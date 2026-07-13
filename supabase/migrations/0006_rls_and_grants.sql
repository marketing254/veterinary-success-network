-- VSN waitlist phase · 0006: RLS + grants (NEVER skip)
-- All access goes through the Next.js server with the service-role key, which
-- bypasses RLS. Anon/authenticated get nothing.

alter table public.member_reservations enable row level security;
alter table public.expert_applications enable row level security;
alter table public.partner_applications enable row level security;
alter table public.free_kit_signups    enable row level security;
alter table public.admin_users         enable row level security;
alter table public.admin_otps          enable row level security;
alter table public.review_actions      enable row level security;
alter table public.auth_audit          enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Dashboard counts view (service role only)
create or replace view public.signup_counts as
select
  (select count(*) from public.member_reservations)                                  as reservations_total,
  (select count(*) from public.member_reservations where status = 'reserved')       as reservations_open,
  (select count(*) from public.expert_applications)                                  as experts_total,
  (select count(*) from public.expert_applications where status = 'new')            as experts_new,
  (select count(*) from public.partner_applications)                                 as partners_total,
  (select count(*) from public.partner_applications where status = 'new')           as partners_new,
  (select count(*) from public.free_kit_signups)                                     as free_kit_total;

revoke all on public.signup_counts from anon, authenticated;

-- ---- Verify (expect every column = true) ----
-- select
--   to_regclass('public.member_reservations') is not null as reservations,
--   to_regclass('public.expert_applications') is not null as expert_apps,
--   to_regclass('public.partner_applications') is not null as partner_apps,
--   to_regclass('public.free_kit_signups')    is not null as free_kit,
--   to_regclass('public.admin_users')         is not null as admins,
--   to_regclass('public.admin_otps')          is not null as otps,
--   to_regclass('public.review_actions')      is not null as review_actions,
--   to_regclass('public.auth_audit')          is not null as auth_audit;
