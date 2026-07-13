"use client";

import { FormEvent, useEffect, useState } from "react";
import { fmtDate } from "@/components/admin/RecordsPage";

type Admin = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
  created_at: string;
};

export default function AdminsPage() {
  const [rows, setRows] = useState<Admin[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("admin");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/admins");
    const data = await res.json();
    if (data.ok) setRows(data.rows);
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, role }),
    });
    const data = await res.json();
    if (data.ok) {
      setEmail("");
      setFullName("");
      setRole("admin");
      setMsg({ kind: "ok", text: "Admin added. They can sign in with their email right away." });
      load();
    } else {
      setMsg({ kind: "err", text: data.error || "Couldn't add admin." });
    }
    setBusy(false);
  }

  async function toggle(row: Admin) {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, action: row.active ? "deactivate" : "reactivate" }),
    });
    const data = await res.json();
    if (data.ok) load();
    else setMsg({ kind: "err", text: data.error || "Update failed." });
    setBusy(false);
  }

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Admin team</h1>
          <p>Who can sign in to this console. Deactivated admins lose access immediately.</p>
        </div>
      </div>
      {msg && <div className={`adm-msg show ${msg.kind}`}>{msg.text}</div>}

      <div className="adm-card">
        <div className="hd"><h2>Add an admin</h2></div>
        <form onSubmit={add} style={{ padding: "16px 20px" }}>
          <div className="f2col">
            <div className="frow">
              <label className="flab" htmlFor="ad-name">Full name</label>
              <input id="ad-name" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="frow">
              <label className="flab" htmlFor="ad-email">Email</label>
              <input id="ad-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="frow">
            <label className="flab" htmlFor="ad-role">Role</label>
            <select id="ad-role" value={role} onChange={(e) => setRole(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <button className="adm-btn primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Add admin"}
          </button>
        </form>
      </div>

      <div className="adm-card">
        <div className="hd"><h2>Team</h2></div>
        <div className="adm-tablewrap">
          <table className="adm-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Added</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="em">{r.full_name}</td>
                  <td>{r.email}</td>
                  <td><span className={`badge ${r.role}`}>{r.role}</span></td>
                  <td><span className={`badge ${r.active ? "approved" : "inactive"}`}>{r.active ? "active" : "inactive"}</span></td>
                  <td>{fmtDate(r.created_at)}</td>
                  <td>
                    <button className={`adm-btn${r.active ? " danger" : ""}`} disabled={busy} onClick={() => toggle(r)}>
                      {r.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
