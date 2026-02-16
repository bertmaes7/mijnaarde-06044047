import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeSQL(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "true" : "false";
  if (typeof val === "number") return val.toString();
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

function arrayToSQL(arr: string[] | null): string {
  if (!arr || arr.length === 0) return "NULL";
  const items = arr.map((v) => escapeSQL(v)).join(", ");
  return `ARRAY[${items}]::uuid[]`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const lines: string[] = [];

  lines.push("-- =============================================================================");
  lines.push("-- DATA IMPORT SCRIPT");
  lines.push("-- Project: Mijn Aarde - Ledenadministratie");
  lines.push(`-- Generated: ${new Date().toISOString().split("T")[0]}`);
  lines.push("--");
  lines.push("-- INSTRUCTIES:");
  lines.push("-- 1. Zorg dat het schema al is aangemaakt (via database-supabase-clone.sql)");
  lines.push("-- 2. Voer dit volledige script uit in de SQL Editor van je nieuwe project");
  lines.push("--");
  lines.push("-- LET OP: auth_user_id wordt NIET geëxporteerd. Gebruikers worden automatisch");
  lines.push("-- gekoppeld via de handle_new_user trigger bij hun eerste login.");
  lines.push("-- =============================================================================");
  lines.push("");

  // 1. Companies
  lines.push("-- ===================== 1. COMPANIES =====================");
  const { data: companies } = await supabase.from("companies").select("*").order("name");
  for (const c of companies || []) {
    lines.push(
      `INSERT INTO public.companies (id, name, address, postal_code, city, country, website, email, phone, bank_account, enterprise_number, vat_number, is_supplier, created_at, updated_at) VALUES (${escapeSQL(c.id)}, ${escapeSQL(c.name)}, ${escapeSQL(c.address)}, ${escapeSQL(c.postal_code)}, ${escapeSQL(c.city)}, ${escapeSQL(c.country)}, ${escapeSQL(c.website)}, ${escapeSQL(c.email)}, ${escapeSQL(c.phone)}, ${escapeSQL(c.bank_account)}, ${escapeSQL(c.enterprise_number)}, ${escapeSQL(c.vat_number)}, ${c.is_supplier}, ${escapeSQL(c.created_at)}, ${escapeSQL(c.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 2. Members (without auth_user_id)
  lines.push("-- ===================== 2. MEMBERS =====================");
  const { data: members } = await supabase
    .from("members")
    .select("id, company_id, first_name, last_name, email, phone, mobile, address, postal_code, city, country, bank_account, personal_url, profile_photo_url, facebook_url, linkedin_url, instagram_url, tiktok_url, notes, date_of_birth, member_since, is_active, is_active_member, is_admin, is_board_member, is_council_member, is_ambassador, is_donor, receives_mail, password_change_required, created_at, updated_at")
    .order("last_name")
    .order("first_name");
  for (const m of members || []) {
    lines.push(
      `INSERT INTO public.members (id, company_id, first_name, last_name, email, phone, mobile, address, postal_code, city, country, bank_account, personal_url, profile_photo_url, facebook_url, linkedin_url, instagram_url, tiktok_url, notes, date_of_birth, member_since, is_active, is_active_member, is_admin, is_board_member, is_council_member, is_ambassador, is_donor, receives_mail, password_change_required, created_at, updated_at) VALUES (${escapeSQL(m.id)}, ${escapeSQL(m.company_id)}, ${escapeSQL(m.first_name)}, ${escapeSQL(m.last_name)}, ${escapeSQL(m.email)}, ${escapeSQL(m.phone)}, ${escapeSQL(m.mobile)}, ${escapeSQL(m.address)}, ${escapeSQL(m.postal_code)}, ${escapeSQL(m.city)}, ${escapeSQL(m.country)}, ${escapeSQL(m.bank_account)}, ${escapeSQL(m.personal_url)}, ${escapeSQL(m.profile_photo_url)}, ${escapeSQL(m.facebook_url)}, ${escapeSQL(m.linkedin_url)}, ${escapeSQL(m.instagram_url)}, ${escapeSQL(m.tiktok_url)}, ${escapeSQL(m.notes)}, ${escapeSQL(m.date_of_birth)}, ${escapeSQL(m.member_since)}, ${escapeSQL(m.is_active)}, ${escapeSQL(m.is_active_member)}, ${escapeSQL(m.is_admin)}, ${escapeSQL(m.is_board_member)}, ${escapeSQL(m.is_council_member)}, ${escapeSQL(m.is_ambassador)}, ${escapeSQL(m.is_donor)}, ${escapeSQL(m.receives_mail)}, ${escapeSQL(m.password_change_required)}, ${escapeSQL(m.created_at)}, ${escapeSQL(m.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 3. Tags
  lines.push("-- ===================== 3. TAGS =====================");
  const { data: tags } = await supabase.from("tags").select("*").order("name");
  for (const t of tags || []) {
    lines.push(
      `INSERT INTO public.tags (id, name, created_at) VALUES (${escapeSQL(t.id)}, ${escapeSQL(t.name)}, ${escapeSQL(t.created_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 4. Member Tags
  lines.push("-- ===================== 4. MEMBER TAGS =====================");
  const { data: memberTags } = await supabase.from("member_tags").select("*");
  for (const mt of memberTags || []) {
    lines.push(
      `INSERT INTO public.member_tags (id, member_id, tag_id, created_at) VALUES (${escapeSQL(mt.id)}, ${escapeSQL(mt.member_id)}, ${escapeSQL(mt.tag_id)}, ${escapeSQL(mt.created_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 5. Events
  lines.push("-- ===================== 5. EVENTS =====================");
  const { data: events } = await supabase.from("events").select("*");
  for (const e of events || []) {
    lines.push(
      `INSERT INTO public.events (id, title, description, event_date, location, max_participants, is_published, created_at, updated_at) VALUES (${escapeSQL(e.id)}, ${escapeSQL(e.title)}, ${escapeSQL(e.description)}, ${escapeSQL(e.event_date)}, ${escapeSQL(e.location)}, ${e.max_participants ?? "NULL"}, ${e.is_published}, ${escapeSQL(e.created_at)}, ${escapeSQL(e.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 6. Event Registrations
  lines.push("-- ===================== 6. EVENT REGISTRATIONS =====================");
  const { data: regs } = await supabase.from("event_registrations").select("*");
  for (const r of regs || []) {
    lines.push(
      `INSERT INTO public.event_registrations (id, event_id, member_id, status, registered_at, created_at, updated_at) VALUES (${escapeSQL(r.id)}, ${escapeSQL(r.event_id)}, ${escapeSQL(r.member_id)}, ${escapeSQL(r.status)}, ${escapeSQL(r.registered_at)}, ${escapeSQL(r.created_at)}, ${escapeSQL(r.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 7. Income
  lines.push("-- ===================== 7. INCOME =====================");
  const { data: income } = await supabase.from("income").select("*");
  for (const i of income || []) {
    lines.push(
      `INSERT INTO public.income (id, description, amount, date, type, notes, member_id, company_id, created_at, updated_at) VALUES (${escapeSQL(i.id)}, ${escapeSQL(i.description)}, ${i.amount}, ${escapeSQL(i.date)}, ${escapeSQL(i.type)}, ${escapeSQL(i.notes)}, ${escapeSQL(i.member_id)}, ${escapeSQL(i.company_id)}, ${escapeSQL(i.created_at)}, ${escapeSQL(i.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 8. Expenses
  lines.push("-- ===================== 8. EXPENSES =====================");
  const { data: expenses } = await supabase.from("expenses").select("*");
  for (const e of expenses || []) {
    lines.push(
      `INSERT INTO public.expenses (id, description, amount, date, type, vat_rate, category, notes, receipt_url, member_id, company_id, created_at, updated_at) VALUES (${escapeSQL(e.id)}, ${escapeSQL(e.description)}, ${e.amount}, ${escapeSQL(e.date)}, ${escapeSQL(e.type)}, ${e.vat_rate ?? "NULL"}, ${escapeSQL(e.category)}, ${escapeSQL(e.notes)}, ${escapeSQL(e.receipt_url)}, ${escapeSQL(e.member_id)}, ${escapeSQL(e.company_id)}, ${escapeSQL(e.created_at)}, ${escapeSQL(e.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 9. Donations
  lines.push("-- ===================== 9. DONATIONS =====================");
  const { data: donations } = await supabase.from("donations").select("*");
  for (const d of donations || []) {
    lines.push(
      `INSERT INTO public.donations (id, member_id, amount, currency, status, mollie_payment_id, mollie_status, description, paid_at, created_at, updated_at) VALUES (${escapeSQL(d.id)}, ${escapeSQL(d.member_id)}, ${d.amount}, ${escapeSQL(d.currency)}, ${escapeSQL(d.status)}, ${escapeSQL(d.mollie_payment_id)}, ${escapeSQL(d.mollie_status)}, ${escapeSQL(d.description)}, ${escapeSQL(d.paid_at)}, ${escapeSQL(d.created_at)}, ${escapeSQL(d.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 10. Contributions
  lines.push("-- ===================== 10. CONTRIBUTIONS =====================");
  const { data: contributions } = await supabase.from("contributions").select("*");
  for (const c of contributions || []) {
    lines.push(
      `INSERT INTO public.contributions (id, member_id, contribution_year, amount, status, mollie_payment_id, notes, paid_at, created_at, updated_at) VALUES (${escapeSQL(c.id)}, ${escapeSQL(c.member_id)}, ${c.contribution_year}, ${c.amount}, ${escapeSQL(c.status)}, ${escapeSQL(c.mollie_payment_id)}, ${escapeSQL(c.notes)}, ${escapeSQL(c.paid_at)}, ${escapeSQL(c.created_at)}, ${escapeSQL(c.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 11. Invoices
  lines.push("-- ===================== 11. INVOICES =====================");
  const { data: invoices } = await supabase.from("invoices").select("*");
  for (const i of invoices || []) {
    lines.push(
      `INSERT INTO public.invoices (id, invoice_number, invoice_year, invoice_sequence, member_id, company_id, description, invoice_date, due_date, status, subtotal, vat_rate, vat_amount, total, paid_amount, paid_at, reminder_count, last_reminder_at, notes, pdf_url, sent_at, created_at, updated_at) VALUES (${escapeSQL(i.id)}, ${escapeSQL(i.invoice_number)}, ${i.invoice_year}, ${i.invoice_sequence}, ${escapeSQL(i.member_id)}, ${escapeSQL(i.company_id)}, ${escapeSQL(i.description)}, ${escapeSQL(i.invoice_date)}, ${escapeSQL(i.due_date)}, ${escapeSQL(i.status)}, ${i.subtotal}, ${i.vat_rate}, ${i.vat_amount}, ${i.total}, ${i.paid_amount}, ${escapeSQL(i.paid_at)}, ${i.reminder_count}, ${escapeSQL(i.last_reminder_at)}, ${escapeSQL(i.notes)}, ${escapeSQL(i.pdf_url)}, ${escapeSQL(i.sent_at)}, ${escapeSQL(i.created_at)}, ${escapeSQL(i.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 12. Invoice Items
  lines.push("-- ===================== 12. INVOICE ITEMS =====================");
  const { data: invoiceItems } = await supabase.from("invoice_items").select("*");
  for (const ii of invoiceItems || []) {
    lines.push(
      `INSERT INTO public.invoice_items (id, invoice_id, description, quantity, unit_price, vat_rate, total, sort_order, created_at, updated_at) VALUES (${escapeSQL(ii.id)}, ${escapeSQL(ii.invoice_id)}, ${escapeSQL(ii.description)}, ${ii.quantity}, ${ii.unit_price}, ${ii.vat_rate}, ${ii.total}, ${ii.sort_order}, ${escapeSQL(ii.created_at)}, ${escapeSQL(ii.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 13. Budget
  lines.push("-- ===================== 13. BUDGET =====================");
  const { data: budget } = await supabase.from("budget").select("*");
  for (const b of budget || []) {
    lines.push(
      `INSERT INTO public.budget (id, fiscal_year, section, category, description, budgeted_amount, realized_amount, notes, created_at, updated_at) VALUES (${escapeSQL(b.id)}, ${b.fiscal_year}, ${escapeSQL(b.section)}, ${escapeSQL(b.category)}, ${escapeSQL(b.description)}, ${b.budgeted_amount}, ${b.realized_amount}, ${escapeSQL(b.notes)}, ${escapeSQL(b.created_at)}, ${escapeSQL(b.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 14. Annual Report Inventory
  lines.push("-- ===================== 14. ANNUAL REPORT INVENTORY =====================");
  const { data: inventory } = await supabase.from("annual_report_inventory").select("*");
  for (const i of inventory || []) {
    lines.push(
      `INSERT INTO public.annual_report_inventory (id, fiscal_year, category, type, description, amount, notes, created_at, updated_at) VALUES (${escapeSQL(i.id)}, ${i.fiscal_year}, ${escapeSQL(i.category)}, ${escapeSQL(i.type)}, ${escapeSQL(i.description)}, ${i.amount}, ${escapeSQL(i.notes)}, ${escapeSQL(i.created_at)}, ${escapeSQL(i.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 15. Mailing Templates
  lines.push("-- ===================== 15. MAILING TEMPLATES =====================");
  const { data: templates } = await supabase.from("mailing_templates").select("*");
  for (const t of templates || []) {
    lines.push(
      `INSERT INTO public.mailing_templates (id, name, subject, html_content, text_content, created_at, updated_at) VALUES (${escapeSQL(t.id)}, ${escapeSQL(t.name)}, ${escapeSQL(t.subject)}, ${escapeSQL(t.html_content)}, ${escapeSQL(t.text_content)}, ${escapeSQL(t.created_at)}, ${escapeSQL(t.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 16. Mailings
  lines.push("-- ===================== 16. MAILINGS =====================");
  const { data: mailings } = await supabase.from("mailings").select("*");
  for (const m of mailings || []) {
    lines.push(
      `INSERT INTO public.mailings (id, title, template_id, selection_type, selected_member_ids, filter_status, filter_membership_type, filter_city, filter_company_id, status, scheduled_at, sent_at, created_at, updated_at) VALUES (${escapeSQL(m.id)}, ${escapeSQL(m.title)}, ${escapeSQL(m.template_id)}, ${escapeSQL(m.selection_type)}, ${arrayToSQL(m.selected_member_ids)}, ${escapeSQL(m.filter_status)}, ${escapeSQL(m.filter_membership_type)}, ${escapeSQL(m.filter_city)}, ${escapeSQL(m.filter_company_id)}, ${escapeSQL(m.status)}, ${escapeSQL(m.scheduled_at)}, ${escapeSQL(m.sent_at)}, ${escapeSQL(m.created_at)}, ${escapeSQL(m.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push("");

  // 17. Mailing Assets
  lines.push("-- ===================== 17. MAILING ASSETS =====================");
  const { data: assets } = await supabase.from("mailing_assets").select("*");
  for (const a of assets || []) {
    lines.push(
      `INSERT INTO public.mailing_assets (id, key, label, value, type, created_at, updated_at) VALUES (${escapeSQL(a.id)}, ${escapeSQL(a.key)}, ${escapeSQL(a.label)}, ${escapeSQL(a.value)}, ${escapeSQL(a.type)}, ${escapeSQL(a.created_at)}, ${escapeSQL(a.updated_at)}) ON CONFLICT (id) DO NOTHING;`
    );
  }

  lines.push("");
  lines.push("-- ===================== KLAAR =====================");
  lines.push("-- Alle data is succesvol geïmporteerd.");

  const sql = lines.join("\n");

  return new Response(sql, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "attachment; filename=database-data-import.sql",
    },
  });
});
