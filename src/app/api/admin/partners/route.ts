import { makeHandlers } from "@/lib/adminRecords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = makeHandlers({
  table: "partner_applications",
  entityType: "partner_application",
  searchColumns: ["company_name", "contact_name", "email", "category"],
  orderBy: { column: "created_at", ascending: false },
  review: true,
  decisionNote: true,
  actions: {
    start_review: "in_review",
    approve: "approved",
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
