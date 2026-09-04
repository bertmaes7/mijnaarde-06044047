import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Geeft een veilige, beperkte samenvatting van een bestelling terug voor de
// bevestigingspagina op de storefront. `orders` heeft bewust GEEN
// anon-SELECT-policy (zie migratie 20260904130000_webshop_schema.sql) — dit
// endpoint is de enige, gecontroleerde manier waarop een gast zijn eigen
// bestelling (via het onraadbare order-id uit de Mollie-redirect) kan
// terugzien, zonder dat de tabel zelf publiek doorzoekbaar wordt.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const orderId = req.method === "GET" ? url.searchParams.get("orderId") : (await req.json())?.orderId;

    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId is verplicht" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, subtotal, shipping_cost, vat_amount, total, currency, shipping_street, shipping_house_number, shipping_postal_code, shipping_city, shipping_country, created_at"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) {
      console.error("Order lookup error:", orderError);
      return new Response(JSON.stringify({ error: "Kon bestelling niet ophalen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!order) {
      return new Response(JSON.stringify({ error: "Bestelling niet gevonden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("product_name, unit_price, vat_rate, quantity, total")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (itemsError) {
      console.error("Order items lookup error:", itemsError);
      return new Response(JSON.stringify({ error: "Kon bestelregels niet ophalen" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ order, items: items || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in get-order-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
