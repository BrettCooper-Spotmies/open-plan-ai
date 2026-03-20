import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EMAIL_FROM } from "../_shared/constants.ts";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ||
  "http://localhost:5173,http://localhost:3000,https://open-plan-ai.vercel.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const baseCorsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowOrigin = origin && allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0] || "http://localhost:5173";

  return {
    ...baseCorsHeaders,
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
  };
};

interface SendOtpRequest {
  email: string;
}

function generateSixDigitOtp(): string {
  const maxUint32 = 0x1_0000_0000;
  const range = 900000;
  const threshold = maxUint32 - (maxUint32 % range);

  while (true) {
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const randomValue = randomBytes[0];

    if (randomValue < threshold) {
      return (100000 + (randomValue % range)).toString();
    }
  }
}

// Get client IP from request headers
function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for rate limiting
    const clientIp = getClientIp(req);
    const endpoint = "send-otp";

    // Check IP-based rate limiting (20 requests per hour per IP)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: ipCount } = await supabase
      .from("ip_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", clientIp)
      .eq("endpoint", endpoint)
      .gte("created_at", oneHourAgo);

    if (ipCount && ipCount >= 20) {
      console.warn(`IP rate limit exceeded for ${clientIp} on ${endpoint}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Record this IP request
    await supabase.from("ip_rate_limits").insert({
      ip_address: clientIp,
      endpoint: endpoint,
    });

    const { email }: SendOtpRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting: Check recent OTP requests per email
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("email_verifications")
      .select("*", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", tenMinutesAgo);

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate an unbiased cryptographically secure 6-digit OTP.
    const otp = generateSixDigitOtp();

    // Hash the OTP for storage
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Store OTP with 10-minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        email,
        otp_hash: otpHash,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      throw new Error("Failed to generate verification code");
    }

    // Send email via Resend API directly
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
        <div style="max-width: 400px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #18181b; font-size: 24px; font-weight: 700; margin: 0;">OpenPlan AI</h1>
          </div>
          <h2 style="color: #18181b; font-size: 20px; font-weight: 600; margin: 0 0 16px; text-align: center;">Verify your email</h2>
          <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
            Enter this code to complete your registration:
          </p>
          <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #18181b;">${otp}</span>
          </div>
          <p style="color: #a1a1aa; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
            This code will expire in 10 minutes.<br>
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
        subject: "Your verification code for OpenPlan AI",
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error("Failed to send verification email");
    }

    const emailResult = await emailResponse.json();
    console.log("OTP email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({ success: true, message: "Verification code sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-otp function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
