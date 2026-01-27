-- Create mailing_assets table for logo, organization details and text blocks
CREATE TABLE public.mailing_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('logo', 'text', 'organization')),
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mailing_templates table for email templates
CREATE TABLE public.mailing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mailings table for scheduled mailings
CREATE TABLE public.mailings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  template_id UUID REFERENCES public.mailing_templates(id) ON DELETE SET NULL,
  selection_type TEXT NOT NULL CHECK (selection_type IN ('all', 'manual')),
  selected_member_ids UUID[] DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.mailing_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailings ENABLE ROW LEVEL SECURITY;

-- RLS policies for mailing_assets (admin only)
CREATE POLICY "Admins can manage mailing assets"
  ON public.mailing_assets
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow public read on mailing_assets"
  ON public.mailing_assets
  FOR SELECT
  USING (true);

-- RLS policies for mailing_templates (admin only)
CREATE POLICY "Admins can manage mailing templates"
  ON public.mailing_templates
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow public read on mailing_templates"
  ON public.mailing_templates
  FOR SELECT
  USING (true);

-- RLS policies for mailings (admin only)
CREATE POLICY "Admins can manage mailings"
  ON public.mailings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow public read on mailings"
  ON public.mailings
  FOR SELECT
  USING (true);

-- Add updated_at triggers
CREATE TRIGGER update_mailing_assets_updated_at
  BEFORE UPDATE ON public.mailing_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mailing_templates_updated_at
  BEFORE UPDATE ON public.mailing_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mailings_updated_at
  BEFORE UPDATE ON public.mailings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default organization assets
INSERT INTO public.mailing_assets (key, label, type, value) VALUES
  ('org_name', 'Organisatie naam', 'organization', 'Mijn Aarde vzw'),
  ('org_address', 'Adres', 'organization', ''),
  ('org_email', 'E-mail', 'organization', ''),
  ('org_phone', 'Telefoon', 'organization', ''),
  ('org_website', 'Website', 'organization', ''),
  ('logo_url', 'Logo URL', 'logo', '');