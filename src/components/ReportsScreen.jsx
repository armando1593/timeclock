import { useState, useEffect } from 'react'
import { getRegistros, calcularNomina, getEmpleados } from '../lib/api'

export default function ReportsScreen() {
  const [periodo,  setPeriodo]  = useState('semana')
  const [horaData, setHoraData] = useState([])
  const [empCount, setEmpCount] = useState(0)
  const [loading,  setLoading]  = useState(false)

  useEffect(() => { loadReport() }, [periodo])

  async function loadReport() {
    setLoading(true)
    try {
      const now = new Date()
      const tod = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      let desde
      if (periodo === 'semana') {
        const w = new Date(tod); w.setDate(w.getDate() - w.getDay()); desde = w.toISOString()
      } else {
        desde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      }
      const [recs, emps] = await Promise.all([getRegistros({ desde }), getEmpleados()])
      setEmpCount(emps.length)
      const hrs = calcularHoras(recs)
      // Asegurarse de incluir empleados sin registros
      const all = emps.map(e => {
        const found = hrs.find(h => h.id === e.id)
        return found ?? { ...e, horas: 0 }
      })
      setHoraData(all.sort((a,b) => b.horas - a.horas))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const totalHrs   = horaData.reduce((s, e) => s + e.horas, 0)
  const diasPeriodo = periodo === 'semana' ? 7 : 30
  const avgHrs     = horaData.filter(e => e.horas > 0).length
                   ? (totalHrs / horaData.filter(e => e.horas > 0).length).toFixed(1)
                   : '0.0'

  return (
    <div className="reports-screen">
      <h2 className="screen-title">Reporte de horas</h2>

      <div className="tab-bar">
        {['semana','mes'].map(p => (
          <button key={p} className={`tab ${periodo===p?'active':''}`} onClick={() => setPeriodo(p)}>
            {p === 'semana' ? 'Esta semana' : 'Este mes'}
          </button>
        ))}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-lbl">Horas totales</div>
          <div className="stat-val">{totalHrs.toFixed(1)}h</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Promedio/persona</div>
          <div className="stat-val">{avgHrs}h</div>
        </div>
      </div>

      {loading && <div className="loading-bar" />}

      <div className="hours-list">
        {horaData.map(emp => {
          const meta = (emp.horas_meta ?? 8) * diasPeriodo
          const pct  = Math.min(100, Math.round((emp.horas / meta) * 100))
          const ini  = emp.nombre?.split(' ').map(w=>w[0]).slice(0,2).join('') ?? '?'
          return (
            <div key={emp.id} className="hours-row">
              <div className="emp-avatar sm">{ini}</div>
              <div className="hours-info">
                <div className="hours-name">{emp.nombre}</div>
                <div className="prog-wrap">
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
              <div className="hours-right">
                <div className="hours-val">{emp.horas.toFixed(1)}h</div>
                <div className="hours-pct">{pct}%</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
