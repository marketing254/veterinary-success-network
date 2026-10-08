import { sendEmail, purposeFrom, purposeReplyTo } from "./mailer";
import { renderBranded } from "./branded";
import { escapeHtml } from "./teamNotify";
import { siteOrigin } from "@/lib/referral";
import { providerTermsSentence, formatLongDate, MEMBER_FOUNDING_MONTHLY, MEMBER_FOUNDING_ANNUAL, MEMBER_STANDARD_MONTHLY, type ProviderRate } from "@/lib/providerBilling";

const first = (name: string | null | undefined) => escapeHtml((name || "").trim().split(/\s+/)[0] || "there");
const TEAM = ["The Veterinary Success Network Team", "Powered by Veterinary Business Institute"];

/**
 * Member launch email (#13): the ONLY email a waitlist member gets after the
 * waitlist confirmation, sent by an admin from /admin/reservations once
 * MEMBER_LAUNCH_ENABLED is true. Links to /join?wl=<reservation id>.
 */
export async function sendMemberLaunchEmail(args: { to: string; fullName: string | null; joinUrl: string }) {
  const { html, text } = renderBranded({
    preview: `Your founding rate of $${MEMBER_FOUNDING_MONTHLY} a month is reserved. Confirm your details and you're in.`,
    eyebrow: "Founding member",
    headline: `The doors are open, ${first(args.fullName)}.`,
    paragraphs: [
      `Hi ${first(args.fullName)},`,
      "You reserved a founding spot on the Veterinary Success Network waitlist. The member portal is now live, and your spot is ready.",
      `Your founding rate is <b>$${MEMBER_FOUNDING_MONTHLY} a month or $${MEMBER_FOUNDING_ANNUAL} a year</b>, locked for as long as your membership stays active. The first 100 members get it; after that the standard rate is $${MEMBER_STANDARD_MONTHLY} a month.`,
    ],
    sections: [
      {
        title: "What you get from day one",
        bullets: [
          "<b>The Expert Hotline.</b> Leave a voicemail with your question and get a written action plan by text and email within 2 to 3 business days.",
          "<b>The resource library.</b> Playbooks, checklists, calculators and recordings from vetted experts, with new kits added as experts join.",
          "<b>Member-only partner deals</b> from companies we have vetted.",
          "<b>Directories of experts and partners</b>, so you can find the right help fast.",
        ],
      },
      {
        title: "How to claim your spot",
        bullets: ["Click the button, check the details we saved for you, choose monthly or annual, and add your card. Your portal opens straight after, and you sign in with a 6-digit code to the email you joined with."],
      },
    ],
    cta: { label: "Claim my founding spot", href: args.joinUrl },
    closing: "30-day money-back guarantee. Cancel anytime. Questions? Reply to this email. Our team reads every reply.",
    signoffLines: ["Welcome aboard.", ...TEAM],
    footerNote: "You're receiving this because you joined the Veterinary Success Network founding waitlist.",
  });
  await sendEmail({
    from: purposeFrom("members"),
    replyTo: purposeReplyTo("members"),
    to: args.to,
    template: "member_launch",
    subject: "The doors are open: claim your founding spot | Veterinary Success Network",
    html,
    text,
  });
}

/**
 * Founding invite email (#3): private link to /founding/<code> with the
 * personalised draft agreement(s) attached. Card is saved, nothing charged.
 */
