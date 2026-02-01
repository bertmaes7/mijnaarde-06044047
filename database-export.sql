-- =============================================================================
-- COMPLETE DATABASE SCHEMA EXPORT
-- Project: Mijn Aarde - Ledenadministratie
-- Generated: 2026-02-01
-- Compatible with: PostgreSQL 14+
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
    phone TEXT,
    email TEXT,
    website TEXT,
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
    auth_user_id UUID,
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
    company_id UUID REFERENCES public.companies(id),
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
    name TEXT NOT NULL,
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
    notes TEXT,
    receipt_url TEXT,
    member_id UUID REFERENCES public.members(id),
    company_id UUID REFERENCES public.companies(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
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
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. VIEWS
-- =============================================================================

-- Public view of companies (excluding sensitive fields)
CREATE VIEW public.companies_public AS
SELECT 
    id,
    name,
    address,
    postal_code,
    city,
    country,
    phone,
    email,
    website,
    is_supplier,
    created_at,
    updated_at
FROM public.companies;

-- =============================================================================
-- 4. FUNCTIONS
-- =============================================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get current user's member ID
CREATE OR REPLACE FUNCTION public.get_my_member_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.members WHERE auth_user_id = auth.uid()
$$;

-- Function to check if user is linked to a company
CREATE OR REPLACE FUNCTION public.is_linked_to_company(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.members
        WHERE auth_user_id = auth.uid()
          AND company_id = _company_id
    )
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Function to handle new user registration (links to existing member or creates new)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_member_id UUID;
    member_is_admin BOOLEAN;
BEGIN
    -- Only attempt to link to existing member if email is confirmed
    IF NEW.email_confirmed_at IS NOT NULL THEN
        SELECT id, is_admin INTO existing_member_id, member_is_admin
        FROM public.members
        WHERE email = NEW.email AND auth_user_id IS NULL;
        
        IF existing_member_id IS NOT NULL THEN
            -- Link existing member to auth user
            UPDATE public.members
            SET auth_user_id = NEW.id
            WHERE id = existing_member_id;
            
            -- Give the user the 'member' role
            INSERT INTO public.user_roles (user_id, role)
            VALUES (NEW.id, 'member')
            ON CONFLICT (user_id, role) DO NOTHING;
            
            -- If member was marked as admin, also give admin role
            IF member_is_admin THEN
                INSERT INTO public.user_roles (user_id, role)
                VALUES (NEW.id, 'admin')
                ON CONFLICT (user_id, role) DO NOTHING;
            END IF;
            
            RETURN NEW;
        END IF;
    END IF;
    
    -- Create new member record for unconfirmed emails or when no existing member found
    INSERT INTO public.members (
        auth_user_id,
        first_name,
        last_name,
        email,
        is_active,
        member_since
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'Nieuw'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'Lid'),
        NEW.email,
        true,
        CURRENT_DATE
    );
    
    -- Give new user the 'member' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

-- Update timestamps on companies
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamps on members
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamps on events
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamps on event_registrations
CREATE TRIGGER update_event_registrations_updated_at
    BEFORE UPDATE ON public.event_registrations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamps on income
CREATE TRIGGER update_income_updated_at
    BEFORE UPDATE ON public.income
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamps on expenses
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamps on mailing_templates
CREATE TRIGGER update_mailing_templates_updated_at
    BEFORE UPDATE ON public.mailing_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamps on mailings
CREATE TRIGGER update_mailings_updated_at
    BEFORE UPDATE ON public.mailings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamps on mailing_assets
CREATE TRIGGER update_mailing_assets_updated_at
    BEFORE UPDATE ON public.mailing_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Note: These require Supabase's auth.uid() function. For plain PostgreSQL,
-- you'll need to implement your own authentication mechanism.
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
ALTER TABLE public.mailing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailing_assets ENABLE ROW LEVEL SECURITY;

-- Companies policies
CREATE POLICY "Admins can manage companies" ON public.companies
    FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their linked company" ON public.companies
    FOR SELECT USING (has_role(auth.uid(), 'admin') OR is_linked_to_company(id));

