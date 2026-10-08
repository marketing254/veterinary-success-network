import { makeReviewHandlers } from "@/lib/admin/reviewQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const h = makeReviewHandlers({
  table: "expert_resources",
  statusCol: "status",
  ownerCol: "expert_id",
  ownerTable: "experts",
  entityType: "expert_resource",
  itemKind: "kit",
  titleCol: "title",
  selectCols: "id, expert_id, title, description, kind, storage_path, external_url, file_name, file_size, mime_type, published_url, status, submitted_at, reviewed_at, reviewed_by, review_note, published_at, created_at",
  portalLink: "/expert/resources",
});
export const GET = h.GET;
export const PATCH = h.PATCH;