export async function sendFoundingInviteEmail(args: {
  to: string;
  fullName: string;
  role: "expert" | "partner" | "both";
  companyName?: string | null;
  rate: ProviderRate;
  expertFreeForLife: boolean;
  inviteUrl: string;
  expiresAt: Date;
  note?: string | null;
  attachments: { filename: string; content: Buffer }[];
}) {
  const terms: string[] = [];
  if (args.role !== "partner") {
    terms.push(args.expertFreeForLife ? "Your founding expert listing is <b>free for life</b>. No billing, nothing to set up." : providerTermsSentence("ladder", { expert: true, founding: true }));
  }
  if (args.role !== "expert") terms.push(`${args.companyName ? `<b>${escapeHtml(args.companyName)}</b>: ` : ""}${providerTermsSentence(args.rate)}`);
  terms.push("Nothing is charged today. When billing opens you save a card and your free founding months start on the member launch date.");
  const { html, text } = renderBranded({
    preview: "Your personalised founding agreement is ready to review. Private link inside.",
    eyebrow: "Founding invitation",
    headline: `Your agreement is ready, ${first(args.fullName)}.`,
    paragraphs: [
      `Hi ${first(args.fullName)},`,
      `You are invited to join the Veterinary Success Network as a founding ${args.role === "both" ? "expert and partner" : args.role}. Your personalised agreement is attached and ready to review on your private page.`,
      ...(args.note ? [`<i>${escapeHtml(args.note)}</i>`] : []),
    ],
    sections: [
      { title: "Your founding terms", bullets: terms },
      {
        title: "How it works",
        bullets: [
          "Open your private link, read the agreement, and type your name to accept.",
          `Your page stays open until ${escapeHtml(formatLongDate(args.expiresAt))}.`,
          "Your portal opens the moment you accept, and a signed copy is emailed to you.",
        ],
      },
    ],
    cta: { label: "Review and accept", href: args.inviteUrl },
    closing: "Questions before you accept? Reply to this email and we will walk you through it.",
    signoffLines: TEAM,
    footerNote: "This link is personal to you. Please do not forward it.",
  });
  await sendEmail({
    from: purposeFrom(args.role === "partner" ? "partners" : "experts"),
    replyTo: purposeReplyTo(args.role === "partner" ? "partners" : "experts"),
    to: args.to,
    template: "founding_invite",
    subject: "Your Veterinary Success Network founding agreement is ready",
    html,
    text,
    attachments: args.attachments.map((a) => ({ ...a, contentType: "application/pdf" })),
  });
}

/** Review decision on a kit, catalog item or offer. Fail-soft. */
export async function sendReviewDecisionEmail(args: {
  to: string;
  name: string;
  audience: "expert" | "partner";
  itemKind: "kit" | "catalog item" | "offer";
  itemTitle: string;
  decision: "approved" | "needs_changes" | "rejected";
  note?: string | null;
  publishedUrl?: string | null;
}) {
  const site = siteOrigin();
  const portal = args.audience === "expert" ? `${site}/expert/resources` : `${site}/partner/${args.itemKind === "offer" ? "offers" : "catalog"}`;
  const headline = args.decision === "approved" ? `Your ${args.itemKind} is live.` : args.decision === "needs_changes" ? `One more pass on your ${args.itemKind}.` : `We could not publish this ${args.itemKind}.`;
  const body =
    args.decision === "approved"
      ? `<b>${escapeHtml(args.itemTitle)}</b> has been reviewed and published.${args.publishedUrl ? ` You can see it here: <a href="${escapeHtml(args.publishedUrl)}" style="color:#3BAB00;font-weight:700;">${escapeHtml(args.publishedUrl)}</a>` : ""}`
      : args.decision === "needs_changes"
        ? `The team reviewed <b>${escapeHtml(args.itemTitle)}</b> and asked for a small change before it goes live.`
        : `The team reviewed <b>${escapeHtml(args.itemTitle)}</b> and it does not fit the library as submitted.`;
  const { html, text } = renderBranded({
    preview: headline,
    eyebrow: "Review update",
    headline,
    paragraphs: [`Hi ${first(args.name)},`, body, ...(args.note ? [`<b>Team note:</b> ${escapeHtml(args.note)}`] : [])],
    cta: { label: "Open your portal", href: portal },
    signoffLines: TEAM,
  });
  try {
    await sendEmail({
      from: purposeFrom(args.audience === "expert" ? "experts" : "partners"),
      replyTo: purposeReplyTo(args.audience === "expert" ? "experts" : "partners"),
      to: args.to,
      template: `review_${args.decision}`,
      subject: `${headline} | Veterinary Success Network`,
      html,
      text,
    });
  } catch (err) {
    console.error("review decision email failed:", err);
  }
}
