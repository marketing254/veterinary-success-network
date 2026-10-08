import { makeHandlers } from "@/lib/adminRecords";
import { sendExpertApproval, sendFoundingExpertEmail } from "@/lib/email/confirmations";
import { notifySignup } from "@/lib/email/teamNotify";
import { provisionExpert } from "@/lib/providers/provision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = makeHandlers({
  table: "expert_applications",
  entityType: "expert_application",
  searchColumns: ["full_name", "email", "company", "topics"],
  orderBy: { column: "created_at", ascending: false },
  review: true,
  decisionNote: true,
  // Approval emails fire ONLY on the first transition into approved.
  // "approve" = public ramp email (§4); "approve_founding" = the PRIVATE
  // free-for-life founding-expert email (§5) for the invitation-only 20.
  afterAction: async (adminEmail, row, action, priorStatus) => {
    if (priorStatus === "approved") return;
    // Approval = live portal account (experts row + auth user) so the 6-digit sign-in works.
    if (action === "approve" || action === "approve_founding") {
      try {
        await provisionExpert(row as Parameters<typeof provisionExpert>[0], adminEmail, {
          freeForLife: action === "approve_founding",
        });
      } catch (err) {
        console.error("provisionExpert failed (run migrations 0010 to 0016):", err);
      }
    }
    if (action === "approve") {
      await sendExpertApproval(row.email, row.full_name);
      await notifySignup("expert approval", {
        Expert: row.full_name,
        Email: row.email,
        Company: row.company,
        "Approved by": adminEmail,
      });
    } else if (action === "approve_founding") {
      await sendFoundingExpertEmail(row.email, row.full_name);
      await notifySignup("FOUNDING expert approval (free for life)", {
        Expert: row.full_name,
        Email: row.email,
        Company: row.company,
        "Approved by": adminEmail,
      });
    }
  },
  actions: {
    start_review: "in_review",
    approve: "approved",
    approve_founding: "approved",
    decline: "declined",
    restore: "new",
  },
  csvColumns: [
    ["created_at", "Applied at"],
    ["full_name", "Full name"],
    ["email", "Email"],
    ["company", "Company"],
    ["website", "Website / LinkedIn"],
    ["topics", "Topics"],
    ["years_experience", "Years with veterinary practices"],
    ["existing_content", "Existing content"],
    ["booking_link", "Booking link"],
    ["status", "Status"],
    ["notes", "Notes"],
  ],
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
