import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "http://localhost:5173,http://localhost:3000")
  .split(",").map((o: string) => o.trim()).filter(Boolean);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
  const allow = allowedOrigins.includes(origin) || isLocal ? origin : allowedOrigins[0] ?? "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-client-info",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: cors });

  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("client_error_logs").insert({
      error_message: String(body.error_message ?? "unknown").slice(0, 2000),
      context: body.context ?? {},
      page_url: String(body.page_url ?? "").slice(0, 500),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("log-client-error failed:", err);
    // Always 200 — we never want the browser to retry or surface this error
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
