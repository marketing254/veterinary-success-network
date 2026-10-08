-- VSN house profiles: Naren Arulrajah (expert, lifetime free) and Ekwa Marketing Inc. (partner, flat plan).
-- Run AFTER migrations 0010 to 0019. Re-runnable (upserts by email). Nothing is billed for either row.
-- Images are site-relative paths served from public/, so no storage upload is needed.
-- Create the two auth users first (Authentication -> Users -> Add user, auto-confirm) if they should sign in:
--   naren@ekwa.com and helpdesk@ekwa.com.
-- Source: 11-naren-ekwa-house-profiles.md (DMN values, VSN wording applied).

-- 1. Naren, expert ----------------------------------------------------------
insert into public.experts (email, full_name, display_name, company_name, specialty, topics, bio, website, booking_link, headshot_url,
                            status, activated_at, source, invited_by, billing_exempt, billing_exempt_reason,
                            agreement_signed_at, agreement_version, agreement_name)
values (
  'naren@ekwa.com', 'Naren Arulrajah', 'Naren Arulrajah', 'Ekwa Marketing', 'Marketing & Growth',
  'Practice marketing, SEO, AI for practices, founder journey, brand building',
  'Naren founded Ekwa Marketing to give healthcare practices a marketing partner that actually moves the needle. Under his leadership, Ekwa has grown into a team that helps practices across veterinary, dental, medical aesthetics, and more get found, get liked, and get chosen.

Ekwa is the best known of what Naren has built, but it is not the whole story. He is also a speaker, an author, and a host or regular voice on a range of healthcare podcasts, where he teaches the same system in public. What ties it all together is a simple belief: good practices deserve to grow, and growth should not be a mystery.

He is just as comfortable talking about the founder journey and giving back as he is about SEO and AI, because to Naren, building a company and building a brand are the same work: earn trust, deliver value, and keep showing up.',
  'https://www.narenarulrajah.com/', 'https://www.narenarulrajah.com/book', '/team/naren-arulrajah.jpg',
  'active', now(), 'admin', 'house', true, 'House expert (founder), free for life',
  now(), 'v1', 'Naren Arulrajah'
)
on conflict (email) do update set
  full_name = excluded.full_name, display_name = excluded.display_name, company_name = excluded.company_name,
  specialty = excluded.specialty, topics = excluded.topics, bio = excluded.bio, website = excluded.website,
  booking_link = excluded.booking_link, headshot_url = excluded.headshot_url, status = 'active',
  agreement_signed_at = coalesce(public.experts.agreement_signed_at, excluded.agreement_signed_at),
  agreement_version = coalesce(public.experts.agreement_version, excluded.agreement_version),
  agreement_name = coalesce(public.experts.agreement_name, excluded.agreement_name);

-- 2. Ekwa, partner -----------------------------------------------------------
insert into public.partners (company_name, display_name, category, website, description, member_offer, logo_url, booking_link,
                             lead_response_time, contact_name, contact_email, contact_phone, status, verified, approved_at, approved_by,
                             source, billing_plan, stripe_customer_id, agreement_signed_at, agreement_version, agreement_name, signer_name, signer_title)
values (
  'Ekwa Marketing Inc.', 'Ekwa Marketing', 'Marketing & growth', 'https://www.ekwa.com/',
  'Ekwa Marketing helps healthcare practices attract more clients, grow their online presence, and build stronger, more profitable businesses through digital marketing.',
  '$250 off each of the first 2 months of your marketing bill, plus a complimentary Complete Marketing Audit (worth $900).',
  '/ekwa-logo.png', 'https://www.ekwa.com/marketing-strategy-meeting/', 'Within 1 business day',
  'Ekwa Helpdesk', 'helpdesk@ekwa.com', '855-971-1519', 'approved', true, now(), 'house',
  'admin', 'flat', 'house_ekwa', now(), 'v1', 'Naren Arulrajah', 'Naren Arulrajah', 'Founder & CEO'
)
on conflict (contact_email) do update set
  company_name = excluded.company_name, display_name = excluded.display_name, category = excluded.category,
  website = excluded.website, description = excluded.description, member_offer = excluded.member_offer,
  logo_url = excluded.logo_url, booking_link = excluded.booking_link, status = 'approved', verified = true;

