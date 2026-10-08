import { NextRequest } from "next/server";
import { portalVerify } from "@/lib/auth/portalLogin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return portalVerify(req, "partner");
}
