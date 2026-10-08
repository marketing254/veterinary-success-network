-- VSN · 0017: expert portal content (kits, network feed, member inquiries)
-- Run AFTER 0016_counts_and_launch.sql.
--   expert_resources        kits an expert submits for the team to brand and publish
--   expert_posts            network feed posts (+ reactions, comments)
--   expert_inquiries        member questions routed to an expert (hotline referrals,
--                           profile contact); replies threaded underneath
--   experts.avatar_url      small portal avatar (headshot_url stays the public photo)
--   bucket expert-resources private; downloads via signed URLs from the API
-- All browser access goes through /api/expert/* (service role after a guard);
-- tables are RLS-on with no browser grants.

alter table public.experts add column if not exists avatar_url text;

create table if not exists public.expert_resources (
  id                   uuid primary key default gen_random_uuid(),
  expert_id            uuid not null references public.experts(id) on delete cascade,
  title                text not null check (char_length(title) between 1 and 200),
  description          text check (char_length(description) <= 4000),
  kind                 text not null default 'other'
                         check (kind in ('recording','sop','template','slide_deck','pdf','checklist','worksheet','link','other')),
  storage_bucket       text not null default 'expert-resources',
  storage_path         text,
  external_url         text check (external_url is null or char_length(external_url) <= 500),
  file_name            text,
  file_size            bigint check (file_size is null or file_size >= 0),
  mime_type            text,
  branded_storage_path text,
  published_url        text,
  status               text not null default 'pending_review'
                         check (status in ('draft','pending_review','needs_changes','approved','rejected','archived')),
  submitted_at         timestamptz default now(),
  reviewed_at          timestamptz,
  reviewed_by          text,
  review_note          text check (review_note is null or char_length(review_note) <= 2000),
  published_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint expert_resources_source check (storage_path is not null or external_url is not null)
);
create index if not exists expert_resources_expert_idx on public.expert_resources (expert_id, created_at desc);
create index if not exists expert_resources_status_idx on public.expert_resources (status, submitted_at desc);
drop trigger if exists expert_resources_updated_at on public.expert_resources;
create trigger expert_resources_updated_at before update on public.expert_resources
  for each row execute function public.set_updated_at();
alter table public.expert_resources enable row level security;
revoke all on public.expert_resources from anon, authenticated;

insert into storage.buckets (id, name, public)
values ('expert-resources', 'expert-resources', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
create table if not exists public.expert_posts (
  id              uuid primary key default gen_random_uuid(),
  expert_id       uuid references public.experts(id) on delete cascade,
  partner_id      uuid references public.partners(id) on delete cascade,
  admin_email     text,
  author_kind     text not null default 'expert' check (author_kind in ('expert','partner','admin')),
  content         text not null check (char_length(content) between 1 and 4000),
  image_url       text check (image_url is null or char_length(image_url) <= 500),
  link_url        text check (link_url is null or char_length(link_url) <= 500),
  status          text not null default 'published' check (status in ('draft','published','hidden','deleted')),
  published_at    timestamptz default now(),
  hidden_at       timestamptz,
  hidden_by       text,
  hidden_reason   text,
  reaction_count  integer not null default 0 check (reaction_count >= 0),
  comment_count   integer not null default 0 check (comment_count >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists expert_posts_feed_idx on public.expert_posts (status, published_at desc) where status = 'published';
create index if not exists expert_posts_expert_idx on public.expert_posts (expert_id, created_at desc);
create index if not exists expert_posts_partner_idx on public.expert_posts (partner_id, created_at desc);
drop trigger if exists expert_posts_updated_at on public.expert_posts;
create trigger expert_posts_updated_at before update on public.expert_posts
  for each row execute function public.set_updated_at();
alter table public.expert_posts enable row level security;
revoke all on public.expert_posts from anon, authenticated;

create table if not exists public.post_reactions (
  id                  uuid primary key default gen_random_uuid(),
  post_id             uuid not null references public.expert_posts(id) on delete cascade,
  author_auth_user_id uuid not null,
  author_kind         text not null check (author_kind in ('expert','partner','member','admin')),
  author_display_name text not null,
  kind                text not null default 'heart' check (kind in ('heart','insightful','helpful','agree')),
  created_at          timestamptz not null default now()
);
create unique index if not exists post_reactions_uniq on public.post_reactions (post_id, author_auth_user_id);
alter table public.post_reactions enable row level security;
revoke all on public.post_reactions from anon, authenticated;

create table if not exists public.post_comments (
  id                  uuid primary key default gen_random_uuid(),
  post_id             uuid not null references public.expert_posts(id) on delete cascade,
  author_auth_user_id uuid not null,
  author_kind         text not null check (author_kind in ('expert','partner','member','admin')),
  author_display_name text not null,
  author_subtitle     text,
  content             text not null check (char_length(content) between 1 and 2000),
  hidden_at           timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at asc);
alter table public.post_comments enable row level security;
revoke all on public.post_comments from anon, authenticated;

create or replace function public.bump_post_counts() returns trigger language plpgsql as $$
begin
  if tg_table_name = 'post_reactions' then
    if tg_op = 'INSERT' then update public.expert_posts set reaction_count = reaction_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then update public.expert_posts set reaction_count = greatest(reaction_count - 1, 0) where id = old.post_id; end if;
  else
    if tg_op = 'INSERT' then update public.expert_posts set comment_count = comment_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then update public.expert_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id; end if;
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_post_reactions_count on public.post_reactions;
create trigger trg_post_reactions_count after insert or delete on public.post_reactions
  for each row execute function public.bump_post_counts();
drop trigger if exists trg_post_comments_count on public.post_comments;
create trigger trg_post_comments_count after insert or delete on public.post_comments
  for each row execute function public.bump_post_counts();

-- ---------------------------------------------------------------------
create table if not exists public.expert_inquiries (
  id              uuid primary key default gen_random_uuid(),
  expert_id       uuid not null references public.experts(id) on delete cascade,
  member_id       uuid references public.members(id) on delete set null,
  from_name       text not null,
  from_email      citext not null,
  practice_name   text,
  subject         text check (char_length(subject) <= 200),
  body            text not null check (char_length(body) between 1 and 4000),
  source          text not null default 'profile' check (source in ('profile','hotline','admin','resource')),
  status          text not null default 'open' check (status in ('open','answered','closed')),
  reply_count     integer not null default 0,
  created_by      text,            -- admin email when logged from the console
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists expert_inquiries_expert_idx on public.expert_inquiries (expert_id, created_at desc);
create index if not exists expert_inquiries_status_idx on public.expert_inquiries (status, created_at desc);
drop trigger if exists expert_inquiries_updated_at on public.expert_inquiries;
create trigger expert_inquiries_updated_at before update on public.expert_inquiries
  for each row execute function public.set_updated_at();
alter table public.expert_inquiries enable row level security;
revoke all on public.expert_inquiries from anon, authenticated;

create table if not exists public.expert_inquiry_replies (
  id                  uuid primary key default gen_random_uuid(),
  inquiry_id          uuid not null references public.expert_inquiries(id) on delete cascade,
  author_kind         text not null check (author_kind in ('expert','member','admin')),
  author_display_name text not null,
  body                text not null check (char_length(body) between 1 and 4000),
  created_at          timestamptz not null default now()
);
create index if not exists expert_inquiry_replies_idx on public.expert_inquiry_replies (inquiry_id, created_at asc);
alter table public.expert_inquiry_replies enable row level security;
revoke all on public.expert_inquiry_replies from anon, authenticated;

create or replace function public.bump_inquiry_reply_count() returns trigger language plpgsql as $$
begin
  update public.expert_inquiries
     set reply_count = reply_count + 1,
         status = case when new.author_kind = 'expert' and status = 'open' then 'answered' else status end
   where id = new.inquiry_id;
  return new;
end;
$$;
drop trigger if exists trg_inquiry_reply_count on public.expert_inquiry_replies;
create trigger trg_inquiry_reply_count after insert on public.expert_inquiry_replies
  for each row execute function public.bump_inquiry_reply_count();

notify pgrst, 'reload schema';
