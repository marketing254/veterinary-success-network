import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { clean, ok, bad, preflight, isUniqueViolation } from "@/lib/signup";
import { notifySignup } from "@/lib/email/teamNotify";
import { sendFreeKitConfirmation } from "@/lib/email/confirmations";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request.");
  }

  const fullName = clean(body.fullName, 160);
  const email = clean(body.email, 200).toLowerCase();
  if (!fullName) return bad("Please fill in every required field.");

  const pre = preflight(req, body, email);
  if (pre.block) return pre.block;

  const { error } = await supabaseAdmin()
    .from("free_kit_signups")
    .insert({
      full_name: fullName,
      email,
      practice_name: clean(body.practiceName, 200) || null,
      ip_hash: pre.ipHash,
      user_agent: pre.userAgent || null,
      utm: typeof body.utm === "object" && body.utm ? body.utm : {},
    });

  if (error) {
    if (isUniqueViolation(error)) return ok("You're already on the list — the kit is coming your way.");
    console.error("free-kit insert failed:", error);
    return bad("Something went wrong on our side. Please try again.", 500);
  }

  await notifySignup("free-kit signup", {
    Name: fullName,
    Email: email,
    Practice: clean(body.practiceName, 200),
  });
  await sendFreeKitConfirmation(email, fullName);

  return ok();
}
