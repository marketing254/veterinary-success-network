-- VSN · 0009: switch admin sign-in to Supabase Auth OTP (ASN model).
-- An admin is TWO records matched by email: a Supabase auth user (Authentication → Users)
-- and an active admin_users row. Run this, then create the auth users in the dashboard
-- (or via the admin API) for every admin_users email.

-- 1. admin_users: link column + activity + wider role set
alter table public.admin_users
  add column if not exists auth_user_id uuid,
  add column if not exists last_active_at timestamptz;

alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('owner','admin','reviewer','support'));

-- 2. auth_audit: ASN-shaped columns (existing email/event/ip_hash/user_agent stay)
alter table public.auth_audit
  add column if not exists user_id uuid,
  add column if not exists user_type text,
  add column if not exists metadata jsonb;

-- 3. Signed-in admins may read their OWN row (the only RLS policy on intake data).
--    Everything else stays service-role only.
grant select on public.admin_users to authenticated;
drop policy if exists admin_users_read_own on public.admin_users;
create policy admin_users_read_own on public.admin_users
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- 4. admin_otps is no longer used (codes are issued/verified by Supabase Auth now).
--    Kept for history; drop later if you want:
-- drop table if exists public.admin_otps;
