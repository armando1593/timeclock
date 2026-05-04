import { supabase } from './supabase'

export async function getEmpleados() {
  const { data, error } = await supabase.from('empleados').select('id, nombre, departamento, horas_meta, tarifa_hora, tipo_pago').eq('activo', true).order('nombre')
  if (error) throw error
  return data
}

export async function verificarPin(pin) {
  const { data, error } = await supabase.from('empleados').select('id, nombre, departamento, horas_meta').eq('pin_hash', pin).eq('activo', true).single()
  if (error || !data) return null
  return data
}

export async function updateEmpleado(id, updates) {
  const { error } = await supabase.from('empleados').update(updates).eq('id', id)
  if (error) throw error
}

export async function insertarRegistro({ empleado_id, tipo, latitud, longitud, foto_url, timestamp }) {
  const registro = { empleado_id, tipo, latitud, longitud, foto_url }
  if (timestamp) registro.timestamp = timestamp
  const { data, error } = await supabase.from('registros').insert(registro).select().single()
  if (error) throw error
  return data
}

export async function getRegistros({ desde, hasta, empleado_id, tipo } = {}) {
  let q = supabase.from('registros').select('id, tipo, timestamp, latitud, longitud, foto_url, empleados(id, nombre, departamento)').order('timestamp', { ascending: false })
  if (desde) q = q.gte('timestamp', desde)
  if (hasta) q = q.lte('timestamp', hasta)
  if (empleado_id) q = q.eq('empleado_id', empleado_id)
  if (tipo) q = q.eq('tipo', tipo)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function getUltimoRegistro(empleado_id) {
  const { data, error } = await supabase.from('registros').select('tipo, timestamp').eq('empleado_id', empleado_id).order('timestamp', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}

export async function subirFoto(blob, empleadoId) {
  const filename = empleadoId + '/' + Date.now() + '.jpg'
  const { error } = await supabase.storage.from('fotos-ponche').upload(filename, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('fotos-ponche').getPublicUrl(filename)
  return publicUrl
}

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

export async function solicitarVacaciones({ empleado_id, fecha_inicio, fecha_fin, motivo }) {
  const { data, error } = await supabase.from('vacaciones').insert({ empleado_id, fecha_inicio, fecha_fin, motivo }).select().single()
  if (error) throw error
  return data
}

export async function getVacaciones({ estado, empleado_id } = {}) {
  let q = supabase.from('vacaciones').select('id, fecha_inicio, fecha_fin, motivo, estado, admin_nota, creado_en, empleados(id, nombre, departamento)').order('creado_en', { ascending: false })
  if (estado) q = q.eq('estado', estado)
  if (empleado_id) q = q.eq('empleado_id', empleado_id)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function responderVacaciones(id, estado, admin_nota) {
  const nota = admin_nota || ''
  const { error } = await supabase.from('vacaciones').update({ estado, admin_nota: nota, revisado_en: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function calcularNomina(desde, hasta) {
  const recs = await getRegistros({ desde, hasta })
  const emps = await getEmpleados()
  return emps.map(function(emp) {
    const er = recs.filter(function(r) {
      return r.empleados && r.empleados.id === emp.id
    }).sort(function(a, b) {
      return new Date(a.timestamp) - new Date(b.timestamp)
    })
    let horas = 0
    let lastIn = null
    er.forEach(function(r) {
      if (r.tipo === 'entrada') {
        lastIn = new Date(r.timestamp)
      } else if (r.tipo === 'salida' && lastIn) {
        horas += (new Date(r.timestamp) - lastIn) / 3600000
        lastIn = null
      }
    })
    if (lastIn) horas += (Date.now() - lastIn) / 3600000
    const tarifa = emp.tarifa_hora || 0
    const horasReg = Math.min(horas, 40)
    const horasExtra = Math.max(0, horas - 40)
    return {
      id: emp.id,
      nombre: emp.nombre,
      departamento: emp.departamento,
      tarifa_hora: emp.tarifa_hora,
      horas_meta: emp.horas_meta,
      horas: Math.round(horas * 10) / 10,
      horasReg: Math.round(horasReg * 10) / 10,
      horasExtra: Math.round(horasExtra * 10) / 10,
      salarioReg: Math.round(horasReg * tarifa * 100) / 100,
      salarioExtra: Math.round(horasExtra * tarifa * 1.5 * 100) / 100,
      salarioTotal: Math.round((horasReg * tarifa + horasExtra * tarifa * 1.5) * 100) / 100,
    }
  })
}

export async function getDashboardStats() {
  const now = new Date()
  const emps = await getEmpleados()

  // Usar SQL directo con timezone de PR para obtener registros de hoy
  const { data: todayRecs } = await supabase
    .from('registros')
    .select('empleado_id, tipo, timestamp')
    .gte('timestamp', now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + 'T04:00:00.000Z')
    .order('timestamp', { ascending: true })

  const registros = todayRecs || []

  // Para cada empleado, encontrar su ultimo registro de hoy
  const presentes = new Set()
  emps.forEach(function(e) {
    const misRegistros = registros.filter(function(r) { return r.empleado_id === e.id })
    if (misRegistros.length === 0) return
    const ultimo = misRegistros[misRegistros.length - 1]
    if (ultimo.tipo === 'entrada') {
      presentes.add(e.id)
    }
  })

  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - 6)
  weekStart.setHours(0, 0, 0, 0)

  const { data: weekData } = await supabase
    .from('registros')
    .select('empleado_id, tipo, timestamp')
    .gte('timestamp', weekStart.toISOString())
    .order('timestamp', { ascending: false })

  const weekRecs = weekData || []

  const tardanzas = weekRecs.filter(function(r) {
    const h = new Date(r.timestamp)
    const prHour = (h.getUTCHours() - 4 + 24) % 24
    const prMin  = h.getUTCMinutes()
    return r.tipo === 'entrada' && (prHour > 9 || (prHour === 9 && prMin > 0))
  }).length

  const horasPorDia = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    horasPorDia[d.toLocaleDateString('es-PR', { weekday: 'short' })] = 0
  }
  weekRecs.forEach(function(r) {
    if (r.tipo !== 'entrada') return
    const label = new Date(r.timestamp).toLocaleDateString('es-PR', { weekday: 'short' })
    if (horasPorDia[label] !== undefined) horasPorDia[label]++
  })

  const asistenciaPorEmp = emps.map(function(e) {
    const diasSet = new Set()
    weekRecs.forEach(function(r) {
      if (r.empleado_id === e.id && r.tipo === 'entrada') {
        const d = new Date(r.timestamp)
        diasSet.add(d.toLocaleDateString())
      }
    })
    return { nombre: e.nombre.split(' ')[0], entradas: diasSet.size }
  })

  return {
    totalEmpleados: emps.length,
    presentesHoy: presentes.size,
    ausentesHoy: emps.length - presentes.size,
    tardanzasSemana: tardanzas,
    registrosHoy: registros.length,
    horasPorDia: Object.entries(horasPorDia).map(function(entry) {
      return { dia: entry[0], cnt: entry[1] }
    }),
    asistenciaPorEmp: asistenciaPorEmp,
  }
}

export async function getConfiguracion() {
  const { data, error } = await supabase.from('configuracion').select('*').single()
  if (error) throw error
  return data
}

export async function updateConfiguracion(updates) {
  const { error } = await supabase.from('configuracion').update(updates).eq('id', 1)
  if (error) throw error
}
