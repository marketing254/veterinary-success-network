import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { providerFreePeriodEnd, PROVIDER_FREE_MONTHS, formatLongDate, providerTermsShort, isBillingBypassed, normalizeProviderRate, type ProviderRate } from "@/lib/providerBilling";

export const PARTNER_SELF_COLUMNS =
  "id, application_id, billing_parent_id, company_name, display_name, category, website, description, member_offer, logo_url, booking_link, lead_response_time, contact_name, contact_email, contact_phone, billing_email, signer_name, signer_title, status, verified, approved_at, source, billing_plan, agreement_signed_at, agreement_version, agreement_name, subscription_status, current_period_end, free_period_ends_at, card_brand, card_last4, stripe_customer_id, created_at";

export type PartnerSelf = {
  id: string;
  application_id: string | null;
  billing_parent_id: string | null;
  company_name: string;
  display_name: string | null;
  category: string | null;
  website: string | null;
  description: string | null;
  member_offer: string | null;
  logo_url: string | null;
  booking_link: string | null;
  lead_response_time: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  billing_email: string | null;
  signer_name: string | null;
  signer_title: string | null;
  status: string;
  verified: boolean;
  approved_at: string | null;
  source: string;
  billing_plan: string;
  agreement_signed_at: string | null;
  agreement_version: string | null;
  agreement_name: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  free_period_ends_at: string | null;
  card_brand: string | null;
  card_last4: string | null;
  stripe_customer_id: string | null;
  created_at: string;
};

export async function loadPartnerSelf(partnerId: string): Promise<PartnerSelf | null> {
  const { data } = await supabaseAdmin().from("partners").select(PARTNER_SELF_COLUMNS).eq("id", partnerId).maybeSingle();
  return (data as PartnerSelf | null) ?? null;
}

/** House accounts (stripe_customer_id starting with house_) are our own companies: nothing is ever billed. */
export function isHousePartner(p: { stripe_customer_id?: string | null } | PartnerSelf): boolean {
  const id = (p as { stripe_customer_id?: string | null }).stripe_customer_id;
  return typeof id === "string" && id.startsWith("house_");
}

export type PartnerBilling = {
  state: "house" | "bypass" | "covered" | "not_approved" | "unsigned" | "awaiting_card" | "free_months" | "active" | "past_due" | "paused" | "canceled";
  label: string;
  detail: string;
  terms: string;
  rate: ProviderRate;
  freeUntil: string | null;
  freeUntilLabel: string | null;
  provisional: boolean;
  coveredBy: string | null;
};

export function partnerBilling(p: PartnerSelf, parent?: PartnerSelf | null): PartnerBilling {
  const rate = normalizeProviderRate(p.billing_plan);
  const src = parent ?? p;
  const computed = providerFreePeriodEnd(PROVIDER_FREE_MONTHS);
  const freeUntil = src.free_period_ends_at ? new Date(src.free_period_ends_at) : computed.date;
  const base = {
    terms: providerTermsShort(rate, freeUntil),
    rate,
    freeUntil: freeUntil.toISOString(),
    freeUntilLabel: formatLongDate(freeUntil),
    provisional: !src.free_period_ends_at && computed.provisional,
    coveredBy: parent ? parent.company_name : null,
  };
  if (isHousePartner(p)) return { ...base, terms: "House account. No fees apply.", state: "house", label: "House partner", detail: "This is a Veterinary Success Network company. Nothing is billed and no agreement step is needed." };
  if (isBillingBypassed(p.contact_email)) return { ...base, state: "bypass", label: "Preview account", detail: "Billing is bypassed for this account." };
  if (p.status !== "approved") return { ...base, state: "not_approved", label: "Pending review", detail: "The team is reviewing your application." };
  if (parent) {
    return { ...base, state: "covered", label: `Covered by ${parent.company_name}`, detail: "This listing is covered by your principal company's subscription. Nothing is billed separately." };
  }
  if (!p.agreement_signed_at) return { ...base, state: "unsigned", label: "Agreement pending", detail: "Accept your partner agreement to activate your listing." };
  const sub = p.subscription_status;
  if (!sub) return { ...base, state: "awaiting_card", label: "Free founding months", detail: "Your card step opens when billing goes live. Nothing is due today." };
  if (sub === "trialing") return { ...base, state: "free_months", label: "Free founding months", detail: `Your first charge is after ${base.freeUntilLabel}.` };
  if (sub === "active") return { ...base, state: "active", label: "Active", detail: p.current_period_end ? `Next charge ${formatLongDate(new Date(p.current_period_end))}.` : "Your partnership is active." };
  if (sub === "past_due") return { ...base, state: "past_due", label: "Payment due", detail: "A charge failed. Update your card within 7 days to keep your listing live." };
  if (sub === "paused" || sub === "unpaid") return { ...base, state: "paused", label: "Paused", detail: "Your listing is paused until billing is resolved." };
  return { ...base, state: "canceled", label: "Canceled", detail: "Your partner listing is no longer active." };
}

export function partnerChecklist(p: PartnerSelf, covered: boolean) {
  return [
    ...(covered ? [] : [{ key: "agreement", label: "Accept the partner agreement", done: !!p.agreement_signed_at, href: "/partner/agreement" }]),
    { key: "logo", label: "Upload your logo", done: !!p.logo_url, href: "/partner/profile" },
    { key: "description", label: "Describe what you do", done: !!p.description && p.description.length >= 60, href: "/partner/profile" },
    { key: "offer", label: "Set your exclusive member offer", done: !!p.member_offer, href: "/partner/profile" },
    { key: "booking", label: "Add a booking or contact link", done: !!p.booking_link || !!p.website, href: "/partner/profile" },
  ];
}

export function isPartnerListable(p: PartnerSelf, parentSigned?: boolean): boolean {
  const signed = p.billing_parent_id ? !!parentSigned : !!p.agreement_signed_at;
  return p.status === "approved" && p.verified && signed && !!p.logo_url && !!p.description;
}
