# VSN Landing — Next.js app (waitlist / countdown phase)

Next.js conversion of the static site in `../site/` for **veterinarysuccessnetwork.com**.
Same "Calm Premium" design (the entire `vsn.css` design system carried over verbatim),
plus what the static site couldn't do:

- **Launch countdown** on the home page + join page (this is the initial pre-launch phase).
- **All four forms wired to Supabase** (member reservation, expert application, partner
  application, free-kit lead), with rate limiting, honeypot, salted IP hashing, team
  notification emails and applicant confirmation emails.
- **Admin portal** at `/admin` (email OTP sign-in) to review everything.

Built on the DMN reference patterns (fonts via `next/font` CSS variables, migration
layout, admin review flows) — see `../SKILL.md`.

## Setup

1. **Create a Supabase project**, then run everything in `supabase/migrations/` in the
   SQL editor **in numeric order** (0001 → 0006). 0005 seeds the admin team — edit the
   emails first. 0006 has a commented verify query; run it and expect every column `true`.
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `IP_HASH_SALT` — 32+ random chars, **never rotate after launch**
   - `ADMIN_SESSION_SECRET` — 32+ random chars (signs admin session cookies)
   - Email: pick ONE transport — generic SMTP (`SMTP_HOST/PORT/USER/PASS`), Gmail/Workspace
     (`GMAIL_USER` + `GMAIL_APP_PASSWORD`), or Resend (`RESEND_API_KEY`) — all sending as
     `marketing@ekwa.co` (`WAITLIST_EMAIL_FROM`, `WAITLIST_SUPPORT_EMAIL`,
     `TEAM_DISTRIBUTION_LIST`). Leave all unset in dev and every email (including admin
     OTP codes) is logged to the server console instead. Supabase Auth email templates +
     SMTP for the next phase: see `supabase/email-templates/README.md` (OTP codes, not
     magic links)
   - `NEXT_PUBLIC_LAUNCH_AT` — ISO datetime the countdown counts to ("founding doors open")
3. `npm install`, then `npm run dev` (or `npm run build && npm start`).

## Pages

| Route | Purpose |
|---|---|
| `/` | Home: hero **with countdown**, hotline demo, credibility, features, portal preview, ROI calculator, pricing (monthly/annual toggle), fit check, free kit, three-ways-in, FAQ, CTA |
| `/experts`, `/partners` | Audience pages (unchanged copy from the static site) |
| `/join` | Member reservation form (`?plan=founding|early|standard&billing=mo|yr` preselects) |
| `/apply-expert`, `/apply-partner` | Applications with recap asides |
| `/free-kit` | Lead-magnet signup |
| `/admin/*` | Admin console (OTP-gated) |

## Forms → database → admin

| Form | API route | Table | Admin page | Statuses |
|---|---|---|---|---|
| Member reservation | `POST /api/member/reserve` | `member_reservations` (ordered `position` = founding spot #) | `/admin/reservations` | reserved → invited → converted / cancelled |
| Expert application | `POST /api/expert/signup` | `expert_applications` | `/admin/experts` | new → in_review → approved / declined |
| Partner application | `POST /api/partner/signup` | `partner_applications` | `/admin/partners` | new → in_review → approved / declined |
| Free kit | `POST /api/free-kit/signup` | `free_kit_signups` | `/admin/free-kit` | subscribed → sent / unsubscribed |

Shared behavior on every route: honeypot (`bt`) silently accepted, per-IP+email rate limit,
salted IP hash (raw IP never stored), duplicate email → friendly success (reservation/kit),
`notifySignup()` to `TEAM_DISTRIBUTION_LIST` + confirmation email to the applicant, safe
generic errors to the browser (details go to server logs). If the server is unreachable the
form shows a mailto fallback carrying every field value, so no lead is lost.

## Admin portal

- **Sign in**: `/admin/login` → email → 6-digit OTP (10-min expiry, 5 attempts, hashed at
  rest). Only active `admin_users` rows can sign in; responses never reveal whether an
  email is an admin. Session = HMAC-signed httpOnly cookie (7 days); middleware protects
  `/admin/*` and `/api/admin/*`.
- **Dashboard**: counts + latest activity across all four lists.
- **Records pages**: search, status filter, CSV export, expandable detail row, status
  actions with an optional note. Every action writes to `review_actions`; every sign-in
  event to `auth_audit` — both visible on `/admin/audit-log`.
- **Admin team**: add admins (owner role required to add owners), deactivate/reactivate.
  Deactivation locks them out on their next request.

## Countdown / phase switch

The countdown reads `NEXT_PUBLIC_LAUNCH_AT`. Before that moment: tile countdown
("until founding doors open"). After it: a "Founding doors are open" pill — no deploy
needed at the moment of launch. When the next phase starts (payments), swap the join
flow for Stripe checkout and mark reservations converted from the admin portal.

## Copy rules (carried over from the static site — non-negotiable)

Courses split 70/30 (expert keeps 70%) · no category-exclusivity wording · no em-dashes
in live copy · no emojis (inline SVG only) · no invented testimonials/member counts ·
hotline is "written reply in 2–3 business days", never "live"/"24/7".

## Still pending (unchanged from the static site)

- Confirm `hello@veterinarysuccessnetwork.com` exists (team notifications + fallbacks).
- Stripe checkout for the post-waitlist phase.
- Real agreement PDFs for the footer links (adapt DMN Agreement v4).
- Toll-free hotline number, real logo, real reviews.
