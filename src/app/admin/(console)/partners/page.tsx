"use client";

import RecordsPage, { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";

export default function PartnersAdminPage() {
  return (
    <RecordsPage
      title="Partner applications"
      subtitle="Founding-partner applications. Verify the company, the category and the member offer before approving."
      endpoint="/api/admin/partners"
      searchPlaceholder="Search company, contact, email or category…"
      statusOptions={["new", "in_review", "approved", "declined"]}
      columns={[
        {
          key: "company_name",
          label: "Company",
          render: (r) => (
            <span className="em">
              {r.company_name}
              <span className="sub">{r.website}</span>
            </span>
          ),
        },
        { key: "category", label: "Category" },
        {
          key: "contact_name",
          label: "Contact",
          render: (r) => (
            <span>
              {r.contact_name}
              <span className="sub">{r.email}</span>
            </span>
          ),
        },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        { key: "created_at", label: "Applied", render: (r) => fmtDate(r.created_at) },
      ]}
      detail={[
        { key: "website", label: "Website" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "member_offer", label: "Member offer" },
        { key: "lead_response_time", label: "Lead response time" },
        { key: "notes", label: "Applicant notes" },
        { key: "decision_note", label: "Decision note" },
        { key: "reviewed_by", label: "Reviewed by" },
        { key: "reviewed_at", label: "Reviewed at", isDate: true },
      ]}
      actions={[
        { action: "start_review", label: "Start review", when: (s) => s === "new" },
        { action: "approve", label: "Approve as partner", variant: "primary", when: (s) => s === "new" || s === "in_review", withNote: true },
        { action: "decline", label: "Decline", variant: "danger", when: (s) => s === "new" || s === "in_review", withNote: true },
        { action: "restore", label: "Reopen as new", when: (s) => s === "approved" || s === "declined", withNote: true },
      ]}
    />
  );
}