-- Members policies
CREATE POLICY "Admins can view all members" ON public.members
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can only view their own record" ON public.members
    FOR SELECT USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can insert members" ON public.members
    FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR (auth_user_id = auth.uid()));

CREATE POLICY "Members can update their own record" ON public.members
    FOR UPDATE USING ((auth_user_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete members" ON public.members
    FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Tags policies
CREATE POLICY "Authenticated users can view tags" ON public.tags
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags" ON public.tags
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Member tags policies
CREATE POLICY "Members can view their own tags" ON public.member_tags
    FOR SELECT USING (member_id = get_my_member_id());

CREATE POLICY "Admins can manage member_tags" ON public.member_tags
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Events policies
CREATE POLICY "Anyone can view published events" ON public.events
    FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage all events" ON public.events
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Event registrations policies
CREATE POLICY "Members can view their own registrations" ON public.event_registrations
    FOR SELECT USING (member_id = get_my_member_id());

CREATE POLICY "Members can register themselves" ON public.event_registrations
    FOR INSERT WITH CHECK (member_id = get_my_member_id());

CREATE POLICY "Members can cancel their own registration" ON public.event_registrations
    FOR UPDATE USING (member_id = get_my_member_id());

CREATE POLICY "Admins can manage all registrations" ON public.event_registrations
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Income policies
CREATE POLICY "Members can view their own income" ON public.income
    FOR SELECT USING (member_id = get_my_member_id());

CREATE POLICY "Admins can manage income" ON public.income
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Expenses policies
CREATE POLICY "Members can view their own expenses" ON public.expenses
    FOR SELECT USING (member_id = get_my_member_id());

CREATE POLICY "Admins can manage expenses" ON public.expenses
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Mailing templates policies
CREATE POLICY "Admins can manage mailing templates" ON public.mailing_templates
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Mailings policies
CREATE POLICY "Admins can manage mailings" ON public.mailings
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Mailing assets policies
CREATE POLICY "Admins can manage mailing assets" ON public.mailing_assets
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =============================================================================
-- 7. INDEXES (for performance)
-- =============================================================================

CREATE INDEX idx_members_email ON public.members(email);
CREATE INDEX idx_members_auth_user_id ON public.members(auth_user_id);
CREATE INDEX idx_members_company_id ON public.members(company_id);
CREATE INDEX idx_members_is_active ON public.members(is_active);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_member_tags_member_id ON public.member_tags(member_id);
CREATE INDEX idx_member_tags_tag_id ON public.member_tags(tag_id);
CREATE INDEX idx_events_event_date ON public.events(event_date);
CREATE INDEX idx_events_is_published ON public.events(is_published);
CREATE INDEX idx_event_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX idx_event_registrations_member_id ON public.event_registrations(member_id);
CREATE INDEX idx_income_date ON public.income(date);
CREATE INDEX idx_income_member_id ON public.income(member_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_expenses_member_id ON public.expenses(member_id);
CREATE INDEX idx_mailings_status ON public.mailings(status);

-- =============================================================================
-- NOTES FOR SELF-HOSTING
-- =============================================================================
-- 
-- 1. AUTHENTICATION:
--    The RLS policies use auth.uid() which is a Supabase-specific function.
--    For plain PostgreSQL, you'll need to:
--    - Implement your own authentication system
--    - Replace auth.uid() with your own session user function
--    - Or disable RLS and handle authorization in your application layer
--
-- 2. STORAGE:
--    This schema doesn't include storage bucket configuration.
--    The app uses these storage buckets:
--    - profile-photos (private, uses signed URLs)
--    - mailing-assets (public)
--    - receipts (private)
--    You'll need to set up your own file storage solution.
--
-- 3. EDGE FUNCTIONS:
--    The app uses these edge functions that you'll need to reimplement:
--    - create-admin-account
--    - reset-admin-password
--    - send-mailing
--    - unsubscribe
--
-- 4. ENVIRONMENT VARIABLES NEEDED:
--    - Database connection string
--    - SMTP settings for email
--    - Storage configuration
--
-- =============================================================================
