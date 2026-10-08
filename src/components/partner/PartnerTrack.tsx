"use client";

/** Booking and website buttons on the public partner listing; pings the analytics endpoint on click. */
export default function PartnerTrack({ partnerId, bookingLink, website }: { partnerId: string; bookingLink: string | null; website: string | null }) {
  function ping(kind: "booking_click" | "website_click") {
    try {
      const body = JSON.stringify({ partner_id: partnerId, kind });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/directory/partners", new Blob([body], { type: "application/json" }));
      else fetch("/api/directory/partners", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    } catch {
      /* best effort */
    }
  }
  return (
    <>
      {bookingLink && (
        <a className="btn solid" href={bookingLink} target="_blank" rel="noreferrer" onClick={() => ping("booking_click")} style={{ width: "100%", justifyContent: "center", marginBottom: 10 }}>Book a meeting</a>
      )}
      {website && (
        <a className="btn glass" href={website} target="_blank" rel="noreferrer" onClick={() => ping("website_click")} style={{ width: "100%", justifyContent: "center" }}>Visit website</a>
      )}
    </>
  );
}
