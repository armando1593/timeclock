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

export default function AdminScreen({ isAdmin }) {
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
const [pin,      setPin]      = useState('')
const [empleado, setEmpleado] = useState(null)
const [pinError, setPinError] = useState('')
const [misRecs,  setMisRecs]  = useState([])

const KEYS = ['1','2','3','4','5','6','7','8','9','←','0','✓']

async function verificarPinEmp(p) {
  const { verificarPin } = await import('../lib/api')
  const emp = await verificarPin(p)
  setPin('')
  if (!emp) { setPinError('PIN incorrecto'); return }
  setPinError('')
  setEmpleado(emp)
  const tod = new Date(); tod.setHours(0,0,0,0)
  const recs = await getRegistros({ empleado_id: emp.id })
  setMisRecs(recs)
}

if (!isAdmin) {
  if (!empleado) return (
    <div className="punch-screen">
      <header className="punch-header">
        <div className="date-line">Mis registros de ponche</div>
        <div style={{fontSize:14,color:'var(--gray-500)',marginTop:4}}>Ingresa tu PIN para ver tus registros</div>
      </header>
      <div className="pin-card">
        <p className="pin-label">Tu PIN de 4 dígitos</p>
        <div className="pin-dots">
          {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${i<pin.length?'filled':''}`} />)}
        </div>
        <div className="pin-grid">
          {KEYS.map(k => (
            <button key={k} className={`pin-key ${k==='✓'?'pin-confirm':k==='←'?'pin-del':''}`}
              onClick={() => {
                if (k==='←') { setPin(p=>p.slice(0,-1)); return }
                if (k==='✓') { verificarPinEmp(pin); return }
                if (pin.length<4) { const np=pin+k; setPin(np); if(np.length===4) setTimeout(()=>verificarPinEmp(np),200) }
              }}>{k}</button>
          ))}
        </div>
        {pinError && <div className="msg msg-error">{pinError}</div>}
      </div>
    </div>
  )

  return (
    <div className="admin-screen">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <div className="emp-avatar">{empleado.nombre.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
        <div><div className="emp-name">{empleado.nombre}</div><div className="emp-dept">{empleado.departamento}</div></div>
        <button onClick={()=>{setEmpleado(null);setMisRecs([]);setPinError('')}}
          style={{marginLeft:'auto',fontSize:12,padding:'4px 10px',borderRadius:8,border:'0.5px solid var(--gray-200)',background:'var(--gray-50)',cursor:'pointer',color:'var(--gray-500)'}}>
          Salir
        </button>
      </div>
      <div className="section-title">Mis últimos registros</div>
      <div className="records-list">
        {misRecs.length === 0 && <div className="empty-state">No tienes registros aún</div>}
        {misRecs.slice(0,20).map(r => (
          <div key={r.id} className="record-row">
            <div className="rec-info">
              <div className="rec-name">{new Date(r.timestamp).toLocaleDateString('es-PR',{weekday:'short',month:'short',day:'numeric'})}</div>
              <div className="rec-meta">{new Date(r.timestamp).toLocaleTimeString('es-PR',{hour:'2-digit',minute:'2-digit'})}</div>
            </div>
            <span className={`rec-badge ${r.tipo}`}>{r.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
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
