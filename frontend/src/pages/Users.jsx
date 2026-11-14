import { useEffect, useState } from "react";
import { api, API_BASE } from "../lib/api";
import { Edit2, Trash2, Plus, Upload, Download, Users as UsersIcon, X, KeyRound } from "lucide-react";
import UserForm from "../components/UserForm";
import PageHeader from "../components/PageHeader";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  // CSV import
  const [showImport, setShowImport] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  const loadUsers = () => {
    setLoading(true);
    api.get("/users")
      .then(setUsers)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSave = async (data) => {
    try {
      if (editUser) {
        await api.put(`/users/${editUser.username}`, data);
      } else {
        await api.post("/users", data);
      }
      setShowModal(false);
      loadUsers();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (username) => {
    if (!confirm(`Delete user "${username}"?`)) return;
    try {
      await api.del(`/users/${username}`);
      loadUsers();
    } catch (e) { alert(e.message); }
  };

  const handleMfaReset = async (username) => {
    if (!confirm(`Reset all passkeys, authenticator and recovery codes for "${username}"? Their sessions will end.`)) return;
    try {
      const result = await api.post(`/users/${username}/mfa-reset`, {});
      alert(result.message);
      loadUsers();
    } catch (e) { alert(e.message); }
  };

  const handleImport = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = form.querySelector('input[type="file"]')?.files?.[0];
    if (!file) {
      setImportStatus({ type: "danger", message: "Choose a CSV file first." });
      return;
    }
    setImportBusy(true);
    setImportStatus(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${API_BASE}/hr/upload`, { method: "POST", body, credentials: "include" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || payload.message || "The CSV could not be imported.");
      setImportStatus({
        type: payload.added ? "success" : "warning",
        message: `${payload.added || 0} user(s) added, ${payload.skipped || 0} skipped (already existing).`,
      });
      form.reset();
      loadUsers();
    } catch (e) {
      setImportStatus({ type: "danger", message: e.message || "The CSV could not be imported." });
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="users-page">
      <PageHeader
        icon={<UsersIcon size={20} />}
        kicker="Administration · access control"
        title="Users"
        subtitle="Accounts, roles and the position that decides which left-pane tabs each person can open."
        actions={
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-outline-secondary btn-sm d-flex align-items-center" onClick={() => setShowImport((open) => !open)}>
              <Upload size={14} className="me-1" /> Import CSV
            </button>
            <button className="btn-brand btn-sm px-3 d-flex align-items-center" onClick={() => { setEditUser(null); setShowModal(true); }}>
              <Plus size={14} className="me-1" /> Add User
            </button>
          </div>
        }
      />

      {err && <div className="alert alert-danger">{err}</div>}

      {showImport && (
        <div className="card border-0 shadow-sm users-import-card mb-3">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
              <div>
                <h6 className="fw-bold mb-1">Import users from CSV</h6>
                <div className="small text-muted">
                  Columns: firstName, lastName, username, email, role, position, department, subDepartment, employeeNo, phone.
                  Existing usernames are skipped; imported accounts use the password in the file or <code>Password123!</code>.
                </div>
              </div>
              <button type="button" className="btn btn-sm btn-link text-muted p-0" onClick={() => setShowImport(false)} aria-label="Close import panel">
                <X size={16} />
              </button>
            </div>
            <a className="btn btn-sm btn-outline-primary mb-3" href={`${API_BASE}/hr/template`} download>
              <Download size={14} className="me-1" /> Download CSV template
            </a>
            <form className="users-import-form" onSubmit={handleImport}>
              <input type="file" accept=".csv,text/csv" className="form-control form-control-sm" required />
              <button type="submit" className="btn btn-primary btn-sm" disabled={importBusy}>
                <Upload size={14} className="me-1" /> {importBusy ? "Importing…" : "Import users"}
              </button>
            </form>
            {importStatus && <div className={`alert alert-${importStatus.type} py-2 px-3 small mt-3 mb-0`}>{importStatus.message}</div>}
          </div>
        </div>
      )}
      {loading && <div className="spinner-border text-success" />}
      
      {showModal && <UserForm user={editUser} onSave={handleSave} onClose={() => setShowModal(false)} />}

      {!loading && !err && (
        <div className="app-table">
          <div className="table-responsive">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Role</th>
                <th>Position</th>
                <th>Email</th>
                <th>Department</th>
                <th>Last Login</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.username}>
                  <td><strong>{u.firstName || u.username}</strong></td>
                  <td>{u.lastName || "—"}</td>
                  <td>{u.role}</td>
                  <td className="small">{u.position || "—"}</td>
                  <td>{u.email || "—"}</td>
                  <td>{u.department || "—"}</td>
                  <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never"}</td>
                  <td>
                    <button className="btn btn-sm btn-link text-secondary p-0 me-2" onClick={() => { setEditUser(u); setShowModal(true); }}>
                      <Edit2 size={14} />
                    </button>
                    {u.username !== "admin" && (
                      <button
                        className="btn btn-sm btn-link text-warning p-0 me-2"
                        title="Reset two-factor and passkeys"
                        onClick={() => handleMfaReset(u.username)}
                      >
                        <KeyRound size={14} />
                      </button>
                    )}
                    {u.username !== "admin" && (
                      <button className="btn btn-sm btn-link text-danger p-0" onClick={() => handleDelete(u.username)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}