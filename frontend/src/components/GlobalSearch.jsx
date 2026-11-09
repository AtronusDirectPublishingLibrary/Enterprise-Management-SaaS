import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, FolderKanban, Search, Target, UserRound, X } from "lucide-react";
import { api } from "../lib/api";

const EMPTY = { projects: [], plans: [], items: [], people: [], documents: [] };

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const box = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      api.get(`/search?q=${encodeURIComponent(text)}`)
        .then((data) => setResults({ ...EMPTY, ...data }))
        .catch(() => setResults(EMPTY))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const close = (event) => {
      if (box.current && !box.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (path) => {
    if (!path) return;
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  const groups = [
    { key: "projects", label: "Projects", icon: FolderKanban, rows: results.projects, path: (row) => `/database/pms`, title: (row) => row.title, meta: (row) => row.projectId },
    { key: "plans", label: "Plans", icon: Target, rows: results.plans, path: (row) => row.path, title: (row) => row.title, meta: (row) => row.periodLabel },
    { key: "items", label: "Plan items", icon: Target, rows: results.items, path: (row) => row.path, title: (row) => row.title, meta: (row) => `${row.kind}${row.code ? ` · ${row.code}` : ""}` },
    { key: "people", label: "People", icon: UserRound, rows: results.people, path: () => "/users", title: (row) => [row.firstName, row.lastName].filter(Boolean).join(" ") || row.username, meta: (row) => row.position || row.department || row.username },
    { key: "documents", label: "Documents", icon: FileText, rows: results.documents, path: () => "/database/archive", title: (row) => row.title, meta: (row) => `${row.type}${row.version ? ` · ${row.version}` : ""}` },
  ].filter((group) => group.rows.length);

  const hasResults = groups.length > 0;

  return (
    <div className="global-search" ref={box}>
      <div className="global-search-input">
        <Search size={15} />
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search projects, plans, people…"
          aria-label="Search the database"
        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); setResults(EMPTY); }} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>
      {open && query.trim().length >= 2 && (
        <div className="global-search-results">
          {loading && <div className="global-search-empty">Searching…</div>}
          {!loading && !hasResults && <div className="global-search-empty">No matching records.</div>}
          {!loading && groups.map((group) => {
            const Icon = group.icon;
            return (
              <div className="global-search-group" key={group.key}>
                <div className="global-search-label">{group.label}</div>
                {group.rows.map((row) => (
                  <button type="button" key={`${group.key}-${row.id || row.projectId || row.username || row.title}`} onClick={() => go(group.path(row))}>
                    <Icon size={14} />
                    <span>
                      <strong>{group.title(row)}</strong>
                      <small>{group.meta(row)}</small>
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
