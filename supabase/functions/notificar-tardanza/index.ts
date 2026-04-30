// supabase/functions/notificar-tardanza/index.ts
// Desplegar con: supabase functions deploy notificar-tardanza
// Requiere secret: supabase secrets set RESEND_API_KEY=tu_key

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { nombre, hora, emailAdmin } = await req.json()

  if (!emailAdmin) {
    return new Response(JSON.stringify({ error: 'No hay email configurado' }), { status: 400 })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Asistencia <alertas@tudominio.com>',
      to: [emailAdmin],
      subject: `⚠️ Tardanza: ${nombre}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#0F6E56">Alerta de tardanza</h2>
          <p><strong>${nombre}</strong> llegó tarde hoy.</p>
          <p>Hora de ponche de entrada: <strong>${hora}</strong></p>
          <hr style="border:none;border-top:1px solid #eee;margin:20px 0"/>
          <p style="color:#888;font-size:12px">Sistema de Control de Asistencia</p>
        </div>
      `
    })
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status: res.status
  })
})
