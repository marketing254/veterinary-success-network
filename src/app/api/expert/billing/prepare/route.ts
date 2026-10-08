import { billingPrepare } from "@/lib/billing/providerRoutes";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST() { return billingPrepare("expert"); }
