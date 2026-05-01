import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { verificarPin } from '../lib/api'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export default function NotificacionesPush() {
  const [pin,      setPin]      = useState('')
  const [empleado, setEmpleado] = useState(null)
  const [estado,   setEstado]   = useState('idle')
  const [msg,      setMsg]      = useState('')

  const KEYS = ['1','2','3','4','5','6','7','8','9','<','0','OK']

  async function suscribir(emp) {
    try {
      setEstado('cargando')
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
      await supabase.from('push_subscriptions').upsert({
        empleado_id: emp.id,
        subscription: sub.toJSON()
      })
      setEstado('activo')
      setMsg('Notificaciones activadas para ' + emp.nombre)
    } catch(e) {
      setEstado('error')
      setMsg('Error al activar. Asegurate de permitir notificaciones.')
    }
  }

  async function verificarPinEmp(p) {
    const emp = await verificarPin(p)
    setPin('')
    if (!emp) { setMsg('PIN incorrecto'); return }
    setEmpleado(emp)
    await suscribir(emp)
  }

  if (estado === 'activo') return (
    <div style={{background:'#E1F5EE',borderRadius:12,padding:'1rem',margin:'1rem 0',textAlign:'center'}}>
      <div style={{fontSize:24,marginBottom:6}}>🔔</div>
      <div style={{fontSize:14,fontWeight:500,color:'#0F6E56'}}>{msg}</div>
      <div style={{fontSize:12,color:'#1D9E75',marginTop:4}}>Recibiras recordatorios de ponche automaticamente</div>
    </div>
  )

  if (estado === 'cargando') return (
    <div style={{textAlign:'center',padding:'1rem',color:'#888',fontSize:13}}>Activando notificaciones...</div>
  )

  return (
    <div style={{background:'#F8F7F4',borderRadius:12,padding:'1rem',margin:'1rem 0'}}>
      <div style={{fontSize:13,fontWeight:500,color:'#1A1A18',marginBottom:4}}>Activar recordatorios de ponche</div>
      <div style={{fontSize:12,color:'#888',marginBottom:12}}>Ingresa tu PIN para recibir notificaciones automaticas</div>
      <div style={{display:'flex',gap:6,justifyContent:'center',marginBottom:10}}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{width:10,height:10,borderRadius:'50%',border:'1.5px solid #D4D3CE',background:i<pin.length?'#1A1A18':'transparent'}} />
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
        {KEYS.map(k => (
          <button key={k}
            style={{padding:'10px',borderRadius:8,border:'0.5px solid #D4D3CE',background:'white',fontSize:16,cursor:'pointer',fontFamily:'monospace'}}
            onClick={function() {
              if (k === '<') { setPin(function(p) { return p.slice(0,-1) }); return }
              if (k === 'OK') { verificarPinEmp(pin); return }
              if (pin.length < 4) {
                var np = pin + k
                setPin(np)
                if (np.length === 4) setTimeout(function() { verificarPinEmp(np) }, 200)
              }
            }}>{k}</button>
        ))}
      </div>
      {msg && <div style={{fontSize:12,color:'#D85A30',textAlign:'center',marginTop:8}}>{msg}</div>}
    </div>
  )
}