-- 3. Referral codes (vanity links /narenarulrajah and /ekwamarketing) ---------
insert into public.referral_codes (expert_id, code, slug)
select id, 'NARE2CRK', 'narenarulrajah' from public.experts where email = 'naren@ekwa.com'
on conflict (code) do nothing;
insert into public.referral_codes (partner_id, code, slug)
select id, 'EKWA2VSN', 'ekwamarketing' from public.partners where contact_email = 'helpdesk@ekwa.com'
on conflict (code) do nothing;

-- 4. Ekwa catalog item + member offers (approved, live on /partners/<id>) ----
with p as (select id from public.partners where contact_email = 'helpdesk@ekwa.com')
insert into public.partner_catalog_items (id, partner_id, type, name, tagline, description, category, price_label, highlights, link_url, review_status, approved_at, reviewed_by)
select 'a1b2c3d4-0000-4000-8000-00000000e001', p.id, 'service', 'Digital Marketing Program', 'Get found, get liked, get chosen',
  'Ekwa''s full digital marketing program for veterinary practices: SEO, website, content, and client-acquisition systems that grow your online presence and your practice.',
  'Marketing & growth', 'Custom pricing',
  array['SEO and local search', 'Website design and content', 'Client acquisition systems', 'Monthly reporting'],
  'https://www.ekwa.com/', 'approved', now(), 'house'
from p
on conflict (id) do update set description = excluded.description, review_status = 'approved';

with p as (select id from public.partners where contact_email = 'helpdesk@ekwa.com')
insert into public.partner_offers (id, partner_id, catalog_item_id, headline, discount_value, description, terms, redeem_url, valid_from, valid_to, redemption_limit_per_member, review_status, approved_at, reviewed_by)
select 'a1b2c3d4-0000-4000-8000-00000000e002', p.id, 'a1b2c3d4-0000-4000-8000-00000000e001',
  '$250 off each of the first 2 months', '$250 off x 2 months',
  'Enjoy $250 off your marketing bill for each of your first 2 months of service with Ekwa.',
  'For Veterinary Success Network members. Applies to your marketing bill for the first 2 months of service. Cannot be combined with other promotions unless stated.',
  'https://www.ekwa.com/marketing-strategy-meeting/', '2026-09-01', '2030-12-31', 'once', 'approved', now(), 'house'
from p
on conflict (id) do update set headline = excluded.headline, discount_value = excluded.discount_value, description = excluded.description, terms = excluded.terms, review_status = 'approved';

with p as (select id from public.partners where contact_email = 'helpdesk@ekwa.com')
insert into public.partner_offers (id, partner_id, catalog_item_id, headline, discount_value, description, terms, redeem_url, valid_from, valid_to, redemption_limit_per_member, review_status, approved_at, reviewed_by)
select 'a1b2c3d4-0000-4000-8000-00000000e003', p.id, 'a1b2c3d4-0000-4000-8000-00000000e001',
  'Complimentary Complete Marketing Audit (worth $900)', 'Free, worth $900',
  'A Complete Marketing Audit worth $900, complimentary for Veterinary Success Network members. Book through the marketing strategy meeting link.',
  'For Veterinary Success Network members. One audit per practice.',
  'https://www.ekwa.com/marketing-strategy-meeting/', '2026-09-01', '2030-12-31', 'once', 'approved', now(), 'house'
from p
on conflict (id) do update set headline = excluded.headline, description = excluded.description, terms = excluded.terms, review_status = 'approved';

-- Verify
-- select email, status, billing_exempt from public.experts where email = 'naren@ekwa.com';
-- select company_name, status, verified, billing_plan from public.partners where contact_email = 'helpdesk@ekwa.com';
