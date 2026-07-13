"use client";

import RecordsPage, { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";

export default function FreeKitAdminPage() {
  return (
    <RecordsPage
      title="Free-kit leads"
      subtitle="Lead-magnet signups. Mark the list sent when the first kit goes out; honor unsubscribes immediately."
      endpoint="/api/admin/free-kit"
      searchPlaceholder="Search name, email or practice…"
      statusOptions={["subscribed", "sent", "unsubscribed"]}
      columns={[
        {
          key: "full_name",
          label: "Lead",
          render: (r) => (
            <span className="em">
              {r.full_name}
              <span className="sub">{r.email}</span>
            </span>
          ),
        },
        { key: "practice_name", label: "Practice", render: (r) => r.practice_name || "—" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        { key: "created_at", label: "Signed up", render: (r) => fmtDate(r.created_at) },
      ]}
      detail={[
        { key: "email", label: "Email" },
        { key: "practice_name", label: "Practice" },
        { key: "created_at", label: "Signed up", isDate: true },
      ]}
      actions={[
        { action: "mark_sent", label: "Mark kit sent", variant: "primary", when: (s) => s === "subscribed" },
        { action: "unsubscribe", label: "Unsubscribe", variant: "danger", when: (s) => s !== "unsubscribed" },
        { action: "resubscribe", label: "Re-subscribe", when: (s) => s === "unsubscribed" },
      ]}
    />
  );
}
