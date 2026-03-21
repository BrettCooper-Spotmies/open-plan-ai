import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ------------------------------------------------------------------
// CORS – restrict to known origins via ALLOWED_ORIGINS env var.
// Never use "*" on an authenticated endpoint.
// ------------------------------------------------------------------
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ||
  "http://localhost:5173,http://localhost:3000,https://open-plan-ai.vercel.app")
  .split(",")
  .map((origin) => origin.trim())
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

/** Maximum allowed length for invitation identifiers to prevent abuse. */
const MAX_INVITE_ID_LENGTH = 500;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get the authenticated user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token, inviteId } = await req.json();

    // Require at least one identifier
    if (!token && !inviteId) {
      return new Response(JSON.stringify({ error: "Missing invitation identifier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Basic format validation – reject empty strings, non-strings, or oversized values
    // to prevent injection or resource-exhaustion before touching the database.
    const effectiveId = inviteId ?? token;
    if (
      typeof effectiveId !== "string" ||
      effectiveId.trim().length === 0 ||
      effectiveId.length > MAX_INVITE_ID_LENGTH
    ) {
      return new Response(JSON.stringify({ error: "Invalid invitation identifier format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find the invitation by ID (preferred) or token (legacy links).
    let invitationQuery = adminClient
      .from("team_invitations")
      .select("*")
      .eq("status", "pending");

    if (inviteId) {
      invitationQuery = invitationQuery.eq("id", inviteId);
    } else {
      invitationQuery = invitationQuery.eq("token", token);
    }

    const { data: invitation, error: inviteError } = await invitationQuery.single();

    if (inviteError || !invitation) {
      return new Response(JSON.stringify({ error: "Invalid or expired invitation" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      await adminClient
        .from("team_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);

      return new Response(JSON.stringify({ error: "Invitation has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Null-check both emails before comparison to prevent runtime errors
    if (!user.email || !invitation.email) {
      return new Response(
        JSON.stringify({ error: "Invitation email information is missing" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "This invitation is for a different email address" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if already a member
    const { data: existingMember } = await adminClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", invitation.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      // Mark invitation as accepted anyway
      await adminClient
        .from("team_invitations")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", invitation.id);

      return new Response(JSON.stringify({ success: true, message: "Already a member" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add user to organization
    const { error: memberError } = await adminClient
      .from("organization_members")
      .insert({
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
        invited_by: invitation.invited_by,
      });

    if (memberError) {
      console.error("Error adding member:", memberError);
      return new Response(
        JSON.stringify({ error: "Failed to add member to organization" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update invitation status
    await adminClient
      .from("team_invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
