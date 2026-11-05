import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Edit2, Trash2, Plus } from "lucide-react";
import UserForm from "../components/UserForm";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

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

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="page-title mb-0">Users</h2>
        <button className="btn-brand btn-sm px-3 d-flex align-items-center" onClick={() => { setEditUser(null); setShowModal(true); }}>
          <Plus size={14} className="me-1" /> Add User
        </button>
      </div>

      {err && <div className="alert alert-danger">{err}</div>}
      {loading && <div className="spinner-border text-success" />}
      
      {showModal && <UserForm user={editUser} onSave={handleSave} onClose={() => setShowModal(false)} />}

      {!loading && !err && (
        <div className="app-table">
          <table className="table mb-0">
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Role</th>
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
                  <td>{u.email || "—"}</td>
                  <td>{u.assignedDirectorate || "—"}</td>
                  <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : "Never"}</td>
                  <td>
                    <button className="btn btn-sm btn-link text-secondary p-0 me-2" onClick={() => { setEditUser(u); setShowModal(true); }}>
                      <Edit2 size={14} />
                    </button>
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
      )}
    </div>
  );
}