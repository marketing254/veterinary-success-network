"use client";

import RecordsPage, { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";

export default function ExpertsAdminPage() {
  return (
    <RecordsPage
      title="Expert applications"
      subtitle="Founding-bench applications. Start review, then approve or decline; every action lands in the audit log."
      endpoint="/api/admin/experts"
      searchPlaceholder="Search name, email, company or topics…"
      statusOptions={["new", "in_review", "approved", "declined"]}
      columns={[
        {
          key: "full_name",
          label: "Applicant",
          render: (r) => (
            <span className="em">
              {r.full_name}
              <span className="sub">{r.email}</span>
            </span>
          ),
        },
        { key: "company", label: "Company", render: (r) => r.company || "—" },
        { key: "years_experience", label: "Vet experience" },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        { key: "created_at", label: "Applied", render: (r) => fmtDate(r.created_at) },
      ]}
      detail={[
        { key: "email", label: "Email" },
        { key: "website", label: "Website / LinkedIn" },
        { key: "topics", label: "Topics" },
        { key: "existing_content", label: "Existing content" },
        { key: "booking_link", label: "Booking link" },
        { key: "notes", label: "Applicant notes" },
        { key: "agreement_accepted", label: "Expert Agreement accepted" },
        { key: "agreement_accepted_at", label: "Accepted at", isDate: true },
        { key: "decision_note", label: "Decision note" },
        { key: "reviewed_by", label: "Reviewed by" },
        { key: "reviewed_at", label: "Reviewed at", isDate: true },
      ]}
      actions={[
        { action: "start_review", label: "Start review", when: (s) => s === "new" },
        { action: "approve", label: "Approve for the bench (sends email)", variant: "primary", when: (s) => s === "new" || s === "in_review", withNote: true, quickLabel: "✓ Approve" },
        { action: "decline", label: "Decline", variant: "danger", when: (s) => s === "new" || s === "in_review", withNote: true, quickLabel: "✕" },
        { action: "restore", label: "Reopen as new", when: (s) => s === "approved" || s === "declined", withNote: true },
      ]}
    />
  );
}
