import { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Droplets,
  Gauge,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../lib/api";
import { useTheme } from "../../lib/theme";

const TABS = [
  { key: "overview", label: "Cost overview", icon: BarChart3 },
  { key: "fuel", label: "Fuel logbook", icon: Droplets },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "parts", label: "Spare parts", icon: Settings2 },
  { key: "tyres", label: "Tyres", icon: Gauge },
];

const EMPTY = {
  fuel: {
    vehicleId: "",
    driverId: "",
    date: new Date().toISOString().slice(0, 10),
    odometer: "",
    litres: "",
    unitCost: "",
    totalCost: "",
    fuelType: "Diesel",
    station: "",
    reference: "",
    notes: "",
  },
  maintenance: {
    vehicleId: "",
    title: "",
    type: "Scheduled",
    status: "Scheduled",
    scheduledDate: new Date().toISOString().slice(0, 10),
    completedDate: "",
    odometer: "",
    vendor: "",
    laborCost: "",
    partsCost: "",
    totalCost: "",
    invoiceNo: "",
    nextServiceDate: "",
    nextServiceOdometer: "",
    notes: "",
  },
  parts: {
    vehicleId: "",
    date: new Date().toISOString().slice(0, 10),
    partName: "",
    partNumber: "",
    quantity: 1,
    unitCost: "",
    totalCost: "",
    supplier: "",
    odometer: "",
    notes: "",
  },
  tyres: {
    vehicleId: "",
    date: new Date().toISOString().slice(0, 10),
    position: "FL",
    brand: "",
    size: "",
    serialNumber: "",
    quantity: 1,
    unitCost: "",
    totalCost: "",
    odometer: "",
    action: "Fitted",
    notes: "",
  },
};

