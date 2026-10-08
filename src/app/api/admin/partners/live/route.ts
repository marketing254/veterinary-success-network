import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, requireOwner, isResponse, logAction, toCsv, csvResponse } from "@/lib/adminApi";
import { clean, EMAIL_RE } from "@/lib/signup";
import { normalizeWebUrl } from "@/lib/url";
import { deletePartnerEverywhere } from "@/lib/admin/deleteProvider";
import { ensureAuthUser } from "@/lib/providers/provision";
import { notify } from "@/lib/notify";
import { sendPartnerApproval } from "@/lib/email/confirmations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = "id, billing_parent_id, company_name, display_name, category, website, description, member_offer, logo_url, booking_link, lead_response_time, contact_name, contact_email, contact_phone, billing_email, signer_name, signer_title, status, verified, approved_at, approved_by, source, billing_plan, notes, agreement_signed_at, agreement_version, agreement_name, subscription_status, free_period_ends_at, card_brand, card_last4, created_at";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const url = new URL(req.url);
  const status = clean(url.searchParams.get("status"), 30);
  const q = clean(url.searchParams.get("q"), 120).replace(/[,()]/g, " ").trim();
  let query = supabaseAdmin().from("partners").select(COLS).order("created_at", { ascending: false }).limit(1000);
  if (status && status !== "all") query = status === "covered" ? query.not("billing_parent_id", "is", null) : query.eq("status", status);
  if (q) query = query.or(["company_name", "contact_name", "contact_email", "category"].map((c) => `${c}.ilike.%${q}%`).join(","));
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: "Query failed." }, { status: 500 });
  if (url.searchParams.get("format") === "csv") {
    return csvResponse(toCsv(data || [], [["created_at", "Created"], ["company_name", "Company"], ["contact_name", "Contact"], ["contact_email", "Email"], ["category", "Category"], ["status", "Status"], ["verified", "Verified"], ["billing_plan", "Plan"], ["agreement_signed_at", "Agreement"], ["subscription_status", "Billing"]]), "vsn-partners.csv");
  }
  return NextResponse.json({ ok: true, rows: data || [] });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  const id = clean(body.id, 60);
  const action = clean(body.action, 40);
  const note = clean(body.note, 1000);
  const db = supabaseAdmin();
  const { data: row } = await db.from("partners").select("id, contact_email, contact_name, company_name, status, verified, billing_plan").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  const now = new Date().toISOString();
  let patch: Record<string, unknown> | null = null;
  switch (action) {
    case "approve": patch = { status: "approved", verified: true, approved_at: now, approved_by: session.email }; break;
    case "verify": patch = { verified: true }; break;
    case "unverify": patch = { verified: false }; break;
    case "suspend": patch = { status: "suspended", suspended_at: now }; break;
    case "reactivate": patch = { status: "approved", suspended_at: null }; break;
    case "churn": patch = { status: "churned" }; break;
    case "reject": patch = { status: "rejected" }; break;
    case "plan_ladder": patch = { billing_plan: "ladder" }; break;
    case "plan_flat": patch = { billing_plan: "flat" }; break;
    case "grant_login": {
      await ensureAuthUser(row.contact_email, { role: "partner" });
      await logAction(session.email, "partner", id, action, note || undefined);
      return NextResponse.json({ ok: true });
    }
    case "resend_approval": {
      await ensureAuthUser(row.contact_email, { role: "partner" });
      await sendPartnerApproval(row.contact_email, row.contact_name, row.company_name);
      await logAction(session.email, "partner", id, action, note || undefined);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  }
  const { data, error } = await db.from("partners").update(patch).eq("id", id).select(COLS).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
  await logAction(session.email, "partner", id, action, note || undefined);
  if (action === "approve" && row.status !== "approved") {
    await ensureAuthUser(row.contact_email, { role: "partner" });
    await sendPartnerApproval(row.contact_email, row.contact_name, row.company_name);
  }
  if (action.startsWith("plan_")) await notify({ audience: "partner", partnerId: id, kind: "plan_changed", title: "Your plan was updated", body: action === "plan_flat" ? "$39 a month after the free months, no increase." : "$39 a month for 12 months after the free months, then $149.", link: "/partner/account" });
  return NextResponse.json({ ok: true, row: data });
}

/** POST { id?, ... } edit, or add a company by hand (optionally covered by billing_parent_id). */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  const db = supabaseAdmin();
  const patch: Record<string, unknown> = {};
  const text = (k: string, max: number) => { if (k in body) patch[k] = clean(body[k], max) || null; };
  ["company_name", "display_name", "category", "description", "member_offer", "logo_url", "lead_response_time", "contact_name", "contact_phone", "billing_email", "signer_name", "signer_title", "notes"].forEach((k) => text(k, 2000));
  for (const k of ["website", "booking_link"]) {
    if (k in body) {
      const raw = clean(body[k], 300);
      if (raw && !normalizeWebUrl(raw)) return NextResponse.json({ ok: false, error: `Invalid ${k}.` }, { status: 400 });
      patch[k] = raw ? normalizeWebUrl(raw) : null;
    }
  }
  if ("billing_plan" in body) patch.billing_plan = body.billing_plan === "flat" ? "flat" : "ladder";
  if ("billing_parent_id" in body) {
    const pid = clean(body.billing_parent_id, 60);
    if (pid) {
      const { data: parent } = await db.from("partners").select("id").eq("id", pid).is("billing_parent_id", null).maybeSingle();
      if (!parent) return NextResponse.json({ ok: false, error: "Billing parent must be a principal (non-covered) partner." }, { status: 400 });
    }
    patch.billing_parent_id = pid || null;
  }
  const id = clean(body.id, 60);
  if (id) {
    const { data, error } = await db.from("partners").update(patch).eq("id", id).select(COLS).maybeSingle();
    if (error || !data) return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
    await logAction(session.email, "partner", id, "edit_profile");
    return NextResponse.json({ ok: true, row: data });
  }
  const email = clean(body.contact_email, 200).toLowerCase();
  if (!EMAIL_RE.test(email) || !patch.company_name || !patch.contact_name) return NextResponse.json({ ok: false, error: "Company, contact name and a valid email are required." }, { status: 400 });
  const authUserId = await ensureAuthUser(email, { role: "partner" });
  const { data, error } = await db
    .from("partners")
    .insert({ ...patch, contact_email: email, display_name: patch.display_name || patch.company_name, auth_user_id: authUserId, status: "approved", verified: true, approved_at: new Date().toISOString(), approved_by: session.email, source: "admin" })
    .select(COLS)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.code === "23505" ? "That email already has a partner account." : "Insert failed." }, { status: 500 });
  await logAction(session.email, "partner", data.id, "add_manual", patch.billing_parent_id ? `covered by ${patch.billing_parent_id}` : undefined);
  if (body.sendEmail === true) await sendPartnerApproval(email, String(patch.contact_name), String(patch.company_name));
  return NextResponse.json({ ok: true, row: data });
}

export async function DELETE(req: NextRequest) {
  const session = await requireOwner();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = clean(body?.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "Email required." }, { status: 400 });
  const report = await deletePartnerEverywhere(email);
  await logAction(session.email, "partner", email, "delete_everywhere", report.removed.join("; "));
  return NextResponse.json({ ok: true, report });
}
