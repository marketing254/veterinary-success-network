import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { renderExpertAgreementPdf, renderPartnerAgreementPdf, type AgreementSignature } from "@/lib/pdf/agreementPdf";
import { providerFreePeriodEnd, freeMonthsFor, PROVIDER_FREE_MONTHS, normalizeProviderRate, type ProviderRate } from "@/lib/providerBilling";
import { EXPERT_AGREEMENT_VERSION } from "@/content/legal/expertAgreement";
import { PARTNER_AGREEMENT_VERSION } from "@/content/legal/partnerAgreement";
import { sendFoundingInviteEmail } from "@/lib/email/adminEmails";
import { sendExpertAgreementWelcome } from "@/lib/email/expertPortal";
import { sendPartnerAgreementWelcome } from "@/lib/email/partnerPortal";
import { notifySignup } from "@/lib/email/teamNotify";
import { ensureAuthUser } from "@/lib/providers/provision";
import { siteOrigin } from "@/lib/referral";

/**
 * Founding invites: the ONLY path that uses /founding/<code>. Admin drafts,
 * sends (email with draft PDFs + private link), the invitee accepts on the
 * page (card step added in Phase 5), and acceptance creates the experts and/or
 * partners rows, the auth user, the signed PDFs and the welcome emails.
 */
export type Invite = {
  id: string; code: string; role: "expert" | "partner" | "both"; full_name: string; email: string; phone: string | null;
  company_name: string | null; category: string | null; website: string | null; description: string | null; member_offer: string | null;
  booking_link: string | null; signer_name: string | null; signer_title: string | null; notes: string | null;
  pricing_plan: string; expert_free_for_life: boolean; status: string; sent_at: string | null; viewed_at: string | null;
  accepted_at: string | null; accepted_name: string | null; expires_at: string; expert_id: string | null; partner_id: string | null; created_by: string | null; created_at: string;
};

export const INVITE_COLS = "id, code, role, full_name, email, phone, company_name, category, website, description, member_offer, booking_link, signer_name, signer_title, notes, pricing_plan, expert_free_for_life, status, sent_at, viewed_at, accepted_at, accepted_name, expires_at, expert_id, partner_id, created_by, created_at";

export function newInviteCode(): string {
  return randomBytes(18).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 22);
}

export function inviteUrl(code: string): string {
  return `${siteOrigin()}/founding/${code}`;
}

export function isSendableEmail(email: string): boolean {
  const e = email.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && !/example\.com$|@test\.|placeholder|tbd|@none/.test(e);
}

export async function inviteDraftPdfs(inv: Invite, signature: AgreementSignature | null = null) {
  const rate = normalizeProviderRate(inv.pricing_plan);
  const out: { filename: string; content: Buffer; role: "expert" | "partner" }[] = [];
  if (inv.role !== "partner") {
    const freeUntil = providerFreePeriodEnd(freeMonthsFor({ audience: "expert", founding: true })).date;
    const pdf = await renderExpertAgreementPdf({ fullName: inv.full_name, email: inv.email, companyName: inv.company_name, founding: true, freeUntil }, signature);
    out.push({ filename: `VSN-Expert-Agreement${signature ? "-signed" : "-draft"}.pdf`, content: pdf, role: "expert" });
  }
  if (inv.role !== "expert") {
    const freeUntil = providerFreePeriodEnd(PROVIDER_FREE_MONTHS).date;
    const pdf = await renderPartnerAgreementPdf({ companyName: inv.company_name || inv.full_name, contactName: inv.full_name, email: inv.email, category: inv.category, memberOffer: inv.member_offer, rate, freeUntil }, signature);
    out.push({ filename: `VSN-Partner-Agreement${signature ? "-signed" : "-draft"}.pdf`, content: pdf, role: "partner" });
  }
  return out;
}

export async function sendInvite(inv: Invite, adminEmail: string, resend = false) {
  if (!isSendableEmail(inv.email)) throw new Error("That email looks like a placeholder; fix it before sending.");
  const pdfs = await inviteDraftPdfs(inv);
  await sendFoundingInviteEmail({
    to: inv.email,
    fullName: inv.full_name,
    role: inv.role,
    companyName: inv.company_name,
    rate: normalizeProviderRate(inv.pricing_plan),
    expertFreeForLife: inv.expert_free_for_life,
    inviteUrl: inviteUrl(inv.code),
    expiresAt: new Date(inv.expires_at),
    note: null,
    attachments: pdfs.map(({ filename, content }) => ({ filename, content })),
  });
  await supabaseAdmin().from("founding_invites").update({ status: inv.status === "viewed" ? "viewed" : "sent", sent_at: new Date().toISOString() }).eq("id", inv.id);
  await notifySignup(resend ? "founding invite resent" : "founding invite sent", {
    Name: inv.full_name, Email: inv.email, Role: inv.role, Company: inv.company_name, Category: inv.category,
    Plan: inv.role === "expert" ? (inv.expert_free_for_life ? "Free for life" : "12 months free, then $39") : inv.pricing_plan === "flat" ? "$39 flat" : "$39 x 12 then $149",
    "Expert free for life": inv.role !== "partner" && inv.expert_free_for_life ? "yes" : "no",
    "Sent by": adminEmail,
  });
}

