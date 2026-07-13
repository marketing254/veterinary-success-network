-- VSN waitlist phase · 0004: free-kit lead magnet signups

create table if not exists public.free_kit_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  practice_name text,
  status text not null default 'subscribed' check (status in ('subscribed','sent','unsubscribed')),
  ip_hash text,
  user_agent text,
  utm jsonb not null default '{}'::jsonb
);

create unique index if not exists free_kit_signups_email_key
  on public.free_kit_signups (lower(email));
