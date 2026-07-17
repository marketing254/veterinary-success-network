import { NextRequest, NextResponse } from "next/server";
import { makeHandlers } from "@/lib/adminRecords";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin, isResponse, logAction } from "@/lib/adminApi";
import { clean, EMAIL_RE } from "@/lib/signup";
import { sendMemberWelcome } from "@/lib/email/confirmations";
import { notifySignup } from "@/lib/email/teamNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = makeHandlers({
  table: "members",
  entityType: "member",
  searchColumns: ["full_name", "email", "practice_name"],
  orderBy: { column: "activated_at", ascending: false },
  review: false,
  actions: {
    pause: "paused",
    reactivate: "active",
  },
  csvColumns: [
    ["activated_at", "Activated at"],
    ["full_name", "Full name"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["practice_name", "Practice"],
    ["role", "Role"],
    ["plan", "Plan"],
    ["billing", "Billing"],
    ["status", "Status"],
    ["activated_by", "Activated by"],
  ],
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;

/**
 * Activate a founding member.
 * Body: { reservationId } — activate from a waitlist reservation (flips it to converted), or
 *       { fullName, email, ... } — manual activation.
 * Sends the welcome email, audits, and notifies the team.
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isResponse(session)) return session;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const db = supabaseAdmin();
  const reservationId = clean(body.reservationId, 60);

  let member: Record<string, unknown>;
  let position: number | null = null;

  if (reservationId) {
    const { data: r } = await db.from("member_reservations").select("*").eq("id", reservationId).maybeSingle();
    if (!r) return NextResponse.json({ ok: false, error: "Reservation not found." }, { status: 404 });
    position = r.position ?? null;
    member = {
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      practice_name: r.practice_name,
      role: r.role,
      location: r.location,
      plan: r.plan,
      billing: r.billing,
      reservation_id: r.id,
      activated_by: session.email,
    };
  } else {
    const fullName = clean(body.fullName, 160);
    const email = clean(body.email, 200).toLowerCase();
    if (!fullName || !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "Name and a valid email are required." }, { status: 400 });
    }
    member = {
      full_name: fullName,
      email,
      phone: clean(body.phone, 40) || null,
      practice_name: clean(body.practiceName, 200) || null,
      role: clean(body.role, 80) || null,
      plan: ["founding", "early", "standard"].includes(clean(body.plan)) ? clean(body.plan) : "founding",
      billing: ["monthly", "annual"].includes(clean(body.billing)) ? clean(body.billing) : "monthly",
      activated_by: session.email,
    };
  }

  const { data, error } = await db.from("members").insert(member).select().maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: false, error: "That email is already an active member." }, { status: 409 });
    }
    console.error("member activation failed:", error);
    return NextResponse.json({ ok: false, error: "Activation failed." }, { status: 500 });
  }

  if (reservationId) {
    await db
      .from("member_reservations")
      .update({ status: "converted", reviewed_by: session.email, reviewed_at: new Date().toISOString() })
      .eq("id", reservationId);
  }

  await logAction(
    session.email,
    "member",
    data!.id,
    "activate",
    reservationId ? `from reservation ${reservationId}` : "manual activation"
  );
  await sendMemberWelcome(String(member.email), String(member.full_name), position);
  await notifySignup("member activation", {
    Member: String(member.full_name),
    Email: String(member.email),
    Practice: String(member.practice_name || ""),
    Spot: position ? `#${position}` : "manual",
    "Activated by": session.email,
  });

  return NextResponse.json({ ok: true, row: data });
}
