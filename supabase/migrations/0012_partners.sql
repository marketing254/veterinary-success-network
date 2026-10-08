-- VSN · 0012: partners (the live partner portal account; ASN calls this table vendors)
-- Run AFTER 0011_experts.sql.
-- An approved partner_applications row is promoted into ONE partners row.
-- A partner may own several company listings: the paying row carries the card,
-- the extra rows point at it via billing_parent_id and never bill on their own.
-- Code: src/lib/providers/provision.ts, src/lib/auth/guards.ts, /api/partner/*.

create table if not exists public.partners (
  id                       uuid primary key default gen_random_uuid(),
  application_id           uuid references public.partner_applications(id) on delete set null,
  auth_user_id             uuid references auth.users(id) on delete set null,
  billing_parent_id        uuid references public.partners(id) on delete set null,

  -- company
  company_name             text not null check (char_length(company_name) between 2 and 200),
  display_name             text check (char_length(display_name) <= 120),
  category                 text,
  website                  text check (char_length(website) <= 300),
  description              text check (char_length(description) <= 2000),
  member_offer             text check (char_length(member_offer) <= 2000),
  logo_url                 text check (char_length(logo_url) <= 500),
  booking_link             text check (char_length(booking_link) <= 300),
  lead_response_time       text check (char_length(lead_response_time) <= 80),

  -- contact
  contact_name             text not null,
  contact_email            citext not null unique,
  contact_phone            text check (char_length(contact_phone) <= 40),
  billing_email            citext,
  signer_name              text,
  signer_title             text,

  -- lifecycle
  status                   text not null default 'pending'
                             check (status in ('pending','approved','rejected','suspended','churned')),
  verified                 boolean not null default false,   -- Verified Partner badge
  approved_at              timestamptz,
  approved_by              text,
  suspended_at             timestamptz,
  notes                    text,
  source                   text default 'website' check (source in ('website','founding_invite','admin')),

  -- plan after the 6 free months: ladder ($39 x 12 then $149, default) or flat ($39, no increase)
  billing_plan             text not null default 'ladder' check (billing_plan in ('ladder','flat')),

  -- agreement e-sign
  agreement_signed_at      timestamptz,
  agreement_version        text,
  agreement_name           text,
  agreement_ip_hash        text,
  agreement_user_agent     text,
  agreement_pdf_path       text,

  -- billing shadow (Phase 5)
  stripe_customer_id       text,
  stripe_subscription_id   text,
  stripe_schedule_id       text,
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
  founding_partner_locked  boolean not null default false,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists partners_status_idx on public.partners (status);
create index if not exists partners_category_idx on public.partners (category);
create index if not exists partners_auth_user_idx on public.partners (auth_user_id);
create index if not exists partners_billing_parent_idx on public.partners (billing_parent_id);
create unique index if not exists partners_stripe_customer_uidx on public.partners (stripe_customer_id) where stripe_customer_id is not null;

drop trigger if exists partners_updated_at on public.partners;
create trigger partners_updated_at before update on public.partners
  for each row execute function public.set_updated_at();

alter table public.partner_applications
  add column if not exists partner_id uuid references public.partners(id) on delete set null;

create or replace function public.guard_partner_founding_lock()
returns trigger language plpgsql as $$
begin
  if OLD.founding_partner_locked = true and NEW.founding_partner_locked = false then
    raise exception 'founding_partner_locked cannot be un-set (partner %)', OLD.id;
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_partner_founding_lock on public.partners;
create trigger trg_partner_founding_lock before update on public.partners
  for each row execute function public.guard_partner_founding_lock();

create or replace function public.protect_partner_privileged_cols()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_client_role() then return new; end if;
  if tg_op = 'INSERT' then
    raise exception 'partners rows are created by the server only';
  end if;
  new.status := old.status;
  new.verified := old.verified;
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  new.contact_email := old.contact_email;
  new.auth_user_id := old.auth_user_id;
  new.application_id := old.application_id;
  new.billing_parent_id := old.billing_parent_id;
  new.source := old.source;
  new.billing_plan := old.billing_plan;
  new.founding_partner_locked := old.founding_partner_locked;
  new.stripe_customer_id := old.stripe_customer_id;
  new.stripe_subscription_id := old.stripe_subscription_id;
  new.stripe_schedule_id := old.stripe_schedule_id;
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
drop trigger if exists partners_protect_privileged on public.partners;
create trigger partners_protect_privileged before insert or update on public.partners
  for each row execute function public.protect_partner_privileged_cols();

alter table public.partners enable row level security;
revoke all on public.partners from anon, authenticated;
grant select on public.partners to authenticated;
grant update (display_name, category, website, description, member_offer, logo_url, booking_link,
              lead_response_time, contact_name, contact_phone, billing_email, signer_name, signer_title)
  on public.partners to authenticated;

drop policy if exists partners_self_select on public.partners;
create policy partners_self_select on public.partners for select to authenticated
  using (auth_user_id = auth.uid() or public.is_admin()
         or billing_parent_id in (select id from public.partners p where p.auth_user_id = auth.uid()));

drop policy if exists partners_self_update on public.partners;
create policy partners_self_update on public.partners for update to authenticated
  using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());

notify pgrst, 'reload schema';
