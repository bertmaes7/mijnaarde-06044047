import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Whitelist of tables that can be queried (read-only)
const ALLOWED_TABLES = [
  "members",
  "companies",
  "income",
  "expenses",
  "contributions",
  "donations",
  "invoices",
  "invoice_items",
  "events",
  "event_registrations",
  "budget",
  "annual_report_inventory",
  "tags",
  "member_tags",
  "mailing_templates",
  "mailings",
];

const MAX_LIMIT = 1000;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // API key validation
    const expectedKey = Deno.env.get("EXTERNAL_API_KEY");
    if (!expectedKey) {
      return new Response(
        JSON.stringify({ error: "Server not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const providedKey =
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!providedKey || providedKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid or missing API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method !== "GET") {
      return new Response(
        JSON.stringify({ error: "Only GET method is allowed (read-only API)" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    // Path: /external-api/{table} or /external-api/{table}/{id}
    const pathParts = url.pathname.split("/").filter(Boolean);
    const apiIdx = pathParts.indexOf("external-api");
    const segments = apiIdx >= 0 ? pathParts.slice(apiIdx + 1) : pathParts;

    // Root endpoint: list available tables
    if (segments.length === 0) {
      return new Response(
        JSON.stringify({
          version: "1.0",
          description: "Read-only REST API for Mijn Aarde data",
          tables: ALLOWED_TABLES,
          usage: {
            list: "GET /external-api/{table}",
            single: "GET /external-api/{table}/{id}",
            params: {
              limit: "max rows (default 100, max 1000)",
              offset: "skip N rows",
              select: "comma-separated columns",
              order: "column.asc or column.desc",
            },
            auth: "Header: x-api-key: <YOUR_KEY>  OR  Authorization: Bearer <YOUR_KEY>",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const table = segments[0];
    const id = segments[1];

    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(
        JSON.stringify({
          error: `Table '${table}' not allowed`,
          allowed_tables: ALLOWED_TABLES,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query parameters
    const select = url.searchParams.get("select") || "*";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), MAX_LIMIT);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const order = url.searchParams.get("order");

    let query = supabase.from(table).select(select, { count: "exact" });

    if (id) {
      query = query.eq("id", id).maybeSingle();
    } else {
      query = query.range(offset, offset + limit - 1);
      if (order) {
        const [col, dir] = order.split(".");
        query = query.order(col, { ascending: dir !== "desc" });
      }
    }

    const { data, error, count } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (id) {
      if (!data) {
        return new Response(
          JSON.stringify({ error: "Not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        data,
        meta: { total: count, limit, offset, returned: (data || []).length },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("external-api error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
