-- VSN · 0019: member billing columns (Stripe, Phase 5)
-- Run AFTER 0018_partner_portal.sql.
-- members gains the Stripe shadow columns; member_reservations records the
-- Checkout session so the webhook can promote a reservation into a member.
-- Members still cannot sign in; the member portal is a later phase.

alter table public.members
  add column if not exists auth_user_id            uuid references auth.users(id) on delete set null,
  add column if not exists stripe_customer_id      text,
  add column if not exists stripe_subscription_id  text,
  add column if not exists stripe_price_id         text,
  add column if not exists subscription_status     text,
  add column if not exists subscription_interval   text,
  add column if not exists current_period_end      timestamptz,
  add column if not exists cancel_at_period_end    boolean default false,
  add column if not exists canceled_at             timestamptz,
  add column if not exists card_brand              text,
  add column if not exists card_last4              text,
  add column if not exists first_paid_at           timestamptz,
  add column if not exists founding_member_locked  boolean not null default false;

create unique index if not exists members_stripe_customer_uidx on public.members (stripe_customer_id) where stripe_customer_id is not null;

alter table public.member_reservations
  add column if not exists checkout_session_id text,
  add column if not exists checkout_started_at timestamptz;

create or replace function public.guard_member_founding_lock()
returns trigger language plpgsql as $$
begin
  if OLD.founding_member_locked = true and NEW.founding_member_locked = false then
    raise exception 'founding_member_locked cannot be un-set (member %)', OLD.id;
  end if;
  return NEW;
end;
$$;
drop trigger if exists trg_member_founding_lock on public.members;
create trigger trg_member_founding_lock before update on public.members
  for each row execute function public.guard_member_founding_lock();

notify pgrst, 'reload schema';
