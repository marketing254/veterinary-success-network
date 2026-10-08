import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, isResponse, logAction } from "@/lib/adminApi";
import { clean, EMAIL_RE } from "@/lib/signup";
import { notify } from "@/lib/notify";
import { sendExpertInquiryAlert } from "@/lib/email/expertPortal";
import { sendPartnerInquiryAlert } from "@/lib/email/partnerPortal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/admin/inquiries?status=open|answered|closed|all   expert + partner inquiries, newest first
 * POST { target: expert|partner, target_id, from_name, from_email, practice_name?, subject?, body, source? }
 *      Hotline triage: route a member question to an expert or partner. Alerts them by bell + email.
 * PATCH { target, id, status }
 */
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const status = clean(new URL(req.url).searchParams.get("status"), 20) || "all";
  const db = supabaseAdmin();
  let eq = db.from("expert_inquiries").select("id, expert_id, from_name, from_email, practice_name, subject, body, source, status, reply_count, created_by, created_at, updated_at, experts(full_name, display_name, email)").order("updated_at", { ascending: false }).limit(300);
  let pq = db.from("partner_inquiries").select("id, partner_id, from_name, from_email, practice_name, subject, body, source, status, reply_count, created_by, created_at, updated_at, partners(company_name, display_name, contact_email)").order("updated_at", { ascending: false }).limit(300);
  if (status !== "all") {
    eq = eq.eq("status", status);
    pq = pq.eq("status", status);
  }
  const [{ data: e }, { data: p }] = await Promise.all([eq, pq]);
  const rows = [
    ...(e ?? []).map((r) => {
      const o = (Array.isArray(r.experts) ? r.experts[0] : r.experts) as { full_name: string; display_name: string | null; email: string } | null;
      return { ...r, experts: undefined, target: "expert", target_id: r.expert_id, target_name: o?.display_name || o?.full_name || "Expert", target_email: o?.email };
    }),
    ...(p ?? []).map((r) => {
      const o = (Array.isArray(r.partners) ? r.partners[0] : r.partners) as { company_name: string; display_name: string | null; contact_email: string } | null;
      return { ...r, partners: undefined, target: "partner", target_id: r.partner_id, target_name: o?.display_name || o?.company_name || "Partner", target_email: o?.contact_email };
    }),
  ].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  const target = clean(body.target, 10) === "partner" ? "partner" : "expert";
  const targetId = clean(body.target_id, 60);
  const from_name = clean(body.from_name, 160);
  const from_email = clean(body.from_email, 200).toLowerCase();
  const text = clean(body.body, 4000);
  if (!targetId || from_name.length < 2 || !EMAIL_RE.test(from_email) || text.length < 2) return NextResponse.json({ ok: false, error: "Recipient, member name, a valid email and the question are required." }, { status: 400 });
  const source = ["hotline", "admin", "profile", "resource", "offer"].includes(clean(body.source, 20)) ? clean(body.source, 20) : "hotline";
  const db = supabaseAdmin();
  const row = { from_name, from_email, practice_name: clean(body.practice_name, 200) || null, subject: clean(body.subject, 200) || null, body: text, source: source === "resource" && target === "partner" ? "admin" : source === "offer" && target === "expert" ? "admin" : source, status: "open", created_by: session.email };

  if (target === "expert") {
    const { data: ex } = await db.from("experts").select("id, email, full_name, display_name").eq("id", targetId).maybeSingle();
    if (!ex) return NextResponse.json({ ok: false, error: "Expert not found." }, { status: 404 });
    const { data, error } = await db.from("expert_inquiries").insert({ ...row, expert_id: ex.id }).select("id").single();
    if (error) return NextResponse.json({ ok: false, error: "Insert failed." }, { status: 500 });
    await notify({ audience: "expert", expertId: ex.id, kind: "inquiry", title: `New inquiry from ${from_name}`, body: text.slice(0, 160), link: "/expert/inquiries" });
    await sendExpertInquiryAlert({ email: ex.email, name: ex.display_name || ex.full_name, fromName: from_name, subject: row.subject, preview: text });
    await logAction(session.email, "expert_inquiry", data.id, "route_inquiry", `to ${ex.email}`);
    return NextResponse.json({ ok: true, id: data.id });
  }
  const { data: pr } = await db.from("partners").select("id, contact_email, contact_name, company_name, display_name").eq("id", targetId).maybeSingle();
  if (!pr) return NextResponse.json({ ok: false, error: "Partner not found." }, { status: 404 });
  const { data, error } = await db.from("partner_inquiries").insert({ ...row, partner_id: pr.id }).select("id").single();
  if (error) return NextResponse.json({ ok: false, error: "Insert failed." }, { status: 500 });
  await db.from("partner_events").insert({ partner_id: pr.id, kind: "inquiry", ref_id: data.id });
  await notify({ audience: "partner", partnerId: pr.id, kind: "inquiry", title: `New inquiry from ${from_name}`, body: text.slice(0, 160), link: "/partner/inquiries" });
  await sendPartnerInquiryAlert({ email: pr.contact_email, contactName: pr.contact_name, companyName: pr.display_name || pr.company_name, fromName: from_name, subject: row.subject, preview: text });
  await logAction(session.email, "partner_inquiry", data.id, "route_inquiry", `to ${pr.contact_email}`);
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const target = clean(body?.target, 10) === "partner" ? "partner_inquiries" : "expert_inquiries";
  const id = clean(body?.id, 60);
  const status = clean(body?.status, 20);
  if (!["open", "answered", "closed"].includes(status)) return NextResponse.json({ ok: false, error: "Unknown status." }, { status: 400 });
  const { error } = await supabaseAdmin().from(target).update({ status }).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
  await logAction(session.email, target === "partner_inquiries" ? "partner_inquiry" : "expert_inquiry", id, `set_${status}`);
  return NextResponse.json({ ok: true });
}
