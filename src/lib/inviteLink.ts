import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** After a website application insert: if the visitor arrived via /invite/<code>, stamp the link accepted. Best effort. */
export async function consumeInviteLink(req: NextRequest, kind: "expert" | "partner", email: string) {
  try {
    const code = req.cookies.get("vsn_invite")?.value;
    if (!code || !/^[A-Za-z0-9]{6,40}$/.test(code)) return null;
    const db = supabaseAdmin();
    const { data } = await db.from("invite_links").select("id, status, kind").eq("code", code).maybeSingle();
    if (!data || data.kind !== kind || data.status === "revoked" || data.status === "accepted") return null;
    await db.from("invite_links").update({ status: "accepted", accepted_at: new Date().toISOString(), email }).eq("id", data.id);
    return data.id as string;
  } catch {
    return null;
  }
}
