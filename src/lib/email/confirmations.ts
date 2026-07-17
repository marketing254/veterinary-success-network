import { sendEmail, emailShell, purposeFrom } from "./mailer";
import { renderBranded } from "./branded";
import { escapeHtml } from "./teamNotify";

/**
 * Transactional email set, verbatim from the ASN drafts (vertical-email-drafts skill)
 * with the §9 swaps applied: VSN brand + vocabulary, VSN canon numbers
 * ($49 first 100 → $99 members 101 to 500 → $199 standard; expert/partner ramp
 * $0 → $49 → $199; courses 70/30; 30-day money-back guarantee).
 * Applicant emails are fail-soft; the admin code is not. No em dashes anywhere.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.veterinarysuccessnetwork.com";

const fmtDate = () =>
  new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const first = (name: string) => escapeHtml((name || "").trim().split(/\s+/)[0] || "there");

const P = (t: string) => `<p style="font-size:14px;line-height:1.6;color:#2c3a22;margin:0 0 12px;">${t}</p>`;

const SIGNOFF_WELCOME = [
  "Welcome aboard.",
  "The Veterinary Success Network Team",
  "Powered by Veterinary Business Institute",
];

/** §1 MEMBER · waitlist join. From members@. Branded journey. */
export async function sendReservationConfirmation(
  email: string,
  name: string,
  _plan: string,
  position?: number | null,
  referenceId?: string | null
) {
  const { html, text } = renderBranded({
    preview:
      "You're on the founding waitlist. $49/month founding rate, locked while active. Nothing to pay today.",
    eyebrow: "Founding Waitlist",
    headline: "You're on the list.",
    paragraphs: [
      `Hi ${first(name)},`,
      `Welcome to the Veterinary Success Network. Your spot on the founding waitlist is reserved, and there is <b>nothing to pay today</b>. As founding spots open we'll reach out personally, and you confirm before any charge.`,
    ],
    sections: [
      {
        title: "What you get as a founding member",
        bullets: [
          "<b>The Expert Hotline.</b> Call our toll-free line, leave a voicemail, and get a written action plan by text and email within 2 to 3 business days, routed to the right experts by fit.",
          "<b>A growing resource library.</b> Training videos, action guides, checklists and worksheets, with new expert kits added weekly.",
          "<b>Member-only partner deals.</b> Exclusive pricing from vetted vendors across supplies, equipment, software, financing and services.",
          "<b>Live AMAs and CE.</b> Monthly live sessions with the field's best experts, plus continuing-education opportunities.",
        ],
      },
      {
        title: "A few things to know",
        bullets: [
          "Your founding rate is <b>$49/month</b> (or $490/year, two months free), locked for as long as your membership stays active. After the first 100 members, pricing steps to $99/month, then $199/month standard.",
          "Every membership comes with a 30-day money-back guarantee, and you can cancel anytime.",
          "Spots are assigned in the order reservations arrive. We'll email you before the doors open with everything you need. No payment happens until you confirm.",
        ],
      },
    ],
    cta: { label: "Visit the network", href: SITE },
    closing: "Questions in the meantime? Reply to this email. We read and respond to every message.",
    signoffLines: SIGNOFF_WELCOME,
    footerNote: `This is an automated confirmation of your reservation on ${fmtDate()}. Please don't reply to report a problem with someone else's signup. If this wasn't you, just ignore it.`,
    reference: `Reference: ${position ? `founding spot #${position}` : ""}${position && referenceId ? " · " : ""}${referenceId || ""}`,
  });
  try {
    await sendEmail({
      from: purposeFrom("members"),
      to: email,
      subject: "Your founding spot is reserved | Veterinary Success Network",
      html,
      text,
    });
  } catch (err) {
    console.error("reservation confirmation failed:", err);
  }
}

