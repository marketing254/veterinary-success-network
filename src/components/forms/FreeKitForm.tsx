"use client";

import { FormEvent, useState } from "react";
import { useVsnSubmit, mailtoFallback, SuccessPanel, ErrorPanel, Honeypot } from "./shared";

export default function FreeKitForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [practiceName, setPracticeName] = useState("");
  const [bt, setBt] = useState("");

  const { status, serverMessage, submit } = useVsnSubmit("/api/free-kit/signup");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit({ fullName, email, practiceName, bt });
  }

  if (status === "success") {
    return (
      <SuccessPanel title="You're on the list.">
        {serverMessage ||
          "The first free kit goes out by email the moment it drops: video, guide, checklist and worksheet. No spam in the meantime."}
      </SuccessPanel>
    );
  }

  return (
    <form className="vsn-form" onSubmit={onSubmit}>
      <Honeypot value={bt} onChange={setBt} />
      <div className="frow">
        <label className="flab" htmlFor="kf-name">Full name</label>
        <input type="text" id="kf-name" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div className="frow">
        <label className="flab" htmlFor="kf-email">Email</label>
        <input type="email" id="kf-email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="frow">
        <label className="flab" htmlFor="kf-practice">
          Practice name <small>(optional)</small>
        </label>
        <input type="text" id="kf-practice" autoComplete="organization" value={practiceName} onChange={(e) => setPracticeName(e.target.value)} />
      </div>
      <button className="btn solid" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send me the kit when it drops →"}
      </button>
      <p className="fnote">No spam and no membership pitch. Just the kit when it&apos;s ready. Unsubscribe anytime.</p>
      {status === "error" && (
        <ErrorPanel
          message={serverMessage}
          mailto={mailtoFallback("free-kit", { "Full name": fullName, Email: email, Practice: practiceName })}
          mailtoLabel="Request the kit by email instead →"
        />
      )}
    </form>
  );
}
