// @ts-expect-error - ES module import from esm.sh
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_FROM } from "../_shared/constants.ts";

// @ts-expect-error - Deno is available in edge function runtime
const Deno = globalThis.Deno;

// ------------------------------------------------------------------
// CORS – restrict to known origins via ALLOWED_ORIGINS env var.
// Never use "*" on an authenticated endpoint.
// ------------------------------------------------------------------
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ||
  "http://localhost:5173,http://localhost:3000,https://open-plan-ai.vercel.app")
  .split(",")
  .map((origin: string) => origin.trim())
  .filter(Boolean);

const baseCorsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const isLocalOrigin =
    typeof origin === "string" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const allowOrigin =
    origin && (allowedOrigins.includes(origin) || isLocalOrigin)
      ? origin
      : allowedOrigins[0] || "http://localhost:5173";
  return {
    ...baseCorsHeaders,
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
  };
}

/** Maximum retry attempts for unbiased OTP generation. Converges in 1-2 tries in practice. */
const MAX_OTP_RETRIES = 100;

function generateSixDigitOtp(): string {
  const maxUint32 = 0x1_0000_0000;
  const range = 900000;
  const threshold = maxUint32 - (maxUint32 % range);

  for (let attempt = 0; attempt < MAX_OTP_RETRIES; attempt++) {
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const randomValue = randomBytes[0];

    if (randomValue < threshold) {
      return (100000 + (randomValue % range)).toString();
    }
  }

  throw new Error("Failed to generate a secure OTP after maximum retries");
}

async function findAuthUserByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string; email?: string | null; email_confirmed_at?: string | null } | null> {
  const { data, error } = await adminClient
    .schema("auth")
    .from("users")
    .select("id, email, email_confirmed_at")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.warn("Failed direct query to auth.users:", error);
  }

  if (data) {
    return {
      id: data.id,
      email: data.email,
      email_confirmed_at: data.email_confirmed_at,
    };
  }

  return null;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { invite, email, password, metadata } = await req.json();

    if (!invite || !email || !password) {
      return new Response(
        JSON.stringify({ error: "Invitation, email, and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic format validation to reject obviously invalid inputs
    if (typeof invite !== "string" || invite.length > 500 || invite.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid invitation identifier format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const invitationById = await adminClient
      .from("team_invitations")
      .select("id, email, expires_at, status")
      .eq("id", invite)
      .eq("status", "pending")
      .maybeSingle();

    let invitation = invitationById.data;
    if (!invitation) {
      const invitationByToken = await adminClient
        .from("team_invitations")
        .select("id, email, expires_at, status")
        .eq("token", invite)
        .eq("status", "pending")
        .maybeSingle();
      invitation = invitationByToken.data;
    }

    if (!invitation) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Invitation has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Null-check both emails before comparison
    if (!invitation.email || !email) {
      return new Response(
        JSON.stringify({ error: "Invitation email information is missing" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "Invitation email does not match signup email" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new user with metadata
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // User must verify via OTP
      user_metadata: metadata || {},
    });

    let userId = authData.user?.id;

    if (authError || !userId) {
      const authMessage = authError?.message || "";
      const isRecoverableAuthError =
        authError?.status === 422 ||
        /user already exists|already registered|already been registered|database error creating new user/i.test(authMessage);

      if (!isRecoverableAuthError) {
        throw authError || new Error("Unable to create auth user");
      }

      // Recovery path: previous partial attempts may have already created the auth user.
      const existingUser = await findAuthUserByEmail(adminClient, email);

      if (!existingUser?.id) {
        if (/user already exists|already registered|already been registered/i.test(authMessage)) {
          return new Response(
            JSON.stringify({ error: "User with this email already exists" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw authError || new Error("Unable to locate existing user after auth create failure");
      }

      userId = existingUser.id;
    }

    // Upsert profile record. A DB trigger may already create this row on auth.users insert.
    const initials = (metadata?.name || "")
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: userId,
        email,
        name: metadata?.name || "",
        initials,
        avatar_url: null,
      }, { onConflict: "id" });

    if (profileError) {
      const isDuplicateEmailProfile =
        profileError.code === "23505" &&
        /profiles_email_key/i.test(profileError.message || "");

      if (isDuplicateEmailProfile) {
        // Recovery path for stale profile rows that already hold this email.
        const { error: relinkError } = await adminClient
          .from("profiles")
          .update({
            id: userId,
            name: metadata?.name || "",
            initials,
            avatar_url: null,
          })
          .eq("email", email);

        if (!relinkError) {
          console.warn("Recovered from duplicate profiles.email by relinking profile", {
            email,
            userId,
          });
        } else {
          // Clean up user if profile reconciliation fails
          await adminClient.auth.admin.deleteUser(userId);
          throw relinkError;
        }
      } else {
        // Clean up user if profile creation fails for any other reason
        await adminClient.auth.admin.deleteUser(userId);
        throw profileError;
      }
    }

    // Generate an unbiased cryptographically secure 6-digit OTP.
    const otp = generateSixDigitOtp();

    // Hash the OTP salted with the user's email to prevent precomputed attacks.
    // The same salted format must be used in verify-otp when verifying.
    const encoder = new TextEncoder();
    const saltedOtp = `${email.toLowerCase()}:${otp}`;
    const data = encoder.encode(saltedOtp);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: otpInsertError } = await adminClient
      .from("email_verifications")
      .insert({
        email,
        otp_hash: otpHash,
        expires_at: expiresAt,
      });

    if (otpInsertError) {
      console.error("Error storing OTP", {
        code: otpInsertError.code,
        message: otpInsertError.message,
      });
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to create verification code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [email],
          subject: "Your OpenPlan AI Verification Code",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #1a1a1a;">Welcome to OpenPlan AI!</h2>
              <p style="color: #4a4a4a; font-size: 16px;">
                Your verification code is:
              </p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">
                  ${otp}
                </div>
              </div>
              <p style="color: #6b7280; font-size: 14px;">
                This code expires in 10 minutes. Do not share this code with anyone.
              </p>
            </div>
          `,
        }),
      });

      if (!emailRes.ok) {
        console.error("Failed to send OTP email:", await emailRes.text());
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        message: "User created successfully. Check your email for verification code.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
