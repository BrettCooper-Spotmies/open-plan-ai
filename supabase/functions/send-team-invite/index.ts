// @ts-expect-error - ES module import from esm.sh
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_FROM } from "../_shared/constants.ts";

// @ts-expect-error - Deno is available in edge function runtime
const Deno = globalThis.Deno;

const isProduction = Deno.env.get("ENVIRONMENT") === "production";
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ||
  "http://localhost:8080,http://localhost:5173,http://localhost:3000,https://open-plan-ai.vercel.app,https://app.openplanai.com")
  .split(",")
  .map((origin: string) => origin.trim())
  .filter((origin: string) => {
    try {
      new URL(origin);
      return true;
    } catch {
      return false;
    }
  });

const baseCorsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendInviteEmailViaResend(params: {
  resendApiKey: string;
  from: string;
  to: string;
  orgName: string;
  role: string;
  inviteLink: string;
}) {
  const { resendApiKey, from, to, orgName, role, inviteLink } = params;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `You're invited to join ${orgName} on OpenPlan AI`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a1a;">You've been invited!</h2>
          <p style="color: #4a4a4a; font-size: 16px;">
            You've been invited to join <strong>${orgName}</strong> on OpenPlan AI as a <strong>${role || "member"}</strong>.
          </p>
          <p style="color: #4a4a4a; font-size: 16px;">
            Click the button below to join the team:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Join ${orgName}
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This invitation expires in 48 hours. If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">OpenPlan AI — Hardware Project Management</p>
        </div>
      `,
    }),
  });

  if (response.ok) {
    return { ok: true as const, errorText: "" };
  }

  const errText = await response.text();
  return { ok: false as const, errorText: errText };
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const isLocalOrigin =
    typeof origin === "string" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const allowOrigin = origin && (allowedOrigins.includes(origin) || isLocalOrigin)
    ? origin
    : allowedOrigins[0] || Deno.env.get("DEFAULT_ORIGIN") || "http://localhost:5173";

  return {
    ...baseCorsHeaders,
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
  };
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user client to get caller identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Authentication failed", details: userError.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!user) {
      return new Response(JSON.stringify({ error: "No user found in token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const { email, role, orgId } = await req.json();
    if (!email || !orgId) {
      return new Response(JSON.stringify({ error: "Missing email or orgId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normalizedEmail = String(email).trim().toLowerCase();

    // Use service role client for DB operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Basic IP-based rate limiting to reduce invitation spam/abuse.
    // We reuse the existing `ip_rate_limits` table already used by other functions.
    const clientIp = getClientIp(req);
    const endpoint = "send-team-invite";
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    // Rate limiting can fail if the `ip_rate_limits` table is missing/misconfigured.
    // In that case we skip rate limiting rather than failing the invite flow.
    let ipCount: number | null = null;
    try {
      const { count } = await adminClient
        .from("ip_rate_limits")
        .select("*", { count: "exact", head: true })
        .eq("ip_address", clientIp)
        .eq("endpoint", endpoint)
        .gte("created_at", oneHourAgo);
      ipCount = count ?? null;
    } catch (e) {
      if (!isProduction) console.warn("IP rate limiting disabled (count failed)");
    }

    if (ipCount !== null && ipCount >= 10) {
      console.warn("IP rate limit exceeded", { endpoint, ipCount });
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record this request (even if it later fails validation) to deter brute-force spam.
    try {
      await adminClient.from("ip_rate_limits").insert({
        ip_address: clientIp,
        endpoint,
      });
    } catch (e) {
      if (!isProduction) console.warn("IP rate limiting disabled (insert failed)");
    }

    // Verify caller is admin/owner
    const { data: callerMembership, error: memberError } = await adminClient
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !callerMembership) {
      return new Response(JSON.stringify({ error: "Not a member of this organization" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["admin", "owner"].includes(callerMembership.role)) {
      return new Response(JSON.stringify({ error: "Only admins and owners can invite members" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is already a member
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      const { data: existingMember } = await adminClient
        .from("organization_members")
        .select("id")
        .eq("organization_id", orgId)
        .eq("user_id", existingProfile.id)
        .maybeSingle();

      if (existingMember) {
        return new Response(JSON.stringify({ error: "This user is already a member of the organization" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check for existing pending invitation; if present, re-send it instead of blocking.
    const { data: existingPending } = await adminClient
      .from("team_invitations")
      .select("id, role")
      .eq("organization_id", orgId)
      .eq("email", normalizedEmail)
      .eq("status", "pending")
      .maybeSingle();

    // Get org name for the email
    const { data: org } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();

    const orgName = org?.name || "the team";
    // Route existing users to /join-org, new users to /signup
    const invitePath = existingProfile ? "/join-org" : "/signup";

    // Resolve app URL from env first; fallback to allowed/request origin for local/dev reliability.
    const requestOrigin = req.headers.get("origin");
    const rawAppUrl =
      Deno.env.get("APP_URL") ||
      (requestOrigin && (allowedOrigins.includes(requestOrigin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin))
        ? requestOrigin
        : allowedOrigins[0]);

    if (!rawAppUrl) {
      return new Response(JSON.stringify({ error: "Unable to resolve application URL for invitation link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appUrl = rawAppUrl.replace(/\/$/, "");

    // Try configured sender first. In dev/test, fallback to Resend's safe sender
    // so invites keep working even before custom domain verification is complete.
    const envFrom = Deno.env.get("EMAIL_FROM");
    const primaryFrom = envFrom || EMAIL_FROM;
    const fallbackFrom = "OpenPlan AI <onboarding@resend.dev>";

    const sendEmailWithFallback = async (invitationId: string, effectiveRole: string) => {
      const inviteLink = `${appUrl}${invitePath}?invite=${invitationId}`;

      let sendResult = await sendInviteEmailViaResend({
        resendApiKey,
        from: primaryFrom,
        to: normalizedEmail,
        orgName,
        role: effectiveRole,
        inviteLink,
      });

      if (!sendResult.ok && primaryFrom !== fallbackFrom) {
        console.warn("Primary sender failed, retrying with Resend fallback sender");
        console.warn("Primary sender error:", sendResult.errorText);
        sendResult = await sendInviteEmailViaResend({
          resendApiKey,
          from: fallbackFrom,
          to: normalizedEmail,
          orgName,
          role: effectiveRole,
          inviteLink,
        });
      }

      return { sendResult, inviteLink };
    };

    if (existingPending?.id) {
      // Throttle re-sends for an existing pending invitation to prevent email spamming.
      const resendEndpoint = `send-team-invite-resend:${existingPending.id}`;
      const oneHourAgoForResend = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      let resendCount: number | null = null;
      try {
        const { count } = await adminClient
          .from("ip_rate_limits")
          .select("*", { count: "exact", head: true })
          .eq("ip_address", clientIp)
          .eq("endpoint", resendEndpoint)
          .gte("created_at", oneHourAgoForResend);
        resendCount = count ?? null;
      } catch (e) {
        if (!isProduction) console.warn("IP rate limiting disabled (resend count failed)");
      }

      if (resendCount !== null && resendCount >= 2) {
        console.warn("Invitation re-send rate limit exceeded", { resendEndpoint, resendCount });
        return new Response(JSON.stringify({ error: "Too many invitation re-send attempts. Please try later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        await adminClient.from("ip_rate_limits").insert({
          ip_address: clientIp,
          endpoint: resendEndpoint,
        });
      } catch (e) {
        if (!isProduction) console.warn("IP rate limiting disabled (resend insert failed)");
      }

      const { sendResult, inviteLink } = await sendEmailWithFallback(existingPending.id, existingPending.role || role || "member");

      if (!sendResult.ok) {
        console.error("Resend error on resend:", sendResult.errorText);
        return new Response(JSON.stringify({
          success: true,
          resent: true,
          invitationId: existingPending.id,
          warning: "Pending invitation exists, but re-send email delivery failed. Check RESEND_API_KEY, sender domain verification, and recipient restrictions.",
          inviteLink,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, resent: true, invitationId: existingPending.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate token and create invitation. The token stays server-side and is
    // not included in client-facing URLs.
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: invitation, error: insertError } = await adminClient
      .from("team_invitations")
      .insert({
        organization_id: orgId,
        email: normalizedEmail,
        role: role || "member",
        token,
        invited_by: user.id,
        status: "pending",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invitationId = invitation?.id;
    if (!invitationId) {
      return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { sendResult, inviteLink } = await sendEmailWithFallback(invitationId, role || "member");

    if (!sendResult.ok) {
      console.error("Resend error:", sendResult.errorText);
      // Still return success since invitation was created
      return new Response(JSON.stringify({
        success: true,
        warning: "Invitation created, but email delivery failed. Check RESEND_API_KEY, sender domain verification, and recipient restrictions.",
        inviteLink,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, invitationId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    // Log details server-side only; don't expose internal error messages to clients.
    console.error("Internal error details:", errorMessage);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
