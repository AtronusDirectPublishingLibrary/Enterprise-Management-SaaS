import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, Activity, Target, ArrowRight, ShieldCheck } from 'lucide-react';

export default function PublicPage() {
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState(null);
  const [strategic, setStrategic] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/public/roadmap').then(res => res.json()).then(data => setRoadmap(data));
    fetch('http://localhost:5000/api/public/strategic').then(res => res.json()).then(data => setStrategic(data));
  }, []);

  return (
    <div className="min-h-screen relative font-sans overflow-x-hidden">
      
      {/* LAYER 1: Glowing Orbs */}
      <div className="ocean-backdrop">
        <div className="ocean-orb orb-gold"></div>
        <div className="ocean-orb orb-green"></div>
      </div>

      {/* LAYER 2: Dark Overlay */}
      <div className="content-overlay"></div>

      {/* LAYER 3: Content */}
      <div className="relative z-10">
        
        {/* HEADER */}
        <header className="eih-header" style={{ background: 'rgba(5, 21, 19, 0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(195, 168, 106, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => window.scrollTo(0,0)}>
            <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 80 C 20 40, 50 20, 70 30 C 85 35, 90 55, 80 75 C 70 95, 40 95, 30 85" stroke="#C3A86A" strokeWidth="4" fill="none"/>
              <path d="M45 45 C 55 30, 75 25, 85 35" stroke="#C3A86A" strokeWidth="4" fill="none"/>
              <circle cx="40" cy="50" r="3" fill="#C3A86A"/>
            </svg>
            <div className="eih-logo-text">
              <span style={{ color: '#C3A86A' }}>Ethiobiopharma</span><br/>
              <span style={{ fontSize: '12px', letterSpacing: '0.2em' }}>Holdings</span>
            </div>
          </div>

          <nav className="eih-nav">
            <a href="#home" className="active">Home</a>
            <a href="#progress">Progress <ChevronDown size={16} /></a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Search size={24} color="#C3A86A" style={{ cursor: 'pointer' }} />
            {/* RESTORED STAFF PORTAL BUTTON */}
            <button 
              onClick={() => navigate('/login')} 
              className="px-6 py-2 rounded-full font-bold text-sm text-[#0F3A35] bg-[#C3A86A] hover:bg-[#d4bc83] transition-all"
            >
              Staff Portal
            </button>
          </div>
        </header>

        {/* HERO SECTION */}
        <section id="home" className="min-h-screen flex items-center justify-center text-center px-6 relative">
          <div className="max-w-4xl mx-auto">
            
            <div className="animate-slide-up delay-1 inline-block bg-[#C3A86A]/10 border border-[#C3A86A]/30 text-[#C3A86A] font-bold text-xs px-5 py-2 rounded-full mb-6 backdrop-blur-md uppercase tracking-wider">
              An Enterprise of Ethiopian Investment Holdings
            </div>

            <h1 className="hero-title animate-slide-up delay-2">
              <span className="text-mix-white">Unlocking the </span>
              <span className="text-mix">Biopharma Potential</span>
              <span className="text-mix-white"> of Ethiopia</span>
            </h1>

            <p className="hero-subtitle animate-slide-up delay-3 mb-10">
              Ethiobiopharma Group is driving national health security by managing public assets, enabling strategic investments, and fostering transformative partnerships.
            </p>

            <div className="animate-slide-up delay-3 flex justify-center gap-6">
              <a href="#progress" className="px-8 py-4 rounded-full font-bold text-base text-[#051513] bg-[#C3A86A] hover:bg-[#d4bc83] transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(195,168,106,0.3)] flex items-center gap-2">
                View Live Progress <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </section>

        {/* LIVE PROGRESS SECTION */}
        <section id="progress" className="py-32 relative">
          <div className="max-w-[1200px] mx-auto px-6 relative z-10">
            
            <div className="text-center mb-16 scroll-reveal">
              <span className="text-[#C3A86A] font-bold tracking-widest uppercase text-sm mb-3 block">Live Performance</span>
              <h2 className="section-title">
                Roadmap <span className="text-mix">&</span> Strategic Plan
              </h2>
              <p className="hero-subtitle mt-4">Tracking our progress towards vaccine sovereignty, economic resilience, and industrial excellence.</p>
            </div>

            {/* Roadmap Milestones */}
            <div className="mb-24">
              <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3 border-b border-white/10 pb-4 scroll-reveal">
                <Activity className="text-[#C3A86A]" size={28} /> Roadmap Milestones
              </h3>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roadmap?.milestones?.map((ms, index) => (
                  <div key={ms.id} className={`glass-card milestone-card scroll-reveal delay-${(index % 3) + 1}`}>
                    <div className="flex justify-between items-start mb-4">
                      <span className="badge-date">
                        {new Date(ms.targetDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                      </span>
                      <span className={`badge-status ${
                        ms.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 
                        ms.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                      }`}>
                        {ms.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h4>{ms.title}</h4>
                    <p>{ms.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic KPIs */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3 border-b border-white/10 pb-4 scroll-reveal">
                <Target className="text-[#C3A86A]" size={28} /> Strategic KPIs
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {strategic?.kpis?.map((kpi, index) => (
                  <div key={kpi.id} className={`glass-card kpi-card scroll-reveal delay-${(index % 5) + 1}`}>
                    <div className="kpi-value">{kpi.target}</div>
                    <div className="kpi-title">{kpi.title}</div>
                    <div className="kpi-category">{kpi.category}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="eih-footer" style={{ background: 'rgba(5, 21, 19, 0.9)', backdropFilter: 'blur(20px)', borderTop: '4px solid #C3A86A' }}>
          <div className="eih-footer-grid">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 80 C 20 40, 50 20, 70 30 C 85 35, 90 55, 80 75 C 70 95, 40 95, 30 85" stroke="#C3A86A" strokeWidth="4" fill="none"/>
                  <path d="M45 45 C 55 30, 75 25, 85 35" stroke="#C3A86A" strokeWidth="4" fill="none"/>
                </svg>
                <div className="eih-logo-text" style={{ color: 'white', fontSize: '18px' }}>
                  Ethiobiopharma<br/><span style={{ fontSize: '12px', color: '#C3A86A' }}>Holdings</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm max-w-sm">An enterprise of Ethiopian Investment Holdings. Dedicated to advancing national development through healthcare manufacturing.</p>
            </div>
            <div>
              <h4 className="eih-footer-title">Quick Links</h4>
              <ul className="eih-footer-links text-sm">
                <li><a href="#home">Home</a></li>
                <li><a href="#progress">Progress</a></li>
              </ul>
            </div>
            <div>
              <h4 className="eih-footer-title">Contact</h4>
              <ul className="eih-footer-links text-sm">
                <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ color: '#C3A86A' }}>📞</span> +251 (0)111 70 45 70
                </li>
                <li style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ color: '#C3A86A' }}>✉️</span> info@ethiobiopharma.et
                </li>
              </ul>
            </div>
          </div>
          <div style={{ maxWidth: '1200px', margin: '40px auto 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            Copyright &copy; 2026 All Right Reserved
          </div>
        </footer>

      </div>
    </div>
  );
}