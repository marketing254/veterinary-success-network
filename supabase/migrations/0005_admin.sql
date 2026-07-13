-- VSN waitlist phase · 0005: admin portal (team, OTP login, audit trail)

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null unique,
  full_name text not null,
  role text not null default 'admin' check (role in ('owner','admin')),
  active boolean not null default true
);

-- One-time sign-in codes. code_hash = sha256(salt:code); never store the raw code.
create table if not exists public.admin_otps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  consumed_at timestamptz
);

create index if not exists admin_otps_email_idx on public.admin_otps (email, created_at desc);

-- Review/action audit trail (who did what to which record)
create table if not exists public.review_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_email text not null,
  entity_type text not null,   -- member_reservation | expert_application | partner_application | free_kit_signup | admin_user
  entity_id text not null,
  action text not null,        -- start_review | approve | decline | invite | convert | cancel | restore | add | deactivate | reactivate
  note text
);

create index if not exists review_actions_entity_idx on public.review_actions (entity_type, entity_id);

-- Auth events (login attempts, OTP verifications)
create table if not exists public.auth_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  event text not null,         -- otp_requested | otp_verified | otp_failed | logout
  ip_hash text,
  user_agent text
);

-- ---- Seed the admin team (edit per vertical) ----
insert into public.admin_users (email, full_name, role, active)
values ('lester@ekwa.com', 'Lester', 'owner', true),
       ('rushdha@ekwa.com', 'Rushdha', 'admin', true)
on conflict (email) do nothing;
