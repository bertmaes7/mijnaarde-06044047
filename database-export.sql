-- =============================================================================
-- COMPLETE DATABASE SCHEMA EXPORT
-- Project: Mijn Aarde - Ledenadministratie
-- Generated: 2026-02-16
-- Compatible with: PostgreSQL 14+
--
-- Dit bestand bevat enkel het schema (geen Supabase-specifieke triggers/storage).
-- Voor een volledige Supabase-kloon, gebruik database-supabase-clone.sql.
-- =============================================================================

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'member');

-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- Companies table
CREATE TABLE public.companies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    country TEXT DEFAULT 'België',
    website TEXT,
    email TEXT,
    phone TEXT,
    bank_account TEXT,
    enterprise_number TEXT,
    vat_number TEXT,
    is_supplier BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Members table
CREATE TABLE public.members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    auth_user_id UUID UNIQUE,
    company_id UUID REFERENCES public.companies(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    country TEXT DEFAULT 'België',
    bank_account TEXT,
    personal_url TEXT,
    profile_photo_url TEXT,
    facebook_url TEXT,
    linkedin_url TEXT,
    instagram_url TEXT,
    tiktok_url TEXT,
    notes TEXT,
    date_of_birth DATE,
    member_since DATE,
    is_active BOOLEAN DEFAULT true,
    is_active_member BOOLEAN DEFAULT true,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_board_member BOOLEAN DEFAULT false,
    is_council_member BOOLEAN DEFAULT false,
    is_ambassador BOOLEAN DEFAULT false,
    is_donor BOOLEAN DEFAULT false,
    receives_mail BOOLEAN DEFAULT true,
    password_change_required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User roles table (for RLS)
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Tags table
CREATE TABLE public.tags (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Member tags junction table
CREATE TABLE public.member_tags (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (member_id, tag_id)
);

-- Events table
CREATE TABLE public.events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    max_participants INTEGER,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event registrations table
CREATE TABLE public.event_registrations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'confirmed',
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (event_id, member_id)
);

-- Income table
CREATE TABLE public.income (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL,
    notes TEXT,
    member_id UUID REFERENCES public.members(id),
    company_id UUID REFERENCES public.companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Expenses table
CREATE TABLE public.expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type TEXT NOT NULL,
    vat_rate NUMERIC DEFAULT 21,
    category TEXT DEFAULT 'overig',
    notes TEXT,
    receipt_url TEXT,
    member_id UUID REFERENCES public.members(id),
    company_id UUID REFERENCES public.companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Donations table
CREATE TABLE public.donations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID REFERENCES public.members(id),
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    status TEXT NOT NULL DEFAULT 'pending',
    mollie_payment_id TEXT,
    mollie_status TEXT,
    description TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contributions table
CREATE TABLE public.contributions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES public.members(id),
    contribution_year INTEGER NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    mollie_payment_id TEXT,
    notes TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invoices table
CREATE TABLE public.invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_year INTEGER NOT NULL DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer,
    invoice_sequence INTEGER NOT NULL,
    member_id UUID REFERENCES public.members(id),
    company_id UUID REFERENCES public.companies(id),
    description TEXT NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    vat_rate NUMERIC NOT NULL DEFAULT 21,
    vat_amount NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    paid_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER NOT NULL DEFAULT 0,
    last_reminder_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    pdf_url TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invoice items table
CREATE TABLE public.invoice_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    vat_rate NUMERIC NOT NULL DEFAULT 21,
    total NUMERIC NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Budget table
CREATE TABLE public.budget (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fiscal_year INTEGER NOT NULL,
    section TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    budgeted_amount NUMERIC NOT NULL DEFAULT 0,
    realized_amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Annual report inventory table
CREATE TABLE public.annual_report_inventory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    fiscal_year INTEGER NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mailing templates table
CREATE TABLE public.mailing_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mailings table
CREATE TABLE public.mailings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    template_id UUID REFERENCES public.mailing_templates(id),
    selection_type TEXT NOT NULL,
    selected_member_ids UUID[] DEFAULT '{}',
    filter_status TEXT DEFAULT 'all',
    filter_membership_type TEXT DEFAULT 'all',
    filter_city TEXT DEFAULT 'all',
    filter_company_id TEXT DEFAULT 'all',
    status TEXT NOT NULL DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mailing assets table
CREATE TABLE public.mailing_assets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. VIEWS
-- =============================================================================

CREATE VIEW public.companies_public AS
SELECT 
    id, name, address, postal_code, city, country, website,
    is_supplier, created_at, updated_at
FROM public.companies;

-- =============================================================================
-- 4. FUNCTIONS
-- =============================================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Function to get current user's member ID
CREATE OR REPLACE FUNCTION public.get_my_member_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
$$;

-- Function to check if user is linked to a company
CREATE OR REPLACE FUNCTION public.is_linked_to_company(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.members
        WHERE auth_user_id = auth.uid() AND company_id = _company_id
    )
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_year INTEGER)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    next_sequence INTEGER;
    invoice_num TEXT;
BEGIN
    SELECT COALESCE(MAX(invoice_sequence), 0) + 1 INTO next_sequence
    FROM public.invoices WHERE invoice_year = p_year;
    invoice_num := p_year::TEXT || '-' || LPAD(next_sequence::TEXT, 3, '0');
    RETURN invoice_num;
END;
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    existing_member_id UUID;
    member_is_admin BOOLEAN;
BEGIN
    -- Always try to link to existing member by email first
    SELECT id, is_admin INTO existing_member_id, member_is_admin
    FROM public.members
    WHERE LOWER(email) = LOWER(NEW.email) AND auth_user_id IS NULL;

    IF existing_member_id IS NOT NULL THEN
        UPDATE public.members SET auth_user_id = NEW.id WHERE id = existing_member_id;

        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'member') ON CONFLICT (user_id, role) DO NOTHING;

        IF member_is_admin THEN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
        END IF;

        RETURN NEW;
    END IF;

    -- No existing member found - only create new member if email is confirmed
    IF NEW.email_confirmed_at IS NOT NULL THEN
        INSERT INTO public.members (
            auth_user_id, first_name, last_name, email, is_active, member_since
        ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'first_name', 'Nieuw'),
            COALESCE(NEW.raw_user_meta_data->>'last_name', 'Lid'),
            NEW.email, true, CURRENT_DATE
        );

        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'member') ON CONFLICT (user_id, role) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_event_registrations_updated_at BEFORE UPDATE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_income_updated_at BEFORE UPDATE ON public.income FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON public.donations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contributions_updated_at BEFORE UPDATE ON public.contributions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_updated_at BEFORE UPDATE ON public.budget FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_annual_report_inventory_updated_at BEFORE UPDATE ON public.annual_report_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mailing_templates_updated_at BEFORE UPDATE ON public.mailing_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mailings_updated_at BEFORE UPDATE ON public.mailings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_mailing_assets_updated_at BEFORE UPDATE ON public.mailing_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_report_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailing_assets ENABLE ROW LEVEL SECURITY;

