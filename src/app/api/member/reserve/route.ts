import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { clean, ok, bad, preflight, isUniqueViolation } from "@/lib/signup";
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

  const pre = preflight(req, body, email);
  if (pre.block) return pre.block;

  const { error } = await supabaseAdmin()
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
      ip_hash: pre.ipHash,
      user_agent: pre.userAgent || null,
      utm: typeof body.utm === "object" && body.utm ? body.utm : {},
    });

  if (error) {
    if (isUniqueViolation(error)) {
      return ok("You already have a reservation with this email — your spot is safe.");
    }
    console.error("member reserve insert failed:", error);
    return bad("Something went wrong on our side. Please try again.", 500);
  }

  await notifySignup("member reservation", {
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
  await sendReservationConfirmation(email, fullName, plan === "founding" ? "Founding ($49/mo)" : plan);

  return ok();
}
