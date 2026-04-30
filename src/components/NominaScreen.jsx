import { useState, useEffect } from 'react'
import { calcularNomina, getEmpleados, updateEmpleado } from '../lib/api'

export default function NominaScreen() {
  const [periodo,  setPeriodo]  = useState('semana')
  const [nomina,   setNomina]   = useState([])
  const [loading,  setLoading]  = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [editRate, setEditRate] = useState('')

  useEffect(() => { loadNomina() }, [periodo])

  async function loadNomina() {
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
      const data = await calcularNomina(desde, new Date().toISOString())
      setNomina(data)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function saveRate(id) {
    await updateEmpleado(id, { tarifa_hora: parseFloat(editRate) || 0 })
    setEditId(null)
    loadNomina()
  }

  function exportPDF() {
    const rows = nomina.map(e =>
      `<tr>
        <td>${e.nombre}</td><td>${e.departamento}</td>
        <td>${e.horasReg}h</td><td>${e.horasExtra}h</td>
        <td>$${e.tarifa_hora?.toFixed(2) ?? '0.00'}/h</td>
        <td>$${e.salarioReg?.toFixed(2) ?? '0.00'}</td>
        <td>$${e.salarioExtra?.toFixed(2) ?? '0.00'}</td>
        <td><strong>$${e.salarioTotal?.toFixed(2) ?? '0.00'}</strong></td>
      </tr>`
    ).join('')

    const total = nomina.reduce((s, e) => s + (e.salarioTotal || 0), 0)
    const periodoLabel = periodo === 'semana' ? 'Esta semana' : 'Este mes'
    const fecha = new Date().toLocaleDateString('es-PR', { year:'numeric', month:'long', day:'numeric' })

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Reporte de Nómina</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; color: #1A1A18; }
      h1 { color: #0F6E56; margin-bottom: 4px; }
      .sub { color: #888; font-size: 14px; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #0F6E56; color: white; padding: 10px 8px; text-align: left; }
      td { padding: 8px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #F8F7F4; }
      .total-row td { font-weight: bold; border-top: 2px solid #0F6E56; padding-top: 12px; }
      .footer { margin-top: 32px; font-size: 12px; color: #888; }
    </style></head><body>
    <h1>Reporte de Nómina</h1>
    <div class="sub">${periodoLabel} · Generado el ${fecha}</div>
    <table>
      <thead><tr>
        <th>Empleado</th><th>Departamento</th><th>Hrs regulares</th><th>Hrs extra</th>
        <th>Tarifa</th><th>Salario regular</th><th>Salario extra</th><th>Total</th>
      </tr></thead>
      <tbody>${rows}
        <tr class="total-row">
          <td colspan="7">TOTAL NÓMINA</td>
          <td>$${total.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    <div class="footer">VR Insurance Group · Sistema de Control de Asistencia</div>
    </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.print()
  }

  const totalNomina = nomina.reduce((s, e) => s + (e.salarioTotal || 0), 0)

  return (
    <div className="nomina-screen">
      <h2 className="screen-title">Reporte de nómina</h2>

      <div className="tab-bar">
        {['semana','mes'].map(p => (
          <button key={p} className={`tab ${periodo===p?'active':''}`} onClick={() => setPeriodo(p)}>
            {p === 'semana' ? 'Esta semana' : 'Este mes'}
          </button>
        ))}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-lbl">Total nómina</div>
          <div className="stat-val">${totalNomina.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-lbl">Empleados</div>
          <div className="stat-val">{nomina.length}</div>
        </div>
      </div>

      {loading && <div className="loading-bar" />}

      <div className="nomina-list">
        {nomina.map(emp => {
          const ini = emp.nombre?.split(' ').map(w=>w[0]).slice(0,2).join('') ?? '?'
          return (
            <div key={emp.id} className="nomina-card">
              <div className="nomina-header">
                <div className="emp-avatar sm">{ini}</div>
                <div style={{ flex:1 }}>
                  <div className="emp-name">{emp.nombre}</div>
                  <div className="emp-dept">{emp.departamento}</div>
                </div>
                <div className="nomina-total">${(emp.salarioTotal || 0).toFixed(2)}</div>
              </div>
              <div className="nomina-rows">
                <div className="nomina-row"><span>Horas regulares</span><span>{emp.horasReg}h × ${(emp.tarifa_hora||0).toFixed(2)} = ${(emp.salarioReg||0).toFixed(2)}</span></div>
                {emp.horasExtra > 0 && <div className="nomina-row accent"><span>Horas extra (×1.5)</span><span>{emp.horasExtra}h = ${(emp.salarioExtra||0).toFixed(2)}</span></div>}
                <div className="nomina-row">
                  <span>Tarifa/hora</span>
                  {editId === emp.id ? (
                    <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                      <input type="number" value={editRate} onChange={e=>setEditRate(e.target.value)}
                        style={{ width:70, padding:'4px 8px', borderRadius:6, border:'0.5px solid var(--color-border-secondary)', background:'var(--color-background-secondary)', fontSize:13 }} />
                      <button onClick={() => saveRate(emp.id)} style={{ fontSize:12, padding:'4px 10px', borderRadius:6, background:'#1D9E75', color:'#E1F5EE', border:'none', cursor:'pointer' }}>Guardar</button>
                      <button onClick={() => setEditId(null)} style={{ fontSize:12, padding:'4px 10px', borderRadius:6, background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', cursor:'pointer' }}>×</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditId(emp.id); setEditRate(emp.tarifa_hora||0) }}
                      style={{ fontSize:12, padding:'4px 10px', borderRadius:6, background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-secondary)', cursor:'pointer' }}>
                      ${(emp.tarifa_hora||0).toFixed(2)} ✏️
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button className="abtn btn-in" style={{ marginTop:12 }} onClick={exportPDF}>
        Exportar PDF con nómina completa ↗
      </button>
    </div>
  )
}
