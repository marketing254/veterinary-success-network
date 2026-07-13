-- VSN waitlist phase · 0001: member reservations (founding-spot waitlist)
-- Run in the Supabase SQL editor, in numeric order.

create extension if not exists pgcrypto;

create table if not exists public.member_reservations (
  id uuid primary key default gen_random_uuid(),
  -- monotonic reservation order: founding spots + the $49 lock are assigned by this
  position bigint generated always as identity,
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  phone text,
  practice_name text not null,
  role text not null,
  location text,
  first_question text,
  plan text not null default 'founding' check (plan in ('founding','early','standard')),
  billing text not null default 'monthly' check (billing in ('monthly','annual')),
  status text not null default 'reserved' check (status in ('reserved','invited','converted','cancelled')),
  reviewed_by text,
  reviewed_at timestamptz,
  ip_hash text,
  user_agent text,
  utm jsonb not null default '{}'::jsonb
);

create unique index if not exists member_reservations_email_key
  on public.member_reservations (lower(email));

create index if not exists member_reservations_status_idx
  on public.member_reservations (status, position);
