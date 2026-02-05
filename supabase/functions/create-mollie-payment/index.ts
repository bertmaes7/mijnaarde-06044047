import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const MOLLIE_API_KEY = Deno.env.get("MOLLIE_API_KEY");
    if (!MOLLIE_API_KEY) {
      throw new Error("MOLLIE_API_KEY is not configured");
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { amount, description, email, firstName, lastName } = await req.json();

    // Validate required fields
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "E-mailadres is verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailNormalized = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalized)) {
      return new Response(JSON.stringify({ error: "Ongeldig e-mailadres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!amount || amount < 1) {
      return new Response(JSON.stringify({ error: "Bedrag moet minimaal €1 zijn" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up or create member
    let member: { id: string; first_name: string; last_name: string; email: string | null } | null = null;

    // First try to find existing member
    const { data: existingMember, error: memberError } = await supabase
      .from("members")
      .select("id, first_name, last_name, email")
      .eq("email", emailNormalized)
      .maybeSingle();

    if (memberError) {
      console.error("Member lookup error:", memberError);
      return new Response(JSON.stringify({ error: "Kon lid niet opzoeken" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingMember) {
      member = existingMember;
      console.log("Found existing member:", member.id);
    } else {
      // Create new member - firstName and lastName are required for new members
      if (!firstName || !lastName) {
        return new Response(JSON.stringify({ error: "Voor- en achternaam zijn verplicht voor nieuwe donateurs" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newMember, error: createError } = await supabase
        .from("members")
        .insert({
          email: emailNormalized,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          is_donor: true,
          is_active: true,
          member_since: new Date().toISOString().split("T")[0],
        })
        .select("id, first_name, last_name, email")
        .single();

      if (createError) {
        console.error("Member create error:", createError);
        return new Response(JSON.stringify({ error: "Kon lid niet aanmaken" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      member = newMember;
      console.log("Created new member:", member.id);
    }

    // Create donation record
    const { data: donation, error: donationError } = await supabase
      .from("donations")
      .insert({
        member_id: member.id,
        amount: amount,
        description: description || "Donatie",
        status: "pending",
      })
      .select()
      .single();

    if (donationError) {
      console.error("Donation insert error:", donationError);
      return new Response(JSON.stringify({ error: "Kon donatie niet aanmaken" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Created donation:", donation.id);

    // Get the origin for redirect URLs
    const origin = req.headers.get("origin") || "https://mijnaarde.lovable.app";
    
    // Create Mollie payment
    const mollieResponse = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MOLLIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: {
          currency: "EUR",
          value: amount.toFixed(2),
        },
        description: `Donatie - ${member.first_name} ${member.last_name}`,
        redirectUrl: `${origin}/donate/success?donation_id=${donation.id}`,
        webhookUrl: `${supabaseUrl}/functions/v1/mollie-webhook`,
        metadata: {
          donation_id: donation.id,
          member_id: member.id,
          user_email: member.email,
        },
      }),
    });

    if (!mollieResponse.ok) {
      const errorText = await mollieResponse.text();
      console.error("Mollie API error:", mollieResponse.status, errorText);
      
      // Clean up the donation record
      await supabase.from("donations").delete().eq("id", donation.id);
      
      return new Response(JSON.stringify({ error: "Betaling kon niet worden aangemaakt" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const molliePayment = await mollieResponse.json();
    console.log("Created Mollie payment:", molliePayment.id);

    // Update donation with Mollie payment ID
    await supabase
      .from("donations")
      .update({
        mollie_payment_id: molliePayment.id,
        mollie_status: molliePayment.status,
      })
      .eq("id", donation.id);

    return new Response(
      JSON.stringify({
        checkout_url: molliePayment._links.checkout.href,
        donation_id: donation.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating payment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
