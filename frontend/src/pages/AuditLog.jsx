import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Helmet } from "react-helmet-async";
import { ShieldAlert, Download, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchAction, setSearchAction] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLogs = () => {
    setLoading(true);
    api.get(`/audit?page=${page}&limit=20&action=${searchAction}`)
      .then(res => {
        setLogs(res.data || []);
        setTotalPages(res.totalPages || 1);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadLogs();
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const handleExportCSV = () => {
    const headers = ["Date", "User", "Action", "Grant ID", "Details"];
    const rows = logs.map(l => [
      new Date(l.timestamp).toLocaleString(),
      l.user || "—",
      l.action,
      l.grantId || "—",
      l.details ? JSON.stringify(l.details) : "—"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid py-4">
      <Helmet><title>Audit Log | EBPE</title></Helmet>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 fw-bold mb-0" style={{ color: "var(--brand-primary)" }}>
          <ShieldAlert className="me-2" size={28} /> System Audit Log
        </h1>
        <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={handleExportCSV}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white p-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-3">
          <form onSubmit={handleSearch} className="d-flex gap-2" style={{ maxWidth: "400px", width: "100%" }}>
            <div className="position-relative flex-grow-1">
              <Search size={16} className="position-absolute text-muted" style={{ left: 10, top: 10 }} />
              <input 
                type="text" 
                className="form-control form-control-sm ps-4" 
                placeholder="Filter by action (e.g. CREATE, LOGIN)..." 
                value={searchAction}
                onChange={(e) => setSearchAction(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-sm btn-primary">Filter</button>
          </form>
          
          <div className="small text-muted">
            Page {page} of {totalPages}
          </div>
        </div>

        <div className="card-body p-0 table-responsive" style={{ minHeight: "300px" }}>
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          ) : (
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Grant ID</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-4 text-muted">No audit logs found.</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id}>
                      <td className="text-nowrap small">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="fw-bold small">{log.user || "System"}</td>
                      <td><span className="badge bg-secondary">{log.action}</span></td>
                      <td className="small text-muted">{log.grantId || "—"}</td>
                      <td className="small text-muted text-truncate" style={{ maxWidth: "300px" }}>
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="card-footer bg-white border-top d-flex justify-content-between align-items-center p-3">
          <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={16} /> Previous
          </button>
          <button className="btn btn-sm btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}