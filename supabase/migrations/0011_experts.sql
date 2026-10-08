-- VSN · 0011: experts (the live expert portal account)
-- Run AFTER 0010_portal_foundations.sql.
-- An approved expert_applications row is promoted into ONE experts row that owns
-- sign-in, profile, agreement e-sign, billing shadow and the founding exemption.
-- The application row stays forever as the audit trail (expert_applications.expert_id links them).
-- Code: src/lib/providers/provision.ts, src/lib/auth/guards.ts, /api/expert/*.

create table if not exists public.experts (
  id                       uuid primary key default gen_random_uuid(),
  application_id           uuid references public.expert_applications(id) on delete set null,
  auth_user_id             uuid references auth.users(id) on delete set null,

  -- identity
  email                    citext not null unique,
  full_name                text not null check (char_length(full_name) between 2 and 160),
  display_name             text check (char_length(display_name) <= 120),
  phone                    text check (char_length(phone) <= 40),
  company_name             text check (char_length(company_name) <= 200),

  -- public profile
  specialty                text check (char_length(specialty) <= 240),
  topics                   text check (char_length(topics) <= 2000),
  bio                      text check (char_length(bio) <= 4000),
  website                  text check (char_length(website) <= 300),
  booking_link             text check (char_length(booking_link) <= 300),
  headshot_url             text check (char_length(headshot_url) <= 500),
  years_experience         text check (char_length(years_experience) <= 40),

  -- lifecycle: invited (approved, first sign-in pending) -> active -> suspended | archived
  status                   text not null default 'invited'
                             check (status in ('invited','active','suspended','archived')),
  invited_at               timestamptz not null default now(),
  activated_at             timestamptz,
  suspended_at             timestamptz,
  archived_at              timestamptz,
  invited_by               text,            -- admin email
  notes                    text,
  source                   text default 'website' check (source in ('website','founding_invite','admin')),

  -- agreement e-sign (click-wrap in the portal; PDF stored in the agreements bucket)
  agreement_signed_at      timestamptz,
  agreement_version        text,
  agreement_name           text,
  agreement_ip_hash        text,
  agreement_user_agent     text,
  agreement_pdf_path       text,

  -- billing shadow (Stripe is the source of truth; filled in Phase 5)
  stripe_customer_id       text,
  stripe_subscription_id   text,
  stripe_price_id          text,
  subscription_status      text,
  subscription_interval    text,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean default false,
  canceled_at              timestamptz,
  card_brand               text,
  card_last4               text,
  free_period_ends_at      timestamptz,
  free_period_reminder_sent_at timestamptz,

  -- founding 20: free for life. Private. One-way, capped at 20 by trigger.
  billing_exempt           boolean not null default false,
  billing_exempt_reason    text,
  billing_exempt_granted_at timestamptz,
  founding_expert_locked   boolean not null default false,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create unique index if not exists experts_auth_user_uniq on public.experts (auth_user_id) where auth_user_id is not null;
create unique index if not exists experts_stripe_customer_uidx on public.experts (stripe_customer_id) where stripe_customer_id is not null;
create index if not exists experts_status_idx on public.experts (status);
create index if not exists experts_created_idx on public.experts (created_at desc);
create index if not exists experts_billing_exempt_idx on public.experts (billing_exempt) where billing_exempt = true;

drop trigger if exists experts_updated_at on public.experts;
create trigger experts_updated_at before update on public.experts
  for each row execute function public.set_updated_at();

-- link column on the application
alter table public.expert_applications
  add column if not exists expert_id uuid references public.experts(id) on delete set null,
  add column if not exists phone text;

-- ---------------------------------------------------------------------
-- Guards: lifetime grants are one-way; the founding cohort is capped at 20.
-- ---------------------------------------------------------------------
create or replace function public.guard_expert_billing_exempt()
returns trigger language plpgsql as $$
begin
  if OLD.billing_exempt = true and NEW.billing_exempt = false then
    raise exception 'billing_exempt cannot be un-set (expert %). It is a lifetime grant.', OLD.id;
  end if;
  if OLD.founding_expert_locked = true and NEW.founding_expert_locked = false then
    raise exception 'founding_expert_locked cannot be un-set (expert %).', OLD.id;
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_expert_billing_exempt_guard on public.experts;
create trigger trg_expert_billing_exempt_guard before update on public.experts
  for each row execute function public.guard_expert_billing_exempt();

create or replace function public.guard_expert_billing_exempt_cap()
returns trigger language plpgsql as $$
declare
  exempt_count integer;
  cap constant integer := 20;
begin
  if NEW.billing_exempt = true
     and (TG_OP = 'INSERT' or coalesce(OLD.billing_exempt, false) = false) then
    select count(*) into exempt_count from public.experts where billing_exempt = true;
    if exempt_count >= cap then
      raise exception 'Founding-expert cap reached: % of % lifetime-free slots are used.', exempt_count, cap;
    end if;
    NEW.billing_exempt_granted_at := coalesce(NEW.billing_exempt_granted_at, now());
    NEW.founding_expert_locked := true;
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_expert_billing_exempt_cap on public.experts;
create trigger trg_expert_billing_exempt_cap before insert or update on public.experts
  for each row execute function public.guard_expert_billing_exempt_cap();

create or replace view public.founding_expert_slots as
  select 20 as cap,
         count(*) filter (where billing_exempt) as used,
         greatest(0, 20 - count(*) filter (where billing_exempt)) as remaining
  from public.experts;
revoke all on public.founding_expert_slots from anon, authenticated;

-- ---------------------------------------------------------------------
-- Privileged columns are pinned against browser writes. API routes use the
-- service role after a guard, so they pass through.
-- ---------------------------------------------------------------------
create or replace function public.protect_expert_privileged_cols()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_client_role() then return new; end if;
  if tg_op = 'INSERT' then
    raise exception 'experts rows are created by the server only';
  end if;
  new.status := old.status;
  new.email := old.email;
  new.auth_user_id := old.auth_user_id;
  new.application_id := old.application_id;
  new.source := old.source;
  new.billing_exempt := old.billing_exempt;
  new.billing_exempt_reason := old.billing_exempt_reason;
  new.billing_exempt_granted_at := old.billing_exempt_granted_at;
  new.founding_expert_locked := old.founding_expert_locked;
  new.stripe_customer_id := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.stripe_price_id := old.stripe_price_id;
  new.subscription_status := old.subscription_status;
  new.subscription_interval := old.subscription_interval;
  new.current_period_end := old.current_period_end;
  new.cancel_at_period_end := old.cancel_at_period_end;
  new.canceled_at := old.canceled_at;
  new.card_brand := old.card_brand;
  new.card_last4 := old.card_last4;
  new.free_period_ends_at := old.free_period_ends_at;
  new.free_period_reminder_sent_at := old.free_period_reminder_sent_at;
  new.agreement_signed_at := old.agreement_signed_at;
  new.agreement_version := old.agreement_version;
  new.agreement_name := old.agreement_name;
  new.agreement_ip_hash := old.agreement_ip_hash;
  new.agreement_user_agent := old.agreement_user_agent;
  new.agreement_pdf_path := old.agreement_pdf_path;
  return new;
end;
$$;
drop trigger if exists experts_protect_privileged on public.experts;
create trigger experts_protect_privileged before insert or update on public.experts
  for each row execute function public.protect_expert_privileged_cols();

-- ---------------------------------------------------------------------
-- RLS: an expert may read and update profile columns of their OWN row.
-- Everything else goes through the service role.
-- ---------------------------------------------------------------------
alter table public.experts enable row level security;
revoke all on public.experts from anon, authenticated;
grant select on public.experts to authenticated;
grant update (display_name, phone, company_name, specialty, topics, bio, website, booking_link, headshot_url, years_experience)
  on public.experts to authenticated;

drop policy if exists experts_self_select on public.experts;
create policy experts_self_select on public.experts for select to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());

drop policy if exists experts_self_update on public.experts;
create policy experts_self_update on public.experts for update to authenticated
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

notify pgrst, 'reload schema';
