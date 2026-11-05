import { useEffect, useState } from "react";
import { api } from "../lib/api";
import AutomationBuilder from "./AutomationBuilder";

export default function BriefEditor({ projectId }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get(`/briefs/${projectId}`)
      .then(d => { setContent(d.content || ""); setLoaded(true); })
      .catch(e => alert(e.message));
  }, [projectId]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/briefs/${projectId}`, { content });
      alert("Brief saved successfully!");
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  if (!loaded) return <div className="text-muted small">Loading brief...</div>;

  return (
    <div className="brief-editor card border-0 shadow-sm p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Project Brief & Documentation</h5>
        <button className="btn-brand btn-sm" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Brief"}
        </button>
      </div>
      <textarea
        className="form-control font-monospace"
        rows={12}
        placeholder="Write your project brief, goals, and documentation here (Markdown supported)..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <AutomationBuilder projectId={projectId} />
    </div>
  );
}