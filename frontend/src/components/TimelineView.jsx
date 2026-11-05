import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";

export default function TimelineView({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/timeline/${projectId}`)
      .then((res) => setData(res))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="text-muted mt-3">Calculating critical path...</div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;
  if (!data || !data.activities || data.activities.length === 0) {
    return <div className="text-muted mt-3">No tasks found. Add activities to see the timeline.</div>;
  }

  return (
    <div className="mt-3">
      <div className="alert alert-info border-0 shadow-sm d-flex align-items-center gap-2">
        <AlertTriangle size={18} />
        <span><strong>Critical Path Analysis:</strong> Tasks highlighted in red have zero slack. Any delay here will delay the entire project.</span>
      </div>

      <div className="app-table mt-3">
        <table className="table mb-0">
          <thead>
            <tr>
              <th>Task ID</th>
              <th>Title</th>
              <th>Early Start</th>
              <th>Slack (Float)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.activities.map((act) => {
              const isCritical = act.isCritical;
              return (
                <tr key={act.activityId} className={isCritical ? "table-danger" : ""}>
                  <td className="fw-semibold">{act.activityId}</td>
                  <td>{act.title}</td>
                  <td>{new Date(act.earlyStart).toLocaleDateString()}</td>
                  <td>
                    {isCritical ? (
                      <span className="badge bg-danger d-flex align-items-center gap-1" style={{ width: "fit-content" }}>
                        <AlertTriangle size={12} /> Critical
                      </span>
                    ) : (
                      <span className="badge bg-success d-flex align-items-center gap-1" style={{ width: "fit-content" }}>
                        <Clock size={12} /> {act.slack} days
                      </span>
                    )}
                  </td>
                  <td>
                    {act.isCritical ? (
                      <span className="text-danger fw-semibold">Bottleneck</span>
                    ) : (
                      <span className="text-success">On Track</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}