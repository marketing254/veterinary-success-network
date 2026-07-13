-- VSN waitlist phase · 0003: partner (vendor) applications

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_name text not null,
  website text not null,
  category text not null,
  contact_name text not null,
  email text not null,
  phone text,
  member_offer text not null,
  lead_response_time text,
  notes text,
  status text not null default 'new' check (status in ('new','in_review','approved','declined')),
  reviewed_by text,
  reviewed_at timestamptz,
  decision_note text,
  ip_hash text,
  user_agent text,
  utm jsonb not null default '{}'::jsonb
);

create index if not exists partner_applications_status_idx
  on public.partner_applications (status, created_at desc);
create index if not exists partner_applications_email_idx
  on public.partner_applications (lower(email));
