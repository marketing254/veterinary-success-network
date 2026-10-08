/**
 * THE provider pricing model (experts and partners). Every surface (portal cards,
 * emails, agreement PDFs, Stripe schedules, admin chips) reads from here so they
 * always agree. Owner decision 2026-10-07: VSN uses the ASN model (VSN-SWAP-CANON.md section 3).
 *
 * Every free period starts on the member launch date (MEMBER_LAUNCH_DATE), so
 * nobody is charged before members can join.
 *
 *   Founding expert (admin founding invite)   12 months free, then $39 a month, flat.
 *   Website expert (applied at /experts)       6 months free, then $39 a month, flat.
 *   Partner, ladder plan (default)             6 months free, then $39 a month for 12 months, then $149.
 *   Partner, flat plan (admin choice)          6 months free, then $39 a month, no increase.
 *   Founding 20 experts may be billing_exempt (free for life, private).
 *
 * Members (separate): Founding $29/mo or $290/yr (first 100), promo annual $261,
 * Standard $99/mo or $990/yr. 30-day money back. Referral $50 after first payment.
 * Never say "trial" in copy; say "free founding months". No $199, no 70/30.
 */

export const PROVIDER_FREE_MONTHS = 6;
export const FOUNDING_EXPERT_FREE_MONTHS = 12;
export const PROVIDER_PROVISIONAL_FREE_MONTHS = 12;
export const PAYMENT_GRACE_DAYS = 7;
export const CANCEL_NOTICE_DAYS = 30;
export const FIRST_CHARGE_REMINDER_DAYS = 7;

export type ProviderRate = "ladder" | "flat";
export type ProviderAudience = "expert" | "partner";

export const COMPANY_LAUNCH_AMOUNT = 39;
export const COMPANY_LAUNCH_MONTHS = 12;
export const COMPANY_STANDARD_AMOUNT = 149;
export const EXPERT_AMOUNT = 39;

export const MEMBER_FOUNDING_MONTHLY = 29;
export const MEMBER_FOUNDING_ANNUAL = 290;
export const MEMBER_FOUNDING_ANNUAL_PROMO = 261;
export const MEMBER_STANDARD_MONTHLY = 99;
export const MEMBER_STANDARD_ANNUAL = 990;
export const MEMBER_FOUNDING_CAP = 100;
export const FOUNDING_EXPERT_CAP = 20;
export const REFERRAL_PAYOUT_USD = 50;

export function normalizeProviderRate(value: string | null | undefined): ProviderRate {
  return value === "flat" ? "flat" : "ladder";
}

export function memberLaunchDate(): Date | null {
  const raw = (process.env.MEMBER_LAUNCH_DATE ?? "").trim();
  if (!raw) return null;
  const d = new Date(raw.length === 10 ? `${raw}T00:00:00Z` : raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addMonthsUtc(d: Date, months: number): Date {
  const out = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
  return out;
}

export function freeMonthsFor(opts: { audience: ProviderAudience; founding?: boolean }): number {
  return opts.audience === "expert" && opts.founding ? FOUNDING_EXPERT_FREE_MONTHS : PROVIDER_FREE_MONTHS;
}

/**
 * When the free founding months end. If MEMBER_LAUNCH_DATE is unset the period
 * is provisional (N months from today) and the Stripe sync script moves it later.
 * If launch + months is already in the past, the first charge is next month.
 */
export function providerFreePeriodEnd(months: number, now = new Date()): { date: Date; provisional: boolean } {
  const launch = memberLaunchDate();
  if (!launch) return { date: addMonthsUtc(now, PROVIDER_PROVISIONAL_FREE_MONTHS), provisional: true };
  const end = addMonthsUtc(launch, months);
  if (end.getTime() <= now.getTime()) return { date: addMonthsUtc(now, 1), provisional: false };
  return { date: end, provisional: false };
}

export function companyStandardStartsAt(freePeriodEnd: Date): Date {
  return addMonthsUtc(freePeriodEnd, COMPANY_LAUNCH_MONTHS);
}

export function formatLongDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** One sentence for emails and cards. */
export function providerTermsSentence(rate: ProviderRate, opts: { expert?: boolean; founding?: boolean } = {}): string {
  if (opts.expert) {
    const months = opts.founding ? FOUNDING_EXPERT_FREE_MONTHS : PROVIDER_FREE_MONTHS;
    return `Your first ${months} months from member launch are free, then $${EXPERT_AMOUNT} a month with no increase.`;
  }
  if (rate === "flat") {
    return `Your first ${PROVIDER_FREE_MONTHS} months from member launch are free, then $${COMPANY_LAUNCH_AMOUNT} a month with no increase.`;
  }
  return `Your first ${PROVIDER_FREE_MONTHS} months from member launch are free, then $${COMPANY_LAUNCH_AMOUNT} a month for ${COMPANY_LAUNCH_MONTHS} months, then $${COMPANY_STANDARD_AMOUNT} a month.`;
}

/** Short form with the real date once known. */
export function providerTermsShort(rate: ProviderRate, freeUntil: Date | null, opts: { expert?: boolean } = {}): string {
  const until = freeUntil ? `Free until ${formatLongDate(freeUntil)}` : "Free founding months";
  if (opts.expert || rate === "flat") return `${until}, then $${COMPANY_LAUNCH_AMOUNT} a month, no increase.`;
  return `${until}, then $${COMPANY_LAUNCH_AMOUNT} a month for ${COMPANY_LAUNCH_MONTHS} months, then $${COMPANY_STANDARD_AMOUNT}.`;
}

/** Rows for ramp cards and fee tables (2 rows flat/expert, 3 rows ladder). */
export function providerRampRows(rate: ProviderRate, opts: { expert?: boolean; founding?: boolean; freeUntil?: Date | null } = {}) {
  const months = opts.expert ? freeMonthsFor({ audience: "expert", founding: opts.founding }) : PROVIDER_FREE_MONTHS;
  const freeLabel = opts.freeUntil ? `Through ${formatLongDate(opts.freeUntil)}` : `First ${months} months from member launch`;
  const rows = [{ period: freeLabel, amount: "$0 (free founding months)" }];
  if (opts.expert || rate === "flat") {
    rows.push({ period: "After that", amount: `$${COMPANY_LAUNCH_AMOUNT} a month, no increase` });
    return rows;
  }
  rows.push({ period: `Next ${COMPANY_LAUNCH_MONTHS} months`, amount: `$${COMPANY_LAUNCH_AMOUNT} a month` });
  rows.push({ period: "After that", amount: `$${COMPANY_STANDARD_AMOUNT} a month` });
  return rows;
}

/** BILLING_BYPASS_EMAILS: preview accounts treated as paid. Must be EMPTY in production. */
export function isBillingBypassed(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.BILLING_BYPASS_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}
