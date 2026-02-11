import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mollieApiKey = Deno.env.get("MOLLIE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!mollieApiKey) throw new Error("MOLLIE_API_KEY ontbreekt");

    const formData = await req.formData();
    const paymentId = formData.get("id") as string;

    if (!paymentId) {
      return new Response("Missing payment ID", { status: 400 });
    }

    console.log(`Contribution webhook received for payment: ${paymentId}`);

    // Fetch payment from Mollie
    const mollieResponse = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mollieApiKey}` },
    });

    if (!mollieResponse.ok) {
      throw new Error(`Mollie API error: ${mollieResponse.status}`);
    }

    const payment = await mollieResponse.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contributionId = payment.metadata?.contribution_id;
    if (!contributionId) {
      console.error("No contribution_id in payment metadata");
      return new Response("OK", { status: 200 });
    }

    if (payment.status === "paid") {
      // Update contribution status
      await supabase
        .from("contributions")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", contributionId);

      // Also create income record
      const { data: contribution } = await supabase
        .from("contributions")
        .select("member_id, amount, contribution_year")
        .eq("id", contributionId)
        .single();

      if (contribution) {
        await supabase.from("income").insert({
          description: `Lidgeld ${contribution.contribution_year}`,
          amount: contribution.amount,
          date: new Date().toISOString().split("T")[0],
          type: "lidgeld",
          member_id: contribution.member_id,
          notes: `Mollie betaling: ${paymentId}`,
        });
      }

      console.log(`Contribution ${contributionId} marked as paid`);
    } else if (payment.status === "failed" || payment.status === "canceled" || payment.status === "expired") {
      await supabase
        .from("contributions")
        .update({ status: "failed" })
        .eq("id", contributionId);

      console.log(`Contribution ${contributionId} marked as ${payment.status}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Contribution webhook error:", message);
    return new Response("OK", { status: 200 }); // Always return 200 to Mollie
  }
});
