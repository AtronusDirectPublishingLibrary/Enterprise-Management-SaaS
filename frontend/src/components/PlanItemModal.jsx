import { useEffect, useState } from "react";
import { Plus, Trash2, Link2 } from "lucide-react";
import { api } from "../lib/api";

const KINDS = ["PILLAR", "GOAL", "OBJECTIVE", "STRATEGY", "ACTIVITY", "KPI", "MILESTONE"];
const STATUSES = ["Planned", "In Progress", "Completed", "At Risk"];

const KIND_COLORS = {
  PILLAR: "#7c3aed",
  GOAL: "var(--brand-primary)",
  OBJECTIVE: "#0f766e",
  STRATEGY: "#0369a1",
  ACTIVITY: "#b45309",
  KPI: "#be123c",
  MILESTONE: "#4b5563",
};

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

export default function PlanItemModal({ plan, item, parentId, defaultKind, onClose, onSaved }) {
  const isKpi = (kind) => kind === "KPI";
  const [form, setForm] = useState({
    kind: item?.kind || defaultKind || "OBJECTIVE",
    code: item?.code || "",
    title: item?.title || "",
    description: item?.description || "",
    owner: item?.owner || "",
    unit: item?.unit || "",
    baseline: item?.baseline ?? "",
    targetValue: item?.targetValue ?? "",
    currentValue: item?.currentValue ?? "",
    direction: item?.direction || "increase",
    frequency: item?.frequency || "Annual",
    dataSource: item?.dataSource || "",
    isFeatured: item?.isFeatured || false,
    startDate: toDateInput(item?.startDate),
    endDate: toDateInput(item?.endDate),
    budget: item?.budget ?? "",
    status: item?.status || "Planned",
    progress: item?.progress ?? 0,
    linkedItemId: item?.linkedItemId || "",
  });
  const [targets, setTargets] = useState(
    (item?.targets || []).map((target) => ({
      periodLabel: target.periodLabel,
      target: target.target ?? "",
      actual: target.actual ?? "",
      targetLabel: target.targetLabel || "",
    }))
  );
  const [linkable, setLinkable] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!plan.parent?.id) return;
    api
      .get(`/plans/${plan.parent.id}`)
      .then((data) => setLinkable(data.items || []))
      .catch(() => setLinkable([]));
  }, [plan.parent?.id]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const number = (value) => (value === "" || value == null ? null : Number(value));
    const payload = {
      kind: form.kind,
      code: form.code || null,
      title: form.title,
      description: form.description || null,
      owner: form.owner || null,
      linkedItemId: form.linkedItemId || null,
      status: form.status,
      progress: Number(form.progress) || 0,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      ...(isKpi(form.kind)
        ? {
            unit: form.unit || null,
            baseline: number(form.baseline),
            targetValue: number(form.targetValue),
            currentValue: number(form.currentValue),
            direction: form.direction,
            frequency: form.frequency,
            dataSource: form.dataSource || null,
            isFeatured: Boolean(form.isFeatured),
          }
        : {}),
    };

    try {
      const saved = item
        ? await api.put(`/plans/items/${item.id}`, payload)
        : await api.post(`/plans/${plan.id}/items`, { ...payload, parentId: parentId || null });

      if (isKpi(form.kind)) {
        await api.put(`/plans/items/${saved.id}/targets`, {
          targets: targets
            .filter((row) => row.periodLabel.trim())
            .map((row) => ({
              periodLabel: row.periodLabel.trim(),
              target: number(row.target),
              actual: number(row.actual),
              targetLabel: row.targetLabel || null,
            })),
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal d-block" style={{ background: "rgba(15,23,42,0.5)", zIndex: 1080 }} onClick={onClose}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(event) => event.stopPropagation()}>
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header">
            <h5 className="modal-title fw-bold mb-0">{item ? "Edit item" : "Add plan item"}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={submit}>
            <div className="modal-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Type</label>
                  <select className="form-select form-select-sm" value={form.kind} onChange={(e) => set("kind", e.target.value)}>
                    {KINDS.map((kind) => (
                      <option key={kind} value={kind}>{kind}</option>
                    ))}
                  </select>
                  <span className="badge mt-2" style={{ background: KIND_COLORS[form.kind] }}>{form.kind}</span>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Code</label>
                  <input className="form-control form-control-sm" value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="SO1, P2..." />
                </div>
                <div className="col-md-5">
                  <label className="form-label small fw-semibold">Owner</label>
                  <input className="form-control form-control-sm" value={form.owner} onChange={(e) => set("owner", e.target.value)} placeholder="username responsible" />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Title</label>
                  <input required className="form-control form-control-sm" value={form.title} onChange={(e) => set("title", e.target.value)} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Description</label>
                  <textarea className="form-control form-control-sm" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
                </div>

                {linkable.length > 0 && (
                  <div className="col-12">
                    <label className="form-label small fw-semibold d-flex align-items-center gap-1">
                      <Link2 size={13} /> Aligned to {plan.parent?.title}
                    </label>
                    <select className="form-select form-select-sm" value={form.linkedItemId} onChange={(e) => set("linkedItemId", e.target.value)}>
                      <option value="">Not aligned</option>
                      {linkable.map((linked) => (
                        <option key={linked.id} value={linked.id}>
                          {linked.code ? `${linked.code} · ` : ""}{linked.title} ({linked.kind})
                        </option>
                      ))}
                    </select>
                    <div className="form-text">Child plan delivery blends into the linked item's completion.</div>
                  </div>
                )}

                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Status</label>
                  <select className="form-select form-select-sm" value={form.status} onChange={(e) => set("status", e.target.value)}>
                    {STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Progress %</label>
                  <input type="number" min="0" max="100" className="form-control form-control-sm" value={form.progress} onChange={(e) => set("progress", e.target.value)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Budget</label>
                  <input type="number" step="0.01" className="form-control form-control-sm" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Start date</label>
                  <input type="date" className="form-control form-control-sm" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">End date (drives deadline alerts)</label>
                  <input type="date" className="form-control form-control-sm" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
                </div>

                {isKpi(form.kind) && (
                  <>
                    <div className="col-12"><hr className="my-1" /><div className="small fw-bold text-uppercase text-muted">KPI definition</div></div>
                    <div className="col-md-3">
                      <label className="form-label small fw-semibold">Unit</label>
                      <input className="form-control form-control-sm" value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="%, USD M, staff" />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-semibold">Baseline</label>
                      <input type="number" step="0.01" className="form-control form-control-sm" value={form.baseline} onChange={(e) => set("baseline", e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-semibold">Overall target</label>
                      <input type="number" step="0.01" className="form-control form-control-sm" value={form.targetValue} onChange={(e) => set("targetValue", e.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label small fw-semibold">Current value</label>
                      <input type="number" step="0.01" className="form-control form-control-sm" value={form.currentValue} onChange={(e) => set("currentValue", e.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Direction</label>
                      <select className="form-select form-select-sm" value={form.direction} onChange={(e) => set("direction", e.target.value)}>
                        <option value="increase">Higher is better</option>
                        <option value="decrease">Lower is better</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Frequency</label>
                      <select className="form-select form-select-sm" value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
                        <option>Annual</option>
                        <option>Quarterly</option>
                        <option>Monthly</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Data source</label>
                      <input className="form-control form-control-sm" value={form.dataSource} onChange={(e) => set("dataSource", e.target.value)} />
                    </div>

                    <div className="col-12">
                      <div className="form-check mb-2">
                        <input className="form-check-input" type="checkbox" id="kpi-featured" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
                        <label className="form-check-label small" htmlFor="kpi-featured">Feature this KPI on the public home page</label>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small fw-bold text-uppercase text-muted">Period targets &amp; actuals</span>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setTargets([...targets, { periodLabel: "", target: "", actual: "", targetLabel: "" }])}>
                          <Plus size={13} className="me-1" /> Add period
                        </button>
                      </div>
                      {targets.length === 0 && <div className="small text-muted fst-italic">No period targets yet. Add one per year or quarter.</div>}
                      {targets.map((row, index) => (
                        <div className="row g-1 mb-1" key={index}>
                          <div className="col-3">
                            <input className="form-control form-control-sm" placeholder="2026 / Q1 2026/27" value={row.periodLabel} onChange={(e) => setTargets(targets.map((r, i) => i === index ? { ...r, periodLabel: e.target.value } : r))} />
                          </div>
                          <div className="col-3">
                            <input type="number" step="0.01" className="form-control form-control-sm" placeholder="Target" value={row.target} onChange={(e) => setTargets(targets.map((r, i) => i === index ? { ...r, target: e.target.value } : r))} />
                          </div>
                          <div className="col-3">
                            <input type="number" step="0.01" className="form-control form-control-sm" placeholder="Actual" value={row.actual} onChange={(e) => setTargets(targets.map((r, i) => i === index ? { ...r, actual: e.target.value } : r))} />
                          </div>
                          <div className="col-3 d-flex">
                            <input className="form-control form-control-sm" placeholder="Qualitative target" value={row.targetLabel} onChange={(e) => setTargets(targets.map((r, i) => i === index ? { ...r, targetLabel: e.target.value } : r))} />
                            <button type="button" className="btn btn-sm text-danger" onClick={() => setTargets(targets.filter((_, i) => i !== index))}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {error && <div className="alert alert-danger py-2 small mt-3 mb-0">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-brand btn-sm" disabled={saving}>{saving ? "Saving…" : "Save item"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
