import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isStripeConfigured, deleteCustomer } from "@/lib/stripe";

/**
 * Admin "Delete" for an expert or a partner: removes the person from OUR
 * database completely (portal row, application, founding invites, invite
 * links, referral code, content, the Supabase sign-in user) and, from Phase 5,
 * the Stripe customer. Admin and member accounts with the same email are never
 * touched, and the sign-in user is kept while the other provider role still
 * uses it. Not reversible. Use for test accounts and withdrawn applicants.
 */
export type DeleteReport = { ok: true; email: string; removed: string[]; stripe: "deleted" | "none" | "failed" };

async function deleteAuthUser(email: string, removed: string[], keepIf: () => Promise<boolean>) {
  const db = supabaseAdmin();
  const { data: admin } = await db.from("admin_users").select("id").ilike("email", email).maybeSingle();
  const { data: member } = await db.from("members").select("id").ilike("email", email).maybeSingle();
  if (admin || member || (await keepIf())) {
    removed.push("sign-in user kept (also used by another role)");
    return;
  }
  for (let page = 1; page <= 10; page += 1) {
    const { data: list } = await db.auth.admin.listUsers({ page, perPage: 200 });
    const u = (list?.users ?? []).find((x) => (x.email ?? "").toLowerCase() === email);
    if (u) {
      await db.auth.admin.deleteUser(u.id);
      removed.push("sign-in user");
      return;
    }
    if ((list?.users ?? []).length < 200) break;
  }
}

/** Deleting the Stripe customer cancels its subscriptions and schedules. House and preview ids are skipped. */
async function deleteStripeCustomer(customerId: string | null | undefined): Promise<DeleteReport["stripe"]> {
  if (!customerId || customerId.startsWith("house_") || customerId.startsWith("preview_")) return "none";
  if (!isStripeConfigured()) return "none";
  try {
    await deleteCustomer(customerId);
    return "deleted";
  } catch (err) {
    console.error("[admin:delete] Stripe customer delete failed", customerId, err);
    return "failed";
  }
}

export async function deleteExpertEverywhere(email: string): Promise<DeleteReport> {
  const db = supabaseAdmin();
  const e = email.trim().toLowerCase();
  const removed: string[] = [];
  const { data: expert } = await db.from("experts").select("id, stripe_customer_id").ilike("email", e).maybeSingle();
  let stripe: DeleteReport["stripe"] = "none";
  if (expert) {
    stripe = await deleteStripeCustomer(expert.stripe_customer_id);
    const paths: string[] = [];
    const { data: kits } = await db.from("expert_resources").select("storage_path").eq("expert_id", expert.id);
    for (const k of kits ?? []) if (k.storage_path) paths.push(k.storage_path);
    if (paths.length) await db.storage.from("expert-resources").remove(paths).catch(() => undefined);
    await db.from("experts").delete().eq("id", expert.id); // cascades kits, posts, inquiries, referral code, notifications
    removed.push("expert profile and content");
  }
  const { count: apps } = await db.from("expert_applications").delete({ count: "exact" }).ilike("email", e);
  if (apps) removed.push(`${apps} application${apps > 1 ? "s" : ""}`);
  const { count: inv } = await db.from("founding_invites").delete({ count: "exact" }).ilike("email", e).in("role", ["expert"]);
  if (inv) removed.push(`${inv} founding invite${inv > 1 ? "s" : ""}`);
  await db.from("invite_links").delete().ilike("email", e).eq("kind", "expert");
  await deleteAuthUser(e, removed, async () => {
    const { data } = await db.from("partners").select("id").ilike("contact_email", e).maybeSingle();
    return !!data;
  });
  return { ok: true, email: e, removed, stripe };
}

export async function deletePartnerEverywhere(email: string): Promise<DeleteReport> {
  const db = supabaseAdmin();
  const e = email.trim().toLowerCase();
  const removed: string[] = [];
  const { data: partner } = await db.from("partners").select("id, stripe_customer_id").ilike("contact_email", e).maybeSingle();
  let stripe: DeleteReport["stripe"] = "none";
  if (partner) {
    stripe = await deleteStripeCustomer(partner.stripe_customer_id);
    const { data: covered } = await db.from("partners").select("id").eq("billing_parent_id", partner.id);
    // redemptions restrict deletes; clear them first for the principal and covered rows
    const ids = [partner.id, ...(covered ?? []).map((c) => c.id)];
    await db.from("partner_redemptions").delete().in("partner_id", ids);
    if (covered?.length) {
      await db.from("partners").delete().in("id", covered.map((c) => c.id));
      removed.push(`${covered.length} covered compan${covered.length > 1 ? "ies" : "y"}`);
    }
    await db.from("partners").delete().eq("id", partner.id);
    removed.push("partner profile, catalog, offers and inquiries");
  }
  const { count: apps } = await db.from("partner_applications").delete({ count: "exact" }).ilike("email", e);
  if (apps) removed.push(`${apps} application${apps > 1 ? "s" : ""}`);
  const { count: inv } = await db.from("founding_invites").delete({ count: "exact" }).ilike("email", e).in("role", ["partner"]);
  if (inv) removed.push(`${inv} founding invite${inv > 1 ? "s" : ""}`);
  await db.from("invite_links").delete().ilike("email", e).eq("kind", "partner");
  await deleteAuthUser(e, removed, async () => {
    const { data } = await db.from("experts").select("id").ilike("email", e).maybeSingle();
    return !!data;
  });
  return { ok: true, email: e, removed, stripe };
}
