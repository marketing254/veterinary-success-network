import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST() {
  await supabaseServer().auth.signOut();
  return NextResponse.json({ ok: true });
}
