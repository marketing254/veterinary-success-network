-- VSN waitlist phase · 0002: expert applications

create table if not exists public.expert_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  company text,
  website text not null,
  topics text not null,
  years_experience text not null,
  existing_content text,
  booking_link text,
  notes text,
  status text not null default 'new' check (status in ('new','in_review','approved','declined')),
  reviewed_by text,
  reviewed_at timestamptz,
  decision_note text,
  ip_hash text,
  user_agent text,
  utm jsonb not null default '{}'::jsonb
);

create index if not exists expert_applications_status_idx
  on public.expert_applications (status, created_at desc);
create index if not exists expert_applications_email_idx
  on public.expert_applications (lower(email));
