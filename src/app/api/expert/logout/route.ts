import { portalLogout } from "@/lib/auth/portalLogin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return portalLogout("expert");
}
