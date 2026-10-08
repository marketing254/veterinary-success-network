"use client";

import ReviewQueuePage, { type ReviewItem } from "@/components/admin/ReviewQueuePage";
import { fmtDate } from "@/components/admin/RecordsPage";

type Offer = ReviewItem & { headline: string; discount_value: string; promo_code: string | null; description: string; terms: string | null; redeem_url: string | null; valid_from: string; valid_to: string | null; redemption_limit_per_member: string; image_url: string | null };

export default function OffersReviewPage() {
  return (
    <ReviewQueuePage<Offer>
      title="Partner offers"
      sub="Member-only deals. Check the value beats standard pricing, the terms are clear, and there is an end date or a sensible limit."
      endpoint="/api/admin/offers"
      itemKind="offer"
      renderBody={(o) => (
        <div style={{ display: "flex", gap: 14 }}>
          {o.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="thumb" src={o.image_url} alt="" />
          )}
          <div>
            <h3>{o.discount_value}: {o.headline}</h3>
            <p>{o.description}</p>
            {o.terms && <p style={{ color: "var(--muted)" }}>Terms: {o.terms}</p>}
            <div className="meta">
              {o.promo_code && <span>Code {o.promo_code}</span>}
              <span>From {fmtDate(o.valid_from)}{o.valid_to ? ` to ${fmtDate(o.valid_to)}` : ", open ended"}</span>
              <span>Limit: {o.redemption_limit_per_member}</span>
              {o.redeem_url && <a href={o.redeem_url} target="_blank" rel="noreferrer" style={{ color: "var(--deep)", fontWeight: 700 }}>Redemption link</a>}
            </div>
          </div>
        </div>
      )}
    />
  );
}
