import { makeHandlers } from "@/lib/adminRecords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = makeHandlers({
  table: "expert_applications",
  entityType: "expert_application",
  searchColumns: ["full_name", "email", "company", "topics"],
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
