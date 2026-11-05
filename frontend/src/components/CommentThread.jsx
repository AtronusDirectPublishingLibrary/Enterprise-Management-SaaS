import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Send, Trash2 } from "lucide-react";

export default function CommentThread({ targetType, targetId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.get(`/comments?targetType=${targetType}&targetId=${targetId}`);
      setComments(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [targetType, targetId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await api.post("/comments", { targetType, targetId, body });
      setBody("");
      load();
    } catch (e) { alert(e.message); }
  };

  const deleteComment = async (id) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await api.del(`/comments/${id}`);
      load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="comment-thread mt-3">
      {loading ? <div className="text-muted small">Loading comments...</div> : (
        <div className="mb-3">
          {comments.length === 0 && <div className="text-muted small fst-italic">No comments yet. Start the discussion!</div>}
          {comments.map((c) => (
            <div key={c.id} className="d-flex mb-2 p-2 bg-white rounded border">
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <strong style={{ fontSize: "0.85rem" }}>{c.author}</strong>
                  <span className="text-muted" style={{ fontSize: "0.75rem" }}>
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: "0.9rem" }}>{c.body}</div>
              </div>
              {(c.author === user?.username || user?.role === "admin") && (
                <button className="btn btn-sm btn-link text-danger p-0 ms-2" onClick={() => deleteComment(c.id)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="d-flex gap-2">
        <input
          className="form-control form-control-sm"
          placeholder="Write a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button type="submit" className="btn-brand btn-sm d-flex align-items-center" disabled={!body.trim()}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}