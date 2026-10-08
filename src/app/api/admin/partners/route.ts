import { makeHandlers } from "@/lib/adminRecords";
import { sendPartnerApproval } from "@/lib/email/confirmations";
import { notifySignup } from "@/lib/email/teamNotify";
import { provisionPartner } from "@/lib/providers/provision";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = makeHandlers({
  table: "partner_applications",
  entityType: "partner_application",
  searchColumns: ["company_name", "contact_name", "email", "category"],
  orderBy: { column: "created_at", ascending: false },
  review: true,
  decisionNote: true,
  // Approval email fires ONLY on the first transition into approved.
  afterAction: async (adminEmail, row, action, priorStatus, body) => {
    if ((action === "approve" || action === "approve_flat") && priorStatus !== "approved") {
      // Approval = live portal account (partners row, verified, + auth user).
      // Plan: ladder ($39 x 12 then $149, default) or flat ($39, no increase) via action or body.rate.
      const rate = action === "approve_flat" || body.rate === "flat" ? "flat" : "ladder";
      try {
        await provisionPartner(row as Parameters<typeof provisionPartner>[0], adminEmail, { plan: rate });
      } catch (err) {
        console.error("provisionPartner failed (run migrations 0010 to 0016):", err);
      }
      await sendPartnerApproval(row.email, row.contact_name, row.company_name);
      await notifySignup("partner approval", {
        Company: row.company_name,
        Contact: row.contact_name,
        Email: row.email,
        Category: row.category,
        Plan: rate === "flat" ? "$39 flat" : "$39 x 12 then $149",
        "Approved by": adminEmail,
      });
    }
  },
  actions: {
    start_review: "in_review",
    approve: "approved",
    approve_flat: "approved",
    decline: "declined",
    restore: "new",
  },
  csvColumns: [
    ["created_at", "Applied at"],
    ["company_name", "Company"],
    ["website", "Website"],
    ["category", "Category"],
    ["contact_name", "Contact"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["member_offer", "Member offer"],
    ["lead_response_time", "Lead response time"],
    ["status", "Status"],
    ["notes", "Notes"],
  ],
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
