import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function checkBasicAuth(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) return false;

  const expectedUser = Deno.env.get("ODATA_API_USER");
  const expectedPass = Deno.env.get("ODATA_API_PASSWORD");
  if (!expectedUser || !expectedPass) return false;

  try {
    const decoded = atob(authHeader.replace("Basic ", ""));
    const [user, pass] = decoded.split(":");
    return user === expectedUser && pass === expectedPass;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Basic Auth check
  if (!checkBasicAuth(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Basic realm="OData API"',
      },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const url = new URL(req.url);
  const top = parseInt(url.searchParams.get("$top") || "1000");
  const skip = parseInt(url.searchParams.get("$skip") || "0");
  const count = url.searchParams.get("$count") === "true";
  const select = url.searchParams.get("$select");
  const filter = url.searchParams.get("$filter");
  const orderby = url.searchParams.get("$orderby");

  // Build query
  let selectColumns = "id, first_name, last_name, email, phone, mobile, address, postal_code, city, country, date_of_birth, member_since, is_active, is_active_member, is_board_member, is_council_member, is_ambassador, is_donor, is_admin, receives_mail, company_id, notes, personal_url, facebook_url, linkedin_url, instagram_url, tiktok_url, bank_account, created_at, updated_at";

  if (select) {
    selectColumns = select.split(",").map((s) => s.trim()).join(", ");
  }

  let query = supabase
    .from("members")
    .select(selectColumns, { count: count ? "exact" : undefined })
    .range(skip, skip + top - 1);

  // Simple $orderby support
  if (orderby) {
    const parts = orderby.split(",");
    for (const part of parts) {
      const [col, dir] = part.trim().split(/\s+/);
      query = query.order(col, { ascending: dir?.toLowerCase() !== "desc" });
    }
  } else {
    query = query.order("last_name", { ascending: true });
  }

  // Simple $filter support (eq only)
  if (filter) {
    const eqMatch = filter.match(/(\w+)\s+eq\s+'([^']+)'/);
    if (eqMatch) {
      query = query.eq(eqMatch[1], eqMatch[2]);
    }
    const boolMatch = filter.match(/(\w+)\s+eq\s+(true|false)/);
    if (boolMatch) {
      query = query.eq(boolMatch[1], boolMatch[2] === "true");
    }
  }

  const { data, error, count: totalCount } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // OData-style response
  const response: Record<string, unknown> = {
    "@odata.context": `${url.origin}${url.pathname}/$metadata#Members`,
    value: data || [],
  };

  if (count && totalCount !== null) {
    response["@odata.count"] = totalCount;
  }

  return new Response(JSON.stringify(response), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; odata.metadata=minimal",
    },
  });
});
