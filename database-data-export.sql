-- =============================================================================
-- DATA EXPORT GENERATOR
-- Project: Mijn Aarde - Ledenadministratie
-- Generated: 2026-02-16
--
-- INSTRUCTIES:
-- 1. Open de SQL Editor in je Supabase dashboard
-- 2. Voer dit script uit
-- 3. Kopieer de output (kolom "sql") 
-- 4. Plak de output in de SQL Editor van je NIEUWE project en voer uit
--
-- BELANGRIJK: Voer dit script uit NADAT je het schema hebt aangemaakt
-- (via database-supabase-clone.sql of database-supabase-update.sql)
--
-- LET OP: auth_user_id wordt NIET geëxporteerd bij members, omdat deze
-- kolom verwijst naar auth.users die niet mee geëxporteerd worden.
-- Na import moeten gebruikers opnieuw inloggen (ze worden automatisch
-- gekoppeld via de handle_new_user trigger op basis van e-mailadres).
-- =============================================================================

-- =============================================================================
-- Voer elke query hieronder APART uit en kopieer telkens de output.
-- De output bevat kant-en-klare INSERT statements.
-- =============================================================================


-- ===================== 1. COMPANIES =====================
SELECT 'INSERT INTO public.companies (id, name, address, postal_code, city, country, website, email, phone, bank_account, enterprise_number, vat_number, is_supplier, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(name) || ', ' ||
  COALESCE(quote_literal(address), 'NULL') || ', ' ||
  COALESCE(quote_literal(postal_code), 'NULL') || ', ' ||
  COALESCE(quote_literal(city), 'NULL') || ', ' ||
  COALESCE(quote_literal(country), 'NULL') || ', ' ||
  COALESCE(quote_literal(website), 'NULL') || ', ' ||
  COALESCE(quote_literal(email), 'NULL') || ', ' ||
  COALESCE(quote_literal(phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(bank_account), 'NULL') || ', ' ||
  COALESCE(quote_literal(enterprise_number), 'NULL') || ', ' ||
  COALESCE(quote_literal(vat_number), 'NULL') || ', ' ||
  is_supplier::text || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.companies ORDER BY name;


-- ===================== 2. MEMBERS (zonder auth_user_id) =====================
SELECT 'INSERT INTO public.members (id, company_id, first_name, last_name, email, phone, mobile, address, postal_code, city, country, bank_account, personal_url, profile_photo_url, facebook_url, linkedin_url, instagram_url, tiktok_url, notes, date_of_birth, member_since, is_active, is_active_member, is_admin, is_board_member, is_council_member, is_ambassador, is_donor, receives_mail, password_change_required, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  COALESCE(quote_literal(company_id::text), 'NULL') || ', ' ||
  quote_literal(first_name) || ', ' ||
  quote_literal(last_name) || ', ' ||
  COALESCE(quote_literal(email), 'NULL') || ', ' ||
  COALESCE(quote_literal(phone), 'NULL') || ', ' ||
  COALESCE(quote_literal(mobile), 'NULL') || ', ' ||
  COALESCE(quote_literal(address), 'NULL') || ', ' ||
  COALESCE(quote_literal(postal_code), 'NULL') || ', ' ||
  COALESCE(quote_literal(city), 'NULL') || ', ' ||
  COALESCE(quote_literal(country), 'NULL') || ', ' ||
  COALESCE(quote_literal(bank_account), 'NULL') || ', ' ||
  COALESCE(quote_literal(personal_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(profile_photo_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(facebook_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(linkedin_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(instagram_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(tiktok_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  COALESCE(quote_literal(date_of_birth::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(member_since::text), 'NULL') || ', ' ||
  COALESCE(is_active::text, 'NULL') || ', ' ||
  COALESCE(is_active_member::text, 'NULL') || ', ' ||
  is_admin::text || ', ' ||
  COALESCE(is_board_member::text, 'NULL') || ', ' ||
  COALESCE(is_council_member::text, 'NULL') || ', ' ||
  COALESCE(is_ambassador::text, 'NULL') || ', ' ||
  COALESCE(is_donor::text, 'NULL') || ', ' ||
  COALESCE(receives_mail::text, 'NULL') || ', ' ||
  password_change_required::text || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.members ORDER BY last_name, first_name;


-- ===================== 3. TAGS =====================
SELECT 'INSERT INTO public.tags (id, name, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(name) || ', ' ||
  quote_literal(created_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.tags ORDER BY name;


-- ===================== 4. MEMBER TAGS =====================
SELECT 'INSERT INTO public.member_tags (id, member_id, tag_id, created_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(member_id) || ', ' ||
  quote_literal(tag_id) || ', ' ||
  quote_literal(created_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.member_tags;


-- ===================== 5. EVENTS =====================
SELECT 'INSERT INTO public.events (id, title, description, event_date, location, max_participants, is_published, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(title) || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  quote_literal(event_date::text) || ', ' ||
  COALESCE(quote_literal(location), 'NULL') || ', ' ||
  COALESCE(max_participants::text, 'NULL') || ', ' ||
  is_published::text || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.events;


-- ===================== 6. EVENT REGISTRATIONS =====================
SELECT 'INSERT INTO public.event_registrations (id, event_id, member_id, status, registered_at, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(event_id) || ', ' ||
  quote_literal(member_id) || ', ' ||
  quote_literal(status) || ', ' ||
  quote_literal(registered_at::text) || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.event_registrations;


-- ===================== 7. INCOME =====================
SELECT 'INSERT INTO public.income (id, description, amount, date, type, notes, member_id, company_id, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(description) || ', ' ||
  amount::text || ', ' ||
  quote_literal(date::text) || ', ' ||
  quote_literal(type) || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  COALESCE(quote_literal(member_id::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(company_id::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.income;


-- ===================== 8. EXPENSES =====================
SELECT 'INSERT INTO public.expenses (id, description, amount, date, type, vat_rate, category, notes, receipt_url, member_id, company_id, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(description) || ', ' ||
  amount::text || ', ' ||
  quote_literal(date::text) || ', ' ||
  quote_literal(type) || ', ' ||
  COALESCE(vat_rate::text, 'NULL') || ', ' ||
  COALESCE(quote_literal(category), 'NULL') || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  COALESCE(quote_literal(receipt_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(member_id::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(company_id::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.expenses;


-- ===================== 9. DONATIONS =====================
SELECT 'INSERT INTO public.donations (id, member_id, amount, currency, status, mollie_payment_id, mollie_status, description, paid_at, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  COALESCE(quote_literal(member_id::text), 'NULL') || ', ' ||
  amount::text || ', ' ||
  quote_literal(currency) || ', ' ||
  quote_literal(status) || ', ' ||
  COALESCE(quote_literal(mollie_payment_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(mollie_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(description), 'NULL') || ', ' ||
  COALESCE(quote_literal(paid_at::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.donations;


-- ===================== 10. CONTRIBUTIONS =====================
SELECT 'INSERT INTO public.contributions (id, member_id, contribution_year, amount, status, mollie_payment_id, notes, paid_at, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(member_id) || ', ' ||
  contribution_year::text || ', ' ||
  amount::text || ', ' ||
  quote_literal(status) || ', ' ||
  COALESCE(quote_literal(mollie_payment_id), 'NULL') || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  COALESCE(quote_literal(paid_at::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.contributions;


-- ===================== 11. INVOICES =====================
SELECT 'INSERT INTO public.invoices (id, invoice_number, invoice_year, invoice_sequence, member_id, company_id, description, invoice_date, due_date, status, subtotal, vat_rate, vat_amount, total, paid_amount, paid_at, reminder_count, last_reminder_at, notes, pdf_url, sent_at, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(invoice_number) || ', ' ||
  invoice_year::text || ', ' ||
  invoice_sequence::text || ', ' ||
  COALESCE(quote_literal(member_id::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(company_id::text), 'NULL') || ', ' ||
  quote_literal(description) || ', ' ||
  quote_literal(invoice_date::text) || ', ' ||
  quote_literal(due_date::text) || ', ' ||
  quote_literal(status) || ', ' ||
  subtotal::text || ', ' ||
  vat_rate::text || ', ' ||
  vat_amount::text || ', ' ||
  total::text || ', ' ||
  paid_amount::text || ', ' ||
  COALESCE(quote_literal(paid_at::text), 'NULL') || ', ' ||
  reminder_count::text || ', ' ||
  COALESCE(quote_literal(last_reminder_at::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  COALESCE(quote_literal(pdf_url), 'NULL') || ', ' ||
  COALESCE(quote_literal(sent_at::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.invoices;


-- ===================== 12. INVOICE ITEMS =====================
SELECT 'INSERT INTO public.invoice_items (id, invoice_id, description, quantity, unit_price, vat_rate, total, sort_order, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(invoice_id) || ', ' ||
  quote_literal(description) || ', ' ||
  quantity::text || ', ' ||
  unit_price::text || ', ' ||
  vat_rate::text || ', ' ||
  total::text || ', ' ||
  sort_order::text || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.invoice_items;


-- ===================== 13. BUDGET =====================
SELECT 'INSERT INTO public.budget (id, fiscal_year, section, category, description, budgeted_amount, realized_amount, notes, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  fiscal_year::text || ', ' ||
  quote_literal(section) || ', ' ||
  quote_literal(category) || ', ' ||
  quote_literal(description) || ', ' ||
  budgeted_amount::text || ', ' ||
  realized_amount::text || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.budget;


-- ===================== 14. ANNUAL REPORT INVENTORY =====================
SELECT 'INSERT INTO public.annual_report_inventory (id, fiscal_year, category, type, description, amount, notes, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  fiscal_year::text || ', ' ||
  quote_literal(category) || ', ' ||
  quote_literal(type) || ', ' ||
  quote_literal(description) || ', ' ||
  amount::text || ', ' ||
  COALESCE(quote_literal(notes), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.annual_report_inventory;


-- ===================== 15. MAILING TEMPLATES =====================
SELECT 'INSERT INTO public.mailing_templates (id, name, subject, html_content, text_content, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(name) || ', ' ||
  quote_literal(subject) || ', ' ||
  quote_literal(html_content) || ', ' ||
  COALESCE(quote_literal(text_content), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.mailing_templates;


-- ===================== 16. MAILINGS =====================
SELECT 'INSERT INTO public.mailings (id, title, template_id, selection_type, selected_member_ids, filter_status, filter_membership_type, filter_city, filter_company_id, status, scheduled_at, sent_at, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(title) || ', ' ||
  COALESCE(quote_literal(template_id::text), 'NULL') || ', ' ||
  quote_literal(selection_type) || ', ' ||
  COALESCE('''' || selected_member_ids::text || '''', 'NULL') || ', ' ||
  COALESCE(quote_literal(filter_status), 'NULL') || ', ' ||
  COALESCE(quote_literal(filter_membership_type), 'NULL') || ', ' ||
  COALESCE(quote_literal(filter_city), 'NULL') || ', ' ||
  COALESCE(quote_literal(filter_company_id), 'NULL') || ', ' ||
  quote_literal(status) || ', ' ||
  COALESCE(quote_literal(scheduled_at::text), 'NULL') || ', ' ||
  COALESCE(quote_literal(sent_at::text), 'NULL') || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.mailings;


-- ===================== 17. MAILING ASSETS =====================
SELECT 'INSERT INTO public.mailing_assets (id, key, label, value, type, created_at, updated_at) VALUES (' ||
  quote_literal(id) || ', ' ||
  quote_literal(key) || ', ' ||
  quote_literal(label) || ', ' ||
  quote_literal(value) || ', ' ||
  quote_literal(type) || ', ' ||
  quote_literal(created_at::text) || ', ' ||
  quote_literal(updated_at::text) ||
  ') ON CONFLICT (id) DO NOTHING;' AS sql
FROM public.mailing_assets;
