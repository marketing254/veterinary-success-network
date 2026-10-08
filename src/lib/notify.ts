import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** In-app notification for the bell (migration 0015). Best effort; never throws. */
export async function notify(args: {
  audience: "expert" | "partner" | "admin";
  expertId?: string | null;
  partnerId?: string | null;
  kind: string;
  title: string;
  body?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const row: Record<string, unknown> = {
      audience: args.audience,
      kind: args.kind,
      title: args.title.slice(0, 200),
      body: args.body ? args.body.slice(0, 500) : null,
      link: args.link ?? null,
      metadata: args.metadata ?? {},
    };
    if (args.audience === "expert") row.expert_id = args.expertId;
    if (args.audience === "partner") row.partner_id = args.partnerId;
    const { error } = await supabaseAdmin().from("notifications").insert(row);
    if (error) console.error("notification insert failed:", error.message);
  } catch (err) {
    console.error("notify failed:", err);
  }
}
