# Supabase email setup (OTP codes, not magic links)

## What sends what

- **This app sends its own email** (signup confirmations, team notifications, and the
  **admin portal's OTP codes**) through the transport configured in env
  (SMTP / Gmail / Resend as `marketing@ekwa.co`). Supabase is not involved in those.
- **Supabase Auth emails** only fire if/when Supabase Auth users sign in by email —
  that starts in the next phase (member/expert/partner portal accounts). Configure it
  now so it's ready and consistent.

## 1. SMTP — send as marketing@ekwa.co

Supabase Dashboard → **Project Settings → Authentication → SMTP Settings** → enable
Custom SMTP and enter the same mailbox the app uses:

- Sender email: `marketing@ekwa.co`
- Sender name: `Veterinary Success Network`
- Host / Port / Username / Password: same values as `SMTP_HOST/PORT/USER/PASS` in env

Without custom SMTP, Supabase's built-in sender is heavily rate-limited (a few emails
per hour) and lands in spam — always set this before real traffic.

## 2. Make sign-in emails OTP codes instead of magic links

Supabase sends a code instead of a link purely based on the template contents:

1. Dashboard → **Authentication → Email Templates → Magic Link**
2. Subject: `Your Veterinary Success Network sign-in code`
3. Replace the body with `magic-link-otp.html` (this folder). The key line is
   `{{ .Token }}` — using the token (and not `{{ .ConfirmationURL }}`) is what makes
   it an OTP email.
4. Repeat for the **Email OTP** template if your dashboard shows one separately.
5. Dashboard → **Authentication → Providers → Email**: set OTP expiry (3600s is fine)
   and keep "Confirm email" per your flow.

The client code for that phase must then call
`supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })` and verify with
`supabase.auth.verifyOtp({ email, token, type: "email" })` — no magic-link redirect handling.
