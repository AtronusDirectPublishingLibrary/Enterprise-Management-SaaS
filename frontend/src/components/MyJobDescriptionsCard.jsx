import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Download, FileText, PenLine } from "lucide-react";
import { api, assetUrl } from "../lib/api";
import SignatureDialog from "./SignatureDialog";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/**
 * Employee view of job descriptions explicitly assigned to them. HR sees the
 * full library in Recruitment; everyone else only ever sees their own rows.
 */
export default function MyJobDescriptionsCard({ onError }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await api.get("/job-descriptions/mine"));
    } catch (error) {
      onError?.(error.message);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { load(); }, [load]);

  const markViewed = async (assignment) => {
    if (assignment.viewedAt) return;
    try {
      await api.post(`/job-descriptions/${assignment.jobDescriptionId}/view`, {});
      load();
    } catch {
      /* opening the file still records the view server-side */
    }
  };

  const acknowledge = async (signedName) => {
    if (!signing) return;
    setBusy(true);
    try {
      await api.post(`/job-descriptions/${signing.jobDescriptionId}/acknowledge`, { signedName });
      setSigning(null);
      await load();
    } catch (error) {
      onError?.(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center gap-2 flex-wrap">
        <div>
          <h2 className="h6 fw-bold mb-1 d-flex align-items-center gap-2">
            <FileText size={18} /> My job description
          </h2>
          <div className="small text-muted">Documents HR has assigned specifically to you.</div>
        </div>
        <span className="badge bg-light text-dark border">{rows.length} assigned</span>
      </div>
      <div className="card-body p-0">
        {rows.length === 0 ? (
          <div className="p-4 text-muted small">
            No job description has been assigned to you yet. HR will notify you when it is available.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Document</th>
                  <th className="d-none d-md-table-cell">Effective</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((assignment) => {
                  const document = assignment.jobDescription;
                  return (
                    <tr key={assignment.id}>
                      <td>
                        <div className="fw-semibold small">{document.title}</div>
                        <div className="text-muted" style={{ fontSize: "0.74rem" }}>
                          v{document.version}
                          {document.department ? ` · ${document.department}` : ""}
                          {document.position ? ` · ${document.position}` : ""}
                        </div>
                      </td>
                      <td className="small d-none d-md-table-cell">{formatDate(document.effectiveDate)}</td>
                      <td>
                        {assignment.acknowledgedAt ? (
                          <span className="hrx-chip hrx-chip--good">Acknowledged</span>
                        ) : assignment.viewedAt ? (
                          <span className="hrx-chip hrx-chip--info">Viewed</span>
                        ) : (
                          <span className="hrx-chip hrx-chip--warn">New</span>
                        )}
                      </td>
                      <td className="text-end text-nowrap">
                        <a
                          className="btn btn-sm btn-outline-primary me-1"
                          href={assetUrl(`/api/job-descriptions/${document.id}/file`)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => markViewed(assignment)}
                        >
                          <Download size={14} /> Open
                        </a>
                        {!assignment.acknowledgedAt ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => setSigning(assignment)}
                          >
                            <PenLine size={14} /> Acknowledge
                          </button>
                        ) : (
                          <span className="small text-success d-inline-flex align-items-center gap-1">
                            <BadgeCheck size={14} /> {formatDate(assignment.acknowledgedAt)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SignatureDialog
        open={Boolean(signing)}
        title="Acknowledge job description"
        subtitle={`Sign to confirm you have read and received “${signing?.jobDescription?.title || "your job description"}”.`}
        confirmLabel="Sign acknowledgement"
        busy={busy}
        onCancel={() => setSigning(null)}
        onConfirm={acknowledge}
      />
    </div>
  );
}
