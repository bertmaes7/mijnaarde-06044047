import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes(";")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(";")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCSV(row[h])).join(";"));
  }
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const table = url.searchParams.get("table");

    const tables = [
      "companies",
      "members",
      "tags",
      "member_tags",
      "events",
      "event_registrations",
      "income",
      "expenses",
      "donations",
      "contributions",
      "invoices",
      "invoice_items",
      "budget",
      "annual_report_inventory",
      "mailing_templates",
      "mailings",
      "mailing_assets",
      "user_roles",
    ];

    if (table) {
      if (!tables.includes(table)) {
        return new Response(JSON.stringify({ error: "Invalid table" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase.from(table).select("*");
      if (error) throw error;

      const csv = "\uFEFF" + toCSV(data || []);
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": `attachment; filename="${table}.csv"`,
        },
      });
    }

    // Return list of available tables with row counts
    const result: Record<string, number> = {};
    for (const t of tables) {
      const { count } = await supabase.from(t).select("*", { count: "exact", head: true });
      result[t] = count || 0;
    }

    return new Response(JSON.stringify({ tables: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
