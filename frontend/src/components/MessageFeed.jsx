import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Send, Trash2 } from "lucide-react";

export default function MessageFeed({ projectId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.get(`/messages/${projectId}`);
      setMessages(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    try {
      await api.post(`/messages/${projectId}`, { title, body });
      setTitle(""); setBody("");
      load();
    } catch (e) { alert(e.message); }
  };

  const deleteMsg = async (id) => {
    if (!confirm("Delete this message?")) return;
    try { await api.del(`/messages/${id}`); load(); } catch (e) { alert(e.message); }
  };

  return (
    <div className="message-feed">
      <div className="card p-3 mb-4 border-0 shadow-sm">
        <form onSubmit={submit}>
          <input className="form-control form-control-sm mb-2" placeholder="Message Title" value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className="form-control form-control-sm mb-2" rows={2} placeholder="Write an announcement..." value={body} onChange={e => setBody(e.target.value)} />
          <div className="text-end">
            <button type="submit" className="btn-brand btn-sm" disabled={!title.trim() || !body.trim()}>Post Message</button>
          </div>
        </form>
      </div>

      {loading ? <div className="text-muted small">Loading messages...</div> : (
        <div className="d-flex flex-column gap-3">
          {messages.length === 0 && <div className="text-muted fst-italic text-center py-4">No messages posted yet.</div>}
          {messages.map((m) => (
            <div key={m.id} className="card border-0 shadow-sm p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0 fw-bold">{m.title}</h6>
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>{m.author} • {new Date(m.createdAt).toLocaleDateString()}</span>
                  {(m.author === user?.username || user?.role === "admin") && (
                    <button className="btn btn-sm btn-link text-danger p-0" onClick={() => deleteMsg(m.id)}><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: "0.9rem" }}>{m.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}