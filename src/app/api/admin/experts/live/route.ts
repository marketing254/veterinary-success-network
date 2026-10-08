import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, requireOwner, isResponse, logAction, toCsv, csvResponse } from "@/lib/adminApi";
import { clean, EMAIL_RE } from "@/lib/signup";
import { normalizeWebUrl } from "@/lib/url";
import { deleteExpertEverywhere } from "@/lib/admin/deleteProvider";
import { ensureAuthUser } from "@/lib/providers/provision";
import { notify } from "@/lib/notify";
import { notifySignup } from "@/lib/email/teamNotify";
import { sendFoundingExpertEmail, sendExpertApproval } from "@/lib/email/confirmations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = "id, email, full_name, display_name, company_name, specialty, topics, bio, website, booking_link, headshot_url, phone, years_experience, status, source, invited_at, activated_at, invited_by, notes, agreement_signed_at, agreement_version, agreement_name, subscription_status, free_period_ends_at, billing_exempt, billing_exempt_reason, billing_exempt_granted_at, card_brand, card_last4, created_at";

/** GET list (status, q, csv) · PATCH {id, action, note} · POST add or edit profile · DELETE {email} */
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const url = new URL(req.url);
  const status = clean(url.searchParams.get("status"), 30);
  const q = clean(url.searchParams.get("q"), 120).replace(/[,()]/g, " ").trim();
  let query = supabaseAdmin().from("experts").select(COLS).order("created_at", { ascending: false }).limit(1000);
  if (status && status !== "all") query = status === "founding" ? query.eq("billing_exempt", true) : query.eq("status", status);
  if (q) query = query.or(["full_name", "email", "company_name", "specialty"].map((c) => `${c}.ilike.%${q}%`).join(","));
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: "Query failed." }, { status: 500 });
  const { data: slots } = await supabaseAdmin().from("founding_expert_slots").select("*").maybeSingle();
  if (url.searchParams.get("format") === "csv") {
    return csvResponse(toCsv(data || [], [["created_at", "Created"], ["full_name", "Name"], ["email", "Email"], ["company_name", "Company"], ["specialty", "Specialty"], ["status", "Status"], ["source", "Source"], ["billing_exempt", "Lifetime free"], ["agreement_signed_at", "Agreement"], ["subscription_status", "Billing"]]), "vsn-experts.csv");
  }
  return NextResponse.json({ ok: true, rows: data || [], slots: slots || { cap: 20, used: 0, remaining: 20 } });
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
  const { data: row } = await db.from("experts").select("id, email, full_name, status, billing_exempt, agreement_signed_at").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

  const now = new Date().toISOString();
  let patch: Record<string, unknown> | null = null;
  switch (action) {
    case "grant_free": {
      if (row.billing_exempt) return NextResponse.json({ ok: false, error: "Already lifetime free." }, { status: 409 });
      const { data: slots } = await db.from("founding_expert_slots").select("remaining").maybeSingle();
      if (!slots || Number(slots.remaining) <= 0) return NextResponse.json({ ok: false, error: "All 20 founding-expert slots are used." }, { status: 409 });
      patch = { billing_exempt: true, billing_exempt_reason: note || `Founding expert, granted by ${session.email}`, billing_exempt_granted_at: now };
      break;
    }
    case "suspend": patch = { status: "suspended", suspended_at: now }; break;
    case "reactivate": patch = { status: row.agreement_signed_at ? "active" : "invited", suspended_at: null, archived_at: null }; break;
    case "archive": patch = { status: "archived", archived_at: now }; break;
    case "resend_approval": {
      await ensureAuthUser(row.email, { role: "expert" });
      if (row.billing_exempt) await sendFoundingExpertEmail(row.email, row.full_name); else await sendExpertApproval(row.email, row.full_name);
      await logAction(session.email, "expert", id, action, note || undefined);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  }
  const { data, error } = await db.from("experts").update(patch).eq("id", id).select(COLS).maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: /cap reached/i.test(error.message) ? "All 20 founding-expert slots are used." : "Update failed." }, { status: 500 });
  await logAction(session.email, "expert", id, action, note || undefined);
  if (action === "grant_free") {
    await sendFoundingExpertEmail(row.email, row.full_name);
    await notify({ audience: "expert", expertId: id, kind: "lifetime_free", title: "Your listing is free for life", body: "The team made you a founding expert.", link: "/expert/billing" });
    await notifySignup("FOUNDING expert grant (free for life)", { Expert: row.full_name, Email: row.email, "Granted by": session.email, Note: note });
  }
  return NextResponse.json({ ok: true, row: data });
}

/** POST: { id? , ...profile } edit an existing expert, or create one by hand (no application). */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  const db = supabaseAdmin();
  const patch: Record<string, unknown> = {};
  const text = (k: string, max: number) => { if (k in body) patch[k] = clean(body[k], max) || null; };
  ["full_name", "display_name", "company_name", "specialty", "topics", "bio", "phone", "years_experience", "notes", "headshot_url"].forEach((k) => text(k, k === "bio" ? 4000 : k === "topics" ? 2000 : 500));
  for (const k of ["website", "booking_link"]) {
    if (k in body) {
      const raw = clean(body[k], 300);
      if (raw && !normalizeWebUrl(raw)) return NextResponse.json({ ok: false, error: `Invalid ${k}.` }, { status: 400 });
      patch[k] = raw ? normalizeWebUrl(raw) : null;
    }
  }
  const id = clean(body.id, 60);
  if (id) {
    if (!patch.full_name && "full_name" in body) return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
    const { data, error } = await db.from("experts").update(patch).eq("id", id).select(COLS).maybeSingle();
    if (error || !data) return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
    await logAction(session.email, "expert", id, "edit_profile");
    return NextResponse.json({ ok: true, row: data });
  }
  const email = clean(body.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email) || !patch.full_name) return NextResponse.json({ ok: false, error: "Name and a valid email are required." }, { status: 400 });
  const authUserId = await ensureAuthUser(email, { role: "expert" });
  const { data, error } = await db
    .from("experts")
    .insert({ ...patch, email, display_name: patch.display_name || patch.full_name, auth_user_id: authUserId, status: "invited", source: "admin", invited_by: session.email })
    .select(COLS)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.code === "23505" ? "That email already has an expert account." : "Insert failed." }, { status: 500 });
  await logAction(session.email, "expert", data.id, "add_manual");
  if (body.sendEmail === true) await sendExpertApproval(email, String(patch.full_name));
  return NextResponse.json({ ok: true, row: data });
}

export async function DELETE(req: NextRequest) {
  const session = await requireOwner();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = clean(body?.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "Email required." }, { status: 400 });
  const report = await deleteExpertEverywhere(email);
  await logAction(session.email, "expert", email, "delete_everywhere", report.removed.join("; "));
  return NextResponse.json({ ok: true, report });
}
