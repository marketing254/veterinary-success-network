import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { renderExpertAgreementPdf, renderPartnerAgreementPdf } from "@/lib/pdf/agreementPdf";
import { EXPERT_AGREEMENT_VERSION } from "@/content/legal/expertAgreement";
import { PARTNER_AGREEMENT_VERSION } from "@/content/legal/partnerAgreement";
import { providerFreePeriodEnd, freeMonthsFor, PROVIDER_FREE_MONTHS, normalizeProviderRate } from "@/lib/providerBilling";
import { sendExpertAgreementWelcome } from "@/lib/email/expertPortal";
import { sendPartnerAgreementWelcome } from "@/lib/email/partnerPortal";
import { notifySignup } from "@/lib/email/teamNotify";
import type { ExpertSelf } from "@/lib/expert/load";
import type { PartnerSelf } from "@/lib/partner/load";

/**
 * Agreement acceptance shared by the no-card path (Phase 2/3 routes, used
 * when Stripe is not configured) and the sign-and-pay path (Phase 5 start
 * routes). Records e-sign columns, stores the signed PDF, sends ONE welcome
 * email with the PDF, alerts the team. Billing columns are merged in when
 * the caller already created the subscription.
 */
export type Signature = { name: string; title?: string | null; ipHash: string; userAgent: string | null };

export async function acceptExpertAgreement(expert: ExpertSelf, sig: Signature, billing: Record<string, unknown> = {}, freeUntilOverride?: Date | null) {
  const db = supabaseAdmin();
  const founding = expert.source === "founding_invite";
  const freeUntil = freeUntilOverride ?? (expert.free_period_ends_at ? new Date(expert.free_period_ends_at) : providerFreePeriodEnd(freeMonthsFor({ audience: "expert", founding })).date);
  const acceptedAt = new Date();
  const pdf = await renderExpertAgreementPdf(
    { fullName: expert.full_name, email: expert.email, companyName: expert.company_name, founding, freeUntil },
    { acceptedName: sig.name, acceptedAt, ipHash: sig.ipHash, userAgent: sig.userAgent, version: EXPERT_AGREEMENT_VERSION }
  );
  const path = `experts/${expert.id}/expert-agreement-${EXPERT_AGREEMENT_VERSION}-${acceptedAt.getTime()}.pdf`;
  const { error: upErr } = await db.storage.from("agreements").upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (upErr) throw upErr;
  const { error } = await db
    .from("experts")
    .update({
      agreement_signed_at: acceptedAt.toISOString(),
      agreement_version: EXPERT_AGREEMENT_VERSION,
      agreement_name: sig.name,
      agreement_ip_hash: sig.ipHash,
      agreement_user_agent: sig.userAgent,
      agreement_pdf_path: path,
      free_period_ends_at: freeUntil.toISOString(),
      status: expert.status === "invited" ? "active" : expert.status,
      activated_at: expert.activated_at ?? acceptedAt.toISOString(),
      ...billing,
    })
    .eq("id", expert.id);
  if (error) throw error;
  try {
    await sendExpertAgreementWelcome({ email: expert.email, name: expert.full_name, founding, freeUntil, pdf });
  } catch (err) {
    console.error("expert welcome email failed (agreement recorded):", err);
  }
  await notifySignup(billing.stripe_subscription_id ? "expert accepted (card on file)" : "expert agreement accepted", {
    Expert: expert.full_name,
    Email: expert.email,
    Company: expert.company_name,
    Cohort: founding ? "Founding expert (12 free months)" : "Website expert (6 free months)",
    "Free until": freeUntil.toDateString(),
    Card: billing.card_brand ? `${billing.card_brand} ····${billing.card_last4}` : "none yet",
    "Signed as": sig.name,
    "Agreement version": EXPERT_AGREEMENT_VERSION,
  });
  return { acceptedAt, freeUntil, pdfPath: path };
}

export async function acceptPartnerAgreement(p: PartnerSelf, sig: Signature, billing: Record<string, unknown> = {}, freeUntilOverride?: Date | null) {
  const db = supabaseAdmin();
  const rate = normalizeProviderRate(p.billing_plan);
  const freeUntil = freeUntilOverride ?? (p.free_period_ends_at ? new Date(p.free_period_ends_at) : providerFreePeriodEnd(PROVIDER_FREE_MONTHS).date);
  const acceptedAt = new Date();
  const pdf = await renderPartnerAgreementPdf(
    { companyName: p.company_name, contactName: p.contact_name, email: p.contact_email, category: p.category, memberOffer: p.member_offer, rate, freeUntil },
    { acceptedName: sig.name, acceptedTitle: sig.title ?? null, acceptedAt, ipHash: sig.ipHash, userAgent: sig.userAgent, version: PARTNER_AGREEMENT_VERSION }
  );
  const path = `partners/${p.id}/partner-agreement-${PARTNER_AGREEMENT_VERSION}-${acceptedAt.getTime()}.pdf`;
  const { error: upErr } = await db.storage.from("agreements").upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (upErr) throw upErr;
  const { error } = await db
    .from("partners")
    .update({
      agreement_signed_at: acceptedAt.toISOString(),
      agreement_version: PARTNER_AGREEMENT_VERSION,
      agreement_name: sig.name,
      signer_name: sig.name,
      signer_title: sig.title ?? p.signer_title,
      agreement_ip_hash: sig.ipHash,
      agreement_user_agent: sig.userAgent,
      agreement_pdf_path: path,
      free_period_ends_at: freeUntil.toISOString(),
      founding_partner_locked: true,
      ...billing,
    })
    .eq("id", p.id);
  if (error) throw error;
  try {
    await sendPartnerAgreementWelcome({ email: p.contact_email, contactName: p.contact_name, companyName: p.company_name, rate, freeUntil, pdf });
  } catch (err) {
    console.error("partner welcome email failed (agreement recorded):", err);
  }
  await notifySignup(billing.stripe_subscription_id ? "partner accepted (card on file)" : "partner agreement accepted", {
    Company: p.company_name,
    Contact: p.contact_name,
    Email: p.contact_email,
    Category: p.category,
    Plan: rate === "flat" ? "$39 flat" : "$39 x 12 then $149",
    "Free until": freeUntil.toDateString(),
    Card: billing.card_brand ? `${billing.card_brand} ····${billing.card_last4}` : "none yet",
    "Signed as": sig.title ? `${sig.name}, ${sig.title}` : sig.name,
    "Agreement version": PARTNER_AGREEMENT_VERSION,
  });
  return { acceptedAt, freeUntil, pdfPath: path };
}
