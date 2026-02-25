import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UnsubscribeRequest {
  memberId: string;
  token: string;
}

// HMAC-based token validation
async function validateToken(memberId: string, token: string): Promise<boolean> {
  try {
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const decoded = atob(token);
    const parts = decoded.split(":");
    if (parts.length < 3) {
      // Fallback: support legacy base64 tokens (memberId:timestamp)
      const [tokenMemberId] = parts;
      return tokenMemberId === memberId;
    }
    const [tokenMemberId, timestamp, sigHex] = [parts[0], parts[1], parts.slice(2).join(":")];
    if (tokenMemberId !== memberId) return false;

    // Verify HMAC signature
    const data = `${tokenMemberId}:${timestamp}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    return await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(data));
  } catch {
    return false;
  }
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
      throw new Error("Server configuratie ontbreekt");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { memberId, token }: UnsubscribeRequest = await req.json();

    if (!memberId || !token) {
      return new Response(
        JSON.stringify({ error: "Ongeldige parameters" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate token with HMAC
    if (!(await validateToken(memberId, token))) {
      return new Response(
        JSON.stringify({ error: "Ongeldige uitschrijflink" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update member to not receive mail
    const { error: updateError } = await supabase
      .from("members")
      .update({ receives_mail: false })
      .eq("id", memberId);

    if (updateError) {
      console.error("Error updating member:", updateError);
      throw new Error("Fout bij uitschrijven");
    }

    console.log(`Member ${memberId} successfully unsubscribed`);

    return new Response(
      JSON.stringify({ success: true, message: "Je bent uitgeschreven van de mailinglijst" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Onbekende fout";
    console.error("Error in unsubscribe function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
