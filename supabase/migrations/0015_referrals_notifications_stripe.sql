-- VSN · 0015: referral codes, in-app notifications, Stripe event journal
-- Run AFTER 0014_founding_invites.sql.
-- referral_codes: one code + vanity handle per expert or partner. /<handle> and
--   /invite/<code> set the vsn_ref cookie; member signup credits referral_signups.
--   $50 to the referrer after the referred member's first payment (converted_at).
-- notifications: bell items for expert / partner / admin audiences.
-- stripe_events: webhook idempotency. RLS on, NO policies (service only).

create table if not exists public.referral_codes (
  id           uuid primary key default gen_random_uuid(),
  expert_id    uuid references public.experts(id) on delete cascade,
  partner_id   uuid references public.partners(id) on delete cascade,
  code         text not null unique check (code ~ '^[A-Z0-9-]{4,16}$'),
  slug         text unique check (slug is null or slug ~ '^[a-z0-9-]{3,40}$'),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint referral_one_owner check (
    (expert_id is not null and partner_id is null) or (expert_id is null and partner_id is not null)
  )
);
create index if not exists referral_codes_expert_idx on public.referral_codes (expert_id);
create index if not exists referral_codes_partner_idx on public.referral_codes (partner_id);

create table if not exists public.referral_signups (
  id             uuid primary key default gen_random_uuid(),
  code_id        uuid not null references public.referral_codes(id) on delete cascade,
  member_id      uuid references public.members(id) on delete cascade,
  reservation_id uuid references public.member_reservations(id) on delete set null,
  email          citext,
  converted_at   timestamptz,          -- first paid invoice (Phase 5 webhook)
  payout_cents   integer not null default 5000,
  paid_out_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists referral_signups_code_idx on public.referral_signups (code_id, created_at desc);
create index if not exists referral_signups_member_idx on public.referral_signups (member_id);

alter table public.members add column if not exists referral_code_id uuid references public.referral_codes(id) on delete set null;
alter table public.member_reservations add column if not exists referral_code_id uuid references public.referral_codes(id) on delete set null;

alter table public.referral_codes enable row level security;
alter table public.referral_signups enable row level security;
revoke all on public.referral_codes from anon, authenticated;
revoke all on public.referral_signups from anon, authenticated;

-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  audience    text not null check (audience in ('expert','partner','admin')),
  expert_id   uuid references public.experts(id) on delete cascade,
  partner_id  uuid references public.partners(id) on delete cascade,
  admin_id    uuid references public.admin_users(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  link        text,
  metadata    jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  constraint notif_audience_check check (
    (audience = 'expert'  and expert_id is not null and partner_id is null)
    or (audience = 'partner' and partner_id is not null and expert_id is null)
    or (audience = 'admin'   and expert_id is null and partner_id is null)
  )
);
create index if not exists notifications_expert_idx on public.notifications (expert_id, created_at desc) where audience = 'expert';
create index if not exists notifications_partner_idx on public.notifications (partner_id, created_at desc) where audience = 'partner';
create index if not exists notifications_admin_idx on public.notifications (admin_id, created_at desc) where audience = 'admin';

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select, update (read_at) on public.notifications to authenticated;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated
  using (
    (audience = 'expert'  and expert_id  in (select id from public.experts  where auth_user_id = auth.uid()))
    or (audience = 'partner' and partner_id in (select id from public.partners where auth_user_id = auth.uid()))
    or (audience = 'admin' and public.is_admin())
  );
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
  using (
    (audience = 'expert'  and expert_id  in (select id from public.experts  where auth_user_id = auth.uid()))
    or (audience = 'partner' and partner_id in (select id from public.partners where auth_user_id = auth.uid()))
    or (audience = 'admin' and public.is_admin())
  );

-- ---------------------------------------------------------------------
create table if not exists public.stripe_events (
  id             text primary key,                 -- Stripe event id (evt_...)
  type           text not null,
  customer_kind  text check (customer_kind in ('member','expert','partner')),
  expert_id      uuid references public.experts(id) on delete set null,
  partner_id     uuid references public.partners(id) on delete set null,
  member_id      uuid references public.members(id) on delete set null,
  payload        jsonb,
  processed_at   timestamptz not null default now()
);
create index if not exists stripe_events_type_idx on public.stripe_events (type, processed_at desc);
alter table public.stripe_events enable row level security;
revoke all on public.stripe_events from anon, authenticated;

notify pgrst, 'reload schema';
