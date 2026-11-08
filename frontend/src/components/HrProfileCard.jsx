import { useState } from "react";
import { UserRound } from "lucide-react";
import { api } from "../lib/api";

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/**
 * Asked once, on the first visit: the person picks a profession and the form
 * only asks for the credentials that profession actually has to renew.
 */
export default function HrProfileCard({ data, onSaved, onError }) {
  const licenceDocument = data.documents.find((document) => document.category === "LICENCE");
  const medicalDocument = data.documents.find((document) => document.category === "MEDICAL");

  const [editing, setEditing] = useState(!data.profileComplete);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    profession: data.profile.profession || "",
    phone: data.profile.phone || "",
    licenceName: licenceDocument?.title || "",
    licenceNumber: licenceDocument?.reference || "",
    licenceExpiry: licenceDocument?.expiresAt ? licenceDocument.expiresAt.slice(0, 10) : "",
    medicalExpiry: medicalDocument?.expiresAt ? medicalDocument.expiresAt.slice(0, 10) : "",
  });

  const groups = [...new Set(data.professions.map((profession) => profession.group))];
  const selected = data.professions.find((profession) => profession.code === form.profession) || null;

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.patch("/hr-self/profile", {
        profession: form.profession,
        phone: form.phone || undefined,
        licenceName: form.licenceName || undefined,
        licenceNumber: form.licenceNumber || undefined,
        licenceExpiry: form.licenceExpiry || null,
        medicalExpiry: form.medicalExpiry || null,
      });
      setEditing(false);
      await onSaved();
    } catch (error) {
      onError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="card border-0 shadow-sm mb-4"
      style={!data.profileComplete ? { borderLeft: "4px solid #c9a227" } : undefined}
    >
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <h2 className="h6 fw-bold mb-0 d-flex align-items-center gap-2">
          <UserRound size={18} /> My HR profile
          {!data.profileComplete ? <span className="badge bg-warning text-dark ms-2">Required</span> : null}
        </h2>
        {data.profileComplete ? (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setEditing((open) => !open)}>
            {editing ? "Close" : "Edit"}
          </button>
        ) : null}
      </div>

      {editing ? (
        <form className="card-body" onSubmit={save}>
          <p className="small text-muted mb-3">
            Tell us what you do so the portal only tracks the renewals that apply to you. Clinical, laboratory,
            engineering and driving roles keep a professional licence current; some roles also need a medical fitness
            certificate. Everyone else is asked for neither.
          </p>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label small fw-semibold" htmlFor="profile-profession">
                Profession
              </label>
              <select
                id="profile-profession"
                className="form-select"
                value={form.profession}
                onChange={(event) => setForm({ ...form, profession: event.target.value })}
                required
              >
                <option value="">Select your profession…</option>
                {groups.map((group) => (
                  <optgroup key={group} label={group}>
                    {data.professions
                      .filter((profession) => profession.group === group)
                      .map((profession) => (
                        <option key={profession.code} value={profession.code}>
                          {profession.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label small fw-semibold" htmlFor="profile-phone">
                Phone (optional)
              </label>
              <input
                id="profile-phone"
                className="form-control"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="+251 …"
              />
            </div>

            {selected?.requiresLicence ? (
              <>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold" htmlFor="profile-licence-name">
                    {selected.licenceLabel || "Professional licence"}
                  </label>
                  <input
                    id="profile-licence-name"
                    className="form-control"
                    value={form.licenceName}
                    onChange={(event) => setForm({ ...form, licenceName: event.target.value })}
                    placeholder={selected.licenceLabel || "Licence name"}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold" htmlFor="profile-licence-number">
                    Licence number
                  </label>
                  <input
                    id="profile-licence-number"
                    className="form-control"
                    value={form.licenceNumber}
                    onChange={(event) => setForm({ ...form, licenceNumber: event.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold" htmlFor="profile-licence-expiry">
                    Expires
                  </label>
                  <input
                    id="profile-licence-expiry"
                    type="date"
                    className="form-control"
                    value={form.licenceExpiry}
                    onChange={(event) => setForm({ ...form, licenceExpiry: event.target.value })}
                  />
                </div>
              </>
            ) : null}

            {selected?.requiresMedical ? (
              <div className="col-md-6">
                <label className="form-label small fw-semibold" htmlFor="profile-medical-expiry">
                  {selected.medicalLabel || "Medical fitness certificate"} expires
                </label>
                <input
                  id="profile-medical-expiry"
                  type="date"
                  className="form-control"
                  value={form.medicalExpiry}
                  onChange={(event) => setForm({ ...form, medicalExpiry: event.target.value })}
                />
              </div>
            ) : null}
          </div>

          <div className="d-flex align-items-center gap-3 mt-3 flex-wrap">
            <button className="btn btn-brand" disabled={busy || !form.profession}>
              {busy ? "Saving…" : "Save profile"}
            </button>
            {selected && !selected.requiresLicence && !selected.requiresMedical ? (
              <span className="small text-muted">No licence or medical renewal is required for this profession.</span>
            ) : null}
            {selected?.requiresLicence ? (
              <span className="small text-muted">Only this licence is tracked — nothing else is added.</span>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="card-body">
          <div className="row g-3 small">
            <div className="col-sm-4">
              <div className="text-muted">Profession</div>
              <div className="fw-semibold">{data.profession?.label || "—"}</div>
            </div>
            <div className="col-sm-4">
              <div className="text-muted">Phone</div>
              <div className="fw-semibold">{data.profile.phone || "—"}</div>
            </div>
            <div className="col-sm-4">
              <div className="text-muted">Contract ends</div>
              <div className="fw-semibold">{data.profile.contractEnd ? formatDate(data.profile.contractEnd) : "—"}</div>
            </div>
            <div className="col-sm-4">
              <div className="text-muted">{data.requirements.licenceLabel || "Professional licence"}</div>
              <div className="fw-semibold">
                {!data.requirements.licence
                  ? "Not required"
                  : licenceDocument
                    ? `${licenceDocument.reference ? `${licenceDocument.reference} · ` : ""}${formatDate(licenceDocument.expiresAt)}`
                    : "Not on file"}
              </div>
            </div>
            <div className="col-sm-4">
              <div className="text-muted">{data.requirements.medicalLabel || "Medical fitness"}</div>
              <div className="fw-semibold">
                {!data.requirements.medical
                  ? "Not required"
                  : medicalDocument
                    ? formatDate(medicalDocument.expiresAt)
                    : "Not on file"}
              </div>
            </div>
            <div className="col-sm-4">
              <div className="text-muted">Hired</div>
              <div className="fw-semibold">{data.profile.hireDate ? formatDate(data.profile.hireDate) : "—"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
