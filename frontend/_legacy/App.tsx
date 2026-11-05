function App() {
  const kpis = [
    { title: 'Vaccine Doses / Year', target: '55,000,000', achieved: '16,000,000' },
    { title: 'Direct Jobs Created', target: '1,000', achieved: '400' },
    { title: 'Market Share (Generics)', target: '20%', achieved: '10%' },
  ];

  return (
    <div>
      <h1>Ethiobiopharma Command Center</h1>
      <p style={{color: '#8b949e'}}>Strategic Performance & Roadmap Tracking</p>
      
      <div className="grid">
        {kpis.map((kpi, i) => (
          <div key={i} className="card">
            <div style={{color: '#8b949e', fontSize: '0.875rem', textTransform: 'uppercase'}}>{kpi.title}</div>
            <div className="value">{kpi.achieved}</div>
            <div style={{color: '#8b949e'}}>Target: {kpi.target}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginTop: '2rem'}}>
        <h2 style={{color: '#C9A227'}}>Roadmap 2026-2035</h2>
        <ul style={{lineHeight: '2'}}>
          <li><span style={{color: '#2E8B57'}}>●</span> Quick-Win Build-Out (2028)</li>
          <li><span style={{color: '#8b949e'}}>○</span> ShieldVax Commissioning (2030)</li>
          <li><span style={{color: '#8b949e'}}>○</span> Full Integration (2032)</li>
        </ul>
      </div>
    </div>
  );
}
export default App;