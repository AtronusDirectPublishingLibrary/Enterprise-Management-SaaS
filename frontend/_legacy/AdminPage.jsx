import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FileText, Briefcase, Map, Target, Calendar, Plus, BarChart2, ArrowLeft, ChevronRight, TrendingUp, Search, SlidersHorizontal, X, CalendarDays, DollarSign, PieChart, Activity } from 'lucide-react';

const API = 'http://localhost:5000/api';

export default function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('pms');
  const [kpi, setKpi] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fundFilter, setFundFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Project Form States
  const [projTitle, setProjTitle] = useState('');
  const [projCoord, setProjCoord] = useState('');
  const [projFunds, setProjFunds] = useState('');
  const [projStart, setProjStart] = useState('');
  const [projEnd, setProjEnd] = useState('');

  // Deep Forms
  const [wpCode, setWpCode] = useState('');
  const [wpTitle, setWpTitle] = useState('');
  const [wpStart, setWpStart] = useState('');
  const [wpEnd, setWpEnd] = useState('');
  const [msTitle, setMsTitle] = useState('');
  const [msStart, setMsStart] = useState('');
  const [msEnd, setMsEnd] = useState('');
  const [actTitle, setActTitle] = useState('');
  const [actStart, setActStart] = useState('');
  const [actEnd, setActEnd] = useState('');
  const [actWpId, setActWpId] = useState('');

  useEffect(() => {
    loadDashboard();
    loadProjects();
  }, []);

  const loadDashboard = async () => {
    const res = await fetch(`${API}/dashboard`);
    if (res.ok) setKpi(await res.json());
  };

  const loadProjects = async () => {
    const res = await fetch(`${API}/pms/projects`);
    if (res.ok) setProjects(await res.json());
  };

  const loadProjectDetails = async (id) => {
    setSelectedProject(id);
    const res = await fetch(`${API}/pms/projects`);
    if (res.ok) {
      const data = await res.json();
      setProjectDetails(data.find(p => p.id === id));
    }
  };

  const refreshProject = () => loadProjectDetails(selectedProject);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    await fetch(`${API}/pms/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: projTitle, coordinatorName: projCoord, sourceOfFunds: projFunds, startDate: projStart, endDate: projEnd }) });
    setProjTitle(''); setProjCoord(''); setProjFunds(''); setProjStart(''); setProjEnd('');
    setIsCreatingProject(false);
    loadProjects(); loadDashboard();
  };

  const handleCreateWP = async (e) => {
    e.preventDefault();
    await fetch(`${API}/pms/workpackages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: selectedProject, code: wpCode, title: wpTitle, startDate: wpStart, endDate: wpEnd }) });
    setWpCode(''); setWpTitle(''); setWpStart(''); setWpEnd('');
    refreshProject();
  };

  const handleCreateMS = async (e) => {
    e.preventDefault();
    await fetch(`${API}/pms/milestones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: selectedProject, title: msTitle, startDate: msStart, endDate: msEnd }) });
    setMsTitle(''); setMsStart(''); setMsEnd('');
    refreshProject();
  };

  const handleCreateAct = async (e) => {
    e.preventDefault();
    await fetch(`${API}/pms/activities`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: selectedProject, workPackageId: actWpId, title: actTitle, startDate: actStart, endDate: actEnd }) });
    setActTitle(''); setActStart(''); setActEnd(''); setActWpId('');
    refreshProject();
  };

  const clearFilters = () => {
    setSearchQuery(''); setStatusFilter('All'); setFundFilter('All'); setDateFrom(''); setDateTo('');
  };

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchesFund = fundFilter === 'All' || p.sourceOfFunds === fundFilter;
    let matchesDate = true;
    if (dateFrom) matchesDate = matchesDate && new Date(p.startDate) >= new Date(dateFrom);
    if (dateTo) matchesDate = matchesDate && new Date(p.endDate) <= new Date(dateTo);
    return matchesSearch && matchesStatus && matchesFund && matchesDate;
  });

  // --- VISUALIZATION AGGREGATION ---
  let vizTotalBudget = 0;
  let vizActualSpend = 0;
  const statusCounts = { "Not Started": 0, "In Progress": 0, "Completed": 0 };
  
  filteredProjects.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    p.activities?.forEach(a => {
      vizTotalBudget += Number(a.financialPlan);
      vizActualSpend += Number(a.actualExpenditure);
    });
  });
  const vizVariance = vizTotalBudget - vizActualSpend;

  const renderGantt = () => {
    if (!projectDetails) return null;
    const items = [
      ...(projectDetails.workPackages || []).map(wp => ({ ...wp, type: 'WP' })),
      ...(projectDetails.milestones || []).map(m => ({ ...m, type: 'MS' })),
      ...(projectDetails.activities || []).map(a => ({ ...a, type: 'ACT' }))
    ].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    if (items.length === 0) return <p className="text-center py-10 text-gray-500">No data.</p>;

    const min = new Date(Math.min(...items.map(i => new Date(i.startDate).getTime())));
    const max = new Date(Math.max(...items.map(i => new Date(i.endDate).getTime())));
    const days = Math.max(1, (max - min) / (86400000));

    return (
      <div className="admin-card">
        <h3 className="text-xl font-bold text-[#0F3A35] mb-6 flex items-center gap-2"><BarChart2 className="text-[#C3A86A]"/> Gantt Chart</h3>
        <div className="relative border-l-2 border-gray-200 ml-4 space-y-3">
          {items.map(i => {
            const s = new Date(i.startDate); const e = new Date(i.endDate);
            const left = ((s - min) / 86400000) / days * 100;
            const width = Math.max(4, ((e - s) / 86400000) / days * 100);
            let color = 'bg-teal-500'; let prefix = '';
            if (i.type === 'WP') { color = 'bg-indigo-600'; prefix = '[WP] '; }
            if (i.type === 'MS') { color = 'bg-[#C3A86A]'; prefix = '◆ '; }
            return (
              <div key={i.id} className="relative h-10 flex items-center group">
                <div className="absolute left-0 w-48 truncate pr-2 -ml-4 font-semibold text-sm text-gray-700">{prefix}{i.title}</div>
                <div className="w-full ml-48 h-5 bg-gray-100 rounded-md border border-gray-200 relative overflow-hidden">
                  <div className={`absolute h-full ${color} transition-all`} style={{ left: `${left}%`, width: `${width}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const allFunds = ['All', ...new Set(projects.map(p => p.sourceOfFunds).filter(Boolean))];

  const styles = {
    filterPanel: { backgroundColor: '#0F3A35', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', marginBottom: '30px' },
    filterHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', color: 'white' },
    filterTitle: { fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', margin: 0 },
    badge: { backgroundColor: '#C3A86A', color: '#0F3A35', padding: '4px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' },
    btnNew: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', color: '#0F3A35', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px' },
    label: { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#C3A86A', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' },
    input: { width: '100%', backgroundColor: 'white', color: '#0F3A35', padding: '10px 14px', borderRadius: '8px', border: 'none', outline: 'none', fontSize: '14px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' },
    btnReset: { width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#C3A86A', color: '#0F3A35', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
    projectCard: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' },
    projectCode: { fontSize: '12px', fontWeight: 'bold', color: '#C3A86A', backgroundColor: 'rgba(195, 168, 106, 0.1)', padding: '4px 10px', borderRadius: '20px', display: 'inline-block' },
    projectTitle: { fontSize: '18px', fontWeight: 'bold', color: '#0F3A35', margin: '12px 0', lineHeight: '1.3' },
    projectMeta: { display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#6b7280', borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '16px' },
    metaRow: { display: 'flex', alignItems: 'center', gap: '8px' },
    
    // New Visualization Styles
    vizGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' },
    vizCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: '4px solid #0F3A35' },
    vizLabel: { fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '4px', display: 'block' },
    vizValue: { fontSize: '24px', fontWeight: 'bold', color: '#0F3A35' }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header" style={{ padding: '30px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#C3A86A', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#0F3A35', fontSize: '20px' }}>EB</div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'white' }}>Ethiobiopharma</h1>
              <p style={{ fontSize: '12px', color: '#C3A86A', margin: 0, letterSpacing: '0.1em' }}>COMMAND</p>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, paddingTop: '20px' }}>
          <div onClick={() => { setTab('dashboard'); setSelectedProject(null); }} className={`admin-nav-item ${tab === 'dashboard' ? 'active' : ''}`}><TrendingUp size={20} /> Dashboard</div>
          <div onClick={() => { setTab('roadmap'); setSelectedProject(null); }} className={`admin-nav-item ${tab === 'roadmap' ? 'active' : ''}`}><Map size={20} /> Roadmap</div>
          <div onClick={() => { setTab('strategic'); setSelectedProject(null); }} className={`admin-nav-item ${tab === 'strategic' ? 'active' : ''}`}><Target size={20} /> Strategic Plan</div>
          <div onClick={() => { setTab('pms'); setSelectedProject(null); }} className={`admin-nav-item ${tab === 'pms' ? 'active' : ''}`}><Briefcase size={20} /> PMS</div>
          <div onClick={() => { setTab('operational'); setSelectedProject(null); }} className={`admin-nav-item ${tab === 'operational' ? 'active' : ''}`}><Calendar size={20} /> Annual Operational Plan</div>
          <div onClick={() => { setTab('documents'); setSelectedProject(null); }} className={`admin-nav-item ${tab === 'documents' ? 'active' : ''}`}><FileText size={20} /> Document Archive</div>
        </div>

        <div className="admin-signout" onClick={() => navigate('/')} style={{ padding: '24px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <LogOut size={20} /> Sign Out
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h2 style={{ fontFamily: 'Lora, serif', fontSize: '28px', color: '#0F3A35', fontWeight: 700, margin: 0 }}>
            {tab === 'dashboard' ? 'Executive Dashboard' : tab === 'pms' && selectedProject ? 'Project Workspace' : tab === 'pms' ? 'Project Monitoring System' : `${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
          </h2>
        </header>

        {tab === 'dashboard' && kpi && (
          <div className="p-8 bg-gray-50 h-full overflow-y-auto">
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-[#0F3A35]">
                <p className="text-gray-500 text-sm mb-1">Total Projects</p>
                <p className="text-3xl font-bold text-[#0F3A35]">{kpi.kpi.totalProjects}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-[#C3A86A]">
                <p className="text-gray-500 text-sm mb-1">Total Budget</p>
                <p className="text-3xl font-bold text-[#0F3A35]">${kpi.kpi.totalPlan.toLocaleString()}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                <p className="text-gray-500 text-sm mb-1">Variance</p>
                <p className="text-3xl font-bold text-red-600">${kpi.kpi.variance.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'pms' && selectedProject ? (
          <div className="deep-workspace">
            <div className="deep-left">
              <button onClick={() => setSelectedProject(null)} className="mb-6 flex items-center gap-2 font-bold text-[#0F3A35]"><ArrowLeft size={18}/> Back to Projects</button>
              
              <div className="admin-card mb-6">
                <h3 className="font-bold text-[#0F3A35] mb-4">Add Work Package</h3>
                <form onSubmit={handleCreateWP}>
                  <input className="admin-input" required placeholder="WP Code (e.g. WP3)" value={wpCode} onChange={e => setWpCode(e.target.value)} />
                  <input className="admin-input" required placeholder="Work Package Title" value={wpTitle} onChange={e => setWpTitle(e.target.value)} />
                  <div className="flex gap-2 mb-4"><input type="date" className="admin-input mb-0" required value={wpStart} onChange={e => setWpStart(e.target.value)} /><input type="date" className="admin-input mb-0" required value={wpEnd} onChange={e => setWpEnd(e.target.value)} /></div>
                  <button className="admin-btn" style={{ backgroundColor: '#0F3A35' }}>Add WP</button>
                </form>
              </div>

              <div className="admin-card mb-6">
                <h3 className="font-bold text-[#0F3A35] mb-4">Add Milestone</h3>
                <form onSubmit={handleCreateMS}>
                  <input className="admin-input" required placeholder="Milestone Title" value={msTitle} onChange={e => setMsTitle(e.target.value)} />
                  <div className="flex gap-2 mb-4"><input type="date" className="admin-input mb-0" required value={msStart} onChange={e => setMsStart(e.target.value)} /><input type="date" className="admin-input mb-0" required value={msEnd} onChange={e => setMsEnd(e.target.value)} /></div>
                  <button className="admin-btn" style={{ backgroundColor: '#C3A86A', color: '#0F3A35' }}>Add Milestone</button>
                </form>
              </div>

              <div className="admin-card">
                <h3 className="font-bold text-[#0F3A35] mb-4">Add Activity</h3>
                <form onSubmit={handleCreateAct}>
                  <input className="admin-input" required placeholder="Activity Title" value={actTitle} onChange={e => setActTitle(e.target.value)} />
                  <select className="admin-input" value={actWpId} onChange={e => setActWpId(e.target.value)}>
                    <option value="">-- Optional: Assign to Work Package --</option>
                    {projectDetails?.workPackages.map(wp => <option key={wp.id} value={wp.id}>{wp.code} - {wp.title}</option>)}
                  </select>
                  <div className="flex gap-2 mb-4"><input type="date" className="admin-input mb-0" required value={actStart} onChange={e => setActStart(e.target.value)} /><input type="date" className="admin-input mb-0" required value={actEnd} onChange={e => setActEnd(e.target.value)} /></div>
                  <button className="admin-btn" style={{ backgroundColor: '#116d83' }}>Add Activity</button>
                </form>
              </div>
            </div>
            <div className="deep-right">
              <div className="admin-card mb-6"><h2 className="text-2xl font-serif text-[#0F3A35] mb-2">{projectDetails?.title}</h2><p className="text-gray-500">{projectDetails?.code} | Coordinator: {projectDetails?.coordinatorName}</p></div>
              {renderGantt()}
            </div>
          </div>
        ) : tab === 'pms' ? (
          <div style={{ padding: '30px', height: '100%', overflowY: 'auto', backgroundColor: '#F8F9FA' }}>
            
            {/* BRANDED FILTER HEADER */}
            <div style={styles.filterPanel}>
              <div style={styles.filterHeader}>
                <h3 style={styles.filterTitle}><SlidersHorizontal size={20} color="#C3A86A" /> Filter Portfolio</h3>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span style={styles.badge}>
                    {filteredProjects.length} / {projects.length} Projects
                  </span>
                  <button style={styles.btnNew} onClick={() => setIsCreatingProject(!isCreatingProject)}>
                    <Plus size={18} /> New Project
                  </button>
                </div>
              </div>

              <div style={styles.grid}>
                <div style={{ gridColumn: 'span 12', position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: '14px', top: '12px', color: '#9ca3af' }} size={18} />
                  <input type="text" placeholder="Search by Project Title or Code..." style={{ ...styles.input, paddingLeft: '42px' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <label style={styles.label}>Status</label>
                  <select style={styles.input} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="All">All Statuses</option>
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <label style={styles.label}>Funds</label>
                  <select style={styles.input} value={fundFilter} onChange={e => setFundFilter(e.target.value)}>
                    {allFunds.map(f => <option key={f} value={f}>{f === 'All' ? 'All Funds' : f}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 4', display: 'flex', alignItems: 'flex-end' }}>
                  <button style={styles.btnReset} onClick={clearFilters}><X size={16} /> Reset Filters</button>
                </div>
                <div style={{ gridColumn: 'span 6', marginTop: '8px' }}>
                  <label style={styles.label}><CalendarDays size={14} style={{ display: 'inline', marginRight: '4px' }}/> Start Date (From)</label>
                  <input type="date" style={styles.input} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div style={{ gridColumn: 'span 6', marginTop: '8px' }}>
                  <label style={styles.label}><CalendarDays size={14} style={{ display: 'inline', marginRight: '4px' }}/> End Date (To)</label>
                  <input type="date" style={styles.input} value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>
            </div>

            {/* LIVE VISUALIZATION DASHBOARD (Based on Filters) */}
            <div style={styles.vizGrid}>
              <div style={{ ...styles.vizCard, borderLeftColor: '#0F3A35' }}>
                <span style={styles.vizLabel}><Activity size={14} style={{ display: 'inline', marginRight: '4px' }}/> Filtered Projects</span>
                <div style={styles.vizValue}>{filteredProjects.length}</div>
              </div>
              <div style={{ ...styles.vizCard, borderLeftColor: '#C3A86A' }}>
                <span style={styles.vizLabel}><DollarSign size={14} style={{ display: 'inline', marginRight: '4px' }}/> Total Budget Plan</span>
                <div style={styles.vizValue}>${vizTotalBudget.toLocaleString()}</div>
              </div>
              <div style={{ ...styles.vizCard, borderLeftColor: '#116d83' }}>
                <span style={styles.vizLabel}><TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }}/> Actual Spend</span>
                <div style={styles.vizValue}>${vizActualSpend.toLocaleString()}</div>
              </div>
              <div style={{ ...styles.vizCard, borderLeftColor: '#ef4444' }}>
                <span style={styles.vizLabel}><PieChart size={14} style={{ display: 'inline', marginRight: '4px' }}/> Budget Variance</span>
                <div style={styles.vizValue}>${vizVariance.toLocaleString()}</div>
              </div>
            </div>

            {/* COLLAPSIBLE NEW PROJECT FORM */}
            {isCreatingProject && (
              <div style={{ marginBottom: '30px', padding: '24px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', border: '2px solid #C3A86A' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0F3A35', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Plus size={20} color="#C3A86A"/> Create New Project</h3>
                  <button onClick={() => setIsCreatingProject(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={24}/></button>
                </div>
                <form onSubmit={handleCreateProject} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <input style={{ ...styles.input, backgroundColor: '#F8F9FA', border: '1px solid #e5e7eb', gridColumn: 'span 2' }} required placeholder="Project Title" value={projTitle} onChange={e => setProjTitle(e.target.value)} />
                  <input style={{ ...styles.input, backgroundColor: '#F8F9FA', border: '1px solid #e5e7eb' }} required placeholder="Project Coordinator" value={projCoord} onChange={e => setProjCoord(e.target.value)} />
                  <input style={{ ...styles.input, backgroundColor: '#F8F9FA', border: '1px solid #e5e7eb' }} required placeholder="Source of Funds" value={projFunds} onChange={e => setProjFunds(e.target.value)} />
                  
                  <div style={{ gridColumn: 'span 2', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                     <div style={{ flex: 1 }}>
                       <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#6b7280', marginBottom: '4px' }}>Start Date</label>
                       <input type="date" style={{ ...styles.input, backgroundColor: '#F8F9FA', border: '1px solid #e5e7eb' }} required value={projStart} onChange={e => setProjStart(e.target.value)} />
                     </div>
                     <div style={{ flex: 1 }}>
                       <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#6b7280', marginBottom: '4px' }}>End Date</label>
                       <input type="date" style={{ ...styles.input, backgroundColor: '#F8F9FA', border: '1px solid #e5e7eb' }} required value={projEnd} onChange={e => setProjEnd(e.target.value)} />
                     </div>
                     <button style={{ backgroundColor: '#0F3A35', color: 'white', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', height: '42px' }}>Create Project</button>
                  </div>
                </form>
              </div>
            )}

            {/* PROJECT LIST */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {filteredProjects.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px', backgroundColor: 'white', borderRadius: '12px', border: '2px dashed #d1d5db' }}>
                  <p style={{ color: '#6b7280', fontSize: '18px', fontWeight: '500', margin: 0 }}>No projects found.</p>
                  <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '8px' }}>Try adjusting your filters or create a new project.</p>
                </div>
              ) : (
                filteredProjects.map(p => (
                  <div key={p.id} onClick={() => loadProjectDetails(p.id)} style={styles.projectCard} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1)'; e.currentTarget.style.borderColor = '#C3A86A'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <span style={styles.projectCode}>{p.code}</span>
                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', backgroundColor: p.status === 'In Progress' ? '#eff6ff' : '#f3f4f6', color: p.status === 'In Progress' ? '#1d4ed8' : '#4b5563', border: p.status === 'In Progress' ? '1px solid #bfdbfe' : '1px solid #e5e7eb' }}>{p.status}</span>
                      </div>
                      <h4 style={styles.projectTitle}>{p.title}</h4>
                    </div>
                    <div style={styles.projectMeta}>
                      <div style={styles.metaRow}><Briefcase size={14} /> {p.coordinatorName}</div>
                      <div style={styles.metaRow}><Target size={14} /> {p.sourceOfFunds}</div>
                      <div style={styles.metaRow}><Calendar size={14} /> {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <h3 className="text-xl font-bold mb-2">{tab.charAt(0).toUpperCase() + tab.slice(1)}</h3>
            <p>This section is currently being integrated.</p>
          </div>
        )}
      </main>
    </div>
  );
}