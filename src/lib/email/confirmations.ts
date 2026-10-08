import { sendEmail, emailShell, purposeFrom } from "./mailer";
import { renderBranded } from "./branded";
import { escapeHtml } from "./teamNotify";
import { providerTermsSentence, MEMBER_FOUNDING_MONTHLY, MEMBER_FOUNDING_ANNUAL, MEMBER_STANDARD_MONTHLY } from "../providerBilling";

/**
 * Transactional email set, structure from VSN_Transactional_Emails.md. Prices come
 * from src/lib/providerBilling.ts (owner decision 2026-10-07: ASN model; members
 * $29/mo or $290/yr founding, $99/mo standard; providers 6 free months from launch
 * then $39, partners $39 x 12 then $149). No category exclusivity; no courses /
 * 70-30 mention; $50 referral + Verified Partner badge on partners; free-for-life
 * ONLY in the private founding-expert email (§5). Applicant emails are fail-soft;
 * the admin code is not. No em dashes anywhere.
 */
const M_FOUNDING = `$${MEMBER_FOUNDING_MONTHLY}/month`;
const M_FOUNDING_YR = `$${MEMBER_FOUNDING_ANNUAL}/year`;
const M_STANDARD = `$${MEMBER_STANDARD_MONTHLY}/month`;
const EXPERT_TERMS = providerTermsSentence("ladder", { expert: true });
const PARTNER_TERMS = providerTermsSentence("ladder");

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.veterinarysuccessnetwork.com";

const fmtDate = () =>
  new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

const first = (name: string) => escapeHtml((name || "").trim().split(/\s+/)[0] || "there");

const P = (t: string) => `<p style="font-size:14px;line-height:1.6;color:#2c3a22;margin:0 0 12px;">${t}</p>`;

const SIGNOFF = [
  "Welcome aboard.",
  "The Veterinary Success Network Team",
  "Powered by Veterinary Business Institute",
];

/** §1 MEMBER · waitlist join. From members@. Branded journey. */
export async function sendReservationConfirmation(
  email: string,
  name: string,
  referenceId?: string | null
) {
  const { html, text } = renderBranded({
    preview:
      `You're on the founding waitlist. ${M_FOUNDING} founding rate, locked for life while active. Nothing to pay today.`,
    eyebrow: "Founding Waitlist",
    headline: "You're on the list.",
    paragraphs: [
      `Hi ${first(name)},`,
      "Welcome to the Veterinary Success Network. Your spot on the founding waitlist is reserved, and there is <b>nothing to pay today</b>. As founding spots open we will reach out personally, and you confirm before any charge.",
    ],
    sections: [
      {
        title: "What you get as a founding member",
        bullets: [
          "<b>The Expert Hotline.</b> Leave a voicemail on our toll-free line and get a written action plan by text and email within 2 to 3 business days, with 3 to 4 vetted experts matched to your question.",
          "<b>A growing resource library.</b> Training videos, action guides, checklists, worksheets, SOPs and templates, with new expert kits added regularly.",
          "<b>Member-only partner deals.</b> Exclusive pricing from vetted companies across the equipment, software, supplies, diagnostics and services veterinary practices actually buy.",
          "<b>Live AMAs and CE.</b> Monthly live sessions with leading veterinary experts, plus continuing-education opportunities.",
        ],
      },
      {
        title: "A few things to know",
        bullets: [
          `Your founding rate is <b>${M_FOUNDING}</b> (or ${M_FOUNDING_YR}, two months free), locked for as long as your membership stays active. The standard rate after the first 100 founding members is ${M_STANDARD}.`,
          "Every membership comes with a <b>30-day money-back guarantee</b>, and you can cancel anytime.",
          "Founding doors open <b>September 1, 2026</b>. We will email you before then with everything you need. No payment happens until you confirm.",
        ],
      },
    ],
    cta: { label: "Visit the network", href: SITE },
    closing: "Questions in the meantime? Reply to this email. We read and respond to every message.",
    signoffLines: SIGNOFF,
    footerNote: `This is an automated confirmation of your waitlist signup on ${fmtDate()}. If this wasn't you, just ignore it.`,
    reference: referenceId ? `Reference: ${referenceId}` : undefined,
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
export async function sendMemberWelcome(email: string, name: string) {
  const { html, text } = renderBranded({
    preview:
      `Your founding membership is confirmed at the locked ${M_FOUNDING} rate. Here's what happens next.`,
    eyebrow: "Founding Member · Confirmed",
    headline: `Welcome, ${(name || "").trim().split(/\s+/)[0] || "aboard"}.`,
    paragraphs: [
      `Hi ${first(name)},`,
      `Your founding spot on the Veterinary Success Network is confirmed. Your <b>${M_FOUNDING} founding rate is locked in</b> and never increases for as long as your membership stays active.`,
    ],
    sections: [
      {
        title: "What happens next",
        bullets: [
          "Our team will reach out to you personally with your membership setup and payment details. Exactly as promised, <b>you confirm before any charge</b>.",
          "The member portal opens with the network at launch on <b>September 1, 2026</b>: the Expert Hotline (written action plans in 2 to 3 business days), the resource library with new kits added regularly, member-only partner deals, and monthly live AMAs and CE.",
        ],
      },
      {
        title: "A few things to know",
        bullets: [
          `Your founding status is permanent: as the network grows, you keep every new feature at the same ${M_FOUNDING} (or ${M_FOUNDING_YR}) rate for as long as your membership stays active.`,
          "Every membership comes with a <b>30-day money-back guarantee</b>, and you can cancel anytime.",
        ],
      },
    ],
    cta: { label: "Visit the network", href: SITE },
    closing: "Questions? Reply to this email. Our team reads and responds to every message.",
    signoffLines: SIGNOFF,
    footerNote:
      "You're receiving this because our team confirmed your founding membership on the Veterinary Success Network.",
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

/** §3 EXPERT · application received. From experts@. Simple shell. */
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
            "Thanks for applying to become an expert on the Veterinary Success Network. Our team reviews every application personally, for fit, and we will be in touch soon."
          ) +
          P(
            `A quick reminder of how it works: you share one recording, we produce your full content kit in your branding, and interested members reach out to you directly. ${EXPERT_TERMS}`
          )
      ),
    });
  } catch (err) {
    console.error("expert confirmation failed:", err);
  }
}

