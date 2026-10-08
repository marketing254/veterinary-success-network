-- VSN · 0018: partner portal content (catalog, offers, redemptions, inquiries, analytics)
-- Run AFTER 0017_expert_portal.sql.
--   partner_catalog_items / partner_catalog_media   services and products a partner lists
--   partner_offers                                   member-only offers (promo code, validity), admin reviewed
--   partner_redemptions                              a member used an offer (logged by admin or member portal later)
--   partner_inquiries / partner_inquiry_replies      member questions routed to a partner
--   partner_events                                   lightweight analytics (profile_view, offer_view, booking_click, inquiry)
--   bucket partner-media (public)                    catalog and offer images
-- All browser access goes through /api/partner/* (service role after a guard).

create table if not exists public.partner_catalog_items (
  id                  uuid primary key default gen_random_uuid(),
  partner_id          uuid not null references public.partners(id) on delete cascade,
  type                text not null default 'service' check (type in ('service','product','course')),
  name                text not null check (char_length(name) between 2 and 200),
  tagline             text check (tagline is null or char_length(tagline) <= 240),
  description         text not null check (char_length(description) between 10 and 4000),
  category            text,
  price_label         text check (price_label is null or char_length(price_label) <= 60),
  highlights          text[] not null default '{}',
  link_url            text check (link_url is null or char_length(link_url) <= 500),
  review_status       text not null default 'pending_review'
                        check (review_status in ('draft','pending_review','approved','rejected','needs_changes','archived')),
  review_note         text,
  reviewed_at         timestamptz,
  reviewed_by         text,
  submitted_for_review_at timestamptz default now(),
  approved_at         timestamptz,
  offer_count         integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists partner_catalog_partner_idx on public.partner_catalog_items (partner_id, created_at desc);
create index if not exists partner_catalog_status_idx on public.partner_catalog_items (review_status);
drop trigger if exists partner_catalog_updated_at on public.partner_catalog_items;
create trigger partner_catalog_updated_at before update on public.partner_catalog_items
  for each row execute function public.set_updated_at();
alter table public.partner_catalog_items enable row level security;
revoke all on public.partner_catalog_items from anon, authenticated;

create table if not exists public.partner_catalog_media (
  id              uuid primary key default gen_random_uuid(),
  catalog_item_id uuid not null references public.partner_catalog_items(id) on delete cascade,
  kind            text not null default 'image' check (kind in ('image','video')),
  url             text not null,
  storage_path    text,
  caption         text check (caption is null or char_length(caption) <= 240),
  position        integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists partner_catalog_media_idx on public.partner_catalog_media (catalog_item_id, position);
alter table public.partner_catalog_media enable row level security;
revoke all on public.partner_catalog_media from anon, authenticated;

create table if not exists public.partner_offers (
  id                          uuid primary key default gen_random_uuid(),
  partner_id                  uuid not null references public.partners(id) on delete cascade,
  catalog_item_id             uuid references public.partner_catalog_items(id) on delete set null,
  headline                    text not null check (char_length(headline) between 5 and 160),
  discount_value              text not null check (char_length(discount_value) <= 80),
  promo_code                  text check (promo_code is null or char_length(promo_code) <= 40),
  description                 text not null check (char_length(description) between 10 and 1000),
  terms                       text check (terms is null or char_length(terms) <= 4000),
  redeem_url                  text check (redeem_url is null or char_length(redeem_url) <= 500),
  valid_from                  date not null default current_date,
  valid_to                    date,
  redemption_limit_per_member text not null default 'unlimited',
  image_url                   text,
  review_status               text not null default 'pending_review'
                                check (review_status in ('draft','pending_review','approved','rejected','needs_changes','archived')),
  review_note                 text,
  reviewed_at                 timestamptz,
  reviewed_by                 text,
  approved_at                 timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint partner_offers_valid_dates check (valid_to is null or valid_to >= valid_from)
);
create index if not exists partner_offers_partner_idx on public.partner_offers (partner_id, created_at desc);
create index if not exists partner_offers_status_idx on public.partner_offers (review_status);
drop trigger if exists partner_offers_updated_at on public.partner_offers;
create trigger partner_offers_updated_at before update on public.partner_offers
  for each row execute function public.set_updated_at();
alter table public.partner_offers enable row level security;
revoke all on public.partner_offers from anon, authenticated;

create or replace function public.bump_partner_offer_count() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.catalog_item_id is not null then
    update public.partner_catalog_items set offer_count = offer_count + 1 where id = new.catalog_item_id;
  elsif tg_op = 'DELETE' and old.catalog_item_id is not null then
    update public.partner_catalog_items set offer_count = greatest(offer_count - 1, 0) where id = old.catalog_item_id;
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_partner_offer_count on public.partner_offers;
create trigger trg_partner_offer_count after insert or delete on public.partner_offers
  for each row execute function public.bump_partner_offer_count();

create table if not exists public.partner_redemptions (
  id              uuid primary key default gen_random_uuid(),
  offer_id        uuid not null references public.partner_offers(id) on delete restrict,
  partner_id      uuid not null references public.partners(id) on delete restrict,
  member_id       uuid references public.members(id) on delete set null,
  member_display  text,
  member_location text,
  amount_saved    numeric(10,2) check (amount_saved is null or amount_saved >= 0),
  status          text not null default 'confirmed' check (status in ('pending','confirmed','disputed','voided')),
  redeemed_on     date not null default current_date,
  notes           text,
  created_by      text,
  created_at      timestamptz not null default now()
);
create index if not exists partner_redemptions_partner_idx on public.partner_redemptions (partner_id, redeemed_on desc);
create index if not exists partner_redemptions_offer_idx on public.partner_redemptions (offer_id);
alter table public.partner_redemptions enable row level security;
revoke all on public.partner_redemptions from anon, authenticated;

create table if not exists public.partner_inquiries (
  id              uuid primary key default gen_random_uuid(),
  partner_id      uuid not null references public.partners(id) on delete cascade,
  member_id       uuid references public.members(id) on delete set null,
  offer_id        uuid references public.partner_offers(id) on delete set null,
  from_name       text not null,
  from_email      citext not null,
  practice_name   text,
  subject         text check (subject is null or char_length(subject) <= 200),
  body            text not null check (char_length(body) between 1 and 4000),
  source          text not null default 'profile' check (source in ('profile','offer','hotline','admin')),
  status          text not null default 'open' check (status in ('open','answered','closed')),
  reply_count     integer not null default 0,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists partner_inquiries_partner_idx on public.partner_inquiries (partner_id, updated_at desc);
drop trigger if exists partner_inquiries_updated_at on public.partner_inquiries;
create trigger partner_inquiries_updated_at before update on public.partner_inquiries
  for each row execute function public.set_updated_at();
alter table public.partner_inquiries enable row level security;
revoke all on public.partner_inquiries from anon, authenticated;

create table if not exists public.partner_inquiry_replies (
  id                  uuid primary key default gen_random_uuid(),
  inquiry_id          uuid not null references public.partner_inquiries(id) on delete cascade,
  author_kind         text not null check (author_kind in ('partner','member','admin')),
  author_display_name text not null,
  body                text not null check (char_length(body) between 1 and 4000),
  created_at          timestamptz not null default now()
);
create index if not exists partner_inquiry_replies_idx on public.partner_inquiry_replies (inquiry_id, created_at asc);
alter table public.partner_inquiry_replies enable row level security;
revoke all on public.partner_inquiry_replies from anon, authenticated;

create or replace function public.bump_partner_inquiry_reply_count() returns trigger language plpgsql as $$
begin
  update public.partner_inquiries
     set reply_count = reply_count + 1,
         status = case when new.author_kind = 'partner' and status = 'open' then 'answered' else status end
   where id = new.inquiry_id;
  return new;
end;
$$;
drop trigger if exists trg_partner_inquiry_reply_count on public.partner_inquiry_replies;
create trigger trg_partner_inquiry_reply_count after insert on public.partner_inquiry_replies
  for each row execute function public.bump_partner_inquiry_reply_count();

-- Lightweight analytics. Written by the public profile page and the member portal later.
create table if not exists public.partner_events (
  id          bigserial primary key,
  partner_id  uuid not null references public.partners(id) on delete cascade,
  kind        text not null check (kind in ('profile_view','offer_view','catalog_view','booking_click','website_click','inquiry','redemption')),
  ref_id      uuid,
  visitor     text,            -- hashed ip + ua, for rough uniques
  created_at  timestamptz not null default now()
);
create index if not exists partner_events_idx on public.partner_events (partner_id, created_at desc);
alter table public.partner_events enable row level security;
revoke all on public.partner_events from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('partner-media', 'partner-media', true)
on conflict (id) do nothing;
drop policy if exists "vsn_public_read_partner_media" on storage.objects;
create policy "vsn_public_read_partner_media" on storage.objects
  for select to public using (bucket_id = 'partner-media');

notify pgrst, 'reload schema';
