import { useState, useEffect } from 'react'
import { getEmpleados, updateEmpleado } from '../lib/api'
import { supabase } from '../lib/supabase'

const EMPTY_FORM = { nombre:'', departamento:'', pin_hash:'', horas_meta:8, tarifa_hora:0, contribucion_pr:0 }
export default function EmpleadosScreen() {
  const [empleados, setEmpleados] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [seccion,   setSeccion]   = useState('lista')
  const [editEmp,   setEditEmp]   = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [msg,       setMsg]       = useState(null)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { loadEmpleados() }, [])

  async function loadEmpleados() {
    setLoading(true)
    try {
      const { data } = await supabase.from('empleados')
        .select('id, nombre, departamento, pin_hash, horas_meta, tarifa_hora, activo, geofencing_exento')
        .order('nombre')
      setEmpleados(data || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  function abrirNuevo() {
    setEditEmp(null)
    setForm(EMPTY_FORM)
    setMsg(null)
    setSeccion('form')
  }

  function abrirEditar(emp) {
    setEditEmp(emp)
    setForm({
      nombre: emp.nombre,
      departamento: emp.departamento,
      pin_hash: emp.pin_hash,
      horas_meta: emp.horas_meta || 8,
      tarifa_hora: emp.tarifa_hora || 0,
      contribucion_pr: emp.contribucion_pr || 0,
    })
    setMsg(null)
    setSeccion('form')
  }

  async function guardar() {
    if (!form.nombre || !form.departamento || !form.pin_hash) {
      setMsg({ text: 'Nombre, departamento y PIN son requeridos', type: 'error' }); return
    }
    if (form.pin_hash.length !== 4 || !/^\d{4}$/.test(form.pin_hash)) {
      setMsg({ text: 'El PIN debe ser exactamente 4 digitos', type: 'error' }); return
    }
    setSaving(true)
    try {
      if (editEmp) {
        await supabase.from('empleados').update({
          nombre: form.nombre,
          departamento: form.departamento,
          pin_hash: form.pin_hash,
          horas_meta: parseFloat(form.horas_meta) || 8,
          tarifa_hora: parseFloat(form.tarifa_hora) || 0,
          contribucion_pr: parseFloat(form.contribucion_pr) || 0,
        }).eq('id', editEmp.id)
        setMsg({ text: 'Empleado actualizado correctamente', type: 'ok' })
      } else {
        await supabase.from('empleados').insert({
          nombre: form.nombre,
          departamento: form.departamento,
          pin_hash: form.pin_hash,
          horas_meta: parseFloat(form.horas_meta) || 8,
          tarifa_hora: parseFloat(form.tarifa_hora) || 0,
          activo: true,
        })
        setMsg({ text: 'Empleado creado correctamente', type: 'ok' })
      }
      await loadEmpleados()
      setTimeout(function() { setSeccion('lista'); setMsg(null) }, 1500)
    } catch(e) {
      setMsg({ text: 'Error al guardar. Intenta de nuevo.', type: 'error' })
    } finally { setSaving(false) }
  }

  async function toggleActivo(emp) {
    try {
      await supabase.from('empleados').update({ activo: !emp.activo }).eq('id', emp.id)
      await loadEmpleados()
    } catch(e) { console.error(e) }
  }

  const activos   = empleados.filter(function(e) { return e.activo })
  const inactivos = empleados.filter(function(e) { return !e.activo })

  return (
    <div style={{padding:'0 0 1rem'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
        <h2 className="screen-title" style={{margin:0}}>Empleados</h2>
        {seccion === 'lista' && (
          <button onClick={abrirNuevo}
            style={{padding:'8px 14px',borderRadius:'var(--border-radius-md)',background:'var(--teal-400)',color:'var(--teal-50)',border:'none',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'var(--font)'}}>
            + Nuevo
          </button>
        )}
        {seccion === 'form' && (
          <button onClick={function(){setSeccion('lista');setMsg(null)}}
            style={{padding:'8px 14px',borderRadius:'var(--border-radius-md)',background:'var(--gray-50)',color:'var(--gray-700)',border:'0.5px solid var(--gray-200)',fontSize:13,cursor:'pointer',fontFamily:'var(--font)'}}>
            ← Volver
          </button>
        )}
      </div>

      {seccion === 'lista' && (
        <div>
          {loading && <div className="loading-bar" />}
          <div className="section-title" style={{marginBottom:8}}>Activos ({activos.length})</div>
          <div className="records-list" style={{marginBottom:16}}>
            {activos.map(function(emp) {
              const ini = emp.nombre.split(' ').map(function(w){return w[0]}).slice(0,2).join('')
              return (
                <div key={emp.id} className="record-row">
                  <div className="rec-avatar" style={{background:'var(--teal-50)',color:'var(--teal-600)'}}>{ini}</div>
                  <div className="rec-info">
                    <div className="rec-name">{emp.nombre}</div>
                    <div className="rec-meta">{emp.departamento} · PIN: {emp.pin_hash} · ${(emp.tarifa_hora||0).toFixed(2)}/hr</div>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={function(){abrirEditar(emp)}}
                      style={{fontSize:11,padding:'4px 8px',borderRadius:6,background:'var(--teal-50)',border:'0.5px solid var(--teal-100)',color:'var(--teal-600)',cursor:'pointer'}}>
                      ✏️
                    </button>
                    <button onClick={function(){toggleActivo(emp)}}
                      style={{fontSize:11,padding:'4px 8px',borderRadius:6,background:'var(--coral-50)',border:'0.5px solid var(--coral-50)',color:'var(--coral-400)',cursor:'pointer'}}>
                      🚫
                    </button>
                  </div>
                </div>
              )
            })}
            {activos.length === 0 && !loading && <div className="empty-state">No hay empleados activos</div>}
          </div>

          {inactivos.length > 0 && (
            <div>
              <div className="section-title" style={{marginBottom:8}}>Inactivos ({inactivos.length})</div>
              <div className="records-list">
                {inactivos.map(function(emp) {
                  const ini = emp.nombre.split(' ').map(function(w){return w[0]}).slice(0,2).join('')
                  return (
                    <div key={emp.id} className="record-row" style={{opacity:0.6}}>
                      <div className="rec-avatar" style={{background:'var(--gray-100)',color:'var(--gray-500)'}}>{ini}</div>
                      <div className="rec-info">
                        <div className="rec-name">{emp.nombre}</div>
                        <div className="rec-meta">{emp.departamento}</div>
                      </div>
                      <button onClick={function(){toggleActivo(emp)}}
                        style={{fontSize:11,padding:'4px 8px',borderRadius:6,background:'var(--teal-50)',border:'0.5px solid var(--teal-100)',color:'var(--teal-600)',cursor:'pointer'}}>
                        Activar
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {seccion === 'form' && (
        <div className="nomina-card">
          <div className="section-title" style={{marginBottom:14}}>
            {editEmp ? 'Editar empleado' : 'Nuevo empleado'}
          </div>

          <label className="field-label">Nombre completo</label>
          <input type="text" placeholder="Nombre Apellido" value={form.nombre}
            onChange={function(e){setForm(function(f){return {...f,nombre:e.target.value}})}}
            className="text-input" />

          <label className="field-label">Departamento</label>
          <input type="text" placeholder="Ventas, IT, Administracion..." value={form.departamento}
            onChange={function(e){setForm(function(f){return {...f,departamento:e.target.value}})}}
            className="text-input" />

          <label className="field-label">PIN de 4 digitos</label>
          <input type="text" placeholder="1234" maxLength={4} value={form.pin_hash}
            onChange={function(e){setForm(function(f){return {...f,pin_hash:e.target.value.replace(/\D/g,'')}})}}
            className="text-input" style={{fontFamily:'monospace',letterSpacing:4,fontSize:18}} />

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <div>
              <label className="field-label">Horas meta/dia</label>
              <input type="number" value={form.horas_meta} min={1} max={24}
                onChange={function(e){setForm(function(f){return {...f,horas_meta:e.target.value}})}}
                className="text-input" />
            </div>
            <div>
              <label className="field-label">Tarifa por hora ($)</label>
              <input type="number" value={form.tarifa_hora} min={0} step={0.25}
                onChange={function(e){setForm(function(f){return {...f,tarifa_hora:e.target.value}})}}
                className="text-input" />
            </div>
<div>
  <label className="field-label">Contribución PR ($)</label>
  <input type="number" value={form.contribucion_pr} min={0} step={0.01}
    onChange={function(e){setForm(function(f){return {...f,contribucion_pr:e.target.value}})}}
    className="text-input" placeholder="0.00" />
</div>

          </div>

          {msg && <div className={"msg msg-" + msg.type}>{msg.text}</div>}

          <button className="punch-btn btn-in" onClick={guardar} disabled={saving} style={{marginTop:8}}>
            {saving ? 'Guardando...' : editEmp ? 'Guardar cambios' : 'Crear empleado'}
          </button>
        </div>
      )}
    </div>
  )
}
