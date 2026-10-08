import { NextRequest, NextResponse } from "next/server";
import { requireExpert } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";
import { loadExpertSelf } from "@/lib/expert/load";
import { normalizeWebUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/expert/profile: profile-shaped fields only (privileged columns are pinned by trigger too). */
export async function PATCH(req: NextRequest) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  const route = "PATCH /api/expert/profile";
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return apiError.badRequest("Invalid request.", route);
    }
    const patch: Record<string, string | null> = {};
    const text = (k: string, max: number) => {
      if (k in body) patch[k] = clean(body[k], max) || null;
    };
    text("display_name", 120);
    text("company_name", 200);
    text("specialty", 240);
    text("topics", 2000);
    text("bio", 4000);
    text("years_experience", 40);
    text("phone", 40);
    for (const k of ["website", "booking_link"]) {
      if (k in body) {
        const raw = clean(body[k], 300);
        if (!raw) {
          patch[k] = null;
        } else {
          const url = normalizeWebUrl(raw);
          if (!url) return apiError.validation(`Please enter a valid ${k === "website" ? "website" : "booking link"} (like calendly.com/you).`, route);
          patch[k] = url;
        }
      }
    }
    if (Object.keys(patch).length === 0) return apiError.validation("Nothing to update.", route);
    const { error } = await supabaseAdmin().from("experts").update(patch).eq("id", guard.expertId);
    if (error) throw error;
    const expert = await loadExpertSelf(guard.expertId);
    return NextResponse.json({ ok: true, expert });
  } catch (err) {
    return serverError(err, { route });
  }
}
