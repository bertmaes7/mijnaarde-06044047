-- SmartChef (an unrelated app) shared this Supabase project during early
-- development. SmartChef now has its own dedicated database, so these
-- tables are no longer needed here and were an unintended shared trust
-- boundary between the vzw's member/financial data and an unrelated app.
drop view if exists public.smartchef_ai_status cascade;
drop table if exists public.smartchef_ai_usage cascade;
drop table if exists public.smartchef_tier_limits cascade;
drop table if exists public.smartchef_user_tiers cascade;
