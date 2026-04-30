import { supabase } from './supabase'

// ── Empleados ──────────────────────────────────────────────

export async function getEmpleados() {
  const { data, error } = await supabase
    .from('empleados')
    .select('id, nombre, departamento, horas_meta, tarifa_hora, tipo_pago')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return data
}

export async function verificarPin(pin) {
  const { data, error } = await supabase
    .from('empleados')
    .select('id, nombre, departamento, horas_meta')
    .eq('pin_hash', pin)
    .eq('activo', true)
    .single()
  if (error) return null
  return data
}

export async function crearEmpleado({ nombre, departamento, pin, horas_meta = 8, tarifa_hora = 0 }) {
  const { data, error } = await supabase
    .from('empleados')
    .insert({ nombre, departamento, pin_hash: pin, horas_meta, tarifa_hora })
    .select().single()
  if (error) throw error
  return data
}

export async function updateEmpleado(id, updates) {
  const { error } = await supabase.from('empleados').update(updates).eq('id', id)
  if (error) throw error
}

// ── Registros ─────────────────────────────────────────────

export async function insertarRegistro({ empleado_id, tipo, latitud, longitud, foto_url }) {
  const { data, error } = await supabase
    .from('registros')
    .insert({ empleado_id, tipo, latitud, longitud, foto_url })
    .select().single()
  if (error) throw error
  return data
}

export async function getRegistros({ desde, hasta, empleado_id, tipo } = {}) {
  let q = supabase
    .from('registros')
    .select(`id, tipo, timestamp, latitud, longitud, foto_url, empleados(id, nombre, departamento)`)
    .order('timestamp', { ascending: false })
  if (desde)       q = q.gte('timestamp', desde)
  if (hasta)       q = q.lte('timestamp', hasta)
  if (empleado_id) q = q.eq('empleado_id', empleado_id)
  if (tipo)        q = q.eq('tipo', tipo)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getUltimoRegistro(empleado_id) {
  const { data, error } = await supabase
    .from('registros')
    .select('tipo, timestamp')
    .eq('empleado_id', empleado_id)
    .order('timestamp', { ascending: false })
    .limit(1).maybeSingle()
  if (error) throw error
  return data
}

// ── Fotos ─────────────────────────────────────────────────

export async function subirFoto(blob, empleadoId) {
  const filename = `${empleadoId}/${Date.now()}.jpg`
  const { error } = await supabase.storage
    .from('fotos-ponche')
    .upload(filename, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('fotos-ponche').getPublicUrl(filename)
  return publicUrl
}

// ── Geofencing ────────────────────────────────────────────

export async function getGeofencing() {
  const { data, error } = await supabase.from('geofencing').select('*').single()
  if (error) return { latitud: 18.4655, longitud: -66.1057, radio_m: 200, activo: false }
  return data
}

export async function updateGeofencing(updates) {
  const { error } = await supabase.from('geofencing').update(updates).eq('id', 1)
  if (error) throw error
}

export function distanciaMetros(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Vacaciones ────────────────────────────────────────────

export async function solicitarVacaciones({ empleado_id, fecha_inicio, fecha_fin, motivo }) {
  const { data, error } = await supabase
    .from('vacaciones')
    .insert({ empleado_id, fecha_inicio, fecha_fin, motivo })
    .select().single()
  if (error) throw error
  return data
}

export async function getVacaciones({ estado, empleado_id } = {}) {
  let q = supabase
    .from('vacaciones')
    .select(`id, fecha_inicio, fecha_fin, motivo, estado, admin_nota, creado_en, empleados(id, nombre, departamento)`)
    .order('creado_en', { ascending: false })
  if (estado)      q = q.eq('estado', estado)
  if (empleado_id) q = q.eq('empleado_id', empleado_id)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function responderVacaciones(id, estado, admin_nota = '') {
  const { error } = await supabase
    .from('vacaciones')
    .update({ estado, admin_nota, revisado_en: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ── Nómina ────────────────────────────────────────────────

export async function calcularNomina(desde, hasta) {
  const [recs, emps] = await Promise.all([getRegistros({ desde, hasta }), getEmpleados()])
  return emps.map(emp => {
    const er = recs.filter(r => r.empleados?.id === emp.id)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    let horas = 0, lastIn = null
    er.forEach(r => {
      if (r.tipo === 'entrada') lastIn = new Date(r.timestamp)
      else if (r.tipo === 'salida' && lastIn) { horas += (new Date(r.timestamp) - lastIn) / 3600000; lastIn = null }
    })
    if (lastIn) horas += (Date.now() - lastIn) / 3600000
    const tarifa = emp.tarifa_hora || 0
    const horasReg = Math.min(horas, 40)
    const horasExtra = Math.max(0, horas - 40)
    return {
      ...emp,
      horas: Math.round(horas * 10) / 10,
      horasReg: Math.round(horasReg * 10) / 10,
      horasExtra: Math.round(horasExtra * 10) / 10,
      salarioReg: Math.round(horasReg * tarifa * 100) / 100,
      salarioExtra: Math.round(horasExtra * tarifa * 1.5 * 100) / 100,
      salarioTotal: Math.round((horasReg * tarifa + horasExtra * tarifa * 1.5) * 100) / 100,
    }
  })
}

// ── Dashboard ─────────────────────────────────────────────

export async function getDashboardStats() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = (() => { const d = new Date(now); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); return d.toISOString() })()

  const [todayRecs, weekRecs, emps] = await Promise.all([
    getRegistros({ desde: todayStart }),
    getRegistros({ desde: weekStart }),
    getEmpleados()
  ])

  const presentes = new Set()
  emps.forEach(e => {
    const er = todayRecs.filter(r => r.empleados?.id === e.id)
    const li = er.filter(r => r.tipo === 'entrada').pop()
    const lo = er.filter(r => r.tipo === 'salida').pop()
    if (li && (!lo || new Date(li.timestamp) > new Date(lo.timestamp))) presentes.add(e.id)
  })

  const tardanzas = weekRecs.filter(r => r.tipo === 'entrada' && new Date(r.timestamp).getHours() >= 9).length

  const horasPorDia = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate()-i); d.setHours(0,0,0,0)
    horasPorDia[d.toLocaleDateString('es-PR', { weekday:'short' })] = 0
  }
  weekRecs.forEach(r => {
    if (r.tipo !== 'entrada') return
    const label = new Date(r.timestamp).toLocaleDateString('es-PR', { weekday:'short' })
    if (horasPorDia[label] !== undefined) horasPorDia[label]++
  })

  const asistenciaPorEmp = emps.map(e => ({
    nombre: e.nombre.split(' ')[0],
    entradas: weekRecs.filter(r => r.empleados?.id === e.id && r.tipo === 'entrada').length
  }))

  return {
    totalEmpleados: emps.length,
    presentesHoy: presentes.size,
    ausentesHoy: emps.length - presentes.size,
    tardanzasSemana: tardanzas,
    registrosHoy: todayRecs.length,
    horasPorDia: Object.entries(horasPorDia).map(([dia, cnt]) => ({ dia, cnt })),
    asistenciaPorEmp,
  }
}

// ── Config ────────────────────────────────────────────────

export async function getConfiguracion() {
  const { data, error } = await supabase.from('configuracion').select('*').single()
  if (error) throw error
  return data
}

export async function updateConfiguracion(updates) {
  const { error } = await supabase.from('configuracion').update(updates).eq('id', 1)
  if (error) throw error
}
