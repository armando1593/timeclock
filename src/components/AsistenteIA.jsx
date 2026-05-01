import { useState, useRef, useEffect } from 'react'
import { getRegistros, getEmpleados, getVacaciones } from '../lib/api'

// ⚠️ Reemplaza con tu nueva clave de Groq después de borrar la anterior
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_MODEL   = 'llama-3.1-8b-instant'

const SUGERENCIAS = [
  "¿Quién llegó tarde hoy?",
  "¿Cuántas horas trabajó esta semana?",
  "¿Quién está ausente hoy?",
  "Dame un resumen de asistencia",
  "¿Quién tiene vacaciones pendientes?",
]

async function obtenerContexto() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart  = (() => { const d = new Date(now); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); return d.toISOString() })()

  const [emps, todayRecs, weekRecs, vacaciones] = await Promise.all([
    getEmpleados(),
    getRegistros({ desde: todayStart }),
    getRegistros({ desde: weekStart }),
    getVacaciones(),
  ])

  const horasPorEmp = {}
  emps.forEach(e => {
    const recs = weekRecs.filter(r => r.empleados?.id === e.id).sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp))
    let hrs = 0, lastIn = null
    recs.forEach(r => {
      if (r.tipo === 'entrada') lastIn = new Date(r.timestamp)
      else if (r.tipo === 'salida' && lastIn) { hrs += (new Date(r.timestamp)-lastIn)/3600000; lastIn = null }
    })
    if (lastIn) hrs += (Date.now()-lastIn)/3600000
    horasPorEmp[e.nombre] = Math.round(hrs*10)/10
  })

  const tardanzasHoy = todayRecs
    .filter(r => r.tipo === 'entrada' && new Date(r.timestamp).getHours() >= 9)
    .map(r => ({ nombre: r.empleados?.nombre, hora: new Date(r.timestamp).toLocaleTimeString('es-PR',{hour:'2-digit',minute:'2-digit'}) }))

  const presentesHoy = new Set(todayRecs.filter(r=>r.tipo==='entrada').map(r=>r.empleados?.id))
  const ausentesHoy  = emps.filter(e => !presentesHoy.has(e.id)).map(e => e.nombre)

  const tardanzasSemana = weekRecs
    .filter(r => r.tipo === 'entrada' && new Date(r.timestamp).getHours() >= 9)
    .map(r => ({ nombre: r.empleados?.nombre, dia: new Date(r.timestamp).toLocaleDateString('es-PR',{weekday:'long'}), hora: new Date(r.timestamp).toLocaleTimeString('es-PR',{hour:'2-digit',minute:'2-digit'}) }))

  const vacsPendientes = vacaciones.filter(v => v.estado === 'pendiente')
    .map(v => ({ nombre: v.empleados?.nombre, desde: v.fecha_inicio, hasta: v.fecha_fin }))

  return {
    fecha: now.toLocaleDateString('es-PR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}),
    hora:  now.toLocaleTimeString('es-PR',{hour:'2-digit',minute:'2-digit'}),
    totalEmpleados: emps.length,
    empleados: emps.map(e => ({ nombre: e.nombre, departamento: e.departamento, horasMeta: e.horas_meta||8 })),
    presentesHoy: presentesHoy.size,
    ausentesHoy,
    tardanzasHoy,
    tardanzasSemana,
    horasPorEmpleadoSemana: horasPorEmp,
    registrosHoy: todayRecs.length,
    vacacionesPendientes: vacsPendientes,
  }
}

export default function AsistenteIA() {
  const [mensajes, setMensajes] = useState([
    { role: 'assistant', text: '¡Hola! Soy tu asistente de RRHH con IA. Puedo responder preguntas sobre asistencia, horas trabajadas, tardanzas y más. ¿En qué te puedo ayudar?' }
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [mensajes])

  async function enviar(texto) {
    const pregunta = texto || input.trim()
    if (!pregunta || loading) return
    setInput('')
    setMensajes(m => [...m, { role:'user', text:pregunta }])
    setLoading(true)

    try {
      const ctx = await obtenerContexto()
      const systemPrompt = `Eres un asistente de Recursos Humanos para VR Insurance Group en Puerto Rico.
Responde siempre en español, de forma clara y concisa. Usa los datos reales para responder.
Sé profesional pero amigable. Usa emojis ocasionalmente.

DATOS ACTUALES (${ctx.fecha}, ${ctx.hora}):
- Total empleados: ${ctx.totalEmpleados}
- Empleados: ${JSON.stringify(ctx.empleados)}
- Presentes hoy: ${ctx.presentesHoy}
- Ausentes hoy: ${ctx.ausentesHoy.length > 0 ? ctx.ausentesHoy.join(', ') : 'Ninguno'}
- Tardanzas hoy: ${ctx.tardanzasHoy.length > 0 ? JSON.stringify(ctx.tardanzasHoy) : 'Ninguna'}
- Tardanzas esta semana: ${JSON.stringify(ctx.tardanzasSemana)}
- Horas por empleado esta semana: ${JSON.stringify(ctx.horasPorEmpleadoSemana)}
- Vacaciones pendientes: ${JSON.stringify(ctx.vacacionesPendientes)}`

      const historial = mensajes.slice(-6).map(m => ({
        role: m.role,
        content: m.text
      }))

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          max_tokens: 1000,
          messages: [
            { role: 'system', content: systemPrompt },
            ...historial,
            { role: 'user', content: pregunta }
          ]
        })
      })

      const data = await response.json()
      const respuesta = data.choices?.[0]?.message?.content || 'No pude obtener respuesta. Intenta de nuevo.'
      setMensajes(m => [...m, { role:'assistant', text:respuesta }])
    } catch(e) {
      setMensajes(m => [...m, { role:'assistant', text:'Error al conectar. Verifica tu conexión e intenta de nuevo.' }])
    } finally { setLoading(false) }
  }

  return (
    <div className="ia-screen">
      <div className="ia-header">
        <div className="ia-avatar">🤖</div>
        <div>
          <div className="ia-title">Asistente IA de RRHH</div>
          <div className="ia-sub">Datos en tiempo real · Responde en español</div>
        </div>
        <div className="ia-status"><div className="ia-dot" />En línea</div>
      </div>

      <div className="ia-messages">
        {mensajes.map((m, i) => (
          <div key={i} className={`ia-msg ia-msg-${m.role}`}>
            {m.role === 'assistant' && <div className="ia-msg-avatar">🤖</div>}
            <div className={`ia-bubble ia-bubble-${m.role}`}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="ia-msg ia-msg-assistant">
            <div className="ia-msg-avatar">🤖</div>
            <div className="ia-bubble ia-bubble-assistant ia-typing">
              <span/><span/><span/>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="ia-sugerencias">
        {SUGERENCIAS.map((s,i) => (
          <button key={i} className="ia-sug" onClick={() => enviar(s)}>{s}</button>
        ))}
      </div>

      <div className="ia-input-row">
        <input className="ia-input"
          placeholder="Pregúntame sobre asistencia, horas, tardanzas..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && enviar()}
          disabled={loading}
        />
        <button className="ia-send" onClick={() => enviar()} disabled={loading || !input.trim()}>
          {loading ? '…' : '↑'}
        </button>
      </div>
    </div>
  )
}