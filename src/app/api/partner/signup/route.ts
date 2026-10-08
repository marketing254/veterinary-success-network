import { NextRequest } from "next/server";
import { clean, ok, bad, preflight, signupDb } from "@/lib/signup";
import { notifySignup } from "@/lib/email/teamNotify";
import { sendPartnerConfirmation } from "@/lib/email/confirmations";
import { consumeInviteLink } from "@/lib/inviteLink";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid request.");
  }

  const companyName = clean(body.companyName, 200);
  const website = clean(body.website, 300);
  const category = clean(body.category, 120);
  const contactName = clean(body.contactName, 160);
  const email = clean(body.email, 200).toLowerCase();
  const memberOffer = clean(body.memberOffer);

  if (!companyName || !website || !category || !contactName || !memberOffer) {
    return bad("Please fill in every required field.");
  }
  if (body.agreementAccepted !== true) {
    return bad("Please read and accept the VSN Partner Agreement to continue.");
  }

  const pre = preflight(req, body, email);
  if (pre.block) return pre.block;

  const conn = signupDb();
  if (conn.block) return conn.block;

  const { error } = await conn.db
    .from("partner_applications")
    .insert({
      company_name: companyName,
      website,
      category,
      contact_name: contactName,
      email,
      phone: clean(body.phone, 40) || null,
      member_offer: memberOffer,
      lead_response_time: clean(body.leadResponseTime, 80) || null,
      notes: clean(body.notes) || null,
      agreement_accepted: true,
      agreement_accepted_at: new Date().toISOString(),
      ip_hash: pre.ipHash,
      user_agent: pre.userAgent || null,
      utm: typeof body.utm === "object" && body.utm ? body.utm : {},
    });

  if (error) {
    console.error("partner signup insert failed:", error);
    return bad("Something went wrong on our side. Please try again.", 500);
  }

  const inviteId = await consumeInviteLink(req, "partner", email);
  await notifySignup("partner application", {
    ...(inviteId ? { "Invite link": "yes (personal invitation)" } : {}),
    Company: companyName,
    Website: website,
    Category: category,
    Contact: contactName,
    Email: email,
    Phone: clean(body.phone, 40),
    "Member offer": memberOffer,
    "Lead response time": clean(body.leadResponseTime, 80),
    Notes: clean(body.notes),
  });
  await sendPartnerConfirmation(email, contactName);

  return ok();
}
