-- Create companies table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    country TEXT DEFAULT 'België',
    website TEXT,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create members table with link to companies
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    country TEXT DEFAULT 'België',
    personal_url TEXT,
    profile_photo_url TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Public read access policies (for now, as this is an internal admin tool)
CREATE POLICY "Allow public read access on companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Allow public insert on companies" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on companies" ON public.companies FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on companies" ON public.companies FOR DELETE USING (true);

CREATE POLICY "Allow public read access on members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow public insert on members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on members" ON public.members FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on members" ON public.members FOR DELETE USING (true);

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);

-- Storage policies for profile photos
CREATE POLICY "Public read access for profile photos" ON storage.objects FOR SELECT USING (bucket_id = 'profile-photos');
CREATE POLICY "Public upload for profile photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-photos');
CREATE POLICY "Public update for profile photos" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-photos');
CREATE POLICY "Public delete for profile photos" ON storage.objects FOR DELETE USING (bucket_id = 'profile-photos');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();