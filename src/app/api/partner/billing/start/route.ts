import { NextRequest } from "next/server";
import { billingStart } from "@/lib/billing/providerRoutes";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(req: NextRequest) { return billingStart(req, "partner"); }
