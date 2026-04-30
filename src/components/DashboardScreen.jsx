import { useState, useEffect } from 'react'
import { getDashboardStats } from '../lib/api'

export default function DashboardScreen() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDashboardStats().then(s => { setStats(s); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-bar" style={{ margin: '2rem 0' }} />

  const maxCnt = Math.max(...(stats?.horasPorDia?.map(d => d.cnt) ?? [1]), 1)
  const maxEmp = Math.max(...(stats?.asistenciaPorEmp?.map(e => e.entradas) ?? [1]), 1)

  return (
    <div className="dashboard-screen">
      <h2 className="screen-title">Dashboard</h2>

      {/* Stats grid */}
      <div className="dash-grid">
        <StatCard label="Empleados" value={stats.totalEmpleados} color="info" icon="👥" />
        <StatCard label="Presentes hoy" value={stats.presentesHoy} color="success" icon="✅" />
        <StatCard label="Ausentes hoy" value={stats.ausentesHoy} color="danger" icon="❌" />
        <StatCard label="Tardanzas semana" value={stats.tardanzasSemana} color="warning" icon="⏰" />
      </div>

      {/* Ponches por día */}
      <div className="chart-card">
        <div className="chart-title">Ponches por día — últimos 7 días</div>
        <div className="bar-chart">
          {stats.horasPorDia.map((d, i) => (
            <div key={i} className="bar-col">
              <div className="bar-wrap">
                <div className="bar-fill" style={{ height: `${Math.round((d.cnt / maxCnt) * 100)}%` }} />
              </div>
              <div className="bar-val">{d.cnt}</div>
              <div className="bar-lbl">{d.dia}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Asistencia por empleado */}
      <div className="chart-card">
        <div className="chart-title">Asistencia esta semana por empleado</div>
        {stats.asistenciaPorEmp.map((e, i) => (
          <div key={i} className="emp-bar-row">
            <div className="emp-bar-name">{e.nombre}</div>
            <div className="emp-bar-track">
              <div className="emp-bar-fill" style={{ width: `${Math.round((e.entradas / maxEmp) * 100)}%` }} />
            </div>
            <div className="emp-bar-val">{e.entradas}d</div>
          </div>
        ))}
        {stats.asistenciaPorEmp.length === 0 && (
          <div className="empty-state">Sin datos esta semana</div>
        )}
      </div>

      {/* Donut presencia */}
      <div className="chart-card">
        <div className="chart-title">Presencia de hoy</div>
        <div className="donut-wrap">
          <DonutChart present={stats.presentesHoy} total={stats.totalEmpleados} />
          <div className="donut-legend">
            <div className="legend-row"><span className="legend-dot present" />Presentes: {stats.presentesHoy}</div>
            <div className="legend-row"><span className="legend-dot absent" />Ausentes: {stats.ausentesHoy}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className={`dash-stat dash-stat-${color}`}>
      <div className="dash-stat-icon">{icon}</div>
      <div className="dash-stat-val">{value}</div>
      <div className="dash-stat-lbl">{label}</div>
    </div>
  )
}

function DonutChart({ present, total }) {
  const pct = total > 0 ? Math.round((present / total) * 100) : 0
  const r = 40, circ = 2 * Math.PI * r
  const filled = (pct / 100) * circ
  return (
    <div className="donut-svg-wrap">
      <svg viewBox="0 0 100 100" width="100" height="100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-background-secondary)" strokeWidth="12" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1D9E75" strokeWidth="12"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 50 50)" />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: 18, fontWeight: 500, fill: 'var(--color-text-primary)', fontFamily: 'DM Mono' }}>
          {pct}%
        </text>
      </svg>
    </div>
  )
}
