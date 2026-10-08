import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, isResponse, logAction } from "@/lib/adminApi";
import { clean, EMAIL_RE } from "@/lib/signup";
import { normalizeWebUrl } from "@/lib/url";
import { INVITE_COLS, newInviteCode, sendInvite, inviteUrl, type Invite } from "@/lib/founding/invites";
import { PARTNER_CATEGORIES } from "@/components/forms/PartnerApplicationForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET list · POST create draft (or edit draft with id) · PATCH {id, action: send|resend|revoke|reopen} */
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const status = clean(new URL(req.url).searchParams.get("status"), 20);
  let q = supabaseAdmin().from("founding_invites").select(INVITE_COLS).order("created_at", { ascending: false }).limit(500);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ ok: false, error: "Query failed." }, { status: 500 });
  return NextResponse.json({ ok: true, rows: (data ?? []).map((r) => ({ ...r, url: inviteUrl(r.code) })) });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  const role = ["expert", "partner", "both"].includes(clean(body.role, 10)) ? clean(body.role, 10) : "expert";
  const full_name = clean(body.full_name, 160);
  const email = clean(body.email, 200).toLowerCase();
  if (full_name.length < 2 || !EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "Name and a valid email are required." }, { status: 400 });
  const company_name = clean(body.company_name, 200) || null;
  if (role !== "expert" && !company_name) return NextResponse.json({ ok: false, error: "Company name is required for partner invites." }, { status: 400 });
  const category = clean(body.category, 120) || null;
  if (category && !PARTNER_CATEGORIES.includes(category) && !category.startsWith("Other")) return NextResponse.json({ ok: false, error: "Pick a category from the list." }, { status: 400 });
  const website = clean(body.website, 300);
  const booking = clean(body.booking_link, 300);
  if (website && !normalizeWebUrl(website)) return NextResponse.json({ ok: false, error: "Invalid website." }, { status: 400 });
  if (booking && !normalizeWebUrl(booking)) return NextResponse.json({ ok: false, error: "Invalid booking link." }, { status: 400 });
  const row = {
    role, full_name, email, company_name, category,
    phone: clean(body.phone, 40) || null,
    website: website ? normalizeWebUrl(website) : null,
    booking_link: booking ? normalizeWebUrl(booking) : null,
    description: clean(body.description, 2000) || null,
    member_offer: clean(body.member_offer, 2000) || null,
    signer_name: clean(body.signer_name, 160) || null,
    signer_title: clean(body.signer_title, 120) || null,
    notes: clean(body.notes, 2000) || null,
    pricing_plan: body.pricing_plan === "flat" ? "flat" : "ladder",
    expert_free_for_life: role !== "partner" && body.expert_free_for_life === true,
  };
  const db = supabaseAdmin();
  const id = clean(body.id, 60);
  if (id) {
    const { data: cur } = await db.from("founding_invites").select("status").eq("id", id).maybeSingle();
    if (!cur) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
    if (cur.status === "accepted") return NextResponse.json({ ok: false, error: "Accepted invites cannot be edited." }, { status: 409 });
    const { data, error } = await db.from("founding_invites").update(row).eq("id", id).select(INVITE_COLS).maybeSingle();
    if (error || !data) return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
    await logAction(session.email, "founding_invite", id, "edit");
    return NextResponse.json({ ok: true, row: { ...data, url: inviteUrl(data.code) } });
  }
  const { data, error } = await db.from("founding_invites").insert({ ...row, code: newInviteCode(), status: "draft", created_by: session.email }).select(INVITE_COLS).maybeSingle();
  if (error || !data) return NextResponse.json({ ok: false, error: "Insert failed." }, { status: 500 });
  await logAction(session.email, "founding_invite", data.id, "create_draft", `${role} · ${email}`);
  return NextResponse.json({ ok: true, row: { ...data, url: inviteUrl(data.code) } });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = clean(body?.id, 60);
  const action = clean(body?.action, 20);
  const db = supabaseAdmin();
  const { data } = await db.from("founding_invites").select(INVITE_COLS).eq("id", id).maybeSingle();
  const inv = data as Invite | null;
  if (!inv) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  try {
    if (action === "send" || action === "resend") {
      if (inv.status === "accepted" || inv.status === "revoked") return NextResponse.json({ ok: false, error: `Invite is ${inv.status}.` }, { status: 409 });
      if (new Date(inv.expires_at) < new Date()) await db.from("founding_invites").update({ expires_at: new Date(Date.now() + 30 * 86400000).toISOString() }).eq("id", id);
      await sendInvite(inv, session.email, action === "resend");
    } else if (action === "revoke") {
      if (inv.status === "accepted") return NextResponse.json({ ok: false, error: "Accepted invites cannot be revoked. Delete the provider instead." }, { status: 409 });
      await db.from("founding_invites").update({ status: "revoked" }).eq("id", id);
    } else if (action === "reopen") {
      if (inv.status !== "revoked") return NextResponse.json({ ok: false, error: "Only revoked invites can be reopened." }, { status: 409 });
      await db.from("founding_invites").update({ status: "draft", expires_at: new Date(Date.now() + 30 * 86400000).toISOString() }).eq("id", id);
    } else if (action === "delete") {
      if (inv.status === "accepted") return NextResponse.json({ ok: false, error: "Accepted invites are kept as the audit record." }, { status: 409 });
      await db.from("founding_invites").delete().eq("id", id);
    } else {
      return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Action failed." }, { status: 500 });
  }
  await logAction(session.email, "founding_invite", id, action, `${inv.role} · ${inv.email}`);
  const { data: fresh } = await db.from("founding_invites").select(INVITE_COLS).eq("id", id).maybeSingle();
  return NextResponse.json({ ok: true, row: fresh ? { ...fresh, url: inviteUrl(fresh.code) } : null });
}
