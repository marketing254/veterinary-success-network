import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireExpert } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serverError, apiError } from "@/lib/api/errorResponse";
import { clean } from "@/lib/signup";
import { RESOURCE_MAX_BYTES, resolveResourceUpload, safeFileName } from "@/lib/api/uploads";
import { normalizeWebUrl } from "@/lib/url";
import { notifySignup } from "@/lib/email/teamNotify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["recording", "sop", "template", "slide_deck", "pdf", "checklist", "worksheet", "link", "other"];

/** GET /api/expert/resources: the expert's kits with signed download links. */
export async function GET() {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("expert_resources")
      .select("id, title, description, kind, storage_path, external_url, file_name, file_size, mime_type, published_url, status, submitted_at, reviewed_at, review_note, published_at, created_at")
      .eq("expert_id", guard.expertId)
      .neq("status", "archived")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = await Promise.all(
      (data ?? []).map(async (r) => {
        let downloadUrl: string | null = null;
        if (r.storage_path) {
          const { data: s } = await db.storage.from("expert-resources").createSignedUrl(r.storage_path, 900);
          downloadUrl = s?.signedUrl ?? null;
        }
        const { storage_path: _p, ...rest } = r;
        void _p;
        return { ...rest, downloadUrl };
      })
    );
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    return serverError(err, { route: "GET /api/expert/resources" });
  }
}

/** POST multipart: title, description, kind, file OR external_url. Submits for team review. */
export async function POST(req: NextRequest) {
  const guard = await requireExpert();
  if (!guard.ok) return guard.response;
  const route = "POST /api/expert/resources";
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return apiError.badRequest("Invalid upload.", route);
    }
    const title = clean(form.get("title"), 200);
    const description = clean(form.get("description"), 4000) || null;
    const kindRaw = clean(form.get("kind"), 30);
    const kind = KINDS.includes(kindRaw) ? kindRaw : "other";
    const externalRaw = clean(form.get("external_url"), 500);
    const file = form.get("file");

    if (!title) return apiError.validation("Give your kit a title.", route);
    let external_url: string | null = null;
    if (externalRaw) {
      external_url = normalizeWebUrl(externalRaw);
      if (!external_url) return apiError.validation("That link does not look valid.", route);
    }
    const hasFile = file instanceof File && file.size > 0;
    if (!hasFile && !external_url) return apiError.validation("Attach a file or paste a link.", route);

    const db = supabaseAdmin();
    const id = randomUUID();
    let storage_path: string | null = null;
    let file_name: string | null = null;
    let file_size: number | null = null;
    let mime_type: string | null = null;
    if (hasFile) {
      const f = file as File;
      if (f.size > RESOURCE_MAX_BYTES) return apiError.validation("Files must be under 50 MB. For large videos, paste a link instead.", route);
      const type = resolveResourceUpload(f);
      if (!type) return apiError.validation("That file type is not supported. Try PDF, Office, image, MP4 or ZIP.", route);
      storage_path = `${guard.expertId}/${id}-${safeFileName(f.name)}`;
      const buf = Buffer.from(await f.arrayBuffer());
      const { error: upErr } = await db.storage.from("expert-resources").upload(storage_path, buf, { contentType: type.contentType, upsert: false });
      if (upErr) throw upErr;
      file_name = f.name.slice(0, 200);
      file_size = f.size;
      mime_type = type.contentType;
    }

    const { data, error } = await db
      .from("expert_resources")
      .insert({ id, expert_id: guard.expertId, title, description, kind, storage_path, external_url, file_name, file_size, mime_type, status: "pending_review" })
      .select("id")
      .single();
    if (error) throw error;

    await notifySignup("expert kit submission", {
      Expert: guard.fullName,
      Email: guard.email,
      Title: title,
      Kind: kind,
      File: file_name,
      Link: external_url,
    });
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    return serverError(err, { route });
  }
}
