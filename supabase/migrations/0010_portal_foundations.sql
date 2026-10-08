-- VSN · 0010: portal foundations (helpers, durable rate limits, email events)
-- Run AFTER 0009_supabase_auth_admin.sql. Paste into Supabase SQL editor and run.
-- Idempotent. Nothing here changes the existing waitlist tables.
-- Code that depends on it: src/lib/rateLimit.ts (check_rate_limit RPC),
-- every later migration (is_client_role, set_updated_at).

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------
-- updated_at helper (shared by every portal table)
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- is_client_role(): true when the write comes from the browser (anon or
-- authenticated), false for the service role and SQL editor sessions.
-- Used by the privileged-column pinning triggers in 0011 and 0012.
-- NOT security definer on purpose.
-- ---------------------------------------------------------------------
create or replace function public.is_client_role()
returns boolean
language plpgsql
stable
as $$
declare
  jwt_role text;
begin
  begin
    jwt_role := coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
    );
  exception when others then
    jwt_role := null;
  end;

  return current_user in ('anon', 'authenticated')
      or session_user in ('anon', 'authenticated')
      or coalesce(jwt_role, '') in ('anon', 'authenticated');
end;
$$;

-- ---------------------------------------------------------------------
-- is_admin(): the signed-in browser user is an active admin.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users a
     where a.active
       and (a.auth_user_id = auth.uid()
            or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- Durable rate limiter (fixed window) so limits hold across serverless
-- instances. Service role only; the app falls back to memory if missing.
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text primary key,
  count        integer not null default 0 check (count >= 0),
  window_start timestamptz not null default now()
);
create index if not exists rate_limits_window_start_idx on public.rate_limits (window_start);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
grant all on public.rate_limits to service_role;

create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now   timestamptz := clock_timestamp();
  v_count integer;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 512 then return false; end if;
  if p_limit is null or p_limit < 1 then return false; end if;
  if p_window_seconds is null or p_window_seconds < 1 then return false; end if;

  delete from public.rate_limits where window_start < v_now - interval '1 day';

  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update
    set count = case
          when public.rate_limits.window_start < v_now - make_interval(secs => p_window_seconds) then 1
          else public.rate_limits.count + 1
        end,
        window_start = case
          when public.rate_limits.window_start < v_now - make_interval(secs => p_window_seconds) then v_now
          else public.rate_limits.window_start
        end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;
revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.check_rate_limit(text, integer, integer) from anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------
-- Email journal (what we sent, to whom, which template). Service only.
-- ---------------------------------------------------------------------
create table if not exists public.email_events (
  id                  uuid primary key default gen_random_uuid(),
  template            text not null,
  recipient           citext not null,
  subject             text,
  provider            text default 'smtp',
  provider_message_id text,
  status              text default 'sent',
  sandboxed           boolean not null default false,
  metadata            jsonb,
  created_at          timestamptz not null default now()
);
create index if not exists email_events_recipient_idx on public.email_events (recipient);
create index if not exists email_events_template_idx  on public.email_events (template);
create index if not exists email_events_created_idx   on public.email_events (created_at desc);
alter table public.email_events enable row level security;
revoke all on public.email_events from anon, authenticated;

-- auth_audit: widen user_type for the new roles (it is plain text already; add a check for clarity)
alter table public.auth_audit drop constraint if exists auth_audit_user_type_check;
alter table public.auth_audit
  add constraint auth_audit_user_type_check
  check (user_type is null or user_type in ('admin','expert','partner','member'));

notify pgrst, 'reload schema';