/** §2 MEMBER · activation welcome. From members@. Branded journey. Launch-safe copy. */
export async function sendMemberWelcome(email: string, name: string, position?: number | null) {
  const { html, text } = renderBranded({
    preview:
      "Your founding membership is confirmed at the locked $49/month rate. Here's what happens next.",
    eyebrow: "Founding Member · Confirmed",
    headline: `Welcome, ${(name || "").trim().split(/\s+/)[0] || "aboard"}.`,
    paragraphs: [
      `Hi ${first(name)},`,
      `Your founding spot on the Veterinary Success Network is confirmed${
        position ? ` (founding spot <b>#${position}</b>)` : ""
      }. Your <b>$49/month founding rate is locked in</b> and never increases for as long as your membership stays active.`,
    ],
    sections: [
      {
        title: "What happens next",
        bullets: [
          "Our team will reach out to you personally with your membership setup and payment details. Exactly as promised, <b>you confirm before any charge</b>.",
          "The member portal opens with the network: the Expert Hotline (written action plans in 2 to 3 business days), the full resource library with new kits weekly, member-only partner deals, and monthly live AMAs and CE.",
        ],
      },
      {
        title: "A few things to know",
        bullets: [
          "Your founding status is permanent: as the network grows, you keep every new feature at the same $49/month (or $490/year) rate for as long as your membership stays active.",
          "Every membership comes with a 30-day money-back guarantee, and you can cancel anytime.",
        ],
      },
    ],
    cta: { label: "Visit the network", href: SITE },
    closing: "Questions? Reply to this email. Our team reads and responds to every message.",
    signoffLines: SIGNOFF_WELCOME,
    footerNote:
      "You're receiving this because our team confirmed your founding membership on the Veterinary Success Network.",
    reference: position ? `Reference: founding spot #${position}` : undefined,
  });
  try {
    await sendEmail({
      from: purposeFrom("members"),
      to: email,
      subject: "Your founding spot is confirmed | Veterinary Success Network",
      html,
      text,
    });
  } catch (err) {
    console.error("member welcome failed:", err);
  }
}

/** §3 EXPERT · application received. From support@ (experts@ doesn't exist). Simple shell. */
export async function sendExpertConfirmation(email: string, name: string) {
  try {
    await sendEmail({
      from: purposeFrom("experts"),
      to: email,
      subject: "Application received | Veterinary Success Network experts",
      html: emailShell(
        "Application received.",
        P(`Hi ${first(name)},`) +
          P(
            "Thanks for applying to become an expert on the Veterinary Success Network. Our team reviews every application personally, for fit, and we'll be in touch soon."
          ) +
          P(
            "A quick reminder of how it works: you share one recording, we produce your full content kit in your branding, and interested members book straight onto your calendar. Months 1 to 6 are free, then $49/mo, then $199/mo from month 13. Paid courses: you keep 70%."
          )
      ),
    });
  } catch (err) {
    console.error("expert confirmation failed:", err);
  }
}

/** §4 EXPERT · approved (first transition only). From support@. Branded journey. */
export async function sendExpertApproval(email: string, name: string) {
  const { html, text } = renderBranded({
    preview: "Your expert application is approved. Our team will reach out to schedule your onboarding.",
    eyebrow: "Expert Application · Approved",
    headline: `Welcome to the bench, ${(name || "").trim().split(/\s+/)[0] || "expert"}.`,
    paragraphs: [
      `Hi ${first(name)},`,
      "Great news: your application to join the Veterinary Success Network as a <b>founding expert</b> is approved. We review every expert personally, and you're exactly the kind of fit the network was built around.",
    ],
    sections: [
      {
        title: "What happens next",
        bullets: [
          "Our team will reach out to you personally to schedule your onboarding conversation and walk you through everything.",
          "You share <b>one recording</b> of you teaching your topic. We produce your full content kit (training video, action guide, checklist, worksheet, slide deck) in your branding, and you approve it before anything goes live.",
          "Every resource carries a book-a-meeting button, so interested members reach out to you directly.",
        ],
      },
      {
        title: "Your founding terms",
        bullets: [
          "Months 1 to 6 are <b>free</b>, then $49/month (locked launch rate) for months 7 to 12, then $199/month from month 13.",
          "Paid courses: you keep <b>70%</b> of net course revenue; the network retains 30%.",
          "Expert Hotline referrals are routed by fit, never pay-to-play.",
        ],
      },
    ],
    cta: { label: "Visit the network", href: SITE },
    closing:
      "Questions before we talk? Reply to this email and our team will get back to you within one business day.",
    signoffLines: SIGNOFF_WELCOME,
    footerNote:
      "You're receiving this because our team approved your expert application on the Veterinary Success Network.",
    reference: `Reference: approved ${fmtDate()}`,
  });
  try {
    await sendEmail({
      from: purposeFrom("experts"),
      to: email,
      subject: "You're approved | Veterinary Success Network experts",
      html,
      text,
    });
  } catch (err) {
    console.error("expert approval email failed:", err);
  }
}

/** §5 PARTNER · application received. From hello@ (partners@ doesn't exist). Simple shell. */
export async function sendPartnerConfirmation(email: string, name: string) {
  try {
    await sendEmail({
      from: purposeFrom("partners"),
      to: email,
      subject: "Partner application received | Veterinary Success Network",
      html: emailShell(
        "Application received.",
        P(`Hi ${first(name)},`) +
          P(
            "Thanks for applying to become a founding partner of the Veterinary Success Network. We vet and list partners per category, so spots are limited. Our team reviews every application personally and we'll be in touch soon."
          ) +
          P(
            "A quick reminder of the terms: months 1 to 6 are free, then $49/mo (locked launch rate), then $199/mo from month 13. Founding partners get priority placement in their category."
          )
      ),
    });
  } catch (err) {
    console.error("partner confirmation failed:", err);
  }
}

/** §6 PARTNER · approved (first transition only). From hello@. Branded journey. */
export async function sendPartnerApproval(email: string, name: string, companyName: string) {
  const company = escapeHtml(companyName);
  const { html, text } = renderBranded({
    preview: `${companyName} is approved as a founding partner. Our team will reach out to finalize your listing.`,
    eyebrow: "Partner Application · Approved",
    headline: `You're in, ${(name || "").trim().split(/\s+/)[0] || "partner"}.`,
    paragraphs: [
      `Hi ${first(name)},`,
      `Great news: <b>${company}</b> is approved as a <b>founding partner</b> of the Veterinary Success Network. We vet and list partners per category, and you've earned one of the limited founding spots.`,
    ],
    sections: [
      {
        title: "What happens next",
        bullets: [
          "Our team will reach out to you personally to finalize your listing: your logo, the exact wording of your member deal, and your booking link.",
          "As a founding partner you get <b>priority placement</b> in your category, and the Verified Partner badge goes live with your listing when the network opens.",
          "Member leads route directly to you, and you'll see the channel working through your dashboard as the platform rolls out.",
        ],
      },
      {
        title: "Your founding terms",
        bullets: [
          "Months 1 to 6 are <b>free</b>, then $49/month (locked launch rate) for months 7 to 12, then $199/month from month 13.",
          "The five partner commitments apply: your best deal for members, one-business-day responses to leads, a working booking link, 30 days' notice on offer changes, and the fee after your free period.",
        ],
      },
    ],
    cta: { label: "Visit the network", href: SITE },
    closing:
      "Questions before we talk? Reply to this email and our team will get back to you within one business day.",
    signoffLines: SIGNOFF_WELCOME,
    footerNote:
      "You're receiving this because our team approved your partner application on the Veterinary Success Network.",
    reference: `Reference: approved ${fmtDate()}`,
  });
  try {
    await sendEmail({
      from: purposeFrom("partners"),
      to: email,
      subject: "You're approved | Veterinary Success Network partners",
      html,
      text,
    });
  } catch (err) {
    console.error("partner approval email failed:", err);
  }
}

/** Free-kit lead magnet (no ASN counterpart; VSN-specific). From hello@. */
export async function sendFreeKitConfirmation(email: string, name: string) {
  const { html, text } = renderBranded({
    preview: "You're on the list. The first free kit arrives the moment it drops.",
    eyebrow: "Free Resource Kit",
    headline: "You're on the list.",
    paragraphs: [
      `Hi ${first(name)},`,
      "The first free kit goes out by email the moment it drops: a training video, an action guide, a checklist and a worksheet your team can use the same day.",
      "No spam in the meantime, and no membership pitch. Unsubscribe anytime.",
    ],
    cta: { label: "Explore the network", href: SITE },
    signoffLines: SIGNOFF_WELCOME,
    footerNote: `This is an automated confirmation of your free-kit signup on ${fmtDate()}.`,
  });
  try {
    await sendEmail({ to: email, subject: "You're on the list for the free VSN kit", html, text });
  } catch (err) {
    console.error("free-kit confirmation failed:", err);
  }
}

/** §7 ADMIN · sign-in code (fallback path; the primary is Supabase's {{ .Token }} template).
 *  Deliberately NOT fail-soft — the login route must know delivery failed. */
export async function sendAdminCodeEmail(email: string, code: string) {
  await sendEmail({
    from: purposeFrom("support"),
    to: email,
    subject: `Your Veterinary Success Network sign-in code: ${code}`,
    html: emailShell(
      "Your admin sign-in code",
      P("Enter this code on the admin sign-in page to access the console. It expires shortly and can only be used once.") +
        `<p style="text-align:center;margin:18px 0 22px;"><span style="display:inline-block;background:#f6fbf0;border:1px solid #55B900;border-radius:14px;padding:18px 34px;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#1c3310;">${code}</span></p>` +
        P(
          "If you didn't try to sign in to the Veterinary Success Network admin console, you can ignore this email. The code is useless without access to this inbox."
        )
    ),
  });
}
