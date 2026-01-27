-- Add new member fields
ALTER TABLE public.members
ADD COLUMN member_since DATE DEFAULT NULL,
ADD COLUMN receives_mail BOOLEAN DEFAULT true,
ADD COLUMN is_board_member BOOLEAN DEFAULT false,
ADD COLUMN is_active_member BOOLEAN DEFAULT true,
ADD COLUMN is_ambassador BOOLEAN DEFAULT false,
ADD COLUMN is_donor BOOLEAN DEFAULT false,
ADD COLUMN is_council_member BOOLEAN DEFAULT false;