-- Companies
CREATE POLICY "Admins can manage companies" ON public.companies FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can view their linked company" ON public.companies FOR SELECT USING (has_role(auth.uid(), 'admin') OR is_linked_to_company(id));

-- Members
CREATE POLICY "Admins can view all members" ON public.members FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can only view their own record" ON public.members FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "Admins can insert members" ON public.members FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR (auth_user_id = auth.uid()));
CREATE POLICY "Admins can update any member" ON public.members FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Members can update own profile fields" ON public.members FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (
        (auth_user_id = auth.uid())
        AND (is_admin = (SELECT m.is_admin FROM members m WHERE m.id = members.id))
        AND (auth_user_id = (SELECT m.auth_user_id FROM members m WHERE m.id = members.id))
    );
CREATE POLICY "Admins can delete members" ON public.members FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Tags
CREATE POLICY "Authenticated users can view tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Admins can manage tags" ON public.tags FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Member tags
CREATE POLICY "Members can view their own tags" ON public.member_tags FOR SELECT USING (member_id = get_my_member_id());
CREATE POLICY "Admins can manage member_tags" ON public.member_tags FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Events
CREATE POLICY "Anyone can view published events" ON public.events FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage all events" ON public.events FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Event registrations
CREATE POLICY "Members can view their own registrations" ON public.event_registrations FOR SELECT USING (member_id = get_my_member_id());
CREATE POLICY "Members can register themselves" ON public.event_registrations FOR INSERT WITH CHECK (member_id = get_my_member_id());
CREATE POLICY "Members can cancel their own registration" ON public.event_registrations FOR UPDATE USING (member_id = get_my_member_id());
CREATE POLICY "Admins can manage all registrations" ON public.event_registrations FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Income
CREATE POLICY "Members can view their own income" ON public.income FOR SELECT TO authenticated USING (member_id = get_my_member_id());
CREATE POLICY "Admins can manage income" ON public.income FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Expenses
CREATE POLICY "Members can view their own expenses" ON public.expenses FOR SELECT TO authenticated USING (member_id = get_my_member_id());
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Donations
CREATE POLICY "Members can view their own donations" ON public.donations FOR SELECT USING (member_id = get_my_member_id());
CREATE POLICY "Members can create their own donations" ON public.donations FOR INSERT WITH CHECK (member_id = get_my_member_id());
CREATE POLICY "Admins can manage all donations" ON public.donations FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Contributions
CREATE POLICY "Members can view their own contributions" ON public.contributions FOR SELECT USING (member_id = get_my_member_id());
CREATE POLICY "Admins can manage contributions" ON public.contributions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Invoices
CREATE POLICY "Members can view their own invoices" ON public.invoices FOR SELECT USING (member_id = get_my_member_id());
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Invoice items
CREATE POLICY "Members can view their own invoice items" ON public.invoice_items FOR SELECT USING (invoice_id IN (SELECT id FROM invoices WHERE member_id = get_my_member_id()));
CREATE POLICY "Admins can manage invoice items" ON public.invoice_items FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Budget
CREATE POLICY "Admins can manage budget" ON public.budget FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Annual report inventory
CREATE POLICY "Admins can manage inventory" ON public.annual_report_inventory FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Mailing templates
CREATE POLICY "Admins can manage mailing templates" ON public.mailing_templates FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Mailings
CREATE POLICY "Admins can manage mailings" ON public.mailings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Mailing assets
CREATE POLICY "Admins can manage mailing assets" ON public.mailing_assets FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can read logo assets" ON public.mailing_assets FOR SELECT USING (type = 'logo');

-- =============================================================================
-- 7. INDEXES
-- =============================================================================

CREATE INDEX idx_member_tags_member_id ON public.member_tags(member_id);
CREATE INDEX idx_member_tags_tag_id ON public.member_tags(tag_id);
CREATE INDEX idx_tags_name ON public.tags(name);
CREATE INDEX idx_inventory_fiscal_year ON public.annual_report_inventory(fiscal_year);
CREATE INDEX idx_budget_fiscal_year ON public.budget(fiscal_year);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX idx_invoices_invoice_year ON public.invoices(invoice_year);
CREATE INDEX idx_invoices_member_id ON public.invoices(member_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_contributions_member_id ON public.contributions(member_id);
CREATE INDEX idx_contributions_year ON public.contributions(contribution_year);
