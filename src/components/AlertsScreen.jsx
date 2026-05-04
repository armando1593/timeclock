import { useState, useEffect } from 'react'
import { getEmpleados, getRegistros, getConfiguracion, updateConfiguracion } from '../lib/api'

export default function AlertsScreen({ onNotifCount }) {
  const [alertas,    setAlertas]    = useState([])
  const [horaLimite, setHoraLimite] = useState('09:00')
  const [emailAdmin, setEmailAdmin] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)

  useEffect(() => {
    getConfiguracion().then(c => {
      if (c.hora_limite) setHoraLimite(c.hora_limite.slice(0,5))
      if (c.email_alertas) setEmailAdmin(c.email_alertas)
    }).catch(console.error)
    checkTardanzas()
  }, [])

  useEffect(() => { onNotifCount?.(alertas.length) }, [alertas])

  async function checkTardanzas() {
    try {
      const [emps, config] = await Promise.all([getEmpleados(), getConfiguracion()])
      const hoy = new Date(); hoy.setUTCHours(4,0,0,0)
      const recs = await getRegistros({ desde: hoy.toISOString() })
      const [lh, lm] = (config.hora_limite ?? '09:00').slice(0,5).split(':').map(Number)
      const limite = new Date(); limite.setUTCHours(lh + 4, lm, 1, 0)

      const nuevasAlertas = []
      emps.forEach(emp => {
        const entradasEmp = recs.filter(r => r.empleados?.id === emp.id && r.tipo === 'entrada')
        const punchIn = entradasEmp.length > 0 ? entradasEmp[entradasEmp.length - 1] : null {
          nuevasAlertas.push({ tipo: 'ausente', nombre: emp.nombre, dept: emp.departamento, hora: null })
        } else {
          const t = new Date(punchIn.timestamp)
          if (t > limite) {
            nuevasAlertas.push({ tipo: 'tarde', nombre: emp.nombre, dept: emp.departamento,
              hora: t.toLocaleTimeString('es-PR', { hour:'2-digit', minute:'2-digit' }) })
          }
        }
      })
      setAlertas(nuevasAlertas)
    } catch (e) { console.error(e) }
  }

  async function saveConfig() {
    setSaving(true)
    try {
      await updateConfiguracion({ hora_limite: horaLimite + ':00', email_alertas: emailAdmin })
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  return (
    <div className="alerts-screen">
      <h2 className="screen-title">Alertas y notificaciones</h2>

      <div className="config-card">
        <div className="config-title">Configuración de alertas</div>
        <label className="field-label">Hora límite de entrada</label>
        <input type="time" value={horaLimite} onChange={e => setHoraLimite(e.target.value)} className="time-input" />
        <label className="field-label" style={{ marginTop: 12 }}>Email para alertas</label>
        <input type="email" value={emailAdmin} onChange={e => setEmailAdmin(e.target.value)}
          placeholder="admin@empresa.com" className="text-input" />
        <button className="save-btn" onClick={saveConfig} disabled={saving}>
          {saving ? 'Guardando...' : saved ? 'Guardado ✓' : 'Guardar configuración'}
        </button>
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8 }}>
        <div className="section-title">Alertas de hoy</div>
        <button className="check-btn" onClick={checkTardanzas}>Verificar ahora</button>
      </div>

      {alertas.length === 0 ? (
        <div className="empty-state">Sin alertas — todos a tiempo hoy</div>
      ) : (
        <div className="alerts-list">
          {alertas.map((a, i) => (
            <div key={i} className={`alert-item alert-${a.tipo}`}>
              <div className={`alert-icon ${a.tipo}`}>
                {a.tipo === 'tarde' ? '!' : '?'}
              </div>
              <div className="alert-info">
                <div className="alert-name">{a.nombre}</div>
                <div className="alert-desc">
                  {a.tipo === 'tarde'
                    ? `Llegó tarde — ponchó a las ${a.hora}`
                    : 'No ha ponchado entrada hoy'}
                </div>
              </div>
              <span className={`alert-badge ${a.tipo}`}>
                {a.tipo === 'tarde' ? 'Tardanza' : 'Ausente'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
