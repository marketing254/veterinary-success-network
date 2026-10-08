import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin as adminSession, isResponse, type AdminSession } from "@/lib/adminApi";
import { isBillingBypassed } from "@/lib/providerBilling";

/**
 * Auth guards for Route Handlers (ASN pattern, VSN tables).
 * Each returns { ok: true, ...ctx } or { ok: false, response } which the route
 * returns immediately. Defense in depth: middleware blocks page navigation,
 * these block direct API hits, RLS is the third layer.
 */
type Failure = { ok: false; response: NextResponse };

export type ExpertStatus = "invited" | "active" | "suspended" | "archived";
export type PartnerStatus = "pending" | "approved" | "rejected" | "suspended" | "churned";

export type ExpertContext = {
  ok: true;
  userId: string;
  email: string;
  expertId: string;
  fullName: string;
  status: ExpertStatus;
  billingExempt: boolean;
  agreementSigned: boolean;
  subscriptionStatus: string | null;
};

export type PartnerContext = {
  ok: true;
  userId: string;
  email: string;
  partnerId: string;
  companyName: string;
  status: PartnerStatus;
  verified: boolean;
  billingParentId: string | null;
  agreementSigned: boolean;
  subscriptionStatus: string | null;
  /** Our own company (stripe_customer_id house_*): never billed, never gated. */
  house: boolean;
};

export type AdminContext = { ok: true } & AdminSession;

const fail = (status: number, error: string): Failure => ({
  ok: false,
  response: NextResponse.json({ ok: false, error }, { status }),
});

async function sessionEmail(): Promise<{ userId: string; email: string } | Failure> {
  const supa = supabaseServer();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return fail(401, "Please sign in to continue.");
  const email = user.email?.toLowerCase();
  if (!email) return fail(403, "Account is missing an email.");
  return { userId: user.id, email };
}

export async function requireAdmin(): Promise<AdminContext | Failure> {
  const s = await adminSession();
  if (isResponse(s)) return { ok: false, response: s };
  return { ok: true, ...s };
}

export async function requireOwner(): Promise<AdminContext | Failure> {
  const g = await requireAdmin();
  if (!g.ok) return g;
  if (g.role !== "owner") return fail(403, "Owner-only action.");
  return g;
}

/** experts row by email; relinks auth_user_id; blocks suspended/archived. */
export async function requireExpert(): Promise<ExpertContext | Failure> {
  const s = await sessionEmail();
  if ("ok" in s) return s;
  const db = supabaseAdmin();
  const { data: row } = await db
    .from("experts")
    .select("id, full_name, status, auth_user_id, billing_exempt, agreement_signed_at, subscription_status")
    .ilike("email", s.email)
    .maybeSingle();
  if (!row) return fail(403, "No expert profile is linked to this account.");
  if (row.auth_user_id !== s.userId) {
    await db.from("experts").update({ auth_user_id: s.userId }).eq("id", row.id);
  }
  if (row.status === "suspended" || row.status === "archived") {
    return fail(403, "Your expert portal isn't available right now.");
  }
  return {
    ok: true,
    userId: s.userId,
    email: s.email,
    expertId: row.id,
    fullName: row.full_name,
    status: row.status as ExpertStatus,
    billingExempt: !!row.billing_exempt,
    agreementSigned: !!row.agreement_signed_at,
    subscriptionStatus: row.subscription_status ?? null,
  };
}

/** Expert who may publish: agreement signed and billing in good standing (or exempt / bypassed). */
export async function requirePaidExpert(): Promise<ExpertContext | Failure> {
  const g = await requireExpert();
  if (!g.ok) return g;
  if (g.billingExempt || isBillingBypassed(g.email)) return g;
  const good = g.agreementSigned && ["trialing", "active", "past_due"].includes(g.subscriptionStatus ?? "");
  if (!good) return fail(402, "Sign your agreement and add a card to unlock this.");
  return g;
}

/** partners row by contact_email; relinks auth_user_id; blocks suspended/churned/rejected. */
export async function requirePartner(): Promise<PartnerContext | Failure> {
  const s = await sessionEmail();
  if ("ok" in s) return s;
  const db = supabaseAdmin();
  const { data: row } = await db
    .from("partners")
    .select("id, company_name, status, verified, auth_user_id, billing_parent_id, agreement_signed_at, subscription_status, stripe_customer_id")
    .ilike("contact_email", s.email)
    .maybeSingle();
  if (!row) return fail(403, "No partner profile is linked to this account.");
  if (row.auth_user_id !== s.userId) {
    await db.from("partners").update({ auth_user_id: s.userId }).eq("id", row.id);
  }
  if (["suspended", "churned", "rejected"].includes(row.status)) {
    return fail(403, "Your partner portal isn't available right now.");
  }
  return {
    ok: true,
    userId: s.userId,
    email: s.email,
    partnerId: row.id,
    companyName: row.company_name,
    status: row.status as PartnerStatus,
    verified: !!row.verified,
    billingParentId: row.billing_parent_id ?? null,
    agreementSigned: !!row.agreement_signed_at,
    subscriptionStatus: row.subscription_status ?? null,
    house: typeof row.stripe_customer_id === "string" && row.stripe_customer_id.startsWith("house_"),
  };
}

export async function requireVerifiedPartner(): Promise<PartnerContext | Failure> {
  const g = await requirePartner();
  if (!g.ok) return g;
  if (g.status !== "approved" || !g.verified) return fail(403, "Your partner account is not approved yet.");
  return g;
}

/** Partner who may publish: approved + agreement + billing (own or inherited from billing parent). */
export async function requirePaidPartner(): Promise<PartnerContext | Failure> {
  const g = await requireVerifiedPartner();
  if (!g.ok) return g;
  if (g.house || isBillingBypassed(g.email)) return g;
  let signed = g.agreementSigned;
  let sub = g.subscriptionStatus;
  if (g.billingParentId) {
    const { data: parent } = await supabaseAdmin()
      .from("partners")
      .select("agreement_signed_at, subscription_status")
      .eq("id", g.billingParentId)
      .maybeSingle();
    if (parent) {
      signed = !!parent.agreement_signed_at;
      sub = parent.subscription_status ?? null;
    }
  }
  const good = signed && ["trialing", "active", "past_due"].includes(sub ?? "");
  if (!good) return fail(402, "Sign your agreement and add a card to unlock this.");
  return g;
}
