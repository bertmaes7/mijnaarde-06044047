import { supabase } from "@/integrations/supabase/client";

export { supabase };

export type Company = {
  id: string;
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export type Member = {
  id: string;
  company_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  personal_url: string | null;
  profile_photo_url: string | null;
  notes: string | null;
  is_active: boolean;
  facebook_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  member_since: string | null;
  receives_mail: boolean;
  is_board_member: boolean;
  is_active_member: boolean;
  is_ambassador: boolean;
  is_donor: boolean;
  is_council_member: boolean;
  created_at: string;
  updated_at: string;
  company?: Company | null;
};
