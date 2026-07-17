# Admin sign-in (Supabase Auth OTP) — dashboard setup guide

The admin console signs in with 6-digit codes issued by **Supabase Auth** (ASN model):
an admin = a Supabase **auth user** + an active **`admin_users`** row, matched by email.
Primary delivery is Supabase's own SMTP; if that fails, the app mints the code itself
(`generateLink` → `email_otp`) and emails it through Rackspace — nobody gets locked out.

## One-time checklist (Supabase Dashboard)

Status for this project as of 2026-07-17: steps 4–5 are DONE (auth users created via API,
admin rows seeded). Steps 1–3 and 6 are dashboard-only — do them once.

1. **Run migration `0009_supabase_auth_admin.sql`** (SQL editor) — adds
   `auth_user_id`/`last_active_at` to `admin_users`, the audit columns, and the
   read-own-row RLS policy.

2. **Custom SMTP** — *Project Settings → Authentication → SMTP Settings* → enable it and
   fill in the same Rackspace values the app uses: host `secure.emailsrvr.com` on port
   `465`, sender name `Veterinary Success Network`. Both the sender address and the
   sign-in mailbox are the support@ address on the site domain. The mailbox password
   comes from the Rackspace handover; it is never written anywhere in this repo.
   Ignore the "personal email provider" warning (advisory only). The password field is
   **write-only** — it always displays a stale mask afterwards; judge the save ONLY by
   the green toast.

3. **Magic Link template** — *Authentication → Emails (Templates) → Magic Link*:
   - Subject: `Your Veterinary Success Network sign-in code: {{ .Token }}`
   - Body: paste `admin-otp-email.html` (this folder). The **`{{ .Token }}`** is what makes
     Supabase send a code instead of a link — if a magic LINK arrives, this template didn't
     save.

4. **Auth users** — *Authentication → Users*: every admin email needs an auth user
   (no password; codes only). ✅ Already created for lester@ekwa.com, rushdha@ekwa.com,
   fathimarushdhaakbar28@gmail.com. Adding an admin from `/admin/admins` now auto-creates
   the auth user too.

5. **`admin_users` rows** — the allow-list. ✅ Seeded (Lester owner; Rushdha ×2 admin).
   An email that's an auth user but NOT an active `admin_users` row is refused before any
   email is sent.

6. **Auth settings** — *Authentication → Providers → Email*: OTP expiry 600s is a good
   default. *Authentication → URL Configuration*: Site URL =
   `https://www.veterinarysuccessnetwork.com`.

## Env (local + Vercel)

`NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API → anon public) is now **required** for
admin sign-in, alongside the existing URL/service-role/SMTP vars. `ADMIN_SESSION_SECRET`
is no longer used (sessions are Supabase cookies).

## How the flow behaves (for debugging)

- Unknown/inactive email → "not on the admin allow-list", **no email sent**.
- Supabase send OK → response `sentVia: "supabase"`.
- Supabase send fails → app sends the code itself, response `sentVia: "fallback"`
  (reason in server logs).
- "A code was sent recently" → Supabase's ~60s resend throttle, not an error.
- 422 "no auth user yet" → create the user in Authentication → Users.
- Codes verify as type `email` first, then `magiclink` (covers both delivery paths).
- Every sign-in lands in `auth_audit`; the first sign-in links `admin_users.auth_user_id`.
- Deactivating an admin blocks them on their next request (middleware + guards re-check).
