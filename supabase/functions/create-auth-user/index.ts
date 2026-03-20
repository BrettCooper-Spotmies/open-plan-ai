// @ts-expect-error - ES module import from esm.sh
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_FROM } from "../_shared/constants.ts";

// @ts-expect-error - Deno is available in edge function runtime
const Deno = globalThis.Deno;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email, password, metadata } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create new user with metadata
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // User must verify via OTP
      user_metadata: metadata || {},
    });

    if (authError) {
      if (authError.message.includes("User already exists")) {
        return new Response(
          JSON.stringify({ error: "User with this email already exists" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw authError;
    }

    const userId = authData.user!.id;

    // Create profile record
    const initials = (metadata?.name || "")
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({
        id: userId,
        email,
        name: metadata?.name || "",
        initials,
        avatar_url: null,
      });

    if (profileError) {
      // Clean up user if profile creation fails
      await adminClient.auth.admin.deleteUser(userId);
      throw profileError;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in a temporary record (or use a table if you have one)
    // For now, we'll just send it via email
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
