-- Create tags table for storing unique tags
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for member-tag relationships
CREATE TABLE public.member_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(member_id, tag_id)
);

-- Enable RLS on tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Admins can manage tags
CREATE POLICY "Admins can manage tags"
ON public.tags
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view tags (for suggestions)
CREATE POLICY "Authenticated users can view tags"
ON public.tags
FOR SELECT
USING (true);

-- Enable RLS on member_tags
ALTER TABLE public.member_tags ENABLE ROW LEVEL SECURITY;

-- Admins can manage member_tags
CREATE POLICY "Admins can manage member_tags"
ON public.member_tags
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Members can view their own tags
CREATE POLICY "Members can view their own tags"
ON public.member_tags
FOR SELECT
USING (member_id = get_my_member_id());

-- Create indexes for performance
CREATE INDEX idx_member_tags_member_id ON public.member_tags(member_id);
CREATE INDEX idx_member_tags_tag_id ON public.member_tags(tag_id);
CREATE INDEX idx_tags_name ON public.tags(name);