/** §4 EXPERT · approved, PUBLIC ramp (first transition only). From experts@. Branded journey.
 *  For experts who applied through the site. The invitation-only founding 20 get §5 instead. */
export async function sendExpertApproval(email: string, name: string) {
  const { html, text } = renderBranded({
    preview: "Your expert application is approved. Our team will reach out to schedule your onboarding.",
    eyebrow: "Expert Application · Approved",
    headline: `Welcome to the network, ${(name || "").trim().split(/\s+/)[0] || "expert"}.`,
    paragraphs: [
      `Hi ${first(name)},`,
      "Great news: your application to join the Veterinary Success Network as an expert is approved. We review every expert personally, and you are exactly the kind of fit the network was built around.",
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
        title: "Your terms",
        bullets: [
          `<b>Your terms.</b> ${EXPERT_TERMS} Your free founding months start the day the network opens to members.`,
          "Expert Hotline referrals are routed by fit, never pay-to-play.",
        ],
      },
    ],
    cta: { label: "Visit the network", href: SITE },
    closing:
      "Questions before we talk? Reply to this email and our team will get back to you within one business day.",
    signoffLines: SIGNOFF,
    footerNote:
      "You're receiving this because our team approved your expert application on the Veterinary Success Network.",
    reference: "Contact: experts@veterinarysuccessnetwork.com",
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

/** §5 EXPERT · private founding invite/approval, FREE FOR LIFE. From experts@. Branded journey.
 *  INTERNAL/private: the ONLY email where free-for-life appears. Never send to a public applicant. */
export async function sendFoundingExpertEmail(email: string, name: string) {
  const { html, text } = renderBranded({
    preview: "Your founding expert listing is free for life. Here's what happens next.",
    eyebrow: "Founding Expert · Confirmed",
    headline: `Welcome to the bench, ${(name || "").trim().split(/\s+/)[0] || "expert"}.`,
    paragraphs: [
      `Hi ${first(name)},`,
      "Welcome to the Veterinary Success Network as a <b>founding expert</b>. Your expert listing is <b>free for life</b>, and no payment details are needed.",
    ],
    sections: [
      {
        title: "What happens next",
        bullets: [
          "Our team will reach out to you personally to schedule your onboarding conversation.",
          "You share <b>one recording</b> of you teaching your topic. We produce your full content kit (training video, action guide, checklist, worksheet, slide deck) in your branding, and you approve it before anything goes live.",
          "Your profile and resource kit go live at launch on <b>September 1, 2026</b>, and every resource carries a book-a-meeting button so members reach out to you directly.",
        ],
      },
      {
        title: "Your founding terms",
        bullets: [
          "Your founding expert listing is <b>free for life</b>, for as long as it stays active. There is nothing to set up and no billing.",
          "Expert Hotline referrals are routed by fit, never pay-to-play.",
        ],
      },
    ],
    cta: { label: "Visit the network", href: SITE },
    closing: "Questions before we talk? Reply to this email.",
    signoffLines: SIGNOFF,
    footerNote:
      "You're receiving this because our team invited you as a founding expert on the Veterinary Success Network.",
    reference: "Contact: experts@veterinarysuccessnetwork.com",
  });
  try {
    await sendEmail({
      from: purposeFrom("experts"),
      to: email,
      subject: `You're in, ${(name || "").trim().split(/\s+/)[0] || "expert"}. Welcome to the Veterinary Success Network.`,
      html,
      text,
    });
  } catch (err) {
    console.error("founding expert email failed:", err);
  }
}

/** §6 PARTNER · application received. From partners@. Simple shell. */
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
            "Thanks for applying to become a founding partner of the Veterinary Success Network. Our team reviews every application personally and we will be in touch soon."
          ) +
          P(
            `A quick reminder of the terms: ${PARTNER_TERMS} Founding partners get <b>priority placement</b> in their category.`
          )
      ),
    });
  } catch (err) {
    console.error("partner confirmation failed:", err);
  }
}

/** §7 PARTNER · approved (first transition only). From partners@. Branded journey. */
export async function sendPartnerApproval(email: string, name: string, companyName: string) {
  const company = escapeHtml(companyName);
  const { html, text } = renderBranded({
    preview: `${companyName} is approved as a founding partner. Our team will reach out to finalize your listing.`,
    eyebrow: "Partner Application · Approved",
    headline: `You're in, ${(name || "").trim().split(/\s+/)[0] || "partner"}.`,
    paragraphs: [
      `Hi ${first(name)},`,
      `Great news: <b>${company}</b> is approved as a <b>founding partner</b> of the Veterinary Success Network. We review every partner personally, and you are one of our founding partners.`,
    ],
    sections: [
      {
        title: "What happens next",
        bullets: [
          "Our team will reach out to you personally to finalize your listing: your logo, the exact wording of your member deal, and your booking link.",
          "As a founding partner you get <b>priority placement</b> in your category, and the <b>Verified Partner badge</b> goes live with your listing when the network opens.",
          "Member leads route directly to you, and you will see the channel working through your dashboard as the platform rolls out.",
        ],
      },
      {
        title: "Your founding terms",
        bullets: [
          `<b>Your terms.</b> ${PARTNER_TERMS} Your free founding months start the day the network opens to members.`,
          "Refer a member: once they make their first payment, you earn <b>$50</b>.",
          "The partner commitments apply: your best deal for members, one-business-day responses to leads, a working booking link, 30 days' notice on offer changes, and the fee after your free period.",
        ],
      },
    ],
    cta: { label: "Visit the network", href: SITE },
    closing:
      "Questions before we talk? Reply to this email and our team will get back to you within one business day.",
    signoffLines: SIGNOFF,
    footerNote:
      "You're receiving this because our team approved your partner application on the Veterinary Success Network.",
    reference: "Contact: partners@veterinarysuccessnetwork.com",
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

/** Free-kit lead magnet (VSN-specific; not in the transactional set). From hello@. */
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
    cta: { label: "Visit the network", href: SITE },
    signoffLines: SIGNOFF,
    footerNote: `This is an automated confirmation of your free-kit signup on ${fmtDate()}.`,
  });
  try {
    await sendEmail({ to: email, subject: "You're on the list for the free VSN kit", html, text });
  } catch (err) {
    console.error("free-kit confirmation failed:", err);
  }
}

/** §8 ADMIN · sign-in code (fallback path; primary is Supabase's {{ .Token }} template).
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
