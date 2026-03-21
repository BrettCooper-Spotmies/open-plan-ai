// @ts-expect-error - ES module import from esm.sh
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EMAIL_FROM } from "../_shared/constants.ts";

// @ts-expect-error - Deno is available in edge function runtime
const Deno = globalThis.Deno;

const isProduction = Deno.env.get("ENVIRONMENT") === "production";
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ||
  "http://localhost:5173,http://localhost:3000,https://open-plan-ai.vercel.app")
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

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const isLocalOrigin =
    !isProduction &&
    typeof origin === "string" &&
    /^https?:\/\/(localhost|127\.0\.0\.1):(5173|3000)$/i.test(origin);
  const allowOrigin = origin && (allowedOrigins.includes(origin) || isLocalOrigin)
    ? origin
    : allowedOrigins[0] || Deno.env.get("DEFAULT_ORIGIN") || "http://localhost:5173";

  return {
    ...baseCorsHeaders,
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
  };
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

    // Use service role client for DB operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

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

    // Check for existing pending invitation
    const { data: existing } = await adminClient
      .from("team_invitations")
      .select("id")
      .eq("organization_id", orgId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "An invitation is already pending for this email" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is already a member
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", email)
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

    // Generate token and create invitation. The token stays server-side and is
    // not included in client-facing URLs.
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: invitation, error: insertError } = await adminClient
      .from("team_invitations")
      .insert({
        organization_id: orgId,
        email,
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

    // Get org name for the email
    const { data: org } = await adminClient
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();

    const orgName = org?.name || "the team";
    // Route existing users to /join-org, new users to /signup
    const invitePath = existingProfile ? '/join-org' : '/signup';
    
    // Require an explicit app URL from environment to avoid hardcoded fallbacks.
    const appUrl = Deno.env.get("APP_URL");
    if (!appUrl) {
      return new Response(JSON.stringify({ error: "APP_URL is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const inviteLink = `${appUrl}${invitePath}?invite=${invitationId}`;

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
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

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend error:", errBody);
      // Still return success since invitation was created
      return new Response(JSON.stringify({ 
        success: true, 
        warning: "Invitation created but email delivery may have failed. In testing mode, emails can only be sent to the verified address." 
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
    return new Response(JSON.stringify({ error: "Internal server error", details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
