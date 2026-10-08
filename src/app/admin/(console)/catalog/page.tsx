"use client";

import ReviewQueuePage, { type ReviewItem } from "@/components/admin/ReviewQueuePage";

type Item = ReviewItem & { type: string; name: string; tagline: string | null; description: string; category: string | null; price_label: string | null; highlights: string[]; link_url: string | null; partner_catalog_media: { url: string }[] };

export default function CatalogReviewPage() {
  return (
    <ReviewQueuePage<Item>
      title="Partner catalog"
      sub="Services, products and courses partners want members to see. Edits to a live item come back here."
      endpoint="/api/admin/catalog"
      itemKind="catalog item"
      renderBody={(it) => (
        <div style={{ display: "flex", gap: 14 }}>
          {it.partner_catalog_media?.[0]?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="thumb" src={it.partner_catalog_media[0].url} alt="" />
          )}
          <div>
            <h3>{it.name} <span className="adm-chip" style={{ textTransform: "capitalize" }}>{it.type}</span></h3>
            {it.tagline && <p><i>{it.tagline}</i></p>}
            <p>{it.description}</p>
            {it.highlights?.length > 0 && <p>• {it.highlights.join("\n• ")}</p>}
            <div className="meta">{it.category && <span>{it.category}</span>}{it.price_label && <span>{it.price_label}</span>}{it.link_url && <a href={it.link_url} target="_blank" rel="noreferrer" style={{ color: "var(--deep)", fontWeight: 700 }}>Learn more link</a>}</div>
          </div>
        </div>
      )}
    />
  );
}
