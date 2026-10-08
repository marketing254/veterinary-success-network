import { makeReviewHandlers } from "@/lib/admin/reviewQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const h = makeReviewHandlers({
  table: "partner_catalog_items",
  statusCol: "review_status",
  ownerCol: "partner_id",
  ownerTable: "partners",
  entityType: "catalog_item",
  itemKind: "catalog item",
  titleCol: "name",
  selectCols: "id, partner_id, type, name, tagline, description, category, price_label, highlights, link_url, review_status, review_note, reviewed_at, reviewed_by, submitted_for_review_at, approved_at, created_at, partner_catalog_media(url)",
  portalLink: "/partner/catalog",
});
export const GET = h.GET;
export const PATCH = h.PATCH;
