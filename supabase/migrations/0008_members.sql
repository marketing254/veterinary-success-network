-- VSN waitlist phase · 0008: members (founding-member activation) + refreshed counts view
-- A member row is created when an admin activates a reservation (or adds one manually).

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  practice_name text,
  role text,
  location text,
  plan text not null default 'founding' check (plan in ('founding','early','standard')),
  billing text not null default 'monthly' check (billing in ('monthly','annual')),
  status text not null default 'active' check (status in ('active','paused')),
  reservation_id uuid references public.member_reservations (id),
  activated_by text,
  activated_at timestamptz not null default now(),
  notes text
);

create unique index if not exists members_email_key on public.members (lower(email));

alter table public.members enable row level security;
revoke all on public.members from anon, authenticated;

-- Refresh the dashboard counts view with members + pending numbers
create or replace view public.signup_counts as
select
  (select count(*) from public.member_reservations)                                  as reservations_total,
  (select count(*) from public.member_reservations where status = 'reserved')       as reservations_open,
  (select count(*) from public.expert_applications)                                  as experts_total,
  (select count(*) from public.expert_applications where status in ('new','in_review')) as experts_new,
  (select count(*) from public.partner_applications)                                 as partners_total,
  (select count(*) from public.partner_applications where status in ('new','in_review')) as partners_new,
  (select count(*) from public.free_kit_signups)                                     as free_kit_total,
  (select count(*) from public.members)                                              as members_total,
  (select count(*) from public.members where status = 'active')                      as members_active;

revoke all on public.signup_counts from anon, authenticated;
