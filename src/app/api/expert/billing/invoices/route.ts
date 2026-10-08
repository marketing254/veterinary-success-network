import { billingInvoices } from "@/lib/billing/providerRoutes";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() { return billingInvoices("expert"); }
