"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  id?: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (v: string) => void;
  invalid?: boolean;
};

/** Dropdown styled to match the form inputs (native option popups can't be themed). */
export default function NiceSelect({ id, value, options, placeholder = "Select…", onChange, invalid }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className={`nsel${open ? " open" : ""}${invalid ? " invalid" : ""}`} ref={ref}>
      <button
        type="button"
        id={id}
        className="nsel-btn"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={value ? undefined : "ph"}>{value || placeholder}</span>
        <svg className="chev" viewBox="0 0 12 8" fill="none">
          <path d="M1 1l5 5 5-5" stroke="#3BAB00" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <ul className="nsel-list" role="listbox">
          {options.map((o) => (
            <li
              key={o}
              role="option"
              aria-selected={o === value}
              className={`nsel-opt${o === value ? " on" : ""}`}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
            >
              {o}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
