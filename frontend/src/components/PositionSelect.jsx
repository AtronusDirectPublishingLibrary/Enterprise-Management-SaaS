import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { OTHER_POSITION, POSITIONS } from "../lib/access";

/**
 * Position dropdown shared by staff and user forms. Options come from the
 * seeded POSITION list plus anything added in Form Dropdown Manager, and
 * "Other (specify)" accepts a brand-new position without editing code.
 */
export default function PositionSelect({ value = "", onChange, id = "position", required = false, label = "Position", className = "", allowEmpty = true }) {
  const [options, setOptions] = useState(POSITIONS);
  const [custom, setCustom] = useState(Boolean(value) && !POSITIONS.includes(value));

  useEffect(() => {
    api.get("/dropdowns")
      .then((data) => {
        const seeded = (data?.POSITION || []).map((option) => option.value);
        const merged = [...POSITIONS, ...seeded.filter((entry) => !POSITIONS.includes(entry))];
        setOptions(merged);
        setCustom(Boolean(value) && !merged.includes(value));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isKnown = useMemo(() => options.includes(value), [options, value]);

  useEffect(() => {
    if (value && !isKnown) setCustom(true);
  }, [value, isKnown]);

  return (
    <div className={className}>
      <label className="form-label small fw-bold" htmlFor={id}>{label}</label>
      <select
        id={id}
        className="form-select"
        value={custom ? OTHER_POSITION : value}
        required={required && !custom}
        onChange={(e) => {
          if (e.target.value === OTHER_POSITION) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
      >
        {allowEmpty && <option value="">— Select position —</option>}
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
        <option value={OTHER_POSITION}>{OTHER_POSITION}</option>
      </select>
      {custom && (
        <input
          className="form-control mt-2"
          placeholder="Type the new position title"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          aria-label="Specify position"
        />
      )}
      <div className="form-text" style={{ fontSize: "0.72rem" }}>
        Not listed? Choose Other (specify) to add it.
      </div>
    </div>
  );
}
