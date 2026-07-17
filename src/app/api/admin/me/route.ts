import { NextResponse } from "next/server";
import { requireAdmin, isResponse } from "@/lib/adminApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdmin();
  if (isResponse(session)) return session;
  return NextResponse.json({
    ok: true,
    admin: { email: session.email, name: session.name, role: session.role },
  });
}
