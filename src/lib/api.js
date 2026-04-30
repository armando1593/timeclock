import { supabase } from './supabase'

// ── Empleados ──────────────────────────────────────────────

export async function getEmpleados() {
  const { data, error } = await supabase
    .from('empleados')
    .select('id, nombre, departamento, horas_meta')
    .eq('activo', true)
    .order('nombre')
  if (error) throw error
  return data
}

export async function verificarPin(pin) {
  // En producción: comparar hash. Para demo comparamos texto plano.
  const { data, error } = await supabase
    .from('empleados')
    .select('id, nombre, departamento, horas_meta')
    .eq('pin_hash', pin)
    .eq('activo', true)
    .single()
  if (error) return null
  return data
}

export async function crearEmpleado({ nombre, departamento, pin, horas_meta = 8 }) {
  const { data, error } = await supabase
    .from('empleados')
    .insert({ nombre, departamento, pin_hash: pin, horas_meta })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function eliminarEmpleado(id) {
  const { error } = await supabase
    .from('empleados')
    .update({ activo: false })
    .eq('id', id)
  if (error) throw error
}

// ── Registros ─────────────────────────────────────────────

export async function insertarRegistro({ empleado_id, tipo, latitud, longitud, foto_url }) {
  const { data, error } = await supabase
    .from('registros')
    .insert({ empleado_id, tipo, latitud, longitud, foto_url })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getRegistros({ desde, hasta, empleado_id, tipo } = {}) {
  let query = supabase
    .from('registros')
    .select(`
      id, tipo, timestamp, latitud, longitud, foto_url,
      empleados ( id, nombre, departamento )
    `)
    .order('timestamp', { ascending: false })

  if (desde)       query = query.gte('timestamp', desde)
  if (hasta)       query = query.lte('timestamp', hasta)
  if (empleado_id) query = query.eq('empleado_id', empleado_id)
  if (tipo)        query = query.eq('tipo', tipo)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getUltimoRegistro(empleado_id) {
  const { data, error } = await supabase
    .from('registros')
    .select('tipo, timestamp')
    .eq('empleado_id', empleado_id)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── Fotos ─────────────────────────────────────────────────

export async function subirFoto(blob, empleadoId) {
  const filename = `${empleadoId}/${Date.now()}.jpg`
  const { data, error } = await supabase.storage
    .from('fotos-ponche')
    .upload(filename, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage
    .from('fotos-ponche')
    .getPublicUrl(filename)
  return publicUrl
}

// ── Configuración ─────────────────────────────────────────

export async function getConfiguracion() {
  const { data, error } = await supabase
    .from('configuracion')
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateConfiguracion(updates) {
  const { error } = await supabase
    .from('configuracion')
    .update(updates)
    .eq('id', 1)
  if (error) throw error
}

// ── Reportes de horas ─────────────────────────────────────

export function calcularHoras(registros) {
  const porEmpleado = {}
  registros.forEach(r => {
    const eid = r.empleados?.id
    if (!eid) return
    if (!porEmpleado[eid]) {
      porEmpleado[eid] = { ...r.empleados, horas: 0, registros: [] }
    }
    porEmpleado[eid].registros.push(r)
  })

  Object.values(porEmpleado).forEach(emp => {
    const sorted = emp.registros.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    let lastIn = null
    sorted.forEach(r => {
      if (r.tipo === 'entrada') {
        lastIn = new Date(r.timestamp)
      } else if (r.tipo === 'salida' && lastIn) {
        emp.horas += (new Date(r.timestamp) - lastIn) / 3600000
        lastIn = null
      }
    })
    if (lastIn) emp.horas += (Date.now() - lastIn) / 3600000
    emp.horas = Math.round(emp.horas * 10) / 10
    delete emp.registros
  })

  return Object.values(porEmpleado)
}

// ── Notificaciones por email (via Supabase Edge Function) ──

export async function enviarAlertaTardanza({ nombre, hora, emailAdmin }) {
  const { error } = await supabase.functions.invoke('notificar-tardanza', {
    body: { nombre, hora, emailAdmin }
  })
  if (error) console.error('Error enviando alerta:', error)
}
