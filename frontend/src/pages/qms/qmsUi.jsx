import { useEffect } from "react";
import { X } from "lucide-react";

export const QMS_DEPARTMENTS = [
  "QA",
  "Production",
  "QC",
  "Warehouse",
  "Engineering",
  "Regulatory",
  "HR",
  "IT",
];

const STATUS_CLASS = {
  DRAFT: "qms-badge--draft",
  IN_REVIEW: "qms-badge--review",
  APPROVED: "qms-badge--approved",
  SUPERSEDED: "qms-badge--superseded",
  OBSOLETE: "qms-badge--obsolete",
  OPEN: "qms-badge--open",
  UNDER_INVESTIGATION: "qms-badge--investigating",
  CLOSED: "qms-badge--closed",
  IN_PROGRESS: "qms-badge--progress",
  PENDING_VERIFICATION: "qms-badge--pending",
  REJECTED: "qms-badge--rejected",
  IMPLEMENTED: "qms-badge--implemented",
  Critical: "qms-badge--critical",
  Major: "qms-badge--major",
  Minor: "qms-badge--minor",
};

export function qmsStatusLabel(status) {
  return String(status || "—").replaceAll("_", " ");
}

export function QmsBadge({ status }) {
  return (
    <span className={`qms-badge ${STATUS_CLASS[status] || "qms-badge--draft"}`}>
      {qmsStatusLabel(status)}
    </span>
  );
}

export function personName(person) {
  if (!person) return "—";
  return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.username || "—";
}

export function fmtDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateInput(value) {
  return value ? String(value).slice(0, 10) : "";
}

export function addDaysInput(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function QmsModal({ title, subtitle, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="qms-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`qms-modal ${wide ? "qms-modal--wide" : ""}`}>
        <div className="qms-modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="btn-close btn-close-white" aria-label="Close" onClick={onClose} />
        </div>
        <div className="qms-modal__body">{children}</div>
        {footer ? <div className="qms-modal__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function QmsEmpty({ icon: Icon, title, children }) {
  return (
    <div className="qms-empty">
      {Icon ? <Icon size={30} /> : null}
      <h3>{title}</h3>
      <p className="mb-2">{children}</p>
    </div>
  );
}

export function QmsField({ label, required, hint, full, children }) {
  return (
    <div className={`qms-field ${full ? "qms-field--full" : ""}`}>
      <label>
        {label} {required ? <span className="qms-required">*</span> : null}
      </label>
      {children}
      {hint ? <div className="form-text">{hint}</div> : null}
    </div>
  );
}
