import { NextRequest, NextResponse } from "next/server";
import { requirePartner } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";
import { sendEmail, purposeFrom, purposeReplyTo, emailShell } from "@/lib/email/mailer";
import { escapeHtml } from "@/lib/email/teamNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  const route = "GET /api/partner/inquiries/[id]";
  try {
    const db = supabaseAdmin();
    const { data: inq } = await db
      .from("partner_inquiries")
      .select("id, from_name, from_email, practice_name, subject, body, source, status, reply_count, created_at")
      .eq("id", params.id)
      .eq("partner_id", guard.partnerId)
      .maybeSingle();
    if (!inq) return apiError.notFound(route);
    const { data: replies } = await db.from("partner_inquiry_replies").select("id, author_kind, author_display_name, body, created_at").eq("inquiry_id", inq.id).order("created_at", { ascending: true });
    return NextResponse.json({ ok: true, inquiry: inq, replies: replies ?? [] });
  } catch (err) {
    return serverError(err, { route });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  const route = "POST /api/partner/inquiries/[id]";
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const text = clean(body?.body, 4000);
    if (!text) return apiError.validation("Write a reply first.", route);
    const db = supabaseAdmin();
    const { data: inq } = await db.from("partner_inquiries").select("id, from_name, from_email, subject").eq("id", params.id).eq("partner_id", guard.partnerId).maybeSingle();
    if (!inq) return apiError.notFound(route);
    const { data: me } = await db.from("partners").select("display_name, company_name, contact_name, contact_email, booking_link").eq("id", guard.partnerId).maybeSingle();
    const company = me?.display_name || me?.company_name || guard.companyName;
    const author = `${me?.contact_name || "Partner"} at ${company}`;
    const { error } = await db.from("partner_inquiry_replies").insert({ inquiry_id: inq.id, author_kind: "partner", author_display_name: author, body: text });
    if (error) throw error;
    try {
      await sendEmail({
        from: purposeFrom("partners"),
        replyTo: me?.contact_email || purposeReplyTo("partners"),
        to: inq.from_email,
        template: "member_partner_reply",
        subject: `${company} replied to your question | Veterinary Success Network`,
        html: emailShell(
          `${escapeHtml(company)} replied.`,
          `<p style="font-size:14px;line-height:1.6;color:#2c3a22;margin:0 0 12px;">Hi ${escapeHtml(inq.from_name.split(/\s+/)[0] || "there")},</p>
           <p style="font-size:14px;line-height:1.6;color:#2c3a22;margin:0 0 12px;">${escapeHtml(author)} answered your question${inq.subject ? ` about <b>${escapeHtml(inq.subject)}</b>` : ""} through the Veterinary Success Network:</p>
           <blockquote style="margin:0 0 14px;padding:12px 16px;border-left:3px solid #55B900;background:#f6fbf0;font-size:14px;line-height:1.6;color:#2c3a22;white-space:pre-wrap;">${escapeHtml(text)}</blockquote>
           ${me?.booking_link ? `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;"><a href="${escapeHtml(me.booking_link)}" style="color:#3BAB00;font-weight:700;">Book time with ${escapeHtml(company)}</a></p>` : ""}
           <p style="font-size:13px;line-height:1.6;color:#74806a;margin:0;">Reply to this email to continue the conversation directly with ${escapeHtml(company)}.</p>`
        ),
      });
    } catch (err) {
      console.error("partner reply email failed:", err);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  const route = "PATCH /api/partner/inquiries/[id]";
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const status = clean(body?.status, 20);
    if (!["open", "answered", "closed"].includes(status)) return apiError.badRequest("Unknown status.", route);
    const { error } = await supabaseAdmin().from("partner_inquiries").update({ status }).eq("id", params.id).eq("partner_id", guard.partnerId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route });
  }
}
