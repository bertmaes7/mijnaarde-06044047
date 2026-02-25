import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Verify the user is an admin
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const supabaseService = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await supabaseService
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question, conversationHistory = [] } = await req.json();
    if (!question) {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather data summaries for context
    const [
      { count: totalMembers },
      { count: activeMembers },
      { data: membersData },
      { data: incomeData },
      { data: expensesData },
      { data: contributionsData },
      { data: invoicesData },
      { data: eventsData },
      { data: donationsData },
    ] = await Promise.all([
      supabaseService.from("members").select("*", { count: "exact", head: true }),
      supabaseService.from("members").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabaseService.from("members").select("id, first_name, last_name, email, city, is_active, is_board_member, is_ambassador, is_donor, is_council_member, is_active_member, member_since, company_id, date_of_birth"),
      supabaseService.from("income").select("id, amount, date, description, type, member_id, company_id"),
      supabaseService.from("expenses").select("id, amount, date, description, type, category, member_id, company_id, vat_rate"),
      supabaseService.from("contributions").select("id, member_id, contribution_year, amount, status, paid_at"),
      supabaseService.from("invoices").select("id, invoice_number, description, status, total, paid_amount, invoice_date, due_date, member_id, company_id"),
      supabaseService.from("events").select("id, title, event_date, location, max_participants, is_published"),
      supabaseService.from("donations").select("id, amount, status, paid_at, member_id"),
    ]);

    // Build summary statistics
    const now = new Date();
    const currentYear = now.getFullYear();

    const totalIncome = (incomeData || []).reduce((s, i) => s + Number(i.amount), 0);
    const totalExpenses = (expensesData || []).reduce((s, e) => s + Number(e.amount), 0);
    const yearIncome = (incomeData || []).filter(i => new Date(i.date).getFullYear() === currentYear).reduce((s, i) => s + Number(i.amount), 0);
    const yearExpenses = (expensesData || []).filter(e => new Date(e.date).getFullYear() === currentYear).reduce((s, e) => s + Number(e.amount), 0);

    const paidContributions = (contributionsData || []).filter(c => c.status === "paid");
    const pendingContributions = (contributionsData || []).filter(c => c.status === "pending");
    const yearContributions = (contributionsData || []).filter(c => c.contribution_year === currentYear);

    const paidInvoices = (invoicesData || []).filter(i => i.status === "paid");
    const openInvoices = (invoicesData || []).filter(i => i.status !== "paid" && i.status !== "cancelled");

    const cities = [...new Set((membersData || []).filter(m => m.city).map(m => m.city))];
    const boardMembers = (membersData || []).filter(m => m.is_board_member);
    const ambassadors = (membersData || []).filter(m => m.is_ambassador);
    const donors = (membersData || []).filter(m => m.is_donor);

    const incomeTypes = {};
    (incomeData || []).forEach(i => { incomeTypes[i.type] = (incomeTypes[i.type] || 0) + Number(i.amount); });
    const expenseCategories = {};
    (expensesData || []).forEach(e => { 
      const cat = e.category || e.type;
      expenseCategories[cat] = (expenseCategories[cat] || 0) + Number(e.amount); 
    });

    const contextData = `
## Database Overzicht (actuele data)

### Leden
- Totaal: ${totalMembers}
- Actief: ${activeMembers}
- Inactief: ${(totalMembers || 0) - (activeMembers || 0)}
- Bestuursleden: ${boardMembers.length}
- Ambassadeurs: ${ambassadors.length}
- Donateurs: ${donors.length}
- Steden: ${cities.join(", ")}

### Financiën
- Totale inkomsten (alle jaren): €${totalIncome.toFixed(2)}
- Totale uitgaven (alle jaren): €${totalExpenses.toFixed(2)}
- Saldo (alle jaren): €${(totalIncome - totalExpenses).toFixed(2)}
- Inkomsten ${currentYear}: €${yearIncome.toFixed(2)}
- Uitgaven ${currentYear}: €${yearExpenses.toFixed(2)}
- Saldo ${currentYear}: €${(yearIncome - yearExpenses).toFixed(2)}
- Inkomsten per type: ${JSON.stringify(incomeTypes)}
- Uitgaven per categorie: ${JSON.stringify(expenseCategories)}

### Contributies
- Totaal: ${(contributionsData || []).length}
- Betaald: ${paidContributions.length}
- Openstaand: ${pendingContributions.length}
- Contributies ${currentYear}: ${yearContributions.length} (betaald: ${yearContributions.filter(c => c.status === "paid").length}, openstaand: ${yearContributions.filter(c => c.status === "pending").length})

### Facturen
- Totaal: ${(invoicesData || []).length}
- Betaald: ${paidInvoices.length}
- Openstaand: ${openInvoices.length}
- Totaalbedrag openstaand: €${openInvoices.reduce((s, i) => s + Number(i.total) - Number(i.paid_amount), 0).toFixed(2)}

### Donaties
- Totaal: ${(donationsData || []).length}
- Betaald: ${(donationsData || []).filter(d => d.status === "paid").length}
- Totaalbedrag betaald: €${(donationsData || []).filter(d => d.status === "paid").reduce((s, d) => s + Number(d.amount), 0).toFixed(2)}

### Evenementen
- Totaal: ${(eventsData || []).length}
- Gepubliceerd: ${(eventsData || []).filter(e => e.is_published).length}
- Toekomstig: ${(eventsData || []).filter(e => new Date(e.event_date) > now).length}

### Ruwe data (voor gedetailleerde vragen)
Leden (eerste 50): ${JSON.stringify((membersData || []).slice(0, 50).map(m => ({ naam: `${m.first_name} ${m.last_name}`, stad: m.city, actief: m.is_active, lid_sinds: m.member_since })))}
`;

    const systemPrompt = `Je bent een behulpzame data-assistent voor het ledenbeheersysteem van "Mijn Aarde vzw", een Belgische organisatie. 
Je beantwoordt vragen over leden, financiën, contributies, facturen, donaties en evenementen op basis van de actuele data die je krijgt.

Regels:
- Antwoord altijd in het Nederlands
- Gebruik het €-teken voor bedragen
- Formatteer bedragen in Belgisch formaat (€1.234,56)
- Wees beknopt maar volledig
- Als je iets niet kunt afleiden uit de data, zeg dat eerlijk
- Gebruik markdown-opmaak voor leesbaarheid (lijsten, vetgedrukt, etc.)
- Vermeld geen technische details over de database of API

${contextData}`;

    // Call Lovable AI with streaming
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: question },
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI-tegoed is op. Voeg credits toe in de instellingen." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("data-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
