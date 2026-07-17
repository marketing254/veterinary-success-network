"use client";

import { FormEvent, useState } from "react";
import RecordsPage, { fmtDate, StatusBadge } from "@/components/admin/RecordsPage";

function ManualActivate({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, practiceName, phone }),
    });
    const data = await res.json();
    if (data.ok) {
      setFullName("");
      setEmail("");
      setPracticeName("");
      setPhone("");
      setShow(false);
      onDone();
    } else {
      setErr(data.error || "Activation failed.");
    }
    setBusy(false);
  }

  return (
    <div className="adm-card">
      <div className="hd">
        <h2>Manual activation</h2>
        <button className="adm-btn" onClick={() => setShow(!show)}>
          {show ? "Close" : "Activate someone manually"}
        </button>
      </div>
      {show && (
        <form onSubmit={submit} style={{ padding: "16px 20px" }}>
          {err && <div className="adm-msg show err" style={{ marginBottom: 12 }}>{err}</div>}
          <div className="f2col">
            <div className="frow">
              <label className="flab" htmlFor="mm-name">Full name</label>
              <input id="mm-name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="frow">
              <label className="flab" htmlFor="mm-email">Email</label>
              <input id="mm-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="f2col">
            <div className="frow">
              <label className="flab" htmlFor="mm-practice">Practice <small>(optional)</small></label>
              <input id="mm-practice" type="text" value={practiceName} onChange={(e) => setPracticeName(e.target.value)} />
            </div>
            <div className="frow">
              <label className="flab" htmlFor="mm-phone">Phone <small>(optional)</small></label>
              <input id="mm-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <button className="adm-btn primary" type="submit" disabled={busy}>
            {busy ? "Activating…" : "Activate member (sends welcome email)"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function MembersAdminPage() {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <RecordsPage
      title="Members"
      subtitle="Activated founding members. Rows are created from the Reservations page or the manual form below; every activation sends the welcome email."
      endpoint="/api/admin/members"
      searchPlaceholder="Search name, email or practice…"
      statusOptions={["active", "paused"]}
      reloadKey={reloadKey}
      header={<ManualActivate onDone={() => setReloadKey((k) => k + 1)} />}
      columns={[
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
        { key: "practice_name", label: "Practice", render: (r) => r.practice_name || "—" },
        { key: "plan", label: "Plan", render: (r) => `${r.plan} · ${r.billing}` },
        { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
        { key: "activated_at", label: "Activated", render: (r) => fmtDate(r.activated_at) },
      ]}
      detail={[
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "role", label: "Role" },
        { key: "location", label: "Location" },
        { key: "plan", label: "Plan" },
        { key: "billing", label: "Billing" },
        { key: "activated_by", label: "Activated by" },
        { key: "activated_at", label: "Activated at", isDate: true },
        { key: "reservation_id", label: "From reservation" },
      ]}
      actions={[
        { action: "pause", label: "Pause membership", variant: "danger", when: (s) => s === "active", withNote: true },
        { action: "reactivate", label: "Reactivate", variant: "primary", when: (s) => s === "paused", withNote: true },
      ]}
    />
  );
}
