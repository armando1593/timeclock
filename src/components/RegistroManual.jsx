import { useState, useEffect } from 'react'
import { getEmpleados, insertarRegistro } from '../lib/api'

export default function RegistroManual() {
  const [empleados,  setEmpleados]  = useState([])
  const [empleadoId, setEmpleadoId] = useState('')
  const [tipo,       setTipo]       = useState('entrada')
  const [fecha,      setFecha]      = useState(new Date().toISOString().split('T')[0])
  const [hora,       setHora]       = useState('08:00')
  const [loading,    setLoading]    = useState(false)
  const [msg,        setMsg]        = useState(null)
  const [historial,  setHistorial]  = useState([])

  useEffect(() => {
    getEmpleados().then(setEmpleados).catch(console.error)
  }, [])

  async function guardar() {
    if (!empleadoId) { setMsg({ text: 'Selecciona un empleado', type: 'error' }); return }
    setLoading(true)
    try {
      const timestampPR = fecha + 'T' + hora + ':00-04:00'
      await insertarRegistro({
        empleado_id: empleadoId,
        tipo,
        latitud: null,
        longitud: null,
        foto_url: null,
        timestamp: timestampPR
      })
      const emp = empleados.find(function(e) { return e.id === empleadoId })
      setHistorial(function(h) { return [{ nombre: emp && emp.nombre, tipo, fecha, hora }, ...h].slice(0,10) })
      setMsg({ text: 'Registro guardado: ' + (emp && emp.nombre) + ' ' + tipo + ' ' + fecha + ' ' + hora, type: 'ok' })
      setTimeout(function() { setMsg(null) }, 3000)
    } catch(e) {
      setMsg({ text: 'Error al guardar. Intenta de nuevo.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{padding:'0 0 1rem'}}>
      <h2 className="screen-title">Registro manual de horas</h2>
      <div className="nomina-card" style={{marginBottom:16}}>
        <div className="section-title" style={{marginBottom:12}}>Agregar registro</div>
        <label className="field-label">Empleado</label>
        <select value={empleadoId} onChange={function(e) { setEmpleadoId(e.target.value) }}
          style={{width:'100%',marginBottom:12,padding:'9px 10px',borderRadius:'var(--border-radius-md)',border:'0.5px solid var(--gray-200)',background:'var(--gray-50)',fontSize:14,fontFamily:'var(--font)',color:'var(--gray-900)'}}>
          <option value="">Seleccionar empleado</option>
          {empleados.map(function(e) { return <option key={e.id} value={e.id}>{e.nombre}</option> })}
        </select>
        <label className="field-label">Tipo de registro</label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          <button onClick={function() { setTipo('entrada') }}
            style={{padding:'10px',borderRadius:'var(--border-radius-md)',border:tipo==='entrada'?'2px solid #1D9E75':'0.5px solid var(--gray-200)',background:tipo==='entrada'?'var(--teal-50)':'var(--gray-50)',color:tipo==='entrada'?'#0F6E56':'var(--gray-700)',fontFamily:'var(--font)',fontSize:13,fontWeight:500,cursor:'pointer'}}>
            Entrada
          </button>
          <button onClick={function() { setTipo('salida') }}
            style={{padding:'10px',borderRadius:'var(--border-radius-md)',border:tipo==='salida'?'2px solid #D85A30':'0.5px solid var(--gray-200)',background:tipo==='salida'?'var(--coral-50)':'var(--gray-50)',color:tipo==='salida'?'#D85A30':'var(--gray-700)',fontFamily:'var(--font)',fontSize:13,fontWeight:500,cursor:'pointer'}}>
            Salida
          </button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
          <div>
            <label className="field-label">Fecha</label>
            <input type="date" value={fecha} onChange={function(e) { setFecha(e.target.value) }}
              max={new Date().toISOString().split('T')[0]}
              style={{width:'100%',padding:'9px 10px',borderRadius:'var(--border-radius-md)',border:'0.5px solid var(--gray-200)',background:'var(--gray-50)',fontSize:14,fontFamily:'var(--font)',color:'var(--gray-900)'}} />
          </div>
          <div>
            <label className="field-label">Hora (PR)</label>
            <input type="time" value={hora} onChange={function(e) { setHora(e.target.value) }}
              style={{width:'100%',padding:'9px 10px',borderRadius:'var(--border-radius-md)',border:'0.5px solid var(--gray-200)',background:'var(--gray-50)',fontSize:14,fontFamily:'var(--font)',color:'var(--gray-900)'}} />
          </div>
        </div>
        {msg && <div className={"msg msg-" + msg.type}>{msg.text}</div>}
        <button className="punch-btn btn-in" onClick={guardar} disabled={loading} style={{marginTop:8}}>
          {loading ? 'Guardando...' : 'Guardar registro'}
        </button>
      </div>
      {historial.length > 0 && (
        <div>
          <div className="section-title">Registros guardados en esta sesion</div>
          <div className="records-list">
            {historial.map(function(r, i) {
              return (
                <div key={i} className="record-row">
                  <div className="rec-avatar">{r.nombre && r.nombre.split(' ').map(function(w) { return w[0] }).slice(0,2).join('')}</div>
                  <div className="rec-info">
                    <div className="rec-name">{r.nombre}</div>
                    <div className="rec-meta">{r.fecha} a las {r.hora}</div>
                  </div>
                  <span className={"rec-badge " + r.tipo}>{r.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
