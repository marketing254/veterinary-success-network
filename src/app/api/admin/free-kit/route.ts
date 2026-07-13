import { makeHandlers } from "@/lib/adminRecords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = makeHandlers({
  table: "free_kit_signups",
  entityType: "free_kit_signup",
  searchColumns: ["full_name", "email", "practice_name"],
  orderBy: { column: "created_at", ascending: false },
  review: false,
  actions: {
    mark_sent: "sent",
    unsubscribe: "unsubscribed",
    resubscribe: "subscribed",
  },
  csvColumns: [
    ["created_at", "Signed up at"],
    ["full_name", "Full name"],
    ["email", "Email"],
    ["practice_name", "Practice"],
    ["status", "Status"],
  ],
});

export const GET = handlers.GET;
export const PATCH = handlers.PATCH;
