-- VSN · 0013: storage buckets for the portals
-- Run AFTER 0012_partners.sql.
--   agreements     private  signed and draft agreement PDFs (signed URLs only)
--   avatars        public   expert headshots
--   partner-logos  public   partner logos
-- Uploads go through /api/expert/profile/avatar and /api/partner/profile/logo
-- (service role, size and type checked server side). No browser-side policies.

insert into storage.buckets (id, name, public)
values ('agreements', 'agreements', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('partner-logos', 'partner-logos', true)
on conflict (id) do nothing;

-- Public read for the two public buckets (objects are served by URL on the site).
drop policy if exists "vsn_public_read_avatars" on storage.objects;
create policy "vsn_public_read_avatars" on storage.objects
  for select to public using (bucket_id = 'avatars');

drop policy if exists "vsn_public_read_partner_logos" on storage.objects;
create policy "vsn_public_read_partner_logos" on storage.objects
  for select to public using (bucket_id = 'partner-logos');
