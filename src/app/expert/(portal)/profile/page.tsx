"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useExpert, api, initials } from "@/components/expert/ExpertContext";

export default function ExpertProfilePage() {
  const { me, refresh } = useExpert();
  const [f, setF] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!me) return;
    const e = me.expert;
    setF({
      display_name: e.display_name || e.full_name || "",
      company_name: e.company_name || "",
      specialty: e.specialty || "",
      topics: e.topics || "",
      bio: e.bio || "",
      years_experience: e.years_experience || "",
      website: e.website || "",
      booking_link: e.booking_link || "",
      phone: e.phone || "",
    });
  }, [me]);

  if (!me) return null;
  const e = me.expert;
  const set = (k: string) => (ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: ev.target.value }));

  async function save(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await api("/api/expert/profile", { method: "PATCH", body: JSON.stringify(f) });
    setBusy(false);
    if (r.ok) {
      setMsg({ kind: "ok", text: "Profile saved." });
      refresh();
    } else setMsg({ kind: "err", text: r.data.error || "Could not save." });
  }

  async function upload(file: File) {
    setUploading(true);
    setMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("target", "headshot");
    const r = await api("/api/expert/profile/headshot", { method: "POST", body: fd });
    setUploading(false);
    if (r.ok) {
      setMsg({ kind: "ok", text: "Headshot updated." });
      refresh();
    } else setMsg({ kind: "err", text: r.data.error || "Upload failed." });
  }

  return (
    <div className="xp-grid c2">
      <form className="xp-card" onSubmit={save}>
        <h2>Public profile</h2>
        <p className="lead">This is what members see in the directory and on your profile page. Your email and phone are never shown publicly.</p>
        {msg && <div className={`xp-msg ${msg.kind}`}>{msg.text}</div>}

        <div className="xp-headshot" style={{ marginBottom: 20 }}>
          <div className="ph">
            {e.headshot_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.headshot_url} alt="" />
            ) : (
              initials(e.full_name)
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "var(--xp-side)", marginBottom: 6 }}>Headshot</div>
            <div className="hint" style={{ fontSize: 12.5, color: "var(--xp-muted)", marginBottom: 10 }}>Square, well lit, JPG or PNG under 5 MB. This is the photo members see.</div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(ev) => ev.target.files?.[0] && upload(ev.target.files[0])} />
            <button type="button" className="xp-btn ghost sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? "Uploading…" : e.headshot_url ? "Replace photo" : "Upload photo"}
            </button>
          </div>
        </div>

        <div className="xp-2col">
          <div className="xp-field"><label>Display name</label><input value={f.display_name || ""} onChange={set("display_name")} maxLength={120} /></div>
          <div className="xp-field"><label>Company <small>(optional)</small></label><input value={f.company_name || ""} onChange={set("company_name")} maxLength={200} /></div>
        </div>
        <div className="xp-field">
          <label>Specialty <small>one line, e.g. &quot;Associate retention and compensation design&quot;</small></label>
          <input value={f.specialty || ""} onChange={set("specialty")} maxLength={240} />
        </div>
        <div className="xp-field">
          <label>Bio <small>80 characters minimum; 2 to 4 short paragraphs reads best</small></label>
          <textarea value={f.bio || ""} onChange={set("bio")} maxLength={4000} />
          <div className="hint">{(f.bio || "").length} / 4000</div>
        </div>
        <div className="xp-field">
          <label>Topics you teach <small>comma separated</small></label>
          <textarea value={f.topics || ""} onChange={set("topics")} maxLength={2000} style={{ minHeight: 70 }} />
        </div>
        <div className="xp-2col">
          <div className="xp-field"><label>Years with veterinary practices</label><input value={f.years_experience || ""} onChange={set("years_experience")} maxLength={40} /></div>
          <div className="xp-field"><label>Phone <small>(private)</small></label><input value={f.phone || ""} onChange={set("phone")} maxLength={40} inputMode="tel" /></div>
        </div>
        <div className="xp-2col">
          <div className="xp-field"><label>Website or LinkedIn</label><input value={f.website || ""} onChange={set("website")} inputMode="url" placeholder="www.yoursite.com" /></div>
          <div className="xp-field"><label>Booking link <small>members book straight onto your calendar</small></label><input value={f.booking_link || ""} onChange={set("booking_link")} inputMode="url" placeholder="calendly.com/you" /></div>
        </div>
        <button className="xp-btn primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
      </form>

      <div className="xp-grid" style={{ gap: 18, alignContent: "start" }}>
        <section className="xp-card">
          <h2>Listing status</h2>
          <p className="lead">
            {me.listable
              ? "Your profile is live in the public directory."
              : "Your listing goes live once your agreement is accepted and your headshot and bio are in."}
          </p>
          <ul className="xp-check">
            {me.checklist.map((c) => (
              <li key={c.key} className={c.done ? "done" : undefined}><span className="tk">{c.done ? "✓" : ""}</span>{c.label}</li>
            ))}
          </ul>
          {me.listable && (
            <Link className="xp-btn ghost sm" href={`/experts/${e.id}`} target="_blank" style={{ marginTop: 14 }}>Open public profile</Link>
          )}
        </section>
        <section className="xp-card">
          <h2>Account</h2>
          <dl className="xp-kv">
            <dt>Sign-in email</dt><dd>{e.email}</dd>
            <dt>Status</dt><dd style={{ textTransform: "capitalize" }}>{e.status}</dd>
            <dt>Member since</dt><dd>{new Date(e.invited_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</dd>
          </dl>
          <p className="lead" style={{ marginTop: 12, marginBottom: 0 }}>To change your sign-in email, reply to any of our emails and the team will move it for you.</p>
        </section>
      </div>
    </div>
  );
}
