import { CalendarRange, Filter, Layers, RotateCcw } from "lucide-react";

/**
 * One scope control shared by Goals and Portfolios. Every figure on both pages
 * is computed by the API for exactly this plan type and period, so the two
 * screens can never disagree about the corporate totals.
 */
export default function PlanningScope({ filters, type, period, onChange, resultLabel }) {
  const types = filters?.types || [];
  const periods = (filters?.periods || []).filter((entry) => !type || entry.type === type);
  const active = Boolean(type || period);

  return (
    <div className="planning-scope">
      <div className="planning-scope__types" role="group" aria-label="Filter by plan type">
        <button
          type="button"
          className={`planning-scope__type ${!type ? "is-active" : ""}`}
          onClick={() => onChange({ type: "", period: "" })}
        >
          <Layers size={14} />
          <span>All plans</span>
        </button>
        {types.map((entry) => (
          <button
            key={entry.value}
            type="button"
            className={`planning-scope__type planning-scope__type--${entry.value.toLowerCase()} ${type === entry.value ? "is-active" : ""}`}
            onClick={() => onChange({ type: entry.value, period: "" })}
          >
            <span>{entry.label}</span>
            <em>{entry.count}</em>
          </button>
        ))}
      </div>

      <div className="planning-scope__period">
        <CalendarRange size={15} aria-hidden="true" />
        <label className="visually-hidden" htmlFor="planning-period">Plan period</label>
        <select
          id="planning-period"
          className="form-select form-select-sm"
          value={period}
          onChange={(event) => onChange({ period: event.target.value })}
        >
          <option value="">All periods</option>
          {periods.map((entry) => (
            <option key={`${entry.type}-${entry.periodLabel}`} value={entry.periodLabel}>
              {entry.typeLabel} · {entry.periodLabel}
            </option>
          ))}
        </select>
        <Filter size={14} aria-hidden="true" />
      </div>

      {resultLabel ? <div className="planning-scope__result">{resultLabel}</div> : null}

      {active ? (
        <button type="button" className="planning-scope__reset" onClick={() => onChange({ type: "", period: "" })}>
          <RotateCcw size={13} /> Clear
        </button>
      ) : null}
    </div>
  );
}