export async function acceptInvite(inv: Invite, sig: { name: string; title: string | null; ipHash: string; userAgent: string | null }) {
  const db = supabaseAdmin();
  const acceptedAt = new Date();
  const email = inv.email.toLowerCase();
  const rate: ProviderRate = normalizeProviderRate(inv.pricing_plan);
  const authUserId = await ensureAuthUser(email, { role: inv.role, full_name: inv.full_name });
  let expertId: string | null = inv.expert_id;
  let partnerId: string | null = inv.partner_id;
  const signed = await inviteDraftPdfs(inv, { acceptedName: sig.name, acceptedTitle: sig.title, acceptedAt, ipHash: sig.ipHash, userAgent: sig.userAgent, version: "v1" });

  if (inv.role !== "partner" && !expertId) {
    const freeUntil = providerFreePeriodEnd(freeMonthsFor({ audience: "expert", founding: true })).date;
    const pdf = signed.find((s) => s.role === "expert")!;
    const path = `experts/founding-${inv.code}-${acceptedAt.getTime()}.pdf`;
    await db.storage.from("agreements").upload(path, pdf.content, { contentType: "application/pdf", upsert: true });
    const { data: existing } = await db.from("experts").select("id").ilike("email", email).maybeSingle();
    const row = {
      auth_user_id: authUserId, email, full_name: inv.full_name, display_name: inv.full_name, phone: inv.phone, company_name: inv.company_name,
      topics: inv.description, website: inv.website, booking_link: inv.booking_link, status: "invited", source: "founding_invite", invited_by: inv.created_by,
      agreement_signed_at: acceptedAt.toISOString(), agreement_version: EXPERT_AGREEMENT_VERSION, agreement_name: sig.name, agreement_ip_hash: sig.ipHash,
      agreement_user_agent: sig.userAgent, agreement_pdf_path: path, free_period_ends_at: freeUntil.toISOString(),
      ...(inv.expert_free_for_life ? { billing_exempt: true, billing_exempt_reason: "Founding expert (free for life)" } : {}),
    };
    if (existing) {
      await db.from("experts").update(row).eq("id", existing.id);
      expertId = existing.id;
    } else {
      const { data, error } = await db.from("experts").insert(row).select("id").single();
      if (error) throw new Error(`experts insert failed: ${error.message}`);
      expertId = data.id;
    }
    await db.storage.from("agreements").move(path, `experts/${expertId}/expert-agreement-founding-${acceptedAt.getTime()}.pdf`).then(async (r) => {
      if (!r.error) await db.from("experts").update({ agreement_pdf_path: `experts/${expertId}/expert-agreement-founding-${acceptedAt.getTime()}.pdf` }).eq("id", expertId!);
    });
    try {
      await sendExpertAgreementWelcome({ email, name: inv.full_name, founding: true, freeUntil, pdf: pdf.content });
    } catch (err) {
      console.error("founding expert welcome failed:", err);
    }
  }

  if (inv.role !== "expert" && !partnerId) {
    const freeUntil = providerFreePeriodEnd(PROVIDER_FREE_MONTHS).date;
    const pdf = signed.find((s) => s.role === "partner")!;
    const path = `partners/founding-${inv.code}-${acceptedAt.getTime()}.pdf`;
    await db.storage.from("agreements").upload(path, pdf.content, { contentType: "application/pdf", upsert: true });
    const { data: existing } = await db.from("partners").select("id").ilike("contact_email", email).maybeSingle();
    const row = {
      auth_user_id: authUserId, company_name: inv.company_name || inv.full_name, display_name: inv.company_name || inv.full_name, category: inv.category, website: inv.website,
      description: inv.description, member_offer: inv.member_offer, booking_link: inv.booking_link, contact_name: inv.full_name, contact_email: email, contact_phone: inv.phone,
      signer_name: sig.name, signer_title: sig.title, status: "approved", verified: true, approved_at: acceptedAt.toISOString(), approved_by: inv.created_by, source: "founding_invite",
      billing_plan: rate, agreement_signed_at: acceptedAt.toISOString(), agreement_version: PARTNER_AGREEMENT_VERSION, agreement_name: sig.name, agreement_ip_hash: sig.ipHash,
      agreement_user_agent: sig.userAgent, agreement_pdf_path: path, free_period_ends_at: freeUntil.toISOString(),
    };
    if (existing) {
      await db.from("partners").update(row).eq("id", existing.id);
      partnerId = existing.id;
    } else {
      const { data, error } = await db.from("partners").insert(row).select("id").single();
      if (error) throw new Error(`partners insert failed: ${error.message}`);
      partnerId = data.id;
    }
    try {
      await sendPartnerAgreementWelcome({ email, contactName: inv.full_name, companyName: inv.company_name || inv.full_name, rate, freeUntil, pdf: pdf.content });
    } catch (err) {
      console.error("founding partner welcome failed:", err);
    }
  }

  await db
    .from("founding_invites")
    .update({ status: "accepted", accepted_at: acceptedAt.toISOString(), accepted_name: sig.name, accepted_ip_hash: sig.ipHash, accepted_user_agent: sig.userAgent, expert_id: expertId, partner_id: partnerId, free_period_ends_at: providerFreePeriodEnd(PROVIDER_FREE_MONTHS).date.toISOString() })
    .eq("id", inv.id);

  await notifySignup("founding invite ACCEPTED", {
    Name: inv.full_name, Email: email, Role: inv.role, Company: inv.company_name, Category: inv.category,
    Plan: inv.role === "expert" ? (inv.expert_free_for_life ? "Free for life" : "12 months free, then $39") : rate === "flat" ? "$39 flat" : "$39 x 12 then $149",
    "Signed as": sig.title ? `${sig.name}, ${sig.title}` : sig.name,
  });
  return { expertId, partnerId };
}
