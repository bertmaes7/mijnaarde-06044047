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
 
     // Get authorization header
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       return new Response(JSON.stringify({ error: "Niet geauthenticeerd" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Create Supabase client with user's auth
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: authHeader } },
     });
 
     // Get authenticated user
     const { data: { user }, error: userError } = await supabase.auth.getUser();
     if (userError || !user) {
       console.error("Auth error:", userError);
       return new Response(JSON.stringify({ error: "Niet geauthenticeerd" }), {
         status: 401,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Get member ID for this user
     const { data: member, error: memberError } = await supabase
       .from("members")
       .select("id, first_name, last_name, email")
       .eq("auth_user_id", user.id)
       .single();
 
     if (memberError || !member) {
       console.error("Member fetch error:", memberError);
       return new Response(JSON.stringify({ error: "Lid niet gevonden" }), {
         status: 404,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Parse request body
     const { amount, description } = await req.json();
 
     if (!amount || amount < 1) {
       return new Response(JSON.stringify({ error: "Bedrag moet minimaal €1 zijn" }), {
         status: 400,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     // Create service role client for inserting donation
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
 
     // Create donation record first
     const { data: donation, error: donationError } = await supabaseAdmin
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
       await supabaseAdmin.from("donations").delete().eq("id", donation.id);
       
       return new Response(JSON.stringify({ error: "Betaling kon niet worden aangemaakt" }), {
         status: 500,
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       });
     }
 
     const molliePayment = await mollieResponse.json();
     console.log("Created Mollie payment:", molliePayment.id);
 
     // Update donation with Mollie payment ID
     await supabaseAdmin
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