import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { providerFreePeriodEnd, freeMonthsFor, formatLongDate, providerTermsShort, isBillingBypassed } from "@/lib/providerBilling";

/** Columns the expert may see about themselves (never stripe ids or hashes). */
export const EXPERT_SELF_COLUMNS =
  "id, email, full_name, display_name, phone, company_name, specialty, topics, bio, website, booking_link, headshot_url, avatar_url, years_experience, status, invited_at, activated_at, source, agreement_signed_at, agreement_version, agreement_name, subscription_status, current_period_end, free_period_ends_at, billing_exempt, card_brand, card_last4, created_at";

export type ExpertSelf = {
  id: string;
  email: string;
  full_name: string;
  display_name: string | null;
  phone: string | null;
  company_name: string | null;
  specialty: string | null;
  topics: string | null;
  bio: string | null;
  website: string | null;
  booking_link: string | null;
  headshot_url: string | null;
  avatar_url: string | null;
  years_experience: string | null;
  status: string;
  invited_at: string;
  activated_at: string | null;
  source: string;
  agreement_signed_at: string | null;
  agreement_version: string | null;
  agreement_name: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  free_period_ends_at: string | null;
  billing_exempt: boolean;
  card_brand: string | null;
  card_last4: string | null;
  created_at: string;
};

export async function loadExpertSelf(expertId: string): Promise<ExpertSelf | null> {
  const { data } = await supabaseAdmin().from("experts").select(EXPERT_SELF_COLUMNS).eq("id", expertId).maybeSingle();
  return (data as ExpertSelf | null) ?? null;
}

export type BillingSummary = {
  state: "exempt" | "bypass" | "unsigned" | "awaiting_card" | "free_months" | "active" | "past_due" | "paused" | "canceled";
  label: string;
  detail: string;
  terms: string;
  freeUntil: string | null;
  freeUntilLabel: string | null;
  provisional: boolean;
  founding: boolean;
};

/** Derived billing view for the portal (Stripe wiring arrives in Phase 5). */
export function billingSummary(e: ExpertSelf): BillingSummary {
  const founding = e.source === "founding_invite";
  const months = freeMonthsFor({ audience: "expert", founding });
  const computed = providerFreePeriodEnd(months);
  const freeUntil = e.free_period_ends_at ? new Date(e.free_period_ends_at) : computed.date;
  const base = {
    terms: providerTermsShort("ladder", freeUntil, { expert: true }),
    freeUntil: freeUntil.toISOString(),
    freeUntilLabel: formatLongDate(freeUntil),
    provisional: !e.free_period_ends_at && computed.provisional,
    founding,
  };
  if (e.billing_exempt) return { ...base, state: "exempt", label: "Lifetime free", detail: "Founding expert listing. Nothing to set up and no billing." };
  if (isBillingBypassed(e.email)) return { ...base, state: "bypass", label: "Preview account", detail: "Billing is bypassed for this account." };
  if (!e.agreement_signed_at) return { ...base, state: "unsigned", label: "Agreement pending", detail: "Accept your expert agreement to activate your listing." };
  const sub = e.subscription_status;
  if (!sub) return { ...base, state: "awaiting_card", label: "Free founding months", detail: "Your card step opens when billing goes live. Nothing is due today." };
  if (sub === "trialing") return { ...base, state: "free_months", label: "Free founding months", detail: `Your first charge is after ${base.freeUntilLabel}.` };
  if (sub === "active") return { ...base, state: "active", label: "Active", detail: e.current_period_end ? `Next charge ${formatLongDate(new Date(e.current_period_end))}.` : "Your membership is active." };
  if (sub === "past_due") return { ...base, state: "past_due", label: "Payment due", detail: "A charge failed. Update your card within 7 days to keep your listing live." };
  if (sub === "paused" || sub === "unpaid") return { ...base, state: "paused", label: "Paused", detail: "Your listing is paused until billing is resolved." };
  return { ...base, state: "canceled", label: "Canceled", detail: "Your expert listing is no longer active." };
}

export function profileChecklist(e: ExpertSelf) {
  return [
    { key: "agreement", label: "Accept the expert agreement", done: !!e.agreement_signed_at, href: "/expert/agreement" },
    { key: "headshot", label: "Upload a headshot", done: !!e.headshot_url, href: "/expert/profile" },
    { key: "bio", label: "Write your bio", done: !!e.bio && e.bio.length >= 80, href: "/expert/profile" },
    { key: "specialty", label: "Set your specialty", done: !!e.specialty, href: "/expert/profile" },
    { key: "booking", label: "Add your booking link", done: !!e.booking_link, href: "/expert/profile" },
  ];
}

export function isPubliclyListable(e: ExpertSelf): boolean {
  return (e.status === "active" || e.status === "invited") && !!e.agreement_signed_at && !!e.headshot_url && !!e.bio;
}
