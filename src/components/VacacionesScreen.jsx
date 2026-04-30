import { useState, useEffect } from 'react'
import { getVacaciones, solicitarVacaciones, responderVacaciones, getEmpleados } from '../lib/api'

export default function VacacionesScreen() {
  const [tab,       setTab]       = useState('solicitudes')
  const [vacaciones,setVacaciones]= useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [form,      setForm]      = useState({ empleado_id:'', fecha_inicio:'', fecha_fin:'', motivo:'' })
  const [msg,       setMsg]       = useState(null)

  useEffect(() => {
    getEmpleados().then(setEmpleados).catch(console.error)
    loadVacaciones()
  }, [])

  async function loadVacaciones() {
    setLoading(true)
    try { setVacaciones(await getVacaciones()) }
    catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function submitSolicitud() {
    if (!form.empleado_id || !form.fecha_inicio || !form.fecha_fin) {
      setMsg({ text:'Completa todos los campos', type:'error' }); return
    }
    try {
      await solicitarVacaciones(form)
      setMsg({ text:'Solicitud enviada correctamente', type:'ok' })
      setForm({ empleado_id:'', fecha_inicio:'', fecha_fin:'', motivo:'' })
      loadVacaciones()
    } catch(e) { setMsg({ text:'Error al enviar solicitud', type:'error' }) }
  }

  async function responder(id, estado) {
    try { await responderVacaciones(id, estado); loadVacaciones() }
    catch(e) { console.error(e) }
  }

  const pendientes = vacaciones.filter(v => v.estado === 'pendiente')
  const historico  = vacaciones.filter(v => v.estado !== 'pendiente')

  return (
    <div className="vacaciones-screen">
      <h2 className="screen-title">Vacaciones y días libres</h2>

      <div className="tab-bar">
        <button className={`tab ${tab==='solicitudes'?'active':''}`} onClick={()=>setTab('solicitudes')}>
          Solicitudes {pendientes.length > 0 && <span className="tab-badge">{pendientes.length}</span>}
        </button>
        <button className={`tab ${tab==='nueva'?'active':''}`} onClick={()=>setTab('nueva')}>Nueva</button>
        <button className={`tab ${tab==='historial'?'active':''}`} onClick={()=>setTab('historial')}>Historial</button>
      </div>

      {tab === 'nueva' && (
        <div className="vac-form">
          <div className="section-title" style={{marginBottom:12}}>Nueva solicitud</div>
          <label className="field-label">Empleado</label>
          <select value={form.empleado_id} onChange={e=>setForm({...form,empleado_id:e.target.value})}
            style={{width:'100%',marginBottom:10,padding:'9px 10px',borderRadius:'var(--border-radius-md)',border:'0.5px solid var(--color-border-secondary)',background:'var(--color-background-secondary)',fontSize:14,fontFamily:'var(--font)'}}>
            <option value="">Seleccionar empleado</option>
            {empleados.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div>
              <label className="field-label">Fecha inicio</label>
              <input type="date" value={form.fecha_inicio} onChange={e=>setForm({...form,fecha_inicio:e.target.value})} className="text-input" />
            </div>
            <div>
              <label className="field-label">Fecha fin</label>
              <input type="date" value={form.fecha_fin} onChange={e=>setForm({...form,fecha_fin:e.target.value})} className="text-input" />
            </div>
          </div>
          <label className="field-label">Motivo (opcional)</label>
          <input type="text" placeholder="Vacaciones, cita médica, asunto personal..." value={form.motivo}
            onChange={e=>setForm({...form,motivo:e.target.value})} className="text-input" />
          {msg && <div className={`msg msg-${msg.type}`}>{msg.text}</div>}
          <button className="punch-btn btn-in" onClick={submitSolicitud}>Enviar solicitud</button>
        </div>
      )}

      {tab === 'solicitudes' && (
        <div>
          {loading && <div className="loading-bar" />}
          {pendientes.length === 0 && !loading && (
            <div className="empty-state">No hay solicitudes pendientes</div>
          )}
          {pendientes.map(v => <VacCard key={v.id} v={v} onResponder={responder} showActions />)}
        </div>
      )}

      {tab === 'historial' && (
        <div>
          {historico.length === 0 && <div className="empty-state">Sin historial</div>}
          {historico.map(v => <VacCard key={v.id} v={v} />)}
        </div>
      )}
    </div>
  )
}

function VacCard({ v, onResponder, showActions }) {
  const ini  = v.empleados?.nombre?.split(' ').map(w=>w[0]).slice(0,2).join('') ?? '?'
  const dias  = Math.ceil((new Date(v.fecha_fin) - new Date(v.fecha_inicio)) / 86400000) + 1
  const color = v.estado === 'aprobada' ? 'bs' : v.estado === 'rechazada' ? 'bd' : 'bw'
  const label = v.estado === 'aprobada' ? 'Aprobada' : v.estado === 'rechazada' ? 'Rechazada' : 'Pendiente'

  return (
    <div className="vac-card">
      <div className="nomina-header">
        <div className="emp-avatar sm">{ini}</div>
        <div style={{flex:1}}>
          <div className="emp-name">{v.empleados?.nombre}</div>
          <div className="emp-dept">{v.empleados?.departamento}</div>
        </div>
        <span className={`badge ${color}`}>{label}</span>
      </div>
      <div className="vac-dates">
        <span>📅 {new Date(v.fecha_inicio).toLocaleDateString('es-PR',{month:'short',day:'numeric'})} → {new Date(v.fecha_fin).toLocaleDateString('es-PR',{month:'short',day:'numeric'})}</span>
        <span className="vac-dias">{dias} día{dias>1?'s':''}</span>
      </div>
      {v.motivo && <div className="vac-motivo">"{v.motivo}"</div>}
      {showActions && v.estado === 'pendiente' && (
        <div className="vac-actions">
          <button className="vac-btn aprobar" onClick={() => onResponder(v.id, 'aprobada')}>✓ Aprobar</button>
          <button className="vac-btn rechazar" onClick={() => onResponder(v.id, 'rechazada')}>✕ Rechazar</button>
        </div>
      )}
    </div>
  )
}
