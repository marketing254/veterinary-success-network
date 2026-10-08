import { NextRequest, NextResponse } from "next/server";
import { requireExpert } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";
import { sendEmail, purposeFrom, purposeReplyTo, emailShell } from "@/lib/email/mailer";
import { escapeHtml } from "@/lib/email/teamNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET thread · POST { body } reply (emails the member) · PATCH { status } */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  const route = "GET /api/expert/inquiries/[id]";
  try {
    const db = supabaseAdmin();
    const { data: inq } = await db
      .from("expert_inquiries")
      .select("id, from_name, from_email, practice_name, subject, body, source, status, reply_count, created_at")
      .eq("id", params.id)
      .eq("expert_id", guard.expertId)
      .maybeSingle();
    if (!inq) return apiError.notFound(route);
    const { data: replies } = await db
      .from("expert_inquiry_replies")
      .select("id, author_kind, author_display_name, body, created_at")
      .eq("inquiry_id", inq.id)
      .order("created_at", { ascending: true });
    return NextResponse.json({ ok: true, inquiry: inq, replies: replies ?? [] });
  } catch (err) {
    return serverError(err, { route });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  const route = "POST /api/expert/inquiries/[id]";
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const text = clean(body?.body, 4000);
    if (!text) return apiError.validation("Write a reply first.", route);
    const db = supabaseAdmin();
    const { data: inq } = await db
      .from("expert_inquiries")
      .select("id, from_name, from_email, subject")
      .eq("id", params.id)
      .eq("expert_id", guard.expertId)
      .maybeSingle();
    if (!inq) return apiError.notFound(route);
    const { data: me } = await db.from("experts").select("display_name, full_name, email, booking_link").eq("id", guard.expertId).maybeSingle();
    const name = me?.display_name || me?.full_name || guard.fullName;

    const { error } = await db.from("expert_inquiry_replies").insert({ inquiry_id: inq.id, author_kind: "expert", author_display_name: name, body: text });
    if (error) throw error;

    // Email the member the reply (reply-to goes to the expert). Fail-soft.
    try {
      await sendEmail({
        from: purposeFrom("experts"),
        replyTo: me?.email || purposeReplyTo("experts"),
        to: inq.from_email,
        template: "member_inquiry_reply",
        subject: `${name} replied to your question | Veterinary Success Network`,
        html: emailShell(
          `${escapeHtml(name)} replied.`,
          `<p style="font-size:14px;line-height:1.6;color:#2c3a22;margin:0 0 12px;">Hi ${escapeHtml(inq.from_name.split(/\s+/)[0] || "there")},</p>
           <p style="font-size:14px;line-height:1.6;color:#2c3a22;margin:0 0 12px;">${escapeHtml(name)} answered your question${inq.subject ? ` about <b>${escapeHtml(inq.subject)}</b>` : ""} through the Veterinary Success Network:</p>
           <blockquote style="margin:0 0 14px;padding:12px 16px;border-left:3px solid #55B900;background:#f6fbf0;font-size:14px;line-height:1.6;color:#2c3a22;white-space:pre-wrap;">${escapeHtml(text)}</blockquote>
           ${me?.booking_link ? `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;"><a href="${escapeHtml(me.booking_link)}" style="color:#3BAB00;font-weight:700;">Book time with ${escapeHtml(name)}</a></p>` : ""}
           <p style="font-size:13px;line-height:1.6;color:#74806a;margin:0;">Reply to this email to continue the conversation directly with ${escapeHtml(name)}.</p>`
        ),
      });
    } catch (err) {
      console.error("inquiry reply email failed:", err);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  const route = "PATCH /api/expert/inquiries/[id]";
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const status = clean(body?.status, 20);
    if (!["open", "answered", "closed"].includes(status)) return apiError.badRequest("Unknown status.", route);
    const { error } = await supabaseAdmin().from("expert_inquiries").update({ status }).eq("id", params.id).eq("expert_id", guard.expertId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route });
  }
}