const money = (value) =>
  `ETB ${Math.round(Number(value) || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const num = (value, suffix = "") => (value == null || value === "" ? "—" : `${value}${suffix}`);
const day = (value) => (value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function statusClass(value) {
  if (value === "Completed") return "is-good";
  if (value === "In Progress") return "is-info";
  if (value === "Cancelled") return "is-muted";
  return "is-warn";
}

export default function FleetCostControl() {
  const { colors } = useTheme();
  const NAVY = colors.primary;
  const GOLD = colors.secondary;
  const COLORS = [colors.primary, colors.secondary, colors.info, colors.accent, colors.success];
  const [year, setYear] = useState(new Date().getFullYear());
  const [analytics, setAnalytics] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [fuel, setFuel] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [parts, setParts] = useState([]);
  const [tyres, setTyres] = useState([]);
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editor, setEditor] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const queryString = `?year=${year}`;
      const [summary, vehicleRows, driverRows, fuelRows, maintenanceRows, partRows, tyreRows] = await Promise.all([
        api.get(`/fleet/cost-control/analytics${queryString}`),
        api.get("/fleet/vehicles").catch(() => []),
        api.get("/fleet/drivers").catch(() => []),
        api.get(`/fleet/cost-control/fuel${queryString}`).catch(() => []),
        api.get(`/fleet/cost-control/maintenance${queryString}`).catch(() => []),
        api.get(`/fleet/cost-control/parts${queryString}`).catch(() => []),
        api.get(`/fleet/cost-control/tyres${queryString}`).catch(() => []),
      ]);
      setAnalytics(summary);
      setVehicles(Array.isArray(vehicleRows) ? vehicleRows : []);
      setDrivers(Array.isArray(driverRows) ? driverRows : []);
      setFuel(Array.isArray(fuelRows) ? fuelRows : []);
      setMaintenance(Array.isArray(maintenanceRows) ? maintenanceRows : []);
      setParts(Array.isArray(partRows) ? partRows : []);
      setTyres(Array.isArray(tyreRows) ? tyreRows : []);
    } catch (e) {
      setError(e.message || "Could not load fleet cost control.");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (message) => {
    setNotice(message);
    setError("");
    window.setTimeout(() => setNotice(""), 4000);
  };

  const saveRecord = async (kind, values, existing) => {
    const payload = { ...values };
    if (!payload.vehicleId) throw new Error("Choose a vehicle.");
    ["odometer", "litres", "unitCost", "totalCost", "quantity", "laborCost", "partsCost", "nextServiceOdometer"].forEach(
      (key) => {
        if (payload[key] === "" || payload[key] == null) delete payload[key];
      },
    );
    ["scheduledDate", "completedDate", "nextServiceDate", "date"].forEach((key) => {
      if (payload[key] === "") payload[key] = null;
    });
    if (kind === "maintenance") {
      payload.totalCost = Number(payload.totalCost) || Number(payload.laborCost || 0) + Number(payload.partsCost || 0);
      if (payload.status === "Completed" && !payload.completedDate) payload.completedDate = new Date().toISOString().slice(0, 10);
    }
    if (kind === "fuel" && !payload.totalCost) {
      payload.totalCost = Math.round(Number(payload.litres || 0) * Number(payload.unitCost || 0) * 100) / 100;
    }
    if ((kind === "parts" || kind === "tyres") && !payload.totalCost) {
      payload.totalCost = Math.round(Number(payload.quantity || 0) * Number(payload.unitCost || 0) * 100) / 100;
    }
    if (existing) await api.put(`/fleet/cost-control/${kind}/${existing.id}`, payload);
    else await api.post(`/fleet/cost-control/${kind}`, payload);
    setEditor(null);
    flash(existing ? "Record updated." : "Record added to the ledger.");
    await load();
  };

  const removeRecord = async (kind, row) => {
    const label = kind === "maintenance" ? row.title : kind === "fuel" ? `${row.litres} L fuel` : row.partName || row.position;
    if (!window.confirm(`Delete “${label}”? This removes its cost from the ledger.`)) return;
    try {
      await api.del(`/fleet/cost-control/${kind}/${row.id}`);
      flash("Record deleted.");
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const match = (...values) => !needle || values.filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    return {
      fuel: fuel.filter((row) => match(row.vehicle?.vehicleCode, row.vehicle?.licensePlate, row.station, row.reference, row.driver?.name)),
      maintenance: maintenance.filter((row) => match(row.vehicle?.vehicleCode, row.vehicle?.licensePlate, row.title, row.vendor, row.status)),
      parts: parts.filter((row) => match(row.vehicle?.vehicleCode, row.vehicle?.licensePlate, row.partName, row.partNumber, row.supplier)),
      tyres: tyres.filter((row) => match(row.vehicle?.vehicleCode, row.vehicle?.licensePlate, row.position, row.brand, row.serialNumber)),
    };
  }, [fuel, maintenance, parts, tyres, query]);

  const totals = analytics?.totals || {};
  const composition = (analytics?.composition || []).map((row) => ({ ...row, fill: COLORS[["fuel", "maintenance", "parts", "tyres"].indexOf(row.key) % COLORS.length] }));
  const monthly = (analytics?.monthly || []).map((row) => ({
    ...row,
    fuel: Math.round(row.fuel),
    maintenance: Math.round(row.maintenance),
    parts: Math.round(row.parts),
    tyres: Math.round(row.tyres),
  }));
  const topVehicles = (analytics?.vehicles || []).slice(0, 7).map((row) => ({ ...row, label: row.vehicleCode }));
  const due = analytics?.dueMaintenance || [];

  return (
    <div className="fleet-cost-page">
      <Helmet><title>Fleet Cost Control | Ethio-Biopharma</title></Helmet>

      <div className="fleet-cost-hero">
        <div className="fleet-cost-hero__copy">
          <Link to="/fleet" className="fleet-cost-back"><ArrowLeft size={14} /> Fleet</Link>
          <div className="fleet-cost-eyebrow">Fleet &amp; Transport · total cost of ownership</div>
          <h1>Cost control &amp; workshop ledger</h1>
          <p>
            Fuel, scheduled maintenance, spare parts and tyre replacement in one auditable record — with
            cost per kilometre, fuel efficiency and forward maintenance exposure on every vehicle.
          </p>
          <div className="fleet-cost-hero__meta">
            <span><CircleDollarSign size={14} /> {money(totals.totalCost)} committed in {year}</span>
            <span><Truck size={14} /> {totals.vehicles || 0} vehicles</span>
            <span><Wrench size={14} /> {totals.maintenanceCount || 0} workshop records</span>
          </div>
        </div>
        <div className="fleet-cost-hero__actions">
          <label className="fleet-cost-year">
            <span>Period</span>
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - index).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <button type="button" className="btn btn-gold" onClick={() => setEditor({ kind: "fuel", values: { ...EMPTY.fuel } })}>
            <Plus size={15} /> Log fuel
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setEditor({ kind: "maintenance", values: { ...EMPTY.maintenance } })}>
            <Wrench size={15} /> Schedule service
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}
      {notice ? <div className="alert alert-success mt-3 py-2">{notice}</div> : null}

      <div className="fleet-cost-kpis">
        <Kpi label="Total cost" value={money(totals.totalCost)} hint={`${year} ledger`} icon={CircleDollarSign} tone="navy" />
        <Kpi label="Fuel" value={money(totals.fuelCost)} hint={`${Math.round(totals.fuelLitres || 0).toLocaleString()} litres`} icon={Droplets} tone="gold" />
        <Kpi label="Maintenance" value={money((totals.maintenanceCost || 0) + (totals.partsCost || 0))} hint={`${totals.maintenanceCount || 0} services · ${totals.partsCount || 0} parts`} icon={Wrench} tone="blue" />
        <Kpi label="Tyres" value={money(totals.tyreCost)} hint={`${totals.tyreCount || 0} tyre movements`} icon={Gauge} tone="rust" />
        <Kpi label="Cost / km" value={totals.costPerKm == null ? "—" : `${totals.costPerKm} ETB`} hint="from odometer readings" icon={BarChart3} tone="green" />
        <Kpi label="Fuel efficiency" value={totals.efficiency == null ? "—" : `${totals.efficiency} km/L`} hint="derived from fuel log" icon={Droplets} tone="green" />
      </div>

      <div className="fleet-cost-tabs">
        {TABS.map((item) => {
          const Icon = item.icon;
          const count = item.key === "fuel" ? fuel.length : item.key === "maintenance" ? maintenance.length : item.key === "parts" ? parts.length : item.key === "tyres" ? tyres.length : null;
          return (
            <button key={item.key} type="button" className={tab === item.key ? "is-active" : ""} onClick={() => setTab(item.key)}>
              <Icon size={15} /> {item.label}
              {count != null ? <span>{count}</span> : null}
            </button>
          );
        })}
        <button type="button" className="fleet-cost-refresh" onClick={load} title="Refresh ledger">
          <RefreshCw size={15} className={loading ? "spin" : ""} />
        </button>
      </div>

      {loading && !analytics ? (
        <div className="fleet-cost-loading"><div className="spinner-border text-success" role="status" /></div>
      ) : tab === "overview" ? (
        <>
          <div className="fleet-cost-grid">
            <section className="fleet-panel fleet-panel--wide">
              <PanelHead title="Cost trend" subtitle="Monthly fuel, workshop, parts and tyre spend" icon={BarChart3} />
              <div className="fleet-chart fleet-chart--tall">
                {monthly.some((row) => row.fuel + row.maintenance + row.parts + row.tyres > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9e4d8" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : value)} />
                      <Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 10, border: "1px solid #e4ddcb" }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="fuel" name="Fuel" stackId="a" fill={NAVY} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="maintenance" name="Maintenance" stackId="a" fill={GOLD} />
                      <Bar dataKey="parts" name="Parts" stackId="a" fill="#2E6F9E" />
                      <Bar dataKey="tyres" name="Tyres" stackId="a" fill={colors.accent} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyChart label="No cost transactions yet for this period." />}
              </div>
            </section>

            <section className="fleet-panel">
              <PanelHead title="Cost composition" subtitle={`${year} ledger share`} icon={CircleDollarSign} />
              <div className="fleet-chart">
                {composition.some((row) => row.value > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={composition} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="82%" paddingAngle={3} stroke="none">
                        {composition.map((entry) => <Cell key={entry.key} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip formatter={(value) => money(value)} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <EmptyChart label="Costs appear here once you log fuel or workshop activity." />}
              </div>
              <div className="fleet-composition-list">
                {composition.map((row) => (
                  <div key={row.key}><span><i style={{ background: row.fill }} />{row.label}</span><strong>{money(row.value)}</strong></div>
                ))}
              </div>
            </section>

            <section className="fleet-panel">
              <PanelHead title="Maintenance due" subtitle="Next 30 days and overdue" icon={CalendarClock} action={<button className="btn btn-sm btn-outline-primary" onClick={() => setEditor({ kind: "maintenance", values: { ...EMPTY.maintenance } })}><Plus size={13} /> Add</button>} />
              <div className="fleet-due-list">
                {due.length === 0 ? <div className="fleet-empty">No scheduled maintenance in the next 30 days.</div> : due.map((row) => (
                  <div key={row.id} className={`fleet-due-item ${row.overdue ? "is-overdue" : ""}`}>
                    <div className="fleet-due-icon"><Wrench size={15} /></div>
                    <div className="flex-grow-1">
                      <div className="fw-semibold small">{row.title}</div>
                      <div className="text-muted" style={{ fontSize: "0.72rem" }}>{row.vehicleCode} · {row.plate} · {day(row.scheduledDate)}</div>
                    </div>
                    <span className={`fleet-pill ${row.overdue ? "is-danger" : "is-warn"}`}>{row.overdue ? "Overdue" : row.status}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="fleet-panel">
              <PanelHead title="Tyre positions" subtitle="Latest fitted or rotated tyre by position" icon={Gauge} action={<button className="btn btn-sm btn-outline-primary" onClick={() => setEditor({ kind: "tyres", values: { ...EMPTY.tyres } })}><Plus size={13} /> Record</button>} />
              <TyreBoard rows={analytics?.tyrePositions || []} />
            </section>
          </div>

          <section className="fleet-panel mt-3">
            <PanelHead title="Vehicle cost ledger" subtitle="Total cost of ownership, ranked by spend" icon={Truck} action={<button className="btn btn-sm btn-outline-secondary" onClick={() => window.print()}><BarChart3 size={13} /> Print view</button>} />
            <div className="table-responsive">
              <table className="table fleet-table align-middle mb-0">
                <thead>
                  <tr><th>Vehicle</th><th className="num">Fuel</th><th className="num">Maintenance</th><th className="num">Parts</th><th className="num">Tyres</th><th className="num">Total</th><th className="num">Distance</th><th className="num">Cost / km</th><th className="num">km / L</th><th>Driver</th></tr>
                </thead>
                <tbody>
                  {(analytics?.vehicles || []).length === 0 ? (
                    <tr><td colSpan="10" className="text-center text-muted py-5">No vehicles are in the fleet register.</td></tr>
                  ) : (analytics?.vehicles || []).map((row) => (
                    <tr key={row.vehicleId}>
                      <td><div className="fw-semibold">{row.vehicleCode}</div><div className="small text-muted">{row.licensePlate} · {row.type}</div></td>
                      <td className="num">{money(row.fuelCost)}</td>
                      <td className="num">{money(row.maintenanceCost)}</td>
                      <td className="num">{money(row.partsCost)}</td>
                      <td className="num">{money(row.tyreCost)}</td>
                      <td className="num fw-bold" style={{ color: NAVY }}>{money(row.totalCost)}</td>
                      <td className="num">{row.distance ? `${Math.round(row.distance).toLocaleString()} km` : "—"}</td>
                      <td className="num">{row.costPerKm == null ? "—" : `${row.costPerKm}`}</td>
                      <td className="num">{row.efficiency == null ? "—" : row.efficiency}</td>
                      <td className="small text-muted">{row.driver || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="fleet-panel fleet-ledger">
          <div className="fleet-ledger-head">
            <div>
              <h2>{TABS.find((item) => item.key === tab)?.label}</h2>
              <p>{tab === "fuel" ? "Every fill-up, odometer reading and receipt reference." : tab === "maintenance" ? "Scheduled services, repairs and inspections with labour and parts cost." : tab === "parts" ? "Replacement parts issued to each vehicle." : "Tyre fitment, rotation and replacement by wheel position."}</p>
            </div>
            <div className="fleet-ledger-actions">
              <div className="fleet-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicle, supplier, reference…" /></div>
              <button type="button" className="btn btn-gold btn-sm" onClick={() => setEditor({ kind: tab, values: { ...EMPTY[tab] } })}>
                <Plus size={14} /> {tab === "fuel" ? "Log fuel" : tab === "maintenance" ? "Schedule service" : tab === "parts" ? "Add part" : "Record tyre"}
              </button>
            </div>
          </div>

          {tab === "fuel" ? <FuelTable rows={filtered.fuel} onEdit={(row) => setEditor({ kind: "fuel", values: { ...row, date: row.date?.slice(0, 10), vehicleId: row.vehicleId, driverId: row.driverId || "" }, existing: row })} onDelete={(row) => removeRecord("fuel", row)} /> : null}
          {tab === "maintenance" ? <MaintenanceTable rows={filtered.maintenance} onEdit={(row) => setEditor({ kind: "maintenance", values: { ...row, scheduledDate: row.scheduledDate?.slice(0, 10) || "", completedDate: row.completedDate?.slice(0, 10) || "", nextServiceDate: row.nextServiceDate?.slice(0, 10) || "" }, existing: row })} onDelete={(row) => removeRecord("maintenance", row)} /> : null}
          {tab === "parts" ? <PartsTable rows={filtered.parts} onEdit={(row) => setEditor({ kind: "parts", values: { ...row, date: row.date?.slice(0, 10) }, existing: row })} onDelete={(row) => removeRecord("parts", row)} /> : null}
          {tab === "tyres" ? <TyresTable rows={filtered.tyres} onEdit={(row) => setEditor({ kind: "tyres", values: { ...row, date: row.date?.slice(0, 10) }, existing: row })} onDelete={(row) => removeRecord("tyres", row)} /> : null}
        </section>
      )}

      {editor ? (
        <LedgerEditor
          kind={editor.kind}
          initial={editor.values}
          vehicles={vehicles}
          drivers={drivers}
          existing={editor.existing}
          onClose={() => setEditor(null)}
          onSave={(values) => saveRecord(editor.kind, values, editor.existing)}
        />
      ) : null}
    </div>
  );
}

function Kpi({ label, value, hint, icon: Icon, tone }) {
  return (
    <div className={`fleet-kpi fleet-kpi--${tone}`}>
      <div className="fleet-kpi__icon"><Icon size={18} /></div>
      <div className="fleet-kpi__body"><div className="fleet-kpi__label">{label}</div><div className="fleet-kpi__value">{value}</div><div className="fleet-kpi__hint">{hint}</div></div>
    </div>
  );
}

function PanelHead({ title, subtitle, icon: Icon, action }) {
  return (
    <div className="fleet-panel-head">
      <div><h2><Icon size={16} /> {title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
      {action}
    </div>
  );
}

function EmptyChart({ label }) {
  return <div className="fleet-empty-chart"><BarChart3 size={26} /><span>{label}</span></div>;
}

function TyreBoard({ rows }) {
  const positions = ["FL", "FR", "RL", "RR", "Spare"];
  const byPosition = Object.fromEntries(rows.map((row) => [row.position, row]));
  return (
    <div className="tyre-board">
      <div className="tyre-board__vehicle"><Truck size={20} /><span>Axle view</span></div>
      <div className="tyre-board__grid">
        {positions.map((position) => {
          const row = byPosition[position];
          return (
            <div key={position} className={`tyre-slot ${row ? "is-fitted" : ""}`}>
              <span className="tyre-slot__code">{position}</span>
              <div className="tyre-slot__tyre"><Gauge size={17} /></div>
              <div className="tyre-slot__meta">{row ? <><strong>{row.brand || "Tyre"}</strong><span>{row.size || row.action} · {day(row.fittedAt)}</span></> : <span>No record</span>}</div>
            </div>
          );
        })}
      </div>
      <div className="tyre-board__note">{rows.length ? `${rows.length} tyre positions have a recorded fitment.` : "Record a tyre to build the axle view."}</div>
    </div>
  );
}

function LedgerTable({ head, children, empty, colSpan }) {
  return (
    <div className="table-responsive">
      <table className="table fleet-table align-middle mb-0">
        <thead><tr>{head.map((column) => <th key={column.label} className={column.num ? "num" : ""}>{column.label}</th>)}</tr></thead>
        <tbody>{children || <tr><td colSpan={colSpan || head.length} className="text-center text-muted py-5">{empty}</td></tr>}</tbody>
      </table>
    </div>
  );
}

function FuelTable({ rows, onEdit, onDelete }) {
  return (
    <LedgerTable head={[{ label: "Date" }, { label: "Vehicle" }, { label: "Litres", num: true }, { label: "Unit cost", num: true }, { label: "Total", num: true }, { label: "Odometer", num: true }, { label: "Station / reference" }, { label: "Recorded by" }, { label: "Action" }]} empty="No fuel entries match this view.">
      {rows.map((row) => (
        <tr key={row.id}>
          <td className="small">{day(row.date)}</td>
          <td><div className="fw-semibold small">{row.vehicle?.vehicleCode || "—"}</div><div className="small text-muted">{row.vehicle?.licensePlate}</div></td>
          <td className="num">{row.litres}</td>
          <td className="num">{money(row.unitCost)}</td>
          <td className="num fw-bold">{money(row.totalCost)}</td>
          <td className="num">{row.odometer ? `${row.odometer.toLocaleString()} km` : "—"}</td>
          <td className="small">{row.station || "—"}{row.reference ? <div className="text-muted">{row.reference}</div> : null}</td>
          <td className="small text-muted">{row.recordedBy || "—"}</td>
          <td><RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} /></td>
        </tr>
      ))}
    </LedgerTable>
  );
}

function MaintenanceTable({ rows, onEdit, onDelete }) {
  return (
    <LedgerTable head={[{ label: "Service" }, { label: "Vehicle" }, { label: "Scheduled" }, { label: "Status" }, { label: "Vendor" }, { label: "Labour", num: true }, { label: "Parts", num: true }, { label: "Total", num: true }, { label: "Next service" }, { label: "Action" }]} empty="No maintenance records match this view.">
      {rows.map((row) => {
        const overdue = row.scheduledDate && !["Completed", "Cancelled"].includes(row.status) && new Date(row.scheduledDate) < new Date();
        return (
          <tr key={row.id}>
            <td><div className="fw-semibold small">{row.title}</div><div className="small text-muted">{row.type}{row.invoiceNo ? ` · ${row.invoiceNo}` : ""}</div></td>
            <td><div className="small fw-semibold">{row.vehicle?.vehicleCode || "—"}</div><div className="small text-muted">{row.vehicle?.licensePlate}</div></td>
            <td className={`small ${overdue ? "text-danger fw-semibold" : ""}`}>{day(row.scheduledDate)}{overdue ? " · overdue" : ""}</td>
            <td><span className={`fleet-pill ${statusClass(row.status)}`}>{row.status}</span></td>
            <td className="small">{row.vendor || "—"}</td>
            <td className="num">{money(row.laborCost)}</td>
            <td className="num">{money(row.partsCost)}</td>
            <td className="num fw-bold">{money(row.totalCost)}</td>
            <td className="small">{row.nextServiceDate ? day(row.nextServiceDate) : row.nextServiceOdometer ? `${row.nextServiceOdometer.toLocaleString()} km` : "—"}</td>
            <td><RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} /></td>
          </tr>
        );
      })}
    </LedgerTable>
  );
}

function PartsTable({ rows, onEdit, onDelete }) {
  return (
    <LedgerTable head={[{ label: "Date" }, { label: "Vehicle" }, { label: "Part" }, { label: "Qty", num: true }, { label: "Unit cost", num: true }, { label: "Total", num: true }, { label: "Supplier" }, { label: "Odometer", num: true }, { label: "Action" }]} empty="No spare-part records match this view.">
      {rows.map((row) => (
        <tr key={row.id}>
          <td className="small">{day(row.date)}</td>
          <td><div className="small fw-semibold">{row.vehicle?.vehicleCode || "—"}</div><div className="small text-muted">{row.vehicle?.licensePlate}</div></td>
          <td><div className="fw-semibold small">{row.partName}</div><div className="small text-muted">{row.partNumber || "—"}</div></td>
          <td className="num">{row.quantity}</td>
          <td className="num">{money(row.unitCost)}</td>
          <td className="num fw-bold">{money(row.totalCost)}</td>
          <td className="small">{row.supplier || "—"}</td>
          <td className="num">{row.odometer ? `${row.odometer.toLocaleString()} km` : "—"}</td>
          <td><RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} /></td>
        </tr>
      ))}
    </LedgerTable>
  );
}

function TyresTable({ rows, onEdit, onDelete }) {
  return (
    <LedgerTable head={[{ label: "Date" }, { label: "Vehicle" }, { label: "Position" }, { label: "Brand / size" }, { label: "Serial" }, { label: "Qty", num: true }, { label: "Cost", num: true }, { label: "Odometer", num: true }, { label: "Action" }, { label: "" }]} empty="No tyre records match this view.">
      {rows.map((row) => (
        <tr key={row.id}>
          <td className="small">{day(row.date)}</td>
          <td><div className="small fw-semibold">{row.vehicle?.vehicleCode || "—"}</div><div className="small text-muted">{row.vehicle?.licensePlate}</div></td>
          <td><span className="fleet-pill is-info">{row.position}</span></td>
          <td className="small">{row.brand || "—"}{row.size ? <div className="text-muted">{row.size}</div> : null}</td>
          <td className="small">{row.serialNumber || "—"}</td>
          <td className="num">{row.quantity}</td>
          <td className="num fw-bold">{money(row.totalCost)}</td>
          <td className="num">{row.odometer ? `${row.odometer.toLocaleString()} km` : "—"}</td>
          <td className="small">{row.action}</td>
          <td><RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} /></td>
        </tr>
      ))}
    </LedgerTable>
  );
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="d-flex gap-1">
      <button type="button" className="btn btn-sm btn-light border" onClick={onEdit} title="Edit"><Pencil size={13} /></button>
      <button type="button" className="btn btn-sm btn-light border text-danger" onClick={onDelete} title="Delete"><Trash2 size={13} /></button>
    </div>
  );
}

function LedgerEditor({ kind, initial, vehicles, drivers, existing, onClose, onSave }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setValues((previous) => ({ ...previous, [key]: value }));
  const title = kind === "fuel" ? "Fuel entry" : kind === "maintenance" ? "Maintenance record" : kind === "parts" ? "Spare-part record" : "Tyre record";

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(values);
    } catch (e) {
      setError(e.message || "Could not save this record.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fleet-modal" role="dialog" aria-modal="true">
      <div className="fleet-modal__card">
        <div className="fleet-modal__head">
          <div><div className="fleet-cost-eyebrow">Fleet ledger</div><h2>{existing ? "Edit" : "New"} {title.toLowerCase()}</h2></div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>
        <form onSubmit={submit}>
          <div className="fleet-modal__body">
            {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Vehicle *</label>
                <select className="form-select" required value={values.vehicleId || ""} onChange={(event) => set("vehicleId", event.target.value)}>
                  <option value="">Choose vehicle</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicleCode} · {vehicle.licensePlate} · {vehicle.type}</option>)}
                </select>
              </div>
              {kind === "fuel" ? (
                <>
                  <div className="col-md-6"><label className="form-label">Driver</label><select className="form-select" value={values.driverId || ""} onChange={(event) => set("driverId", event.target.value)}><option value="">Unassigned</option>{drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.driverCode} · {driver.name}</option>)}</select></div>
                  <div className="col-md-4"><label className="form-label">Date *</label><input type="date" required className="form-control" value={values.date || ""} onChange={(event) => set("date", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Litres *</label><input type="number" min="0" step="0.01" required className="form-control" value={values.litres || ""} onChange={(event) => set("litres", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Unit cost (ETB/L) *</label><input type="number" min="0" step="0.01" required className="form-control" value={values.unitCost || ""} onChange={(event) => set("unitCost", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Total cost</label><input type="number" min="0" step="0.01" className="form-control" placeholder="Calculated if blank" value={values.totalCost || ""} onChange={(event) => set("totalCost", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Odometer (km)</label><input type="number" min="0" step="1" className="form-control" value={values.odometer || ""} onChange={(event) => set("odometer", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Fuel type</label><select className="form-select" value={values.fuelType || ""} onChange={(event) => set("fuelType", event.target.value)}><option>Diesel</option><option>Petrol</option><option>Electric</option><option>Hybrid</option></select></div>
                  <div className="col-md-6"><label className="form-label">Station</label><input className="form-control" value={values.station || ""} onChange={(event) => set("station", event.target.value)} /></div>
                  <div className="col-md-6"><label className="form-label">Receipt / reference</label><input className="form-control" value={values.reference || ""} onChange={(event) => set("reference", event.target.value)} /></div>
                </>
              ) : null}
              {kind === "maintenance" ? (
                <>
                  <div className="col-md-6"><label className="form-label">Service title *</label><input required className="form-control" placeholder="e.g. 20,000 km scheduled service" value={values.title || ""} onChange={(event) => set("title", event.target.value)} /></div>
                  <div className="col-md-3"><label className="form-label">Type</label><select className="form-select" value={values.type || "Scheduled"} onChange={(event) => set("type", event.target.value)}><option>Scheduled</option><option>Repair</option><option>Inspection</option><option>Tyre service</option></select></div>
                  <div className="col-md-3"><label className="form-label">Status</label><select className="form-select" value={values.status || "Scheduled"} onChange={(event) => set("status", event.target.value)}><option>Scheduled</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select></div>
                  <div className="col-md-4"><label className="form-label">Scheduled date</label><input type="date" className="form-control" value={values.scheduledDate || ""} onChange={(event) => set("scheduledDate", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Completed date</label><input type="date" className="form-control" value={values.completedDate || ""} onChange={(event) => set("completedDate", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Odometer (km)</label><input type="number" min="0" className="form-control" value={values.odometer || ""} onChange={(event) => set("odometer", event.target.value)} /></div>
                  <div className="col-md-6"><label className="form-label">Vendor / workshop</label><input className="form-control" value={values.vendor || ""} onChange={(event) => set("vendor", event.target.value)} /></div>
                  <div className="col-md-6"><label className="form-label">Invoice number</label><input className="form-control" value={values.invoiceNo || ""} onChange={(event) => set("invoiceNo", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Labour cost</label><input type="number" min="0" step="0.01" className="form-control" value={values.laborCost || ""} onChange={(event) => set("laborCost", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Parts cost</label><input type="number" min="0" step="0.01" className="form-control" value={values.partsCost || ""} onChange={(event) => set("partsCost", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Total cost</label><input type="number" min="0" step="0.01" className="form-control" placeholder="Labour + parts if blank" value={values.totalCost || ""} onChange={(event) => set("totalCost", event.target.value)} /></div>
                  <div className="col-md-6"><label className="form-label">Next service date</label><input type="date" className="form-control" value={values.nextServiceDate || ""} onChange={(event) => set("nextServiceDate", event.target.value)} /></div>
                  <div className="col-md-6"><label className="form-label">Next service odometer</label><input type="number" min="0" className="form-control" value={values.nextServiceOdometer || ""} onChange={(event) => set("nextServiceOdometer", event.target.value)} /></div>
                </>
              ) : null}
              {kind === "parts" ? (
                <>
                  <div className="col-md-6"><label className="form-label">Part name *</label><input required className="form-control" value={values.partName || ""} onChange={(event) => set("partName", event.target.value)} /></div>
                  <div className="col-md-6"><label className="form-label">Part number</label><input className="form-control" value={values.partNumber || ""} onChange={(event) => set("partNumber", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Date *</label><input type="date" required className="form-control" value={values.date || ""} onChange={(event) => set("date", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Quantity *</label><input type="number" min="0.01" step="0.01" required className="form-control" value={values.quantity || ""} onChange={(event) => set("quantity", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Unit cost *</label><input type="number" min="0" step="0.01" required className="form-control" value={values.unitCost || ""} onChange={(event) => set("unitCost", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Total cost</label><input type="number" min="0" step="0.01" className="form-control" placeholder="Qty × unit" value={values.totalCost || ""} onChange={(event) => set("totalCost", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Supplier</label><input className="form-control" value={values.supplier || ""} onChange={(event) => set("supplier", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Odometer</label><input type="number" min="0" className="form-control" value={values.odometer || ""} onChange={(event) => set("odometer", event.target.value)} /></div>
                </>
              ) : null}
              {kind === "tyres" ? (
                <>
                  <div className="col-md-4"><label className="form-label">Date *</label><input type="date" required className="form-control" value={values.date || ""} onChange={(event) => set("date", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Position *</label><select className="form-select" value={values.position || "FL"} onChange={(event) => set("position", event.target.value)}><option>FL</option><option>FR</option><option>RL</option><option>RR</option><option>Spare</option><option>Set</option></select></div>
                  <div className="col-md-4"><label className="form-label">Action</label><select className="form-select" value={values.action || "Fitted"} onChange={(event) => set("action", event.target.value)}><option>Fitted</option><option>Rotated</option><option>Replaced</option><option>Retired</option></select></div>
                  <div className="col-md-6"><label className="form-label">Brand</label><input className="form-control" value={values.brand || ""} onChange={(event) => set("brand", event.target.value)} /></div>
                  <div className="col-md-6"><label className="form-label">Size</label><input className="form-control" placeholder="e.g. 265/65 R17" value={values.size || ""} onChange={(event) => set("size", event.target.value)} /></div>
                  <div className="col-md-6"><label className="form-label">Serial number</label><input className="form-control" value={values.serialNumber || ""} onChange={(event) => set("serialNumber", event.target.value)} /></div>
                  <div className="col-md-3"><label className="form-label">Quantity</label><input type="number" min="0.01" step="0.01" className="form-control" value={values.quantity || ""} onChange={(event) => set("quantity", event.target.value)} /></div>
                  <div className="col-md-3"><label className="form-label">Unit cost</label><input type="number" min="0" step="0.01" className="form-control" value={values.unitCost || ""} onChange={(event) => set("unitCost", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Total cost</label><input type="number" min="0" step="0.01" className="form-control" placeholder="Qty × unit" value={values.totalCost || ""} onChange={(event) => set("totalCost", event.target.value)} /></div>
                  <div className="col-md-4"><label className="form-label">Odometer</label><input type="number" min="0" className="form-control" value={values.odometer || ""} onChange={(event) => set("odometer", event.target.value)} /></div>
                </>
              ) : null}
              <div className="col-12"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={values.notes || ""} onChange={(event) => set("notes", event.target.value)} /></div>
            </div>
          </div>
          <div className="fleet-modal__footer">
            <span className="small text-muted">All entries are audit-logged against your account.</span>
            <div className="d-flex gap-2"><button type="button" className="btn btn-light" onClick={onClose}>Cancel</button><button type="submit" className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Save record"}</button></div>
          </div>
        </form>
      </div>
    </div>
  );
}
