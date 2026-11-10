import { useEffect, useId, useMemo, useState } from "react";
import { RefreshCw, UserRound } from "lucide-react";
import { api } from "../lib/api";

// The directory is small and changes rarely. Share one request across every
// picker on the page so opening a plan does not fan out duplicate calls.
let directoryCache = null;
let directoryRequest = null;

function fetchDirectory(force = false) {
  if (force) {
    directoryCache = null;
    directoryRequest = null;
  }
  if (directoryCache) return Promise.resolve(directoryCache);
  if (!directoryRequest) {
    directoryRequest = api
      .get("/plans/assignable-staff")
      .then((rows) => {
        directoryCache = Array.isArray(rows) ? rows : [];
        return directoryCache;
      })
      .finally(() => {
        directoryRequest = null;
      });
  }
  return directoryRequest;
}

const initials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "?";

const roleLabel = (role) =>
  String(role || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

/**
 * Accessible, OS-native owner picker for plans, KPIs, activities and
 * milestones. Values are stored as the person's display name so existing
 * owner displays and progress-ownership matching keep working unchanged.
 */
export default function StaffAssigneeSelect({
  value = "",
  onChange,
  id,
  disabled = false,
  className = "",
  placeholder = "Unassigned",
  hint,
  showPreview = true,
}) {
  const generatedId = useId();
  const selectId = id || `staff-assignee-${generatedId}`;
  const [staff, setStaff] = useState(directoryCache || []);
  const [loading, setLoading] = useState(!directoryCache);
  const [error, setError] = useState("");

  const load = (force = false) => {
    setLoading(true);
    setError("");
    fetchDirectory(force)
      .then((rows) => setStaff(rows))
      .catch((err) => setError(err.message || "Could not load the staff directory"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    if (!directoryCache) {
      setLoading(true);
      fetchDirectory()
        .then((rows) => {
          if (active) setStaff(rows);
        })
        .catch((err) => {
          if (active) setError(err.message || "Could not load the staff directory");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, []);

  const groups = useMemo(() => {
    const map = new Map();
    staff.forEach((person) => {
      const department = String(person.department || "").trim() || "No department";
      if (!map.has(department)) map.set(department, []);
      map.get(department).push(person);
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
      .map(([department, people]) => [
        department,
        people.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
      ]);
  }, [staff]);

  const selectedStaff = value
    ? staff.find((person) => person.name === value || person.username === value)
    : null;
  const isLegacyValue = Boolean(value) && !selectedStaff;

  return (
    <div className={`staff-assignee ${className}`.trim()}>
      <select
        id={selectId}
        className="form-select form-select-sm staff-assignee__control"
        value={value || ""}
        onChange={(event) => onChange?.(event.target.value)}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-describedby={hint ? `${selectId}-hint` : undefined}
      >
        <option value="">{loading ? "Loading staff…" : placeholder}</option>
        {isLegacyValue ? <option value={value}>{value} (current)</option> : null}
        {groups.map(([department, people]) => (
          <optgroup key={department} label={department}>
            {people.map((person) => (
              <option key={person.username} value={person.name}>
                {person.name}
                {person.position ? ` — ${person.position}` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {hint ? (
        <div className="form-text" id={`${selectId}-hint`}>
          {hint}
        </div>
      ) : null}

      {showPreview ? (
        <div
          className={`staff-assignee__preview${value ? "" : " staff-assignee__preview--empty"}`}
          aria-live="polite"
        >
          <span className="staff-assignee__avatar" aria-hidden="true">
            {selectedStaff ? initials(selectedStaff.name) : <UserRound size={15} />}
          </span>
          <span className="staff-assignee__details">
            {selectedStaff ? (
              <>
                <span className="staff-assignee__name">{selectedStaff.name}</span>
                <span className="staff-assignee__meta">
                  {[selectedStaff.position, selectedStaff.department].filter(Boolean).join(" · ") ||
                    roleLabel(selectedStaff.role)}
                </span>
              </>
            ) : isLegacyValue ? (
              <>
                <span className="staff-assignee__name">{value}</span>
                <span className="staff-assignee__meta">
                  {disabled
                    ? "Current owner is not in the staff directory."
                    : "Current owner is not in the staff directory. Choose a person to update it."}
                </span>
              </>
            ) : (
              <span className="staff-assignee__meta">No owner assigned yet.</span>
            )}
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="staff-assignee__error" role="status">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-link p-0" onClick={() => load(true)}>
            <RefreshCw size={12} className="me-1" />
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
