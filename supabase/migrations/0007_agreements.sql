-- VSN waitlist phase · 0007: click-wrap agreement acceptance columns
-- Nobody signs; acceptance = the "I agree" checkbox at sign-up. This records
-- who / which form / when. Safe to run on a fresh or existing database.

alter table public.member_reservations
  add column if not exists agreement_accepted boolean not null default false,
  add column if not exists agreement_accepted_at timestamptz;

alter table public.expert_applications
  add column if not exists agreement_accepted boolean not null default false,
  add column if not exists agreement_accepted_at timestamptz;

alter table public.partner_applications
  add column if not exists agreement_accepted boolean not null default false,
  add column if not exists agreement_accepted_at timestamptz;
