import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CartItem {
  productId: string;
  quantity: number;
}

interface ShippingAddress {
  street?: string;
  houseNumber?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Bijhouden welke voorraad-reservaties al gelukt zijn, zodat we bij een
  // latere fout (te weinig stock voor een volgend item, of Mollie-fout) alles
  // consistent kunnen terugdraaien.
  const reservedItems: { productId: string; quantity: number }[] = [];
  let createdOrderId: string | null = null;

  const rollback = async () => {
    for (const item of reservedItems) {
      await supabase.rpc("adjust_stock", {
        p_product_id: item.productId,
        p_delta: item.quantity,
        p_reason: "correction",
        p_order_id: createdOrderId,
      });
    }
    if (createdOrderId) {
      await supabase.from("orders").delete().eq("id", createdOrderId);
    }
  };

  try {
    const MOLLIE_API_KEY = Deno.env.get("MOLLIE_API_KEY");
    if (!MOLLIE_API_KEY) {
      throw new Error("MOLLIE_API_KEY is not configured");
    }

    const {
      items,
      email,
      firstName,
      lastName,
      shipping,
    }: {
      items: CartItem[];
      email: string;
      firstName?: string;
      lastName?: string;
      shipping?: ShippingAddress;
    } = await req.json();

    // ── Validatie ──────────────────────────────────────────────────────
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Winkelmand is leeg" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const item of items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return new Response(JSON.stringify({ error: "Ongeldige winkelmand" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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

    // ── Kill-switch: ook server-side herchecken, niet enkel via RLS ─────
    const { data: isLive } = await supabase.rpc("shop_is_live");
    if (!isLive) {
      return new Response(JSON.stringify({ error: "De webshop is momenteel niet actief" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Lid opzoeken of aanmaken (zelfde patroon als create-mollie-payment) ─
    let member: { id: string; first_name: string; last_name: string; email: string | null } | null = null;

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
    } else {
      if (!firstName || !lastName) {
        return new Response(JSON.stringify({ error: "Voor- en achternaam zijn verplicht" }), {
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
    }

    // ── Producten server-side ophalen — nooit prijzen van de client vertrouwen ─
    const productIds = items.map((i) => i.productId);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, vat_rate, stock_quantity, is_published, is_active")
      .in("id", productIds);

    if (productsError) {
      console.error("Products lookup error:", productsError);
      return new Response(JSON.stringify({ error: "Kon producten niet ophalen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productById = new Map((products || []).map((p) => [p.id, p]));
    for (const item of items) {
      const product = productById.get(item.productId);
      if (!product || !product.is_published || !product.is_active) {
        return new Response(
          JSON.stringify({ error: "Eén of meer producten zijn niet meer beschikbaar" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── Bedragen berekenen ──────────────────────────────────────────────
    const orderItemRows = items.map((item) => {
      const product = productById.get(item.productId)!;
      const unitPrice = Number(product.price);
      const vatRate = Number(product.vat_rate);
      const lineTotal = unitPrice * item.quantity;
      return {
        product_id: product.id,
        product_name: product.name,
        unit_price: unitPrice,
        vat_rate: vatRate,
        quantity: item.quantity,
        total: lineTotal,
      };
    });

    const subtotal = orderItemRows.reduce((sum, row) => sum + row.total, 0);
    const vatAmount = orderItemRows.reduce((sum, row) => sum + (row.total * row.vat_rate) / 100, 0);

    const { data: shopSettings } = await supabase
      .from("shop_settings")
      .select("shipping_cost, free_shipping_threshold")
      .single();

    const shippingCost =
      shopSettings?.free_shipping_threshold != null && subtotal >= Number(shopSettings.free_shipping_threshold)
        ? 0
        : Number(shopSettings?.shipping_cost ?? 0);

    const total = subtotal + vatAmount + shippingCost;

    // ── Order aanmaken (status pending), vóór de Mollie-call ─────────────
    const currentYear = new Date().getFullYear();
    const { data: orderNumber, error: orderNumberError } = await supabase.rpc("generate_order_number", {
      p_year: currentYear,
    });
    if (orderNumberError || !orderNumber) {
      console.error("Order number error:", orderNumberError);
      return new Response(JSON.stringify({ error: "Kon bestelnummer niet genereren" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        order_year: currentYear,
        order_sequence: parseInt(orderNumber.split("-B")[1], 10),
        member_id: member.id,
        status: "pending",
        shipping_street: shipping?.street || null,
        shipping_house_number: shipping?.houseNumber || null,
        shipping_postal_code: shipping?.postalCode || null,
        shipping_city: shipping?.city || null,
        shipping_country: shipping?.country || "België",
        subtotal,
        shipping_cost: shippingCost,
        vat_amount: vatAmount,
        total,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order insert error:", orderError);
      return new Response(JSON.stringify({ error: "Kon bestelling niet aanmaken" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    createdOrderId = order.id;

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemRows.map((row) => ({ ...row, order_id: order.id })));

    if (itemsError) {
      console.error("Order items insert error:", itemsError);
      await supabase.from("orders").delete().eq("id", order.id);
      return new Response(JSON.stringify({ error: "Kon bestelling niet aanmaken" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Voorraad reserveren (atomisch, met guard tegen oversell) ─────────
    for (const item of items) {
      const { error: stockError } = await supabase.rpc("adjust_stock", {
        p_product_id: item.productId,
        p_delta: -item.quantity,
        p_reason: "sale",
        p_order_id: order.id,
      });

      if (stockError) {
        console.error("Stock reservation failed:", stockError);
        await rollback();
        const product = productById.get(item.productId);
        return new Response(
          JSON.stringify({ error: `Onvoldoende voorraad voor "${product?.name ?? item.productId}"` }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      reservedItems.push(item);
    }

    // ── Mollie-betaling aanmaken ─────────────────────────────────────────
    const siteUrl = Deno.env.get("SHOP_SITE_URL") || "https://mijnaarde.com";
    const origin = req.headers.get("origin") || siteUrl;

    const mollieResponse = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MOLLIE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { currency: "EUR", value: total.toFixed(2) },
        description: `Bestelling ${order.order_number} — Mijn Aarde`,
        redirectUrl: `${origin}/shop?order=${order.id}`,
        webhookUrl: `${supabaseUrl}/functions/v1/shop-webhook`,
        metadata: { order_id: order.id },
      }),
    });

    if (!mollieResponse.ok) {
      const errorText = await mollieResponse.text();
      console.error("Mollie API error:", mollieResponse.status, errorText);
      await rollback();
      return new Response(JSON.stringify({ error: "Betaling kon niet worden aangemaakt" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const molliePayment = await mollieResponse.json();

    await supabase
      .from("orders")
      .update({ mollie_payment_id: molliePayment.id, mollie_status: molliePayment.status })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        checkout_url: molliePayment._links.checkout.href,
        order_id: order.id,
        order_number: order.order_number,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating shop payment:", error);
    await rollback();
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
