import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireExpert } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { AVATAR_MAX_BYTES, AVATAR_REJECT_MESSAGE, resolveImageUpload } from "@/lib/api/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/expert/profile/headshot  multipart: file, target=headshot|avatar
 * Stores in the public `avatars` bucket under experts/<id>/..., updates the column.
 */
export async function POST(req: NextRequest) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  const route = "POST /api/expert/profile/headshot";
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return apiError.badRequest("Invalid upload.", route);
    }
    const file = form.get("file");
    const target = form.get("target") === "avatar" ? "avatar_url" : "headshot_url";
    if (!(file instanceof File) || file.size === 0) return apiError.validation("Choose an image to upload.", route);
    if (file.size > AVATAR_MAX_BYTES) return apiError.validation(AVATAR_REJECT_MESSAGE, route);
    const kind = resolveImageUpload(file);
    if (!kind) return apiError.validation(AVATAR_REJECT_MESSAGE, route);

    const db = supabaseAdmin();
    const path = `experts/${guard.expertId}/${randomUUID()}.${kind.ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await db.storage.from("avatars").upload(path, buf, { contentType: kind.contentType, upsert: false });
    if (upErr) throw upErr;
    const { data } = db.storage.from("avatars").getPublicUrl(path);
    const url = data?.publicUrl ?? null;
    const { error } = await db.from("experts").update({ [target]: url }).eq("id", guard.expertId);
    if (error) throw error;
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return serverError(err, { route });
  }
}

/** DELETE: clear the headshot (file stays in storage; harmless). */
export async function DELETE(req: NextRequest) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  try {
    const target = new URL(req.url).searchParams.get("target") === "avatar" ? "avatar_url" : "headshot_url";
    const { error } = await supabaseAdmin().from("experts").update({ [target]: null }).eq("id", guard.expertId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err, { route: "DELETE /api/expert/profile/headshot" });
  }
}
