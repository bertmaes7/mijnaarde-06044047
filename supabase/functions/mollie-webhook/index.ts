 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
 
     // Parse webhook payload (form-urlencoded)
     let paymentId: string | null = null;
     
     const contentType = req.headers.get("content-type") || "";
     const text = await req.text();
     console.log("Webhook content-type:", contentType);
     console.log("Webhook body:", text);
     
     if (contentType.includes("application/x-www-form-urlencoded") || text.includes("=")) {
       const params = new URLSearchParams(text);
       paymentId = params.get("id");
     } else if (contentType.includes("application/json")) {
       try {
         const json = JSON.parse(text);
         paymentId = json.id;
       } catch {
         console.error("Failed to parse JSON body");
       }
     }
 
     if (!paymentId) {
       console.error("No payment ID in webhook");
       return new Response("No payment ID", { status: 400 });
     }
 
     console.log("Received webhook for payment:", paymentId);
 
     // Fetch payment details from Mollie
     const mollieResponse = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
       headers: {
         Authorization: `Bearer ${MOLLIE_API_KEY}`,
       },
     });
 
     if (!mollieResponse.ok) {
       console.error("Failed to fetch payment from Mollie:", mollieResponse.status);
       return new Response("Failed to fetch payment", { status: 500 });
     }
 
     const payment = await mollieResponse.json();
     console.log("Payment status:", payment.status, "Metadata:", payment.metadata);
 
     // Create service role Supabase client
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     // Map Mollie status to our status
     let status = "pending";
     let paidAt = null;
 
     switch (payment.status) {
       case "paid":
         status = "paid";
         paidAt = payment.paidAt || new Date().toISOString();
         break;
       case "failed":
       case "canceled":
       case "expired":
         status = "failed";
         break;
       case "pending":
       case "open":
         status = "pending";
         break;
     }
 
     // Update donation record
     const donationId = payment.metadata?.donation_id;
     if (donationId) {
       const updateData: Record<string, unknown> = {
         mollie_status: payment.status,
         status: status,
         updated_at: new Date().toISOString(),
       };
 
       if (paidAt) {
         updateData.paid_at = paidAt;
       }
 
       const { error: updateError } = await supabase
         .from("donations")
         .update(updateData)
         .eq("id", donationId);
 
       if (updateError) {
         console.error("Failed to update donation:", updateError);
         return new Response("Failed to update donation", { status: 500 });
       }
 
       console.log("Updated donation", donationId, "to status:", status);
       
       // If payment is successful, also create an income record
       if (status === "paid") {
         const memberId = payment.metadata?.member_id;
         const amount = parseFloat(payment.amount?.value || "0");
         
         if (memberId && amount > 0) {
           // Check if income record already exists for this donation
           const { data: existingIncome } = await supabase
             .from("income")
             .select("id")
             .eq("notes", `Donatie ID: ${donationId}`)
             .single();
           
           if (!existingIncome) {
             const { error: incomeError } = await supabase
               .from("income")
               .insert({
                 member_id: memberId,
                 amount: amount,
                 type: "donatie",
                 description: "Donatie via Mollie",
                 date: paidAt ? paidAt.split("T")[0] : new Date().toISOString().split("T")[0],
                 notes: `Donatie ID: ${donationId}`,
               });
             
             if (incomeError) {
               console.error("Failed to create income record:", incomeError);
             } else {
               console.log("Created income record for donation", donationId);
             }
           } else {
             console.log("Income record already exists for donation", donationId);
           }
         }
       }
     } else {
       console.warn("No donation_id in payment metadata");
     }
 
     return new Response("OK", { status: 200 });
   } catch (error) {
     console.error("Webhook error:", error);
     return new Response(
       error instanceof Error ? error.message : "Unknown error",
       { status: 500 }
     );
   }
 });