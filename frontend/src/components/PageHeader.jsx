/**
 * Shared branded page header: gold kicker, navy title, optional icon badge and
 * actions. Replaces one-off headers so every workspace looks like one product
 * and wraps cleanly on small screens.
 */
export default function PageHeader({ icon, kicker, title, subtitle, actions, className = "" }) {
  return (
    <header className={`page-header ${className}`}>
      <div className="page-header-main">
        {icon ? <span className="page-header-icon" aria-hidden="true">{icon}</span> : null}
        <div className="page-header-copy">
          {kicker ? <div className="page-kicker">{kicker}</div> : null}
          <h2 className="page-title mb-1">{title}</h2>
          <div className="gold-rule" />
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="page-header-actions no-print">{actions}</div> : null}
    </header>
  );
}
