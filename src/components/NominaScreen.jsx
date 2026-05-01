import { useState, useEffect } from 'react'
import { calcularNomina, getEmpleados, updateEmpleado } from '../lib/api'

// ── Tasas de Puerto Rico 2024 ─────────────────────────────
const TASAS = {
  FICA:      0.062,   // Social Security 6.2%
  MEDICARE:  0.0145,  // Medicare 1.45%
}

// Tabla de contribución de PR (por quincena) - 2024
// Basado en tablas de Hacienda PR para soltero/casado
function calcularContribucion(salarioBrutoQuincenal, exenciones = 1) {
  const anual = salarioBrutoQuincenal * 24
  const exencionAnual = exenciones * 4500
  const ingresoCobrable = Math.max(0, anual - exencionAnual)

  let contribucionAnual = 0
  if (ingresoCobrable <= 9000)        contribucionAnual = ingresoCobrable * 0.07
  else if (ingresoCobrable <= 25000)  contribucionAnual = 630  + (ingresoCobrable - 9000)  * 0.14
  else if (ingresoCobrable <= 41500)  contribucionAnual = 2870 + (ingresoCobrable - 25000) * 0.25
  else if (ingresoCobrable <= 61500)  contribucionAnual = 7000 + (ingresoCobrable - 41500) * 0.33
  else                                contribucionAnual = 13600 + (ingresoCobrable - 61500) * 0.337

  return Math.max(0, contribucionAnual / 24)
}

function calcularDeducciones(salarioBruto, exenciones = 1) {
  const fica      = salarioBruto * TASAS.FICA
  const medicare  = salarioBruto * TASAS.MEDICARE
  const contrib   = calcularContribucion(salarioBruto, exenciones)
  const neto      = salarioBruto - totalDed

  return {
    fica:     Math.round(fica * 100) / 100,
    medicare: Math.round(medicare * 100) / 100,
    contrib:  Math.round(contrib * 100) / 100,
    totalDed: Math.round(totalDed * 100) / 100,
    neto:     Math.round(neto * 100) / 100,
  }
}

