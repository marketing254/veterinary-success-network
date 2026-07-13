"use client";

import RecordsPage, { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";

export default function ReservationsAdminPage() {
  return (
    <RecordsPage
      title="Member reservations"
      subtitle="Founding-spot waitlist, in arrival order. Spots and the $49 lock go by position. Mark rows invited when you email a checkout link, converted once they've paid."
      endpoint="/api/admin/reservations"
      searchPlaceholder="Search name, email or practice…"
      statusOptions={["reserved", "invited", "converted", "cancelled"]}
      columns={[
        { key: "position", label: "Spot", render: (r) => <span className="em">#{r.position}</span> },
        {
          key: "full_name",
          label: "Member",
          render: (r) => (
            <span className="em">
              {r.full_name}
              <span className="sub">{r.email}</span>
            </span>
          ),
        },
        { key: "practice_name", label: "Practice" },
        { key: "plan", label: "Plan", render: (r) => `${r.plan} · ${r.billing}` },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        { key: "created_at", label: "Reserved", render: (r) => fmtDate(r.created_at) },
      ]}
      detail={[
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "role", label: "Role" },
        { key: "location", label: "Location" },
        { key: "plan", label: "Plan" },
        { key: "billing", label: "Billing" },
        { key: "first_question", label: "First hotline question" },
        { key: "reviewed_by", label: "Last actioned by" },
        { key: "reviewed_at", label: "Last actioned at", isDate: true },
      ]}
      actions={[
        { action: "invite", label: "Mark invited (checkout link sent)", variant: "primary", when: (s) => s === "reserved", withNote: true },
        { action: "convert", label: "Mark converted (paid)", variant: "primary", when: (s) => s === "invited" || s === "reserved", withNote: true },
        { action: "cancel", label: "Cancel reservation", variant: "danger", when: (s) => s === "reserved" || s === "invited", withNote: true },
        { action: "restore", label: "Restore to reserved", when: (s) => s === "cancelled", withNote: true },
      ]}
    />
  );
}
