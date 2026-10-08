import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requirePartner } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { AVATAR_MAX_BYTES, AVATAR_REJECT_MESSAGE, resolveImageUpload } from "@/lib/api/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST multipart { file } → partner-logos bucket → partners.logo_url. DELETE clears it. */
export async function POST(req: NextRequest) {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  const route = "POST /api/partner/profile/logo";
  try {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size === 0) return apiError.validation("Choose an image to upload.", route);
    if (file.size > AVATAR_MAX_BYTES) return apiError.validation(AVATAR_REJECT_MESSAGE, route);
    const kind = resolveImageUpload(file);
    if (!kind) return apiError.validation(AVATAR_REJECT_MESSAGE, route);
    const db = supabaseAdmin();
    const path = `${guard.partnerId}/${randomUUID()}.${kind.ext}`;
    const { error: upErr } = await db.storage.from("partner-logos").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: kind.contentType });
    if (upErr) throw upErr;
    const url = db.storage.from("partner-logos").getPublicUrl(path).data?.publicUrl ?? null;
    const { error } = await db.from("partners").update({ logo_url: url }).eq("id", guard.partnerId);
    if (error) throw error;
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return serverError(err, { route });
  }
}

export async function DELETE() {
  const guard = await requirePartner();
  if (!guard.ok) return guard.response;
  try {
    const { error } = await supabaseAdmin().from("partners").update({ logo_url: null }).eq("id", guard.partnerId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route: "DELETE /api/partner/profile/logo" });
  }
}
