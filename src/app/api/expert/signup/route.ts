import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { clean, ok, bad, preflight } from "@/lib/signup";
import { notifySignup } from "@/lib/email/teamNotify";
import { sendExpertConfirmation } from "@/lib/email/confirmations";

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
  const website = clean(body.website, 300);
  const topics = clean(body.topics);
  const years = clean(body.years, 40);

  if (!fullName || !website || !topics || !years) {
    return bad("Please fill in every required field.");
  }

  const pre = preflight(req, body, email);
  if (pre.block) return pre.block;

  const { error } = await supabaseAdmin()
    .from("expert_applications")
    .insert({
      full_name: fullName,
      email,
      company: clean(body.company, 200) || null,
      website,
      topics,
      years_experience: years,
      existing_content: clean(body.existingContent, 80) || null,
      booking_link: clean(body.bookingLink, 300) || null,
      notes: clean(body.notes) || null,
      ip_hash: pre.ipHash,
      user_agent: pre.userAgent || null,
      utm: typeof body.utm === "object" && body.utm ? body.utm : {},
    });

  if (error) {
    console.error("expert signup insert failed:", error);
    return bad("Something went wrong on our side. Please try again.", 500);
  }

  await notifySignup("expert application", {
    Name: fullName,
    Email: email,
    Company: clean(body.company, 200),
    "Website / LinkedIn": website,
    Topics: topics,
    "Years with veterinary practices": years,
    "Existing content": clean(body.existingContent, 80),
    "Booking link": clean(body.bookingLink, 300),
    Notes: clean(body.notes),
  });
  await sendExpertConfirmation(email, fullName);

  return ok();
}
