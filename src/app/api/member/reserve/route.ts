import { NextRequest } from "next/server";
import { clean, ok, bad, preflight, isUniqueViolation, signupDb } from "@/lib/signup";
import { notifySignup } from "@/lib/email/teamNotify";
import { sendReservationConfirmation } from "@/lib/email/confirmations";

export const runtime = "nodejs";

const PLANS = ["founding", "early", "standard"];
const BILLING = ["monthly", "annual"];

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request.");
  }

  const fullName = clean(body.fullName, 160);
  const email = clean(body.email, 200).toLowerCase();
  const practiceName = clean(body.practiceName, 200);
  const role = clean(body.role, 80);
  const plan = PLANS.includes(clean(body.plan)) ? clean(body.plan) : "founding";
  const billing = BILLING.includes(clean(body.billing)) ? clean(body.billing) : "monthly";

  if (!fullName || !practiceName || !role) return bad("Please fill in every required field.");
  if (body.agreementAccepted !== true) {
    return bad("Please read and accept the VSN Member Agreement to continue.");
  }

  const pre = preflight(req, body, email);
  if (pre.block) return pre.block;

  const conn = signupDb();
  if (conn.block) return conn.block;

  const { data: inserted, error } = await conn.db
    .from("member_reservations")
    .insert({
      full_name: fullName,
      email,
      phone: clean(body.phone, 40) || null,
      practice_name: practiceName,
      role,
      location: clean(body.location, 160) || null,
      first_question: clean(body.firstQuestion) || null,
      plan,
      billing,
      agreement_accepted: true,
      agreement_accepted_at: new Date().toISOString(),
      ip_hash: pre.ipHash,
      user_agent: pre.userAgent || null,
      utm: typeof body.utm === "object" && body.utm ? body.utm : {},
    })
    .select("id, position")
    .maybeSingle();

  if (error) {
    if (isUniqueViolation(error)) {
      return ok("You already have a reservation with this email. Your spot is safe.");
    }
    console.error("member reserve insert failed:", error);
    return bad("Something went wrong on our side. Please try again.", 500);
  }

  // Referral attribution (vsn_ref cookie from ?ref=CODE, or a code typed on the form). Best effort.
  let referredBy: string | null = null;
  try {
    const raw = clean(body.ref, 16) || req.cookies.get("vsn_ref")?.value || "";
    if (inserted?.id && /^[A-Za-z0-9-]{4,16}$/.test(raw)) {
      const { data: code } = await conn.db
        .from("referral_codes")
        .select("id, code, expert_id, partner_id")
        .ilike("code", raw)
        .eq("active", true)
        .maybeSingle();
      if (code) {
        await conn.db.from("member_reservations").update({ referral_code_id: code.id }).eq("id", inserted.id);
        await conn.db.from("referral_signups").insert({ code_id: code.id, reservation_id: inserted.id, email });
        referredBy = code.code;
      }
    }
  } catch (err) {
    console.error("referral attribution skipped:", err);
  }

  await notifySignup("member reservation", {
    ...(referredBy ? { "Referred by code": referredBy } : {}),
    Name: fullName,
    Email: email,
    Practice: practiceName,
    Role: role,
    Plan: plan,
    Billing: billing,
    Phone: clean(body.phone, 40),
    Location: clean(body.location, 160),
    "First hotline question": clean(body.firstQuestion),
  });
  await sendReservationConfirmation(email, fullName, inserted?.id ?? null);

  return ok();
}
