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
   SQL editor **in numeric order** (0001 → 0008). 0005 seeds the admin team — edit the
   emails first. 0006 has a commented verify query; 0007 adds the click-wrap agreement
   columns; 0008 adds `members` (activation) and refreshes the counts view.
   **Run migrations BEFORE testing forms** — a missing column = a 500 on submit.
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `IP_HASH_SALT` — 32+ random chars, **never rotate after launch**
   - `ADMIN_SESSION_SECRET` — 32+ random chars (signs admin session cookies)
   - Email: Rackspace SMTP (`secure.emailsrvr.com`, port 465). The app signs in as the
     support@ mailbox on the site domain (same-domain send-as lets one mailbox send From
     every purpose address; the password lives only in env, never in the repo).
     Per-purpose senders: `members@` (reservation confirms + welcomes), `support@`
     (admin codes + expert emails + team notifications), `hello@` (partners/free-kit).
     Team notifications go direct to the three Ekwa inboxes (`TEAM_DISTRIBUTION_LIST`).
     `join-vsn.com` (hello@/News@) is marketing-only — the app never sends from it.
     Leave SMTP unset in dev and every email (including admin OTP codes) is logged to
     the server console instead. Supabase Auth templates + SMTP for the next phase:
     see `supabase/email-templates/README.md` (OTP codes, not magic links)
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

**Agreements (click-wrap, HTML source of truth):** the five documents live as designed
HTML pages under `/legal/*` (`member-agreement`, `expert-agreement`, `partner-agreement`,
`cancellation-policy`, `privacy-policy`) via a shared `LegalShell` (noindex). The
reservation, expert and partner forms require an "I agree" checkbox linking to the
matching page; acceptance is enforced server-side and stored as `agreement_accepted` +
`agreement_accepted_at`, visible in the admin detail panel. Footer links point at the
same pages. Per `../Agreements/README.md`, the HTML is the source and the PDFs in
`../Agreements/` are rendered FROM it (headless Chrome `--print-to-pdf`) — edit the
page, then re-render the PDF.

## Admin portal

- **Sign in (Supabase Auth OTP, ASN model)**: `/admin/login` → email → 6-digit code.
  An admin is TWO records matched by email: a Supabase auth user + an active `admin_users`
  row. The allow-list is checked FIRST (non-admins never receive an email). Primary
  delivery = Supabase's dashboard SMTP with the `{{ .Token }}` Magic Link template; on any
  send failure the app mints the code (`generateLink` → `email_otp`) and emails it via
  Rackspace — lockout-proof. Sessions are Supabase cookies; middleware + `requireAdmin()`
  guards gate `/admin/*` and `/api/admin/*` by email (never by `auth_user_id`, which is
  null before first sign-in). Full dashboard setup: `supabase/email-templates/README.md`.
- **Dashboard**: KPI cards (reservations, members, experts, partners, free-kit) + latest
  activity. Nav badges show pending counts, refreshed every 90s.
- **Reservations**: search/filter/CSV + **"Activate as founding member"** (row quick-button
  and detail panel) — creates the `members` row, flips the reservation to `converted`,
  sends the welcome email, audits, and notifies the team.
- **Members**: activated founding members; manual activation form; pause/reactivate; CSV.
- **Experts / Partners**: approve via row quick-buttons or the detail panel. The branded
  approval email + team notification fire **only on the first transition to approved**.
- **Records pages**: search, status filter, CSV export, expandable detail row (including
  agreement acceptance), status actions with an optional note. Every action writes to
  `review_actions`; every sign-in event to `auth_audit` — merged timeline on
  `/admin/audit-log`.
- **Admin team**: owner-only writes; can't deactivate yourself or the last active owner.
  Deactivation locks the admin out on their next request.

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
