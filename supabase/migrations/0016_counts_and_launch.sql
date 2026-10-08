-- VSN · 0016: dashboard counts with portal numbers, launch email stamp
-- Run AFTER 0015_referrals_notifications_stripe.sql.
-- member_reservations.launch_email_sent_at: stamped by /api/admin/reservations/launch-email
--   (Phase 4) when the admin sends "The doors are open" to selected rows.

alter table public.member_reservations
  add column if not exists launch_email_sent_at timestamptz;

create or replace view public.signup_counts as
select
  (select count(*) from public.member_reservations)                                           as reservations_total,
  (select count(*) from public.member_reservations where status = 'reserved')                as reservations_open,
  (select count(*) from public.expert_applications)                                           as experts_total,
  (select count(*) from public.expert_applications where status in ('new','in_review'))      as experts_new,
  (select count(*) from public.partner_applications)                                          as partners_total,
  (select count(*) from public.partner_applications where status in ('new','in_review'))     as partners_new,
  (select count(*) from public.free_kit_signups)                                              as free_kit_total,
  (select count(*) from public.members)                                                       as members_total,
  (select count(*) from public.members where status = 'active')                               as members_active,
  (select count(*) from public.experts where status in ('invited','active'))                  as experts_live,
  (select count(*) from public.experts where billing_exempt)                                  as experts_founding,
  (select count(*) from public.partners where status = 'approved')                            as partners_live,
  (select count(*) from public.founding_invites where status in ('draft','sent','viewed'))    as founding_invites_open;

revoke all on public.signup_counts from anon, authenticated;

-- ---- Verify (expect every column = true) ----
-- select
--   to_regclass('public.experts')          is not null as experts,
--   to_regclass('public.partners')         is not null as partners,
--   to_regclass('public.founding_invites') is not null as founding_invites,
--   to_regclass('public.invite_links')     is not null as invite_links,
--   to_regclass('public.referral_codes')   is not null as referral_codes,
--   to_regclass('public.notifications')    is not null as notifications,
--   to_regclass('public.stripe_events')    is not null as stripe_events,
--   to_regclass('public.rate_limits')      is not null as rate_limits,
--   to_regclass('public.email_events')     is not null as email_events;
