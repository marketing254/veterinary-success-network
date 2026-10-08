import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, isResponse, logAction } from "@/lib/adminApi";
import { clean, EMAIL_RE } from "@/lib/signup";
import { newInviteCode } from "@/lib/founding/invites";
import { siteOrigin } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Standard (non-founding) personalised invite links: /invite/<code> greets the
 * person by name and sends them to the normal application form. The admin
 * pastes the link into a manually written email. No agreement, no payment.
 */
export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const { data, error } = await supabaseAdmin().from("invite_links").select("*").order("created_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ ok: false, error: "Query failed." }, { status: 500 });
  return NextResponse.json({ ok: true, rows: (data ?? []).map((r) => ({ ...r, url: `${siteOrigin()}/invite/${r.code}` })) });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = clean(body?.kind, 10) === "partner" ? "partner" : "expert";
  const full_name = clean(body?.full_name, 160);
  const email = clean(body?.email, 200).toLowerCase();
  if (full_name.length < 2) return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  if (email && !EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "Invalid email." }, { status: 400 });
  const { data, error } = await supabaseAdmin()
    .from("invite_links")
    .insert({ code: newInviteCode().slice(0, 14), kind, full_name, email: email || null, company_name: clean(body?.company_name, 200) || null, notes: clean(body?.notes, 1000) || null, created_by: session.email })
    .select("*")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ ok: false, error: "Insert failed." }, { status: 500 });
  await logAction(session.email, "invite_link", data.id, "create", `${kind} · ${full_name}`);
  return NextResponse.json({ ok: true, row: { ...data, url: `${siteOrigin()}/invite/${data.code}` } });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const id = clean(body?.id, 60);
  const action = clean(body?.action, 20);
  const status = action === "revoke" ? "revoked" : action === "reactivate" ? "active" : null;
  if (!status) return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  const { error } = await supabaseAdmin().from("invite_links").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "Update failed." }, { status: 500 });
  await logAction(session.email, "invite_link", id, action);
  return NextResponse.json({ ok: true });
}