export default function NominaScreen() {
  const [nomina,   setNomina]   = useState([])
  const [loading,  setLoading]  = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [editRate, setEditRate] = useState('')
  const [editExe,  setEditExe]  = useState(1)

  useEffect(() => { loadNomina() }, [])

  async function loadNomina() {
    setLoading(true)
    try {
      const now = new Date()
      // Período quincenal: del 1-15 o 16-fin de mes
      const dia = now.getDate()
      let desde, hasta
      if (dia <= 15) {
        desde = new Date(now.getFullYear(), now.getMonth(), 1)
        hasta = new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59)
      } else {
        desde = new Date(now.getFullYear(), now.getMonth(), 16)
        hasta = new Date(now.getFullYear(), now.getMonth()+1, 0, 23, 59, 59)
      }
      const data = await calcularNomina(desde.toISOString(), hasta.toISOString())
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
    const now = new Date()
    const dia = now.getDate()
    const periodoLabel = dia <= 15
      ? `1-15 de ${now.toLocaleDateString('es-PR',{month:'long',year:'numeric'})}`
      : `16-${new Date(now.getFullYear(),now.getMonth()+1,0).getDate()} de ${now.toLocaleDateString('es-PR',{month:'long',year:'numeric'})}`
    const fecha = now.toLocaleDateString('es-PR',{year:'numeric',month:'long',day:'numeric'})

    const rows = nomina.map(emp => {
      const ded = calcularDeducciones(emp.salarioTotal || 0, emp.exenciones || 1)
      return `
        <tr>
          <td>${emp.nombre}</td>
          <td>${emp.departamento}</td>
          <td>${emp.horasReg}h</td>
          <td>${emp.horasExtra > 0 ? emp.horasExtra+'h' : '—'}</td>
          <td>$${(emp.tarifa_hora||0).toFixed(2)}</td>
          <td class="num">$${(emp.salarioTotal||0).toFixed(2)}</td>
          <td class="num">$${ded.fica.toFixed(2)}</td>
          <td class="num">$${ded.medicare.toFixed(2)}</td>
          <td class="num">$${ded.contrib.toFixed(2)}</td>
          <td class="num ded">$${ded.totalDed.toFixed(2)}</td>
          <td class="num neto">$${ded.neto.toFixed(2)}</td>
        </tr>`
    }).join('')

    const totalBruto = nomina.reduce((s,e) => s+(e.salarioTotal||0), 0)
    const totDed = nomina.reduce((s,e) => {
      const d = calcularDeducciones(e.salarioTotal||0, e.exenciones||1)
      return {
        fica:     s.fica     + d.fica,
        medicare: s.medicare + d.medicare,
        contrib:  s.contrib  + d.contrib,
        totalDed: s.totalDed + d.totalDed,
        neto:     s.neto     + d.neto,
      }

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Nómina ${periodoLabel}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; padding: 30px; color: #1A1A18; font-size: 11px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #0F6E56; padding-bottom: 12px; }
      .company { font-size: 18px; font-weight: bold; color: #0F6E56; }
      .sub { font-size: 12px; color: #888; margin-top: 2px; }
      .periodo { text-align: right; }
      .periodo-label { font-size: 13px; font-weight: bold; color: #0F6E56; }
      .resumen { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
      .res-card { background: #F8F7F4; border-radius: 8px; padding: 10px 14px; }
      .res-lbl { font-size: 10px; color: #888; margin-bottom: 2px; }
      .res-val { font-size: 16px; font-weight: bold; color: #1A1A18; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background: #0F6E56; color: white; padding: 7px 6px; text-align: left; white-space: nowrap; }
      th.num, td.num { text-align: right; }
      td { padding: 6px; border-bottom: 0.5px solid #EDEDEA; }
      tr:nth-child(even) td { background: #F8F7F4; }
      td.neto { font-weight: bold; color: #0F6E56; }
      td.ded  { color: #D85A30; }
      .totales td { font-weight: bold; border-top: 2px solid #0F6E56; background: #E1F5EE !important; }
      .section-title { font-size: 12px; font-weight: bold; color: #444; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .04em; }
      .tasas { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 20px; font-size: 10px; }
      .tasa-card { background: #FFF8E1; border-radius: 6px; padding: 8px; text-align: center; }
      .tasa-nombre { color: #888; margin-bottom: 2px; }
      .tasa-pct { font-weight: bold; color: #633806; font-size: 13px; }
      .footer { margin-top: 24px; font-size: 10px; color: #888; border-top: 0.5px solid #eee; padding-top: 10px; display: flex; justify-content: space-between; }
      .firma { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
      .firma-line { border-top: 1px solid #444; padding-top: 6px; text-align: center; font-size: 10px; color: #888; }
    </style></head><body>

    <div class="header">
      <div>
        <div class="company">VR Insurance Group</div>
        <div class="sub">Reporte de Nómina Quincenal</div>
      </div>
      <div class="periodo">
        <div class="periodo-label">Período: ${periodoLabel}</div>
        <div class="sub">Generado: ${fecha}</div>
      </div>
    </div>

    <div class="resumen">
      <div class="res-card"><div class="res-lbl">Total Salario Bruto</div><div class="res-val">$${totalBruto.toFixed(2)}</div></div>
      <div class="res-card"><div class="res-lbl">Total Deducciones</div><div class="res-val" style="color:#D85A30">$${totDed.totalDed.toFixed(2)}</div></div>
      <div class="res-card"><div class="res-lbl">Total Salario Neto</div><div class="res-val" style="color:#0F6E56">$${totDed.neto.toFixed(2)}</div></div>
    </div>

    <div class="section-title" style="margin-bottom:8px">Tasas aplicadas</div>
    <div class="tasas">
      <div class="tasa-card"><div class="tasa-nombre">FICA</div><div class="tasa-pct">6.20%</div></div>
      <div class="tasa-card"><div class="tasa-nombre">Medicare</div><div class="tasa-pct">1.45%</div></div>
      <div class="tasa-card"><div class="tasa-nombre">Contribución PR</div><div class="tasa-pct">Variable</div></div>
    </div>

    <div class="section-title">Detalle por empleado</div>
    <table>
      <thead><tr>
        <th>Empleado</th><th>Depto.</th><th>Hrs Reg.</th><th>Hrs Extra</th><th>Tarifa</th>
        <th class="num">Bruto</th>
        <th class="num">FICA</th><th class="num">Medicare</th>
        <th class="num">Contrib. PR</th>
        <th class="num">Total Ded.</th>
        <th class="num">Neto</th>
      </tr></thead>
      <tbody>
        ${rows}
        <tr class="totales">
          <td colspan="5">TOTALES</td>
          <td class="num">$${totalBruto.toFixed(2)}</td>
          <td class="num">$${totDed.fica.toFixed(2)}</td>
          <td class="num">$${totDed.medicare.toFixed(2)}</td>
          <td class="num">$${totDed.contrib.toFixed(2)}</td>
          <td class="num ded">$${totDed.totalDed.toFixed(2)}</td>
          <td class="num neto">$${totDed.neto.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="firma">
      <div class="firma-line">Preparado por / Contable</div>
      <div class="firma-line">Aprobado por / Administrador</div>
    </div>

    <div class="footer">
      <span>VR Insurance Group · Sistema de Control de Asistencia</span>
    </div>
    </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 500)
  }

  const totalBruto = nomina.reduce((s,e) => s+(e.salarioTotal||0), 0)
  const totalNeto  = nomina.reduce((s,e) => {
    const d = calcularDeducciones(e.salarioTotal||0, e.exenciones||1)
    return s + d.neto
  }, 0)
  const totalDed = totalBruto - totalNeto

  return (
    <div className="nomina-screen">
      <h2 className="screen-title">Nómina quincenal</h2>

      <div className="stat-grid">
        <div className="stat-card"><div className="stat-lbl">Bruto total</div><div className="stat-val">${totalBruto.toFixed(2)}</div></div>
        <div className="stat-card"><div className="stat-lbl">Neto total</div><div className="stat-val" style={{color:'#1D9E75'}}>${totalNeto.toFixed(2)}</div></div>
      </div>

      <div style={{background:'#FAEEDA',borderRadius:'var(--border-radius-md)',padding:'10px 14px',marginBottom:14,fontSize:12,color:'#633806'}}>
      </div>

      {loading && <div className="loading-bar" />}

      <div className="nomina-list">
        {nomina.map(emp => {
          const ded = calcularDeducciones(emp.salarioTotal || 0, emp.exenciones || 1)
          const ini = emp.nombre?.split(' ').map(w=>w[0]).slice(0,2).join('') ?? '?'
          return (
            <div key={emp.id} className="nomina-card">
              <div className="nomina-header">
                <div className="emp-avatar sm">{ini}</div>
                <div style={{flex:1}}>
                  <div className="emp-name">{emp.nombre}</div>
                  <div className="emp-dept">{emp.departamento}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,color:'var(--gray-500)'}}>Neto</div>
                  <div className="nomina-total">${ded.neto.toFixed(2)}</div>
                </div>
              </div>

              <div className="nomina-rows">
                <div className="nomina-row">
                  <span>Horas regulares</span>
                  <span>{emp.horasReg}h × ${(emp.tarifa_hora||0).toFixed(2)} = ${(emp.salarioReg||0).toFixed(2)}</span>
                </div>
                {emp.horasExtra > 0 && (
                  <div className="nomina-row accent">
                    <span>Horas extra (×1.5)</span>
                    <span>{emp.horasExtra}h = ${(emp.salarioExtra||0).toFixed(2)}</span>
                  </div>
                )}
                <div className="nomina-row" style={{fontWeight:500,borderTop:'0.5px solid var(--gray-200)',paddingTop:4,marginTop:2}}>
                  <span>Salario bruto</span>
                  <span>${(emp.salarioTotal||0).toFixed(2)}</span>
                </div>
              </div>

              <div className="nomina-rows" style={{marginTop:6,background:'#FFF5F5'}}>
                <div className="section-title" style={{marginBottom:6}}>Deducciones</div>
                <div className="nomina-row"><span>FICA (6.2%)</span><span style={{color:'#D85A30'}}>-${ded.fica.toFixed(2)}</span></div>
                <div className="nomina-row"><span>Medicare (1.45%)</span><span style={{color:'#D85A30'}}>-${ded.medicare.toFixed(2)}</span></div>
                <div className="nomina-row"><span>Contribución PR</span><span style={{color:'#D85A30'}}>-${ded.contrib.toFixed(2)}</span></div>
                <div className="nomina-row" style={{fontWeight:500,borderTop:'0.5px solid var(--gray-200)',paddingTop:4,marginTop:2}}>
                  <span>Total deducciones</span>
                  <span style={{color:'#D85A30'}}>-${ded.totalDed.toFixed(2)}</span>
                </div>
              </div>

              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,padding:'10px 12px',background:'#E1F5EE',borderRadius:'var(--border-radius-md)'}}>
                <span style={{fontSize:14,fontWeight:500,color:'#0F6E56'}}>Salario neto</span>
                <span style={{fontSize:18,fontWeight:600,color:'#0F6E56'}}>${ded.neto.toFixed(2)}</span>
              </div>

              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:8}}>
                <span style={{fontSize:12,color:'var(--gray-500)'}}>
                  Tarifa: {editId===emp.id ? (
                    <span style={{display:'inline-flex',gap:6,alignItems:'center'}}>
                      <input type="number" value={editRate} onChange={e=>setEditRate(e.target.value)}
                        style={{width:65,padding:'3px 6px',borderRadius:6,border:'0.5px solid var(--gray-200)',fontSize:12}} />
                      <button onClick={()=>saveRate(emp.id)} style={{fontSize:11,padding:'3px 8px',borderRadius:6,background:'#1D9E75',color:'#E1F5EE',border:'none',cursor:'pointer'}}>✓</button>
                      <button onClick={()=>setEditId(null)} style={{fontSize:11,padding:'3px 8px',borderRadius:6,background:'var(--gray-100)',border:'none',cursor:'pointer'}}>✕</button>
                    </span>
                  ) : (
                    <button onClick={()=>{setEditId(emp.id);setEditRate(emp.tarifa_hora||0)}}
                      style={{fontSize:12,padding:'2px 8px',borderRadius:6,background:'var(--gray-50)',border:'0.5px solid var(--gray-200)',cursor:'pointer'}}>
                      ${(emp.tarifa_hora||0).toFixed(2)}/hr ✏️
                    </button>
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <button className="abtn btn-in" style={{marginTop:16}} onClick={exportPDF}>
        Exportar PDF nómina completa con deducciones ↗
      </button>
    </div>
  )
}
