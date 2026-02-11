import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mollieApiKey = Deno.env.get("MOLLIE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!mollieApiKey) {
      throw new Error("MOLLIE_API_KEY ontbreekt");
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authenticatie vereist" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify user
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Ongeldige authenticatie" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contributionId } = await req.json();
    if (!contributionId) throw new Error("contributionId is verplicht");

    // Fetch contribution
    const { data: contribution, error: contError } = await supabase
      .from("contributions")
      .select("*, member:members(first_name, last_name, email)")
      .eq("id", contributionId)
      .single();

    if (contError || !contribution) {
      throw new Error("Contributie niet gevonden");
    }

    // Verify the member owns this contribution
    const { data: memberId } = await supabase.rpc("get_my_member_id");
    if (contribution.member_id !== memberId) {
      // Allow if user has the member role linked
      const { data: memberData } = await supabase
        .from("members")
        .select("id")
        .eq("auth_user_id", userData.user.id)
        .single();
      
      if (!memberData || memberData.id !== contribution.member_id) {
        return new Response(JSON.stringify({ error: "Ongeautoriseerd" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    if (contribution.status === "paid") {
      return new Response(JSON.stringify({ error: "Contributie is al betaald" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create Mollie payment
    const webhookUrl = `${supabaseUrl}/functions/v1/contribution-webhook`;
    const redirectUrl = `${req.headers.get("origin") || "https://mijnaarde.lovable.app"}/member?contribution=success`;

    const mollieResponse = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mollieApiKey}`,
      },
      body: JSON.stringify({
        amount: {
          currency: "EUR",
          value: Number(contribution.amount).toFixed(2),
        },
        description: `Contributie ${contribution.contribution_year} - ${contribution.member?.first_name} ${contribution.member?.last_name}`,
        redirectUrl,
        webhookUrl,
        metadata: {
          contribution_id: contribution.id,
          member_id: contribution.member_id,
          year: contribution.contribution_year,
        },
      }),
    });

    if (!mollieResponse.ok) {
      const errorBody = await mollieResponse.text();
      throw new Error(`Mollie API error: ${errorBody}`);
    }

    const molliePayment = await mollieResponse.json();

    // Update contribution with Mollie payment ID
    await supabase
      .from("contributions")
      .update({ mollie_payment_id: molliePayment.id })
      .eq("id", contributionId);

    console.log(`Contribution payment created: ${molliePayment.id} for contribution ${contributionId}`);

    return new Response(JSON.stringify({
      checkoutUrl: molliePayment._links.checkout.href,
      paymentId: molliePayment.id,
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    console.error("Error creating contribution payment:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
