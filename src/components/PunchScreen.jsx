import { useState, useRef, useEffect } from 'react'
import { verificarPin, insertarRegistro, getUltimoRegistro, subirFoto } from '../lib/api'

export default function PunchScreen() {
  const [pin,      setPin]      = useState('')
  const [empleado, setEmpleado] = useState(null)
  const [isIn,     setIsIn]     = useState(false)
  const [gps,      setGps]      = useState(null)
  const [gpsStatus,setGpsStatus]= useState('idle')  // idle | loading | ok | error
  const [camOn,    setCamOn]    = useState(false)
  const [msg,      setMsg]      = useState(null)     // { text, type }
  const [loading,  setLoading]  = useState(false)
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-PR', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
  const timeStr = now.toLocaleTimeString('es-PR', { hour:'2-digit', minute:'2-digit' })

  useEffect(() => { return () => stopCam() }, [])

  function handleKey(k) {
    if (k === '←') { setPin(p => p.slice(0, -1)); return }
    if (k === '✓')  { tryVerify(); return }
    if (pin.length < 4) setPin(p => p + k)
  }

  useEffect(() => {
    if (pin.length === 4) setTimeout(tryVerify, 200)
  }, [pin])

  async function tryVerify() {
    if (pin.length !== 4) return
    setLoading(true)
    const emp = await verificarPin(pin)
    setPin('')
    if (!emp) { setMsg({ text: 'PIN incorrecto', type: 'error' }); setLoading(false); return }
    const last = await getUltimoRegistro(emp.id)
    const inside = last?.tipo === 'entrada'
    setEmpleado(emp)
    setIsIn(inside)
    setLoading(false)
    startCam()
    getGPS()
  }

  function startCam() {
    setCamOn(true)
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => {})
  }

  function stopCam() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamOn(false)
  }

  function getGPS() {
    setGpsStatus('loading')
    if (!navigator.geolocation) { setGpsStatus('error'); return }
    navigator.geolocation.getCurrentPosition(
      pos => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('ok') },
      ()  => { setGps({ lat: 18.4655, lng: -66.1057 }); setGpsStatus('sim') },
      { timeout: 8000 }
    )
  }

  function captureFrame() {
    const v = videoRef.current, c = canvasRef.current
    if (!v || !c || v.readyState < 2) return null
    c.width = v.videoWidth || 320; c.height = v.videoHeight || 240
    c.getContext('2d').drawImage(v, 0, 0)
    return new Promise(res => c.toBlob(res, 'image/jpeg', 0.7))
  }

  async function doPunch() {
    if (!empleado) return
    setLoading(true)
    try {
      let foto_url = null
      const blob = await captureFrame()
      if (blob) foto_url = await subirFoto(blob, empleado.id)

      await insertarRegistro({
        empleado_id: empleado.id,
        tipo: isIn ? 'salida' : 'entrada',
        latitud:  gps?.lat,
        longitud: gps?.lng,
        foto_url
      })

      setMsg({ text: `${isIn ? 'Salida' : 'Entrada'} registrada — ${empleado.nombre}`, type: 'ok' })
      stopCam()
      setTimeout(() => { setEmpleado(null); setMsg(null); setGps(null); setGpsStatus('idle') }, 3000)
    } catch (e) {
      setMsg({ text: 'Error al guardar. Intenta de nuevo.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function cancelPunch() { stopCam(); setEmpleado(null); setPin(''); setMsg(null); setGpsStatus('idle') }

  const KEYS = ['1','2','3','4','5','6','7','8','9','←','0','✓']

  return (
    <div className="punch-screen">
      <header className="punch-header">
        <div className="date-line">{dateStr}</div>
        <div className="time-line">{timeStr}</div>
      </header>

      {!empleado ? (
        <div className="pin-card">
          <p className="pin-label">Ingresa tu PIN de 4 dígitos</p>
          <div className="pin-dots">
            {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />)}
          </div>
          <div className="pin-grid">
            {KEYS.map(k => (
              <button key={k} className={`pin-key ${k==='✓'?'pin-confirm':k==='←'?'pin-del':''}`}
                onClick={() => handleKey(k)} disabled={loading}>
                {k}
              </button>
            ))}
          </div>
          {msg && <div className={`msg msg-${msg.type}`}>{msg.text}</div>}
        </div>
      ) : (
        <div className="confirm-card">
          <div className="emp-row">
            <div className="emp-avatar">{empleado.nombre.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
            <div>
              <div className="emp-name">{empleado.nombre}</div>
              <div className="emp-dept">{empleado.departamento}</div>
            </div>
            <span className={`status-badge ${isIn ? 'inside' : 'outside'}`}>{isIn ? 'Dentro' : 'Fuera'}</span>
          </div>

          <div className="cam-box">
            {camOn && <video ref={videoRef} autoPlay playsInline muted className="cam-video" />}
            {!camOn && <div className="cam-placeholder"><CamIcon /><span>Cámara</span></div>}
          </div>
          <canvas ref={canvasRef} style={{ display:'none' }} />

          <div className={`gps-row gps-${gpsStatus}`}>
            <div className="gps-dot" />
            <span>{
              gpsStatus === 'loading' ? 'Obteniendo ubicación...' :
              gpsStatus === 'ok'      ? `GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` :
              gpsStatus === 'sim'     ? `GPS simulado: ${gps?.lat?.toFixed(4)}, ${gps?.lng?.toFixed(4)}` :
              'GPS no disponible'
            }</span>
          </div>

          {msg && <div className={`msg msg-${msg.type}`}>{msg.text}</div>}

          <button className={`punch-btn ${isIn ? 'btn-out' : 'btn-in'}`} onClick={doPunch} disabled={loading}>
            {loading ? 'Guardando...' : isIn ? 'Ponchar salida' : 'Ponchar entrada'}
          </button>
          <button className="cancel-btn" onClick={cancelPunch}>Cancelar</button>
        </div>
      )}
    </div>
  )
}

function CamIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
}
