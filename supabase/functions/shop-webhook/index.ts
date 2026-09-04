import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const MOLLIE_API_KEY = Deno.env.get("MOLLIE_API_KEY");
    if (!MOLLIE_API_KEY) {
      throw new Error("MOLLIE_API_KEY is not configured");
    }

    // Mollie webhook body: form-urlencoded, enkel "id" — nooit de payload
    // zelf vertrouwen, altijd opnieuw ophalen bij Mollie (zelfde patroon als
    // mollie-webhook).
    let paymentId: string | null = null;
    const contentType = req.headers.get("content-type") || "";
    const text = await req.text();

    if (contentType.includes("application/x-www-form-urlencoded") || text.includes("=")) {
      paymentId = new URLSearchParams(text).get("id");
    } else if (contentType.includes("application/json")) {
      try {
        paymentId = JSON.parse(text).id;
      } catch {
        console.error("Failed to parse JSON body");
      }
    }

    if (!paymentId) {
      return new Response("No payment ID", { status: 400 });
    }

    const mollieResponse = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MOLLIE_API_KEY}` },
    });
    if (!mollieResponse.ok) {
      console.error("Failed to fetch payment from Mollie:", mollieResponse.status);
      return new Response("Failed to fetch payment", { status: 500 });
    }
    const payment = await mollieResponse.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const orderId = payment.metadata?.order_id;
    if (!orderId) {
      console.warn("No order_id in payment metadata");
      return new Response("OK", { status: 200 });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error("Order not found:", orderId, orderError);
      return new Response("OK", { status: 200 });
    }

    // Idempotent: Mollie retryt webhooks. Een order die al 'paid' is, mag
    // niet nog een keer een factuur/income-rij krijgen.
    if (order.status === "paid") {
      return new Response("OK", { status: 200 });
    }

    let status: "pending" | "paid" | "failed" = "pending";
    switch (payment.status) {
      case "paid":
        status = "paid";
        break;
      case "failed":
      case "canceled":
      case "expired":
        status = "failed";
        break;
      default:
        status = "pending";
    }

    if (status === "failed") {
      // Gereserveerde voorraad vrijgeven — de verkoop ging niet door.
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      for (const item of orderItems || []) {
        if (!item.product_id) continue;
        await supabase.rpc("adjust_stock", {
          p_product_id: item.product_id,
          p_delta: item.quantity,
          p_reason: "correction",
          p_order_id: orderId,
        });
      }

      await supabase
        .from("orders")
        .update({ status: "failed", mollie_status: payment.status })
        .eq("id", orderId);

      return new Response("OK", { status: 200 });
    }

    if (status === "pending") {
      await supabase.from("orders").update({ mollie_status: payment.status }).eq("id", orderId);
      return new Response("OK", { status: 200 });
    }

    // ── status === "paid" ────────────────────────────────────────────────
    const paidAt = payment.paidAt || new Date().toISOString();

    await supabase
      .from("orders")
      .update({ status: "paid", mollie_status: payment.status, paid_at: paidAt })
      .eq("id", orderId);

    // Idempotente insert in income (onConflict mollie_payment_id), zelfde
    // patroon als mollie-webhook, zodat de penningmeester webshop-omzet
    // meteen in hetzelfde overzicht ziet als donaties/lidgeld.
    if (order.member_id) {
      const { error: incomeError } = await supabase.from("income").upsert(
        {
          member_id: order.member_id,
          amount: order.total,
          type: "webshop",
          description: `Webshop bestelling ${order.order_number}`,
          date: paidAt.split("T")[0],
          notes: `Order ID: ${orderId}`,
          mollie_payment_id: paymentId,
        },
        { onConflict: "mollie_payment_id", ignoreDuplicates: true }
      );
      if (incomeError) {
        console.error("Failed to create income record:", incomeError);
      }
    }

    // ── Factuur aanmaken via het bestaande facturatiesysteem ────────────
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    const currentYear = new Date().getFullYear();
    const { data: invoiceNumber, error: invoiceNumberError } = await supabase.rpc("generate_invoice_number", {
      p_year: currentYear,
    });

    if (invoiceNumberError || !invoiceNumber) {
      console.error("Could not generate invoice number:", invoiceNumberError);
      return new Response("OK", { status: 200 });
    }

    const today = new Date().toISOString().split("T")[0];

    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        invoice_number: invoiceNumber,
        invoice_year: currentYear,
        invoice_sequence: parseInt(invoiceNumber.split("-")[1], 10),
        member_id: order.member_id,
        order_id: order.id,
        description: `Webshop bestelling ${order.order_number}`,
        invoice_date: today,
        due_date: today,
        status: "paid",
        subtotal: order.subtotal + order.shipping_cost,
        vat_rate: 21,
        vat_amount: order.vat_amount,
        total: order.total,
        paid_amount: order.total,
        paid_at: paidAt,
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      console.error("Could not create invoice for order:", orderId, invoiceError);
      return new Response("OK", { status: 200 });
    }

    const invoiceItemRows = (orderItems || []).map((item, index) => ({
      invoice_id: invoice.id,
      description: `${item.product_name} (${item.quantity}x)`,
      quantity: item.quantity,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      total: item.total,
      sort_order: index,
    }));

    if (order.shipping_cost > 0) {
      invoiceItemRows.push({
        invoice_id: invoice.id,
        description: "Verzendkosten",
        quantity: 1,
        unit_price: order.shipping_cost,
        vat_rate: 21,
        total: order.shipping_cost,
        sort_order: invoiceItemRows.length,
      });
    }

    const { error: invoiceItemsError } = await supabase.from("invoice_items").insert(invoiceItemRows);
    if (invoiceItemsError) {
      console.error("Could not create invoice items for order:", orderId, invoiceItemsError);
    }

    // Verzending van de factuur-e-mail (bestaande Brevo-flow) — niet
    // blokkerend: een mislukte mail mag de webhook niet laten falen (Mollie
    // zou anders blijven retryen op een al succesvolle betaling).
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
          apikey: supabaseServiceKey,
        },
        body: JSON.stringify({ invoiceId: invoice.id, type: "invoice" }),
      });
    } catch (emailError) {
      console.error("Could not send invoice email:", emailError);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Shop webhook error:", error);
    return new Response(error instanceof Error ? error.message : "Unknown error", { status: 500 });
  }
});
