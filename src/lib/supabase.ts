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
  bank_account: string | null;
  enterprise_number: string | null;
  vat_number: string | null;
  is_supplier: boolean;
  created_at: string;
  updated_at: string;
};

export type Member = {
  id: string;
  company_id: string | null;
  auth_user_id: string | null;
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
  is_admin: boolean;
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
  bank_account: string | null;
  created_at: string;
  updated_at: string;
  company?: Company | null;
};

// Income type is defined after Expense type

export type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'invoice' | 'expense_claim' | 'other';
  member_id: string | null;
  company_id: string | null;
  receipt_url: string | null;
  notes: string | null;
  vat_rate: number;
  created_at: string;
  updated_at: string;
  member?: { id: string; first_name: string; last_name: string } | null;
  company?: { id: string; name: string } | null;
};

export type Income = {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'membership' | 'donation' | 'other';
  member_id: string | null;
  company_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  member?: { id: string; first_name: string; last_name: string } | null;
  company?: { id: string; name: string } | null;
};

export type AppRole = 'admin' | 'member';

export type UserRole = {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
};
