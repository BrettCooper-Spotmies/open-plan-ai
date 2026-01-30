import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyOtpRequest {
  email: string;
  otp: string;
}

// Get client IP from request headers
function getClientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration is missing");
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP for rate limiting
    const clientIp = getClientIp(req);
    const endpoint = "verify-otp";

    // Check IP-based rate limiting (30 requests per hour per IP)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: ipCount } = await supabase
      .from("ip_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip_address", clientIp)
      .eq("endpoint", endpoint)
      .gte("created_at", oneHourAgo);

    if (ipCount && ipCount >= 30) {
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

    const { email, otp }: VerifyOtpRequest = await req.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ error: "Email and OTP are required" }),
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

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return new Response(
        JSON.stringify({ error: "Invalid code format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Hash the provided OTP
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const otpHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Find the verification record
    const { data: verification, error: findError } = await supabase
      .from("email_verifications")
      .select("*")
      .eq("email", email)
      .eq("otp_hash", otpHash)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (findError || !verification) {
      // Check if there's a verification with attempts
      const { data: expiredOrWrong } = await supabase
        .from("email_verifications")
        .select("attempts")
        .eq("email", email)
        .is("verified_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (expiredOrWrong) {
        // Increment attempts
        await supabase
          .from("email_verifications")
          .update({ attempts: (expiredOrWrong.attempts || 0) + 1 })
          .eq("email", email)
          .is("verified_at", null);

        if ((expiredOrWrong.attempts || 0) >= 4) {
          return new Response(
            JSON.stringify({ error: "Too many failed attempts. Please request a new code." }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      return new Response(
        JSON.stringify({ error: "Invalid or expired verification code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check max attempts
    if ((verification.attempts || 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Please request a new code." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from("email_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", verification.id);

    if (updateError) {
      console.error("Error updating verification:", updateError);
      throw new Error("Failed to verify code");
    }

    // Update the user's email_confirmed_at in auth.users
    // First, get users by email using the admin API
    try {
      // Use the admin API to list users filtered by email
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      if (listError) {
        console.error("Error listing users:", listError);
      }

      // Find the specific user by email
      const user = usersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (user && !user.email_confirmed_at) {
        console.log(`Updating email_confirmed_at for user ${user.id}`);

        const { error: updateUserError } = await supabase.auth.admin.updateUserById(user.id, {
          email_confirm: true,
        });

        if (updateUserError) {
          console.error("Error updating user email_confirmed_at:", updateUserError);
          // Don't throw - the verification itself succeeded, this is just a secondary update
        } else {
          console.log(`Successfully updated email_confirmed_at for user ${user.id}`);
        }
      } else if (user) {
        console.log(`User ${user.id} already has email_confirmed_at set`);
      } else {
        // If the user wasn't found in the first page, search more explicitly
        console.log(`User not found in first page, searching all users for email: ${email}`);

        // Note: In production with many users, you'd want to implement proper pagination
        // or use a different approach like a database trigger
        const { data: allUsersData } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000, // Adjust based on your expected user count
        });

        const foundUser = allUsersData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (foundUser && !foundUser.email_confirmed_at) {
          const { error: updateFoundUserError } = await supabase.auth.admin.updateUserById(foundUser.id, {
            email_confirm: true,
          });

          if (updateFoundUserError) {
            console.error("Error updating user email_confirmed_at:", updateFoundUserError);
          } else {
            console.log(`Successfully updated email_confirmed_at for user ${foundUser.id}`);
          }
        }
      }
    } catch (authError) {
      console.error("Error updating auth user:", authError);
      // Don't throw - the verification record was updated successfully
    }

    console.log("Email verified successfully for:", email);

    return new Response(
      JSON.stringify({ success: true, message: "Email verified successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in verify-otp function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
