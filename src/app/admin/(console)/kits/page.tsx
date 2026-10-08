"use client";

import ReviewQueuePage, { type ReviewItem } from "@/components/admin/ReviewQueuePage";

type Kit = ReviewItem & { title: string; description: string | null; kind: string; external_url: string | null; file_name: string | null; file_size: number | null; downloadUrl: string | null; published_url: string | null };

export default function KitsReviewPage() {
  return (
    <ReviewQueuePage<Kit>
      title="Expert kits"
      sub="Recordings and documents experts submit. Approve once the branded kit is ready (paste the member-library link), or send it back with a note."
      endpoint="/api/admin/kits"
      itemKind="kit"
      askPublishedUrl
      renderBody={(k) => (
        <>
          <h3>{k.title}</h3>
          {k.description && <p>{k.description}</p>}
          <div className="meta">
            <span>Type: {k.kind.replace("_", " ")}</span>
            {k.downloadUrl && <a href={k.downloadUrl} target="_blank" rel="noreferrer" style={{ color: "var(--deep)", fontWeight: 700 }}>Download {k.file_name}{k.file_size ? ` (${Math.round(k.file_size / 1024)} KB)` : ""}</a>}
            {k.external_url && <a href={k.external_url} target="_blank" rel="noreferrer" style={{ color: "var(--deep)", fontWeight: 700 }}>Open link</a>}
            {k.published_url && <a href={k.published_url} target="_blank" rel="noreferrer" style={{ color: "var(--deep)", fontWeight: 700 }}>Published</a>}
          </div>
        </>
      )}
    />
  );
}
