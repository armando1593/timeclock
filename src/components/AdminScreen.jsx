import { useState, useEffect } from 'react'
import { getRegistros, getEmpleados } from '../lib/api'

const TABS = ['hoy', 'semana', 'todos']

function rangeFor(tab) {
  const now = new Date()
  const tod = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (tab === 'hoy')    return { desde: tod.toISOString() }
  if (tab === 'semana') {
    const w = new Date(tod); w.setDate(w.getDate() - w.getDay())
    return { desde: w.toISOString() }
  }
  return {}
}

export default function AdminScreen() {
  const [tab,       setTab]       = useState('hoy')
  const [records,   setRecords]   = useState([])
  const [empleados, setEmpleados] = useState([])
  const [fEmp,      setFEmp]      = useState('')
  const [fTipo,     setFTipo]     = useState('')
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    getEmpleados().then(setEmpleados).catch(console.error)
  }, [])

  useEffect(() => { loadRecords() }, [tab, fEmp, fTipo])

  async function loadRecords() {
    setLoading(true)
    try {
      const range = rangeFor(tab)
      const data = await getRegistros({ ...range, empleado_id: fEmp || undefined, tipo: fTipo || undefined })
      setRecords(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const now = new Date()
  const todStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todRecs   = records.filter(r => new Date(r.timestamp) >= todStart)
  const presentIds = new Set()
  empleados.forEach(e => {
    const er = todRecs.filter(r => r.empleados?.id === e.id)
    const li = er.filter(r => r.tipo === 'entrada').pop()
    const lo = er.filter(r => r.tipo === 'salida').pop()
    if (li && (!lo || new Date(li.timestamp) > new Date(lo.timestamp))) presentIds.add(e.id)
  })

  return (
    <div className="admin-screen">
      <h2 className="screen-title">Registros de asistencia</h2>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-lbl">Presentes hoy</div>
          <div className="stat-val">{presentIds.size}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Registros hoy</div>
          <div className="stat-val">{todRecs.length}</div>
        </div>
      </div>

      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="filter-row">
        <select value={fEmp} onChange={e => setFEmp(e.target.value)}>
          <option value="">Todos los empleados</option>
          {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select value={fTipo} onChange={e => setFTipo(e.target.value)}>
          <option value="">Entrada y salida</option>
          <option value="entrada">Solo entradas</option>
          <option value="salida">Solo salidas</option>
        </select>
      </div>

      {loading && <div className="loading-bar" />}

      <div className="records-list">
        {records.length === 0 && !loading && (
          <div className="empty-state">Sin registros para este filtro</div>
        )}
        {records.map(r => (
          <RecordRow key={r.id} record={r} />
        ))}
      </div>

      <div className="export-row">
        <ExportButton label="Exportar CSV" onClick={() => exportCSV(records)} />
      </div>
    </div>
  )
}

function RecordRow({ record: r }) {
  const emp  = r.empleados
  const time = new Date(r.timestamp).toLocaleTimeString('es-PR', { hour:'2-digit', minute:'2-digit' })
  const date = new Date(r.timestamp).toLocaleDateString('es-PR', { month:'short', day:'numeric' })
  const ini  = emp?.nombre?.split(' ').map(w=>w[0]).slice(0,2).join('') ?? '?'

  return (
    <div className="record-row">
      <div className="rec-avatar">{ini}</div>
      <div className="rec-info">
        <div className="rec-name">{emp?.nombre ?? '—'}</div>
        <div className="rec-meta">
          {emp?.departamento}
          {r.latitud ? ` · ${Number(r.latitud).toFixed(3)}, ${Number(r.longitud).toFixed(3)}` : ''}
        </div>
      </div>
      <div className="rec-right">
        <span className={`rec-badge ${r.tipo}`}>{r.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
        <div className="rec-time">{date} {time}</div>
        {r.foto_url && <a href={r.foto_url} target="_blank" rel="noreferrer" className="foto-link">Foto</a>}
      </div>
    </div>
  )
}

function ExportButton({ label, onClick }) {
  return <button className="export-btn" onClick={onClick}>{label}</button>
}

function exportCSV(records) {
  const rows = [['Empleado','Departamento','Tipo','Fecha','Hora','Latitud','Longitud']]
  records.forEach(r => {
    const d = new Date(r.timestamp)
    rows.push([
      r.empleados?.nombre ?? '',
      r.empleados?.departamento ?? '',
      r.tipo,
      d.toLocaleDateString('es-PR'),
      d.toLocaleTimeString('es-PR'),
      r.latitud ?? '',
      r.longitud ?? ''
    ])
  })
  const csv  = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `asistencia_${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}
