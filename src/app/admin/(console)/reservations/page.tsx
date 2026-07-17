"use client";

import RecordsPage, { fmtDate, StatusBadge, Row, ActionResult } from "@/components/admin/RecordsPage";

async function activateMember(row: Row): Promise<ActionResult> {
  const res = await fetch("/api/admin/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reservationId: row.id }),
  });
  const data = await res.json();
  // The reservation row flips to converted server-side; reload the list.
  return { ok: data.ok, error: data.error };
}

export default function ReservationsAdminPage() {
  return (
    <RecordsPage
      title="Member reservations"
      subtitle="Founding-spot waitlist, in arrival order. Activate as founding member creates the member record, flips the reservation to converted, and sends the welcome email."
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
        { key: "agreement_accepted", label: "Member Agreement accepted" },
        { key: "agreement_accepted_at", label: "Accepted at", isDate: true },
        { key: "reviewed_by", label: "Last actioned by" },
        { key: "reviewed_at", label: "Last actioned at", isDate: true },
      ]}
      actions={[
        {
          action: "activate",
          label: "Activate as founding member",
          variant: "primary",
          when: (s) => s === "reserved" || s === "invited",
          quickLabel: "Activate",
          run: activateMember,
        },
        { action: "invite", label: "Mark invited (checkout link sent)", when: (s) => s === "reserved", withNote: true },
        { action: "cancel", label: "Cancel reservation", variant: "danger", when: (s) => s === "reserved" || s === "invited", withNote: true },
        { action: "restore", label: "Restore to reserved", when: (s) => s === "cancelled", withNote: true },
      ]}
    />
  );
}
