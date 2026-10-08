"use client";

import { PARTNER_CATEGORIES } from "./PartnerApplicationForm";

/**
 * Partner category select with an "Other" escape hatch: choosing Other reveals a
 * text input and the stored value becomes "Other: <text>", the same format the
 * public partner application form uses. Unstyled on purpose: it inherits the
 * select/input styles of whichever form wraps it (.pw-field, .frow, .adm-form).
 */
export default function CategoryPicker({
  value,
  onChange,
  emptyLabel = "Choose…",
  allowEmpty = true,
  required,
  inputClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  emptyLabel?: string;
  allowEmpty?: boolean;
  required?: boolean;
  inputClassName?: string;
}) {
  const isOther = value === "Other" || value.startsWith("Other:");
  const otherText = isOther ? value.replace(/^Other:?\s*/, "") : "";
  const known = PARTNER_CATEGORIES.includes(value);
  return (
    <>
      <select
        value={isOther ? "Other" : value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {PARTNER_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        {value && !known && !isOther && <option value={value}>{value}</option>}
      </select>
      {isOther && (
        <input
          type="text"
          className={inputClassName}
          style={{ marginTop: 8 }}
          placeholder="Tell us your category"
          value={otherText}
          maxLength={80}
          autoFocus
          onChange={(e) => onChange(e.target.value.trim() ? `Other: ${e.target.value}` : "Other")}
        />
      )}
    </>
  );
}
