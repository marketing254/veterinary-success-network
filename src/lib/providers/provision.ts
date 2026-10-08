import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Promote an approved application into a live portal account.
 *  - experts / partners row (status invited / approved), profile prefilled from the application
 *  - Supabase auth user (email confirmed) so the 6-digit sign-in works at once
 *  - application.expert_id / partner_id link
 * Idempotent: re-approving returns the existing row. Called from the admin
 * approve actions (expert_applications, partner_applications). Website signups
 * never get founding links; that is the admin founding-invite path only.
 */
type ExpertApp = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  website?: string | null;
  topics?: string | null;
  years_experience?: string | null;
  booking_link?: string | null;
  notes?: string | null;
};

type PartnerApp = {
  id: string;
  company_name: string;
  website?: string | null;
  category?: string | null;
  contact_name: string;
  email: string;
  phone?: string | null;
  member_offer?: string | null;
  lead_response_time?: string | null;
  notes?: string | null;
};

/** Create the auth user if it does not exist. Returns the auth user id when known. */
export async function ensureAuthUser(email: string, meta: Record<string, unknown>): Promise<string | null> {
  const db = supabaseAdmin();
  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: meta,
  });
  if (!error && data?.user) return data.user.id;
  if (error && !/already|exists|registered/i.test(error.message)) {
    console.error("createUser failed:", error.message);
    return null;
  }
  // Already registered (also an admin, a member, or the other provider role).
  // The verify-otp route links auth_user_id at first sign-in, so null is fine here.
  return null;
}

export async function provisionExpert(app: ExpertApp, adminEmail: string, opts?: { freeForLife?: boolean }) {
  const db = supabaseAdmin();
  const email = app.email.toLowerCase();
  const { data: existing } = await db.from("experts").select("id").ilike("email", email).maybeSingle();
  if (existing) {
    await db.from("expert_applications").update({ expert_id: existing.id }).eq("id", app.id);
    return { id: existing.id as string, created: false };
  }
  const authUserId = await ensureAuthUser(email, { role: "expert", full_name: app.full_name });
  const insert: Record<string, unknown> = {
    application_id: app.id,
    auth_user_id: authUserId,
    email,
    full_name: app.full_name,
    display_name: app.full_name,
    phone: app.phone || null,
    company_name: app.company || null,
    topics: app.topics || null,
    specialty: app.topics ? app.topics.slice(0, 240) : null,
    years_experience: app.years_experience || null,
    website: app.website || null,
    booking_link: app.booking_link || null,
    notes: app.notes || null,
    status: "invited",
    invited_by: adminEmail,
    source: "website",
  };
  if (opts?.freeForLife) {
    insert.billing_exempt = true;
    insert.billing_exempt_reason = "Founding expert (free for life)";
  }
  const { data, error } = await db.from("experts").insert(insert).select("id").single();
  if (error || !data) throw new Error(`experts insert failed: ${error?.message}`);
  await db.from("expert_applications").update({ expert_id: data.id }).eq("id", app.id);
  return { id: data.id as string, created: true };
}

export async function provisionPartner(app: PartnerApp, adminEmail: string, opts?: { plan?: "ladder" | "flat" }) {
  const db = supabaseAdmin();
  const email = app.email.toLowerCase();
  const { data: existing } = await db.from("partners").select("id").ilike("contact_email", email).maybeSingle();
  if (existing) {
    await db
      .from("partners")
      .update({ status: "approved", verified: true, approved_at: new Date().toISOString(), approved_by: adminEmail })
      .eq("id", existing.id);
    await db.from("partner_applications").update({ partner_id: existing.id }).eq("id", app.id);
    return { id: existing.id as string, created: false };
  }
  const authUserId = await ensureAuthUser(email, { role: "partner", company_name: app.company_name });
  const { data, error } = await db
    .from("partners")
    .insert({
      application_id: app.id,
      auth_user_id: authUserId,
      company_name: app.company_name,
      display_name: app.company_name,
      category: app.category || null,
      website: app.website || null,
      member_offer: app.member_offer || null,
      lead_response_time: app.lead_response_time || null,
      contact_name: app.contact_name,
      contact_email: email,
      contact_phone: app.phone || null,
      notes: app.notes || null,
      status: "approved",
      verified: true,
      approved_at: new Date().toISOString(),
      approved_by: adminEmail,
      billing_plan: opts?.plan ?? "ramp",
      source: "website",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`partners insert failed: ${error?.message}`);
  await db.from("partner_applications").update({ partner_id: data.id }).eq("id", app.id);
  return { id: data.id as string, created: true };
}
