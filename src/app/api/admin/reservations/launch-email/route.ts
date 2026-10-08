import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, isResponse, logAction } from "@/lib/adminApi";
import { MEMBER_LAUNCH_ENABLED } from "@/lib/launch";
import { sendMemberLaunchEmail } from "@/lib/email/adminEmails";
import { siteOrigin } from "@/lib/referral";
import { notifySignup } from "@/lib/email/teamNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { ids: string[] } → "The doors are open" email to the selected reservations.
 * Only when MEMBER_LAUNCH_ENABLED=true. Stamps launch_email_sent_at; skips rows already stamped unless { resend: true }.
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  if (!MEMBER_LAUNCH_ENABLED) {
    return NextResponse.json({ ok: false, error: "Member launch is off. Set MEMBER_LAUNCH_ENABLED=true (and the NEXT_PUBLIC twin) in Vercel, redeploy, then send." }, { status: 409 });
  }
  const body = (await req.json().catch(() => null)) as { ids?: unknown; resend?: boolean } | null;
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((x): x is string => typeof x === "string").slice(0, 200) : [];
  if (!ids.length) return NextResponse.json({ ok: false, error: "Select at least one reservation." }, { status: 400 });
  const db = supabaseAdmin();
  const { data: rows } = await db.from("member_reservations").select("id, full_name, email, status, launch_email_sent_at").in("id", ids);
  let sent = 0;
  const skipped: string[] = [];
  for (const r of rows ?? []) {
    if (r.status === "cancelled" || r.status === "converted") { skipped.push(`${r.email} (${r.status})`); continue; }
    if (r.launch_email_sent_at && !body?.resend) { skipped.push(`${r.email} (already sent)`); continue; }
    try {
      await sendMemberLaunchEmail({ to: r.email, fullName: r.full_name, joinUrl: `${siteOrigin()}/join?wl=${r.id}` });
      await db.from("member_reservations").update({ launch_email_sent_at: new Date().toISOString(), status: r.status === "reserved" ? "invited" : r.status, reviewed_by: session.email, reviewed_at: new Date().toISOString() }).eq("id", r.id);
      sent += 1;
    } catch (err) {
      console.error("launch email failed for", r.email, err);
      skipped.push(`${r.email} (send failed)`);
    }
  }
  await logAction(session.email, "member_reservation", ids.join(","), "launch_email", `${sent} sent; ${skipped.length} skipped`);
  await notifySignup("launch emails sent", { Sent: String(sent), Skipped: skipped.join(", ") || "none", "Sent by": session.email });
  return NextResponse.json({ ok: true, sent, skipped });
}
