-- VSN · 0014: founding invites (private admin path) and standard invite links
-- Run AFTER 0013_storage_buckets.sql.
-- founding_invites: admin drafts an invite (expert / partner / both), sends a private
--   /founding/<code> link with a personalised agreement; acceptance creates the
--   experts and/or partners rows. Lifecycle draft -> sent -> viewed -> accepted | revoked.
-- invite_links: personalised standard application links (/invite/<code>), no agreement.
-- Both are service-role only. Used by the admin console (Phase 4) and billing (Phase 5).

create table if not exists public.founding_invites (
  id                      uuid primary key default gen_random_uuid(),
  code                    text not null unique,
  role                    text not null check (role in ('expert','partner','both')),

  full_name               text not null,
  email                   text not null,
  phone                   text,
  company_name            text,
  companies               jsonb,                 -- [{name, website, category, description, member_offer}] for multi-company partners
  category                text,
  website                 text,
  description             text,
  member_offer            text,
  booking_link            text,
  signer_name             text,
  signer_title            text,
  notes                   text,                  -- internal, never shown

  -- partner plan after the 6 free months: ladder (default) | flat
  pricing_plan            text not null default 'ladder' check (pricing_plan in ('ladder','flat')),
  -- founding experts may be free for life (private); the admin ticks it on the invite
  expert_free_for_life    boolean not null default false,

  agreement_version       text not null default 'v1',
  agreement_pdf_path      text,

  status                  text not null default 'draft'
                            check (status in ('draft','sent','viewed','accepted','revoked')),
  sent_at                 timestamptz,
  viewed_at               timestamptz,
  accepted_at             timestamptz,
  accepted_name           text,
  accepted_ip_hash        text,
  accepted_user_agent     text,
  expires_at              timestamptz not null default (now() + interval '30 days'),

  expert_id               uuid references public.experts(id) on delete set null,
  partner_id              uuid references public.partners(id) on delete set null,
  stripe_customer_id      text,
  free_period_ends_at     timestamptz,

  created_by              text,                  -- admin email
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists founding_invites_email_idx on public.founding_invites (lower(email));
create index if not exists founding_invites_status_idx on public.founding_invites (status, created_at desc);

drop trigger if exists founding_invites_updated_at on public.founding_invites;
create trigger founding_invites_updated_at before update on public.founding_invites
  for each row execute function public.set_updated_at();

alter table public.founding_invites enable row level security;
revoke all on public.founding_invites from anon, authenticated;

create table if not exists public.invite_links (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  kind         text not null check (kind in ('expert','partner')),
  full_name    text not null check (length(full_name) between 2 and 160),
  email        text,
  company_name text,
  notes        text,
  status       text not null default 'active' check (status in ('active','viewed','accepted','revoked')),
  viewed_at    timestamptz,
  accepted_at  timestamptz,
  expert_id    uuid references public.experts(id) on delete set null,
  partner_id   uuid references public.partners(id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '60 days'),
  created_by   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists invite_links_status_idx on public.invite_links (status, created_at desc);
drop trigger if exists invite_links_updated_at on public.invite_links;
create trigger invite_links_updated_at before update on public.invite_links
  for each row execute function public.set_updated_at();
alter table public.invite_links enable row level security;
revoke all on public.invite_links from anon, authenticated;

notify pgrst, 'reload schema';
