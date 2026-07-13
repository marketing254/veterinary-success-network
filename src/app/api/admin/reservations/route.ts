import { makeHandlers } from "@/lib/adminRecords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = makeHandlers({
  table: "member_reservations",
  entityType: "member_reservation",
  searchColumns: ["full_name", "email", "practice_name"],
  orderBy: { column: "position", ascending: true },
  review: true,
  actions: {
    invite: "invited",
    convert: "converted",
    cancel: "cancelled",
    restore: "reserved",
  },
  csvColumns: [
    ["position", "Spot #"],
    ["created_at", "Reserved at"],
    ["full_name", "Full name"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["practice_name", "Practice"],
    ["role", "Role"],
    ["location", "Location"],
    ["plan", "Plan"],
    ["billing", "Billing"],
    ["status", "Status"],
    ["first_question", "First hotline question"],
  ],
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
