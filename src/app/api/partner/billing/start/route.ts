import { NextRequest } from "next/server";
import { billingStart } from "@/lib/billing/providerRoutes";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) { return billingStart(req, "partner"); }
