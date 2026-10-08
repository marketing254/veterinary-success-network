"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { AgreementSection } from "@/content/legal/expertAgreement";
import CardCapture from "@/components/billing/CardCapture";

type Block = { sections: AgreementSection[]; rows: { period: string; amount: string }[]; provisional: boolean } | null;
type Data = {
  invite: { role: "expert" | "partner" | "both"; full_name: string; email: string; company_name: string | null; category: string | null; member_offer: string | null; status: string; accepted_at: string | null; expires_at: string; expired: boolean; rate: "ladder" | "flat"; expert_free_for_life: boolean; cardRequired?: boolean };
  expert: Block;
  partner: Block;
};

const STD_ERR = "Something went wrong on our side. Nothing was charged. Please try again, or email support@veterinarysuccessnetwork.com.";

function Agreement({ title, block, intro }: { title: string; block: NonNullable<Block>; intro: string }) {
  return (
    <section className="fa-card">
      <h2>{title}</h2>
      <table className="fa-fee"><tbody>{block.rows.map((r) => <tr key={r.period}><td>{r.period}</td><td>{r.amount}</td></tr>)}</tbody></table>
      {block.provisional && <p className="fa-note">The member launch date is not set yet, so the free period above is provisional and will be confirmed before any charge.</p>}
      <div className="fa-agree">
        <p><i>{intro}</i></p>
        {block.sections.map((s) => (
          <div key={s.heading}><h3>{s.heading}</h3>{s.paragraphs?.map((p, i) => <p key={i}>{p}</p>)}{s.bullets && <ul>{s.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}</div>
        ))}
      </div>
    </section>
  );
}

export default function FoundingAccept({ code }: { code: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [agree, setAgree] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ next: string; email: string } | null>(null);

  useEffect(() => {
    fetch(`/api/founding/${code}`)
      .then((r) => r.json())
      .then((d) => (d.ok ? setData(d) : setNotFound(true)))
      .catch(() => setNotFound(true));
  }, [code]);

  async function accept(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/founding/${code}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, title, agree, authorized }) });
      const d = await r.json();
      if (d.ok) setDone({ next: d.next, email: d.email });
      else setErr(d.error || STD_ERR);
    } catch {
      setErr(STD_ERR);
    }
    setBusy(false);
  }

  const inv = data?.invite;
  const isPartner = inv?.role !== "expert";

  return (
    <div className="fa">
      <style>{`
        .fa{min-height:100vh;background:linear-gradient(180deg,#f6fbf0,#eef7e3 40%,#f6fbf0);padding:28px 16px 70px;font-family:var(--font-body),system-ui,sans-serif;color:#2c3a22;}
        .fa-wrap{max-width:860px;margin:0 auto;}
        .fa-brand{display:flex;align-items:center;gap:12px;margin-bottom:22px;}
        .fa-brand img{height:36px;}
        .fa-brand strong{display:block;font-family:var(--font-display),Georgia,serif;font-size:17px;color:#1c3310;}
        .fa-brand small{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#55B900;font-weight:700;}
        .fa-hero{background:#1c3310;color:#fff;border-radius:26px;padding:34px 36px;margin-bottom:18px;position:relative;overflow:hidden;}
        .fa-hero:after{content:"";position:absolute;right:-60px;top:-60px;width:260px;height:260px;border-radius:50%;background:rgba(139,227,23,.2);filter:blur(8px);}
        .fa-hero .eyebrow{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#8BE317;font-weight:700;}
        .fa-hero h1{font-family:var(--font-display),Georgia,serif;font-size:32px;font-weight:600;margin:8px 0 10px;line-height:1.1;}
        .fa-hero p{color:rgba(255,255,255,.8);font-size:15px;line-height:1.6;max-width:600px;margin:0;}
        .fa-card{background:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.9);border-radius:22px;padding:26px 28px;box-shadow:0 20px 50px rgba(28,51,16,.08);margin-bottom:18px;}
        .fa-card h2{font-family:var(--font-display),Georgia,serif;font-size:21px;color:#1c3310;font-weight:600;margin:0 0 12px;}
        .fa-fee{width:100%;border-collapse:collapse;font-size:14px;margin-bottom:10px;}
        .fa-fee td{padding:9px 10px;border-bottom:1px solid #e9efe1;}
        .fa-fee td:last-child{text-align:right;font-weight:700;color:#1c3310;}
        .fa-note{font-size:12.5px;color:#74806a;margin:0 0 12px;}
        .fa-agree{max-height:380px;overflow:auto;border:1px solid #e9efe1;border-radius:16px;padding:18px 22px;background:#fcfdf9;font-size:14px;line-height:1.65;}
        .fa-agree h3{font-family:var(--font-display),Georgia,serif;font-size:15.5px;color:#1c3310;margin:16px 0 5px;font-weight:600;}
        .fa-agree h3:first-of-type{margin-top:4px;}
        .fa-agree ul{margin:4px 0 8px 18px;padding:0;} .fa-agree li{margin-bottom:4px;} .fa-agree p{margin:0 0 8px;}
        .fa-sign{border:1.5px solid #55B900;}
        .fa-field{margin-bottom:14px;} .fa-field label{display:block;font-size:13px;font-weight:600;color:#1c3310;margin-bottom:6px;}
        .fa-field input{width:100%;background:#fff;border:1px solid #e9efe1;border-radius:12px;padding:12px 14px;font:inherit;font-size:14.5px;outline:none;}
        .fa-field input:focus{border-color:#55B900;box-shadow:0 0 0 4px rgba(85,185,0,.14);}
        .fa-2{display:grid;grid-template-columns:1fr 1fr;gap:0 14px;}
        .fa-row{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.5;margin-bottom:12px;}
        .fa-row input{width:18px;height:18px;margin-top:3px;accent-color:#3BAB00;flex:none;}
        .fa-btn{display:inline-flex;align-items:center;justify-content:center;border:none;cursor:pointer;border-radius:30px;padding:14px 26px;font:inherit;font-size:15px;font-weight:700;color:#fff;background:linear-gradient(135deg,#55B900,#3BAB00);box-shadow:0 10px 26px rgba(85,185,0,.3);width:100%;}
        .fa-btn:disabled{opacity:.55;cursor:default;box-shadow:none;}
        .fa-due{display:flex;justify-content:space-between;font-size:14px;padding:12px 14px;background:#f6fbf0;border-radius:12px;margin-bottom:14px;}
        .fa-due b{color:#1c3310;}
        .fa-err{background:#fdf0ec;color:#7a4a38;border-radius:12px;padding:12px 14px;font-size:13.5px;margin-bottom:14px;}
        .fa-ok{text-align:center;padding:20px 0;}
        .fa-ok h2{font-size:26px;}
        .fa-foot{text-align:center;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#74806a;font-weight:700;margin-top:24px;}
        @media(max-width:600px){.fa-hero{padding:26px 22px;} .fa-hero h1{font-size:26px;} .fa-card{padding:20px;} .fa-2{grid-template-columns:1fr;}}
      `}</style>
      <div className="fa-wrap">
        <div className="fa-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/vsn-monogram-dark.png" alt="VSN" />
          <span><strong>Veterinary Success Network</strong><small>Powered by Veterinary Business Institute</small></span>
        </div>

        {notFound ? (
          <div className="fa-card fa-ok"><h2>This link is not active.</h2><p>It may have been revoked or mistyped. Reply to your invitation email and we will send a fresh one.</p></div>
        ) : !data || !inv ? (
          <div className="fa-card fa-ok">Loading your agreement…</div>
        ) : done || inv.status === "accepted" ? (
          <div className="fa-card fa-ok">
            <h2>Welcome aboard{inv.full_name ? `, ${inv.full_name.split(/\s+/)[0]}` : ""}.</h2>
            <p>Your agreement is accepted and a signed copy is on its way to {done?.email || inv.email}. Sign in with a 6-digit code to the same address.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
              {inv.role !== "partner" && <Link className="fa-btn" href="/expert/login" style={{ width: "auto" }}>Open expert portal</Link>}
              {inv.role !== "expert" && <Link className="fa-btn" href="/partner/login" style={{ width: "auto", background: "#1c3310", boxShadow: "none" }}>Open partner portal</Link>}
            </div>
          </div>
        ) : inv.expired ? (
          <div className="fa-card fa-ok"><h2>This invitation has expired.</h2><p>Reply to your invitation email and we will send a fresh link.</p></div>
        ) : (
          <>
            <div className="fa-hero">
              <div className="eyebrow">Founding {inv.role === "both" ? "expert and partner" : inv.role} invitation</div>
              <h1>Your agreement is ready, {inv.full_name.split(/\s+/)[0]}.</h1>
              <p>Read your personalised terms below and type your name to accept. Nothing is charged today. Your free founding months start on the member launch date.</p>
            </div>
            {data.expert && <Agreement title="Expert Agreement" block={data.expert} intro={`Between the Veterinary Success Network ("VSN"), a service offered by Ekwa Marketing Inc., and ${inv.full_name} ("you").`} />}
            {data.partner && <Agreement title={`Partner Agreement · ${inv.company_name}`} block={data.partner} intro={`Between the Veterinary Success Network ("VSN"), a service offered by Ekwa Marketing Inc., and ${inv.company_name} ("you").`} />}
            <form className="fa-card fa-sign" onSubmit={accept}>
              <h2>Accept {data.expert && data.partner ? "both agreements" : "the agreement"}</h2>
              <div className="fa-due"><span>Due today</span><b>$0.00</b></div>
              {err && <div className="fa-err">{err}</div>}
              <div className="fa-2">
                <div className="fa-field"><label>Your full name (signature)</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder={inv.full_name} maxLength={160} required /></div>
                {isPartner && <div className="fa-field"><label>Your title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Owner, VP Sales…" maxLength={120} /></div>}
              </div>
              {isPartner && <label className="fa-row"><input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} /><span>I am authorised to commit {inv.company_name} to this agreement.</span></label>}
              <label className="fa-row"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /><span>I have read and agree to the agreement{data.expert && data.partner ? "s" : ""} above. My acceptance is recorded electronically and a signed copy will be emailed to {inv.email}.</span></label>
              {inv.cardRequired ? (
                <CardCapture
                  prepareUrl={`/api/founding/${code}/prepare`}
                  startUrl={`/api/founding/${code}`}
                  extraBody={() => ({ name, title, agree, authorized })}
                  canSubmit={agree && name.trim().length >= 2 && (!isPartner || authorized)}
                  label="Accept, save card and open my portal · Due today $0.00"
                  onDone={(d) => setDone({ next: String(d.next || "/expert/login"), email: String(d.email || inv.email) })}
                  theme="founding"
                />
              ) : (
                <button className="fa-btn" type="submit" disabled={busy || !agree || name.trim().length < 2 || (isPartner && !authorized)}>{busy ? "Recording your acceptance…" : "Accept and open my portal"}</button>
              )}
              <p className="fa-note" style={{ marginTop: 12 }}>Questions before you accept? Reply to your invitation email.</p>
            </form>
          </>
        )}
        <div className="fa-foot">Veterinary Success Network · a service offered by Ekwa Marketing Inc.</div>
      </div>
    </div>
  );
}
