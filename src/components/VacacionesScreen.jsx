import { useState, useEffect } from 'react'
import { getVacaciones, solicitarVacaciones, responderVacaciones, verificarPin } from '../lib/api'

export default function VacacionesScreen({ isAdmin }) {
  const [tab,        setTab]        = useState('empleado')
  const [vacaciones, setVacaciones] = useState([])
  const [loading,    setLoading]    = useState(false)
  const [pin,        setPin]        = useState('')
  const [empleado,   setEmpleado]   = useState(null)
  const [pinError,   setPinError]   = useState('')
  const [form,       setForm]       = useState({ fecha_inicio:'', fecha_fin:'', motivo:'' })
  const [msg,        setMsg]        = useState(null)

  useEffect(() => { if (isAdmin) loadVacaciones() }, [isAdmin])

  async function loadVacaciones() {
    setLoading(true)
    try { setVacaciones(await getVacaciones()) }
    catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function verificarPinEmp(p) {
    const emp = await verificarPin(p)
    setPin('')
    if (!emp) { setPinError('PIN incorrecto, intenta de nuevo'); return }
    setPinError('')
    setEmpleado(emp)
  }

  async function submitSolicitud() {
    if (!form.fecha_inicio || !form.fecha_fin) { setMsg({ text:'Selecciona las fechas', type:'error' }); return }
    if (new Date(form.fecha_fin) < new Date(form.fecha_inicio)) { setMsg({ text:'La fecha fin debe ser despues del inicio', type:'error' }); return }
    try {
      await solicitarVacaciones({ empleado_id: empleado.id, ...form })
      setMsg({ text:'Solicitud enviada! El administrador la revisara pronto.', type:'ok' })
      setForm({ fecha_inicio:'', fecha_fin:'', motivo:'' })
    } catch(e) { setMsg({ text:'Error al enviar. Intenta de nuevo.', type:'error' }) }
  }

  async function responder(id, estado) {
    try { await responderVacaciones(id, estado); loadVacaciones() }
    catch(e) { console.error(e) }
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9','<','0','OK']

  if (!isAdmin && !empleado) return (
    <div className="punch-screen">
      <header className="punch-header">
        <div className="date-line">Solicitud de vacaciones</div>
        <div style={{fontSize:14,color:'var(--gray-500)',marginTop:4}}>Ingresa tu PIN para continuar</div>
      </header>
      <div className="pin-card">
        <p className="pin-label">Tu PIN de 4 digitos</p>
        <div className="pin-dots">
          {[0,1,2,3].map(i => <div key={i} className={"pin-dot " + (i<pin.length?'filled':'')} />)}
        </div>
        <div className="pin-grid">
          {KEYS.map(k => (
            <button key={k} className={"pin-key " + (k==='OK'?'pin-confirm':k==='<'?'pin-del':'')}
              onClick={() => {
                if (k==='<') { setPin(p=>p.slice(0,-1)); return }
                if (k==='OK') { verificarPinEmp(pin); return }
                if (pin.length<4) { const np=pin+k; setPin(np); if(np.length===4) setTimeout(()=>verificarPinEmp(np),200) }
              }}>{k}</button>
          ))}
        </div>
        {pinError && <div className="msg msg-error">{pinError}</div>}
      </div>
    </div>
  )

  if (!isAdmin && empleado) {
    const dias = form.fecha_inicio && form.fecha_fin ? Math.ceil((new Date(form.fecha_fin)-new Date(form.fecha_inicio))/86400000)+1 : 0
    return (
      <div className="vacaciones-screen">
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <div className="emp-avatar">{empleado.nombre.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
          <div><div className="emp-name">{empleado.nombre}</div><div className="emp-dept">{empleado.departamento}</div></div>
          <button onClick={()=>{setEmpleado(null);setMsg(null);setPinError('')}} style={{marginLeft:'auto',fontSize:12,padding:'4px 10px',borderRadius:8,border:'0.5px solid var(--gray-200)',background:'var(--gray-50)',cursor:'pointer',color:'var(--gray-500)'}}>Salir</button>
        </div>
        <div className="vac-form">
          <div className="section-title" style={{marginBottom:12}}>Nueva solicitud de vacaciones</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
            <div>
              <label className="field-label">Fecha inicio</label>
              <input type="date" value={form.fecha_inicio} min={new Date().toISOString().split('T')[0]} onChange={e=>setForm({...form,fecha_inicio:e.target.value})} className="text-input" />
            </div>
            <div>
              <label className="field-label">Fecha fin</label>
              <input type="date" value={form.fecha_fin} min={form.fecha_inicio||new Date().toISOString().split('T')[0]} onChange={e=>setForm({...form,fecha_fin:e.target.value})} className="text-input" />
            </div>
          </div>
          {dias>0 && <div style={{fontSize:13,color:'var(--teal-600)',background:'var(--teal-50)',padding:'6px 12px',borderRadius:8,marginBottom:8,textAlign:'center'}}>{dias} dia{dias>1?'s':''} solicitado{dias>1?'s':''}</div>}
          <label className="field-label">Motivo (opcional)</label>
          <input type="text" placeholder="Vacaciones, cita medica, asunto personal..." value={form.motivo} onChange={e=>setForm({...form,motivo:e.target.value})} className="text-input" />
          {msg && <div className={"msg msg-"+msg.type}>{msg.text}</div>}
          <button className="punch-btn btn-in" onClick={submitSolicitud}>Enviar solicitud</button>
        </div>
      </div>
    )
  }

  const pendientes = vacaciones.filter(v => v.estado==='pendiente')
  const historico  = vacaciones.filter(v => v.estado!=='pendiente')
  return (
    <div className="vacaciones-screen">
      <h2 className="screen-title">Vacaciones y dias libres</h2>
      <div className="tab-bar">
        <button className={"tab "+(tab==='solicitudes'?'active':'')} onClick={()=>setTab('solicitudes')}>Pendientes {pendientes.length>0&&<span className="tab-badge">{pendientes.length}</span>}</button>
        <button className={"tab "+(tab==='historial'?'active':'')} onClick={()=>setTab('historial')}>Historial</button>
      </div>
      {loading && <div className="loading-bar" />}
      {tab==='solicitudes' && <div>{pendientes.length===0&&!loading&&<div className="empty-state">No hay solicitudes pendientes</div>}{pendientes.map(v=><VacCard key={v.id} v={v} onResponder={responder} showActions/>)}</div>}
      {tab==='historial' && <div>{historico.length===0&&<div className="empty-state">Sin historial</div>}{historico.map(v=><VacCard key={v.id} v={v}/>)}</div>}
    </div>
  )
}

function VacCard({ v, onResponder, showActions }) {
  const ini  = v.empleados?.nombre?.split(' ').map(w=>w[0]).slice(0,2).join('')??'?'
  const dias = Math.ceil((new Date(v.fecha_fin)-new Date(v.fecha_inicio))/86400000)+1
  const color = v.estado==='aprobada'?'bs':v.estado==='rechazada'?'bd':'bw'
  const label = v.estado==='aprobada'?'Aprobada':v.estado==='rechazada'?'Rechazada':'Pendiente'
  return (
    <div className="vac-card">
      <div className="nomina-header">
        <div className="emp-avatar sm">{ini}</div>
        <div style={{flex:1}}><div className="emp-name">{v.empleados?.nombre}</div><div className="emp-dept">{v.empleados?.departamento}</div></div>
        <span className={"badge "+color}>{label}</span>
      </div>
      <div className="vac-dates">
        <span>Fechas: {new Date(v.fecha_inicio).toLocaleDateString('es-PR',{month:'short',day:'numeric'})} al {new Date(v.fecha_fin).toLocaleDateString('es-PR',{month:'short',day:'numeric'})}</span>
        <span className="vac-dias">{dias} dia{dias>1?'s':''}</span>
      </div>
      {v.motivo&&<div className="vac-motivo">"{v.motivo}"</div>}
      {showActions&&v.estado==='pendiente'&&(
        <div className="vac-actions">
          <button className="vac-btn aprobar" onClick={()=>onResponder(v.id,'aprobada')}>Aprobar</button>
          <button className="vac-btn rechazar" onClick={()=>onResponder(v.id,'rechazada')}>Rechazar</button>
        </div>
      )}
    </div>
  )
}
