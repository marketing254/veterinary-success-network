import { makeReviewHandlers } from "@/lib/admin/reviewQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const h = makeReviewHandlers({
  table: "partner_offers",
  statusCol: "review_status",
  ownerCol: "partner_id",
  ownerTable: "partners",
  entityType: "offer",
  itemKind: "offer",
  titleCol: "headline",
  selectCols: "id, partner_id, catalog_item_id, headline, discount_value, promo_code, description, terms, redeem_url, valid_from, valid_to, redemption_limit_per_member, image_url, review_status, review_note, reviewed_at, reviewed_by, approved_at, created_at",
  portalLink: "/partner/offers",
});
export const GET = h.GET;
export const PATCH = h.PATCH;
