import { NextRequest } from "next/server";
import { portalLogin } from "@/lib/auth/portalLogin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return portalLogin(req, "partner");
}
