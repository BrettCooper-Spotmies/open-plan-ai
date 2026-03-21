import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const isProduction = Deno.env.get("ENVIRONMENT") === "production";

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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: users, error: usersErr } = await supabaseClient.auth.admin.listUsers();
    const { data: orgs } = await supabaseClient.from("organizations").select("*");
    const { data: orgMembers } = await supabaseClient.from("organization_members").select("*");
    const { data: projects } = await supabaseClient.from("projects").select("id, name, organization_id, created_by");
    const { data: activities } = await supabaseClient.from("activities").select("*");
    const { data: projectMembers } = await supabaseClient.from("project_members").select("*");

    return new Response(
      JSON.stringify({
        users: users?.users.map(u => ({ id: u.id, email: u.email })),
        orgs,
        orgMembers,
        projects,
        activities,
        projectMembers,
        error: usersErr
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
