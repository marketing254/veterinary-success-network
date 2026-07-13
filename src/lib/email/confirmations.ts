import { sendEmail, emailShell } from "./mailer";
import { escapeHtml } from "./teamNotify";

const P = (t: string) => `<p style="font-size:14px;line-height:1.6;color:#2c3a22;margin:0 0 12px;">${t}</p>`;

export async function sendReservationConfirmation(email: string, name: string, plan: string) {
  try {
    await sendEmail({
      to: email,
      subject: "Your VSN founding reservation is in",
      html: emailShell(
        "Your founding reservation is in.",
        P(`Hi ${escapeHtml(name)},`) +
          P(
            `Thanks for reserving your <b>${escapeHtml(plan)}</b> spot at the Veterinary Success Network. No payment was taken today.`
          ) +
          P(
            "When founding doors open you'll get your secure checkout link by email; your spot and the $49/mo lock are held in reservation order."
          ) +
          P("Cancel anytime · money-back guarantee.")
      ),
    });
  } catch (err) {
    console.error("reservation confirmation failed:", err);
  }
}

export async function sendExpertConfirmation(email: string, name: string) {
  try {
    await sendEmail({
      to: email,
      subject: "We received your VSN expert application",
      html: emailShell(
        "Application received.",
        P(`Hi ${escapeHtml(name)},`) +
          P(
            "The Veterinary Business Institute team reviews every application by hand. Expect a reply by email within a few business days."
          ) +
          P("If it's a fit, we'll set up a short call about your topics and your kit.")
      ),
    });
  } catch (err) {
    console.error("expert confirmation failed:", err);
  }
}

export async function sendPartnerConfirmation(email: string, name: string) {
  try {
    await sendEmail({
      to: email,
      subject: "We received your VSN partner application",
      html: emailShell(
        "Application received.",
        P(`Hi ${escapeHtml(name)},`) +
          P(
            "The Veterinary Business Institute team reviews every partner by hand. Expect a reply by email within a few business days."
          ) +
          P("If it's a fit, we'll confirm your category, your member offer and your founding placement.")
      ),
    });
  } catch (err) {
    console.error("partner confirmation failed:", err);
  }
}

export async function sendFreeKitConfirmation(email: string, name: string) {
  try {
    await sendEmail({
      to: email,
      subject: "You're on the list for the free VSN kit",
      html: emailShell(
        "You're on the list.",
        P(`Hi ${escapeHtml(name)},`) +
          P(
            "The first free kit goes out by email the moment it drops: video, guide, checklist and worksheet."
          ) +
          P("No spam in the meantime, and no membership pitch. Unsubscribe anytime.")
      ),
    });
  } catch (err) {
    console.error("free-kit confirmation failed:", err);
  }
}
