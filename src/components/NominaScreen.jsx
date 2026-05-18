import { useState, useEffect } from 'react'
import { calcularNomina, updateEmpleado } from '../lib/api'

const TASAS = {
  FICA:     0.062,
  MEDICARE: 0.0145,
}

function calcularDeducciones(bruto, contribucionPR) {
  const fica     = 0
  const medicare = Math.round(bruto * TASAS.MEDICARE * 100) / 100
  const contrib  = Math.round((contribucionPR || 0) * 100) / 100
  const totalDed = Math.round((fica + medicare + contrib) * 100) / 100
  const neto     = Math.round((bruto - totalDed) * 100) / 100
  return { fica, medicare, contrib, totalDed, neto }
}

export default function NominaScreen({ isAdmin }) {
  const [nomina,      setNomina]      = useState([])
const [periodoDesde, setPeriodoDesde] = useState('2026-05-01')
  const [periodoHasta, setPeriodoHasta] = useState('2026-05-14')
  const [loading,  setLoading]  = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [editRate, setEditRate] = useState('')
  const [pin,      setPin]      = useState('')
  const [empleado, setEmpleado] = useState(null)
  const [pinError, setPinError] = useState('')
  const [miNomina, setMiNomina] = useState(null)

  useEffect(function() { cargarFechas() }, [])

 async function cargarFechas() {
    try {
      const { getConfiguracion } = await import('../lib/api')
      const config = await getConfiguracion()
      const desde = config.nomina_desde || '2026-05-01'
      const hasta = config.nomina_hasta || '2026-05-14'
      console.log('FECHAS:', desde, hasta)
      setPeriodoDesde(desde)
      setPeriodoHasta(hasta)
      const data = await calcularNomina(desde + 'T00:00:00', hasta + 'T23:59:59')
      console.log('NOMINA DATA:', data)
      setNomina(data)
    } catch(e) { console.error('ERROR:', e) }
    finally { setLoading(false) }
  }
  }

  async function loadNomina() {
    setLoading(true)
    try {
    const data = await calcularNomina(periodoDesde + 'T00:00:00', periodoHasta + 'T23:59:59')
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
    const periodoLabel = periodoDesde + ' al ' + periodoHasta
    const fecha = now.toLocaleDateString('es-PR',{year:'numeric',month:'long',day:'numeric'})

    const rows = nomina.map(function(emp) {
      const ded = calcularDeducciones(emp.salarioTotal || 0, emp.contribucion_pr || 0)
      return '<tr><td>' + emp.nombre + '</td><td>' + emp.departamento + '</td><td>' + emp.horasReg + 'h</td><td>' + (emp.horasExtra > 0 ? emp.horasExtra+'h' : '-') + '</td><td>$' + (emp.tarifa_hora||0).toFixed(2) + '</td><td class="num">$' + (emp.salarioTotal||0).toFixed(2) + '</td><td class="num">$' + ded.fica.toFixed(2) + '</td><td class="num">$' + ded.medicare.toFixed(2) + '</td><td class="num">$' + ded.contrib.toFixed(2) + '</td><td class="num ded">$' + ded.totalDed.toFixed(2) + '</td><td class="num neto">$' + ded.neto.toFixed(2) + '</td></tr>'
    }).join('')

    const totalBruto = nomina.reduce(function(s,e){ return s+(e.salarioTotal||0) }, 0)
    const totales = nomina.reduce(function(s,e) {
      const d = calcularDeducciones(e.salarioTotal||0, e.contribucion_pr||0)
      return { fica: s.fica+d.fica, medicare: s.medicare+d.medicare, contrib: s.contrib+d.contrib, totalDed: s.totalDed+d.totalDed, neto: s.neto+d.neto }
    }, { fica:0, medicare:0, contrib:0, totalDed:0, neto:0 })

    const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Nomina</title><style>body{font-family:Arial,sans-serif;padding:30px;font-size:11px}h1{color:#0F6E56}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#0F6E56;color:white;padding:7px 6px;text-align:left}.num{text-align:right}td{padding:6px;border-bottom:0.5px solid #eee}.neto{font-weight:bold;color:#0F6E56}.ded{color:#D85A30}.totales td{font-weight:bold;border-top:2px solid #0F6E56;background:#E1F5EE}.resumen{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}.res{background:#F8F7F4;padding:10px;border-radius:8px}.res-lbl{font-size:10px;color:#888}.res-val{font-size:15px;font-weight:bold}</style></head><body>'
      + '<h1>VR Insurance Group - Nomina Quincenal</h1>'
      + '<p>Periodo: ' + periodoLabel + ' &nbsp;|&nbsp; Generado: ' + fecha + '</p>'
      + '<div class="resumen"><div class="res"><div class="res-lbl">Bruto Total</div><div class="res-val">$' + totalBruto.toFixed(2) + '</div></div><div class="res"><div class="res-lbl">Deducciones</div><div class="res-val" style="color:#D85A30">$' + totales.totalDed.toFixed(2) + '</div></div><div class="res"><div class="res-lbl">Neto Total</div><div class="res-val" style="color:#0F6E56">$' + totales.neto.toFixed(2) + '</div></div></div>'
      + '<table><thead><tr><th>Empleado</th><th>Depto</th><th>Hrs Reg</th><th>Hrs Extra</th><th>Tarifa</th><th class="num">Bruto</th><th class="num">FICA 6.2%</th><th class="num">Medicare 1.45%</th><th class="num">Contrib PR</th><th class="num">Total Ded</th><th class="num">Neto</th></tr></thead><tbody>' + rows
      + '<tr class="totales"><td colspan="5">TOTALES</td><td class="num">$' + totalBruto.toFixed(2) + '</td><td class="num">$' + totales.fica.toFixed(2) + '</td><td class="num">$' + totales.medicare.toFixed(2) + '</td><td class="num">$' + totales.contrib.toFixed(2) + '</td><td class="num ded">$' + totales.totalDed.toFixed(2) + '</td><td class="num neto">$' + totales.neto.toFixed(2) + '</td></tr>'
      + '</tbody></table></body></html>'

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    setTimeout(function(){ w.print() }, 500)
  }

  const KEYS = ['1','2','3','4','5','6','7','8','9','←','0','✓']

async function verificarPinEmp(p) {
    const { verificarPin } = await import('../lib/api')
    const emp = await verificarPin(p)
    setPin('')
    if (!emp) { setPinError('PIN incorrecto'); return }
    setPinError('')
    setEmpleado(emp)
    try {
      const { getConfiguracion } = await import('../lib/api')
      const config = await getConfiguracion()
      const desde = config.nomina_desde || '2026-05-01'
      const hasta = config.nomina_hasta || '2026-05-14'
      const datos = nomina.find(function(n){ return n.id === emp.id })
      setMiNomina(datos || null)
    } catch(e) { console.error(e) }
  }

  if (!isAdmin) {
    if (!empleado) return (
      <div className="punch-screen">
        <header className="punch-header">
          <div className="date-line">Mi nomina quincenal</div>
          <div style={{fontSize:14,color:'var(--gray-500)',marginTop:4}}>Ingresa tu PIN para ver tu pago</div>
        </header>
        <div className="pin-card">
          <p className="pin-label">Tu PIN de 4 digitos</p>
          <div className="pin-dots">
            {[0,1,2,3].map(function(i){ return <div key={i} className={'pin-dot ' + (i<pin.length?'filled':'')} /> })}
          </div>
          <div className="pin-grid">
            {KEYS.map(function(k){ return (
              <button key={k} className={'pin-key ' + (k==='✓'?'pin-confirm':k==='←'?'pin-del':'')}
                onClick={function() {
                  if (k==='←') { setPin(function(p){ return p.slice(0,-1) }); return }
                  if (k==='✓') { verificarPinEmp(pin); return }
                  if (pin.length<4) { var np=pin+k; setPin(np); if(np.length===4) setTimeout(function(){ verificarPinEmp(np) },200) }
                }}>{k}</button>
            )})}
          </div>
          {pinError && <div className="msg msg-error">{pinError}</div>}
        </div>
      </div>
    )

    const ded = miNomina ? calcularDeducciones(miNomina.salarioTotal||0, miNomina.contribucion_pr||0) : null
    return (
      <div className="nomina-screen">
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
          <div className="emp-avatar">{empleado.nombre.split(' ').map(function(w){return w[0]}).slice(0,2).join('')}</div>
          <div><div className="emp-name">{empleado.nombre}</div><div className="emp-dept">{empleado.departamento}</div></div>
          <button onClick={function(){setEmpleado(null);setMiNomina(null);setPinError('')}}
            style={{marginLeft:'auto',fontSize:12,padding:'4px 10px',borderRadius:8,border:'0.5px solid var(--gray-200)',background:'var(--gray-50)',cursor:'pointer',color:'var(--gray-500)'}}>
            Salir
          </button>
        </div>
        {!miNomina ? (
          <div className="empty-state">No hay datos de nomina para este periodo</div>
        ) : (
          <div className="nomina-card">
            <div className="nomina-rows">
              <div className="nomina-row"><span>Horas regulares</span><span>{miNomina.horasReg}h x ${(miNomina.tarifa_hora||0).toFixed(2)} = ${(miNomina.salarioReg||0).toFixed(2)}</span></div>
              {miNomina.horasExtra > 0 && <div className="nomina-row accent"><span>Horas extra (x1.5)</span><span>{miNomina.horasExtra}h = ${(miNomina.salarioExtra||0).toFixed(2)}</span></div>}
              <div className="nomina-row" style={{fontWeight:500}}><span>Salario bruto</span><span>${(miNomina.salarioTotal||0).toFixed(2)}</span></div>
            </div>
            <div className="nomina-rows" style={{marginTop:6,background:'#FFF5F5'}}>
              <div className="section-title" style={{marginBottom:6}}>Deducciones</div>
              <div className="nomina-row"><span>FICA (6.2%)</span><span style={{color:'#D85A30'}}>-${ded.fica.toFixed(2)}</span></div>
              <div className="nomina-row"><span>Medicare (1.45%)</span><span style={{color:'#D85A30'}}>-${ded.medicare.toFixed(2)}</span></div>
              {ded.contrib > 0 && <div className="nomina-row"><span>Contribucion PR</span><span style={{color:'#D85A30'}}>-${ded.contrib.toFixed(2)}</span></div>}
              <div className="nomina-row" style={{fontWeight:500}}><span>Total deducciones</span><span style={{color:'#D85A30'}}>-${ded.totalDed.toFixed(2)}</span></div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,padding:'12px',background:'#E1F5EE',borderRadius:'8px'}}>
              <span style={{fontSize:15,fontWeight:500,color:'#0F6E56'}}>Tu pago neto</span>
              <span style={{fontSize:22,fontWeight:700,color:'#0F6E56'}}>${ded.neto.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  const totalBruto = nomina.reduce(function(s,e){ return s+(e.salarioTotal||0) }, 0)
  const totalNeto  = nomina.reduce(function(s,e){ var d=calcularDeducciones(e.salarioTotal||0,e.contribucion_pr||0); return s+d.neto }, 0)

  return (
    <div className="nomina-screen">
      <h2 className="screen-title">Nomina bisemanal</h2>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
        <div>
          <label className="field-label">Desde</label>
          <input type="date" value={periodoDesde} onChange={function(e){ setPeriodoDesde(e.target.value); localStorage.setItem('nomina_desde', e.target.value) }}
            style={{width:'100%',padding:'8px 10px',borderRadius:'var(--radius-sm)',border:'0.5px solid var(--gray-200)',background:'var(--gray-50)',fontSize:13,fontFamily:'var(--font)',color:'var(--gray-900)'}} />
        </div>
        <div>
          <label className="field-label">Hasta</label>
          <input type="date" value={periodoHasta} onChange={function(e){setPeriodoHasta(e.target.value); localStorage.setItem('nomina_hasta', e.target.value)}}
            style={{width:'100%',padding:'8px 10px',borderRadius:'var(--radius-sm)',border:'0.5px solid var(--gray-200)',background:'var(--gray-50)',fontSize:13,fontFamily:'var(--font)',color:'var(--gray-900)'}} />
        </div>
      </div>
      <button onClick={async function(){ 
        try { 
          const { updateConfiguracion } = await import('../lib/api')
          await updateConfiguracion({ nomina_desde: periodoDesde, nomina_hasta: periodoHasta })
        } catch(e) { console.error(e) }
        loadNomina()
      }} style={{width:'100%',padding:'9px',borderRadius:'var(--radius-sm)',background:'var(--teal-400)',color:'var(--black)',border:'none',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'var(--font)',marginBottom:12}}>
        Calcular nomina
      </button>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-lbl">Bruto total</div><div className="stat-val">${totalBruto.toFixed(2)}</div></div>
        <div className="stat-card"><div className="stat-lbl">Neto total</div><div className="stat-val" style={{color:'#1D9E75'}}>${totalNeto.toFixed(2)}</div></div>
      </div>
      <div style={{background:'#FAEEDA',borderRadius:'8px',padding:'10px 14px',marginBottom:14,fontSize:12,color:'#633806'}}>
        Deducciones: Medicare 1.45% + Contribucion PR (cuando aplica)
      </div>
      {loading && <div className="loading-bar" />}
      <div className="nomina-list">
        {nomina.map(function(emp) {
          const ded = calcularDeducciones(emp.salarioTotal || 0, emp.contribucion_pr || 0)
          const ini = emp.nombre ? emp.nombre.split(' ').map(function(w){return w[0]}).slice(0,2).join('') : '?'
          return (
            <div key={emp.id} className="nomina-card">
              <div className="nomina-header">
                <div className="emp-avatar sm">{ini}</div>
                <div style={{flex:1}}><div className="emp-name">{emp.nombre}</div><div className="emp-dept">{emp.departamento}</div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:11,color:'#888'}}>Neto</div><div className="nomina-total">${ded.neto.toFixed(2)}</div></div>
              </div>
              <div className="nomina-rows">
                <div className="nomina-row"><span>Hrs regulares</span><span>{emp.horasReg}h x ${(emp.tarifa_hora||0).toFixed(2)} = ${(emp.salarioReg||0).toFixed(2)}</span></div>
                {emp.horasExtra > 0 && <div className="nomina-row accent"><span>Hrs extra x1.5</span><span>{emp.horasExtra}h = ${(emp.salarioExtra||0).toFixed(2)}</span></div>}
                <div className="nomina-row" style={{fontWeight:500}}><span>Salario bruto</span><span>${(emp.salarioTotal||0).toFixed(2)}</span></div>
              </div>
              <div className="nomina-rows" style={{marginTop:6,background:'#FFF5F5'}}>
                <div className="section-title" style={{marginBottom:6}}>Deducciones</div>
                <div className="nomina-row"><span>FICA (6.2%)</span><span style={{color:'#D85A30'}}>-${ded.fica.toFixed(2)}</span></div>
                <div className="nomina-row"><span>Medicare (1.45%)</span><span style={{color:'#D85A30'}}>-${ded.medicare.toFixed(2)}</span></div>
                {ded.contrib > 0 && <div className="nomina-row"><span>Contribucion PR</span><span style={{color:'#D85A30'}}>-${ded.contrib.toFixed(2)}</span></div>}
                <div className="nomina-row" style={{fontWeight:500}}><span>Total deducciones</span><span style={{color:'#D85A30'}}>-${ded.totalDed.toFixed(2)}</span></div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,padding:'10px 12px',background:'#E1F5EE',borderRadius:'8px'}}>
                <span style={{fontSize:14,fontWeight:500,color:'#0F6E56'}}>Salario neto</span>
                <span style={{fontSize:18,fontWeight:600,color:'#0F6E56'}}>${ded.neto.toFixed(2)}</span>
              </div>
              <div style={{marginTop:8}}>
                {editId===emp.id ? (
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <span style={{fontSize:12,color:'#888'}}>Tarifa:</span>
                    <input type="number" value={editRate} onChange={function(e){setEditRate(e.target.value)}} style={{width:65,padding:'3px 6px',borderRadius:6,border:'0.5px solid #ddd',fontSize:12}} />
                    <button onClick={function(){saveRate(emp.id)}} style={{fontSize:11,padding:'3px 8px',borderRadius:6,background:'#1D9E75',color:'white',border:'none',cursor:'pointer'}}>Guardar</button>
                    <button onClick={function(){setEditId(null)}} style={{fontSize:11,padding:'3px 8px',borderRadius:6,background:'#eee',border:'none',cursor:'pointer'}}>X</button>
                  </div>
                ) : (
                  <button onClick={function(){setEditId(emp.id);setEditRate(emp.tarifa_hora||0)}} style={{fontSize:12,padding:'3px 10px',borderRadius:6,background:'#F8F7F4',border:'0.5px solid #ddd',cursor:'pointer'}}>
                    Tarifa: ${(emp.tarifa_hora||0).toFixed(2)}/hr - Editar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <button className="abtn" style={{marginTop:8,width:'100%',padding:13,borderRadius:12,background:'#1D7A35',color:'white',border:'none',fontSize:15,fontWeight:500,cursor:'pointer',fontFamily:'var(--font)'}} onClick={function(){
        var headers='Empleado,Departamento,Hrs Reg,Hrs Extra,Tarifa,Bruto,FICA,Medicare,Contrib PR,Total Ded,Neto\n'
        var rows=nomina.map(function(e){
          var b=e.salarioTotal||0
          var d=calcularDeducciones(b,e.contribucion_pr||0)
          return [e.nombre,e.departamento,e.horasReg,e.horasExtra,(e.tarifa_hora||0).toFixed(2),b.toFixed(2),d.fica.toFixed(2),d.medicare.toFixed(2),d.contrib.toFixed(2),d.totalDed.toFixed(2),d.neto.toFixed(2)].join(',')
        }).join('\n')
        var blob=new Blob(['\uFEFF'+headers+rows],{type:'text/csv;charset=utf-8;'})
        var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download='nomina_'+new Date().toISOString().split('T')[0]+'.csv';a.click()
      }}>Exportar Excel (.csv)</button>
      <button className="abtn btn-in" style={{marginTop:8}} onClick={exportPDF}>Exportar PDF con deducciones</button>
    </div>
  )
}
