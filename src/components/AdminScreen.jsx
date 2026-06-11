import { useState, useEffect } from 'react'
import { getEmpleados, getRegistros, verificarPin } from '../lib/api'
import { supabase } from '../lib/supabase'

export default function AdminScreen({ isAdmin }) {
  const [recs,      setRecs]      = useState([])
  const [emps,      setEmps]      = useState([])
  const [loading,   setLoading]   = useState(false)
  const [filtroEmp, setFiltroEmp] = useState('')
  const [filtroTipo,setFiltroTipo]= useState('')
  const [pin,       setPin]       = useState('')
  const [empleado,  setEmpleado]  = useState(null)
  const [pinError,  setPinError]  = useState('')
  const [misRecs,   setMisRecs]   = useState([])

  useEffect(function() {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  async function loadData() {
    setLoading(true)
    try {
      const [e, r] = await Promise.all([getEmpleados(), getRegistros()])
      setEmps(e)
      setRecs(r)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function borrarRegistro(id) {
    if (!window.confirm('¿Borrar este registro?')) return
    try {
      await supabase.from('registros').delete().eq('id', id)
      setRecs(function(prev) { return prev.filter(function(r) { return r.id !== id }) })
    } catch(e) { console.error(e) }
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9','<','0','OK']

  async function verificarPinEmp(p) {
    const emp = await verificarPin(p)
    setPin('')
    if (!emp) { setPinError('PIN incorrecto'); return }
    setPinError('')
    setEmpleado(emp)
    const r = await getRegistros({ empleado_id: emp.id })
    setMisRecs(r)
  }

  if (!isAdmin) {
    if (!empleado) return (
      <div className="punch-screen">
        <header className="punch-header">
          <div className="date-line">Mis registros de ponche</div>
          <div style={{fontSize:14,color:'var(--gray-500)',marginTop:4}}>Ingresa tu PIN para ver tus registros</div>
        </header>
        <div className="pin-card">
          <p className="pin-label">Tu PIN de 4 digitos</p>
          <div className="pin-dots">
            {[0,1,2,3].map(function(i){ return <div key={i} className={'pin-dot ' + (i<pin.length?'filled':'')} /> })}
          </div>
          <div className="pin-grid">
            {KEYS.map(function(k){ return (
              <button key={k} className={'pin-key ' + (k==='OK'?'pin-confirm':k==='<'?'pin-del':'')}
                onClick={function() {
                  if (k==='<') { setPin(function(p){ return p.slice(0,-1) }); return }
                  if (k==='OK') { verificarPinEmp(pin); return }
                  if (pin.length<4) { var np=pin+k; setPin(np); if(np.length===4) setTimeout(function(){ verificarPinEmp(np) },200) }
                }}>{k}</button>
            )})}
          </div>
          {pinError && <div className="msg msg-error">{pinError}</div>}
        </div>
      </div>
    )

    return (
      <div className="admin-screen">
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <div className="emp-avatar">{empleado.nombre.split(' ').map(function(w){return w[0]}).slice(0,2).join('')}</div>
          <div><div className="emp-name">{empleado.nombre}</div><div className="emp-dept">{empleado.departamento}</div></div>
          <button onClick={function(){setEmpleado(null);setMisRecs([]);setPinError('')}}
            style={{marginLeft:'auto',fontSize:12,padding:'4px 10px',borderRadius:8,border:'0.5px solid var(--gray-200)',background:'var(--gray-50)',cursor:'pointer',color:'var(--gray-500)'}}>
            Salir
          </button>
        </div>
        <div className="section-title">Mis ultimos registros</div>
        <div className="records-list">
          {misRecs.length === 0 && <div className="empty-state">No tienes registros aun</div>}
          {misRecs.slice(0,20).map(function(r) {
            var d = new Date(r.timestamp)
            var date = d.toLocaleDateString('es-PR',{weekday:'short',month:'short',day:'numeric'})
            var time = d.toLocaleTimeString('es-PR',{hour:'2-digit',minute:'2-digit'})
            return (
              <div key={r.id} className="record-row">
                <div className="rec-info">
                  <div className="rec-name">{date}</div>
                  <div className="rec-meta">{time}</div>
                </div>
                <span className={'rec-badge ' + r.tipo}>{r.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  var filtered = recs.filter(function(r) {
    var empMatch  = !filtroEmp  || (r.empleados && r.empleados.id === filtroEmp)
    var tipoMatch = !filtroTipo || r.tipo === filtroTipo
    return empMatch && tipoMatch
  })

  function exportCSV() {
    var rows = filtered.map(function(r) {
      var d = new Date(r.timestamp)
      return [
        r.empleados ? r.empleados.nombre : '',
        r.empleados ? r.empleados.departamento : '',
        r.tipo,
        d.toLocaleDateString('es-PR'),
        d.toLocaleTimeString('es-PR'),
        r.latitud || '',
        r.longitud || ''
      ].join(',')
    })
    var csv = 'Nombre,Departamento,Tipo,Fecha,Hora,Latitud,Longitud\n' + rows.join('\n')
    var blob = new Blob([csv], { type: 'text/csv' })
    var url  = URL.createObjectURL(blob)
    var a    = document.createElement('a')
    a.href   = url
    a.download = 'registros.csv'
    a.click()
  }

  return (
    <div className="admin-screen">
      <h2 className="screen-title">Registros de asistencia</h2>
      <div className="filter-row">
        <select value={filtroEmp} onChange={function(e){ setFiltroEmp(e.target.value) }}>
          <option value="">Todos los empleados</option>
          {emps.map(function(e){ return <option key={e.id} value={e.id}>{e.nombre}</option> })}
        </select>
        <select value={filtroTipo} onChange={function(e){ setFiltroTipo(e.target.value) }}>
          <option value="">Todos los tipos</option>
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
        </select>
      </div>
      {loading && <div className="loading-bar" />}
      <div className="records-list">
        {filtered.length === 0 && !loading && <div className="empty-state">No hay registros</div>}
        {filtered.map(function(r) {
          var d    = new Date(r.timestamp)
          var date = d.toLocaleDateString('es-PR',{weekday:'short',month:'short',day:'numeric'})
          var time = d.toLocaleTimeString('es-PR',{hour:'2-digit',minute:'2-digit'})
          var ini  = r.empleados ? r.empleados.nombre.split(' ').map(function(w){return w[0]}).slice(0,2).join('') : '?'
          return (
            <div key={r.id} className="record-row">
              <div className="rec-avatar">{ini}</div>
              <div className="rec-info">
                <div className="rec-name">{r.empleados ? r.empleados.nombre : 'Desconocido'}</div>
                <div className="rec-meta">{r.empleados ? r.empleados.departamento : ''}</div>
              </div>
              <div className="rec-right">
                <div className="rec-time">{date} {time}</div>
                <span className={'rec-badge ' + r.tipo}>{r.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
                <button onClick={function(){ borrarRegistro(r.id) }}
                  style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:'rgba(216,90,48,.15)',border:'0.5px solid rgba(216,90,48,.3)',color:'#D85A30',cursor:'pointer',marginTop:4}}>
                  Borrar
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="export-row">
        <button className="export-btn" onClick={exportCSV}>Exportar CSV</button>
      </div>
    </div>
  )
}
