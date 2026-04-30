# 📋 Control de Asistencia — App Web / PWA

App móvil de ponche de entrada y salida con PIN, foto, GPS, panel de admin, reportes y alertas.

---

## 🚀 Pasos para lanzarla en producción

### 1. Crear tu proyecto en Supabase (gratis)

1. Ve a **[supabase.com](https://supabase.com)** y crea una cuenta
2. Click en **New Project**, ponle un nombre (ej. `asistencia`)
3. Guarda tu contraseña de base de datos
4. Espera ~2 minutos a que el proyecto inicie

### 2. Crear las tablas

1. En tu proyecto de Supabase, ve a **SQL Editor**
2. Pega todo el contenido del archivo `supabase/schema.sql`
3. Click en **Run**

### 3. Crear el bucket de fotos

1. Ve a **Storage** → **New bucket**
2. Nombre: `fotos-ponche`
3. Marca como **Public**

### 4. Conectar la app

1. Copia el archivo `.env.example` como `.env.local`:
   ```
   cp .env.example .env.local
   ```
2. En Supabase ve a **Settings → API**
3. Copia **Project URL** y pégala en `VITE_SUPABASE_URL`
4. Copia **anon / public key** y pégala en `VITE_SUPABASE_ANON_KEY`

### 5. Instalar y correr localmente

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` en tu celular (misma red WiFi) o navegador.

### 6. Publicar en Vercel (gratis)

1. Sube el proyecto a GitHub
2. Ve a **[vercel.com](https://vercel.com)** → **New Project** → importa tu repo
3. En **Environment Variables** agrega las mismas del `.env.local`
4. Click **Deploy** — en 2 minutos tienes tu URL pública

---

## 📧 Alertas por email (opcional)

1. Crea cuenta en **[resend.com](https://resend.com)** (gratis: 3,000 emails/mes)
2. Obtén tu API Key
3. Instala el CLI de Supabase: `npm install -g supabase`
4. Ejecuta:
   ```bash
   supabase login
   supabase link --project-ref TU_PROJECT_REF
   supabase secrets set RESEND_API_KEY=tu_api_key
   supabase functions deploy notificar-tardanza
   ```
5. En la app, ve a **Alertas** y configura el email del administrador

---

## 👤 Crear empleados

En Supabase → **Table Editor → empleados** → click **Insert row**:
- `nombre`: nombre completo
- `departamento`: departamento
- `pin_hash`: PIN de 4 dígitos (ej. `7890`)
- `horas_meta`: horas de trabajo al día (ej. `8`)

---

## 🔐 Crear cuenta de administrador

1. En Supabase → **Authentication → Users → Invite user**
2. Ingresa el email del administrador
3. El admin recibirá un enlace para crear su contraseña
4. Con esas credenciales puede acceder al panel de Registros, Reportes y Alertas

---

## 📁 Estructura del proyecto

```
timeclock/
├── index.html
├── vite.config.js
├── package.json
├── .env.example          ← copia esto a .env.local
├── src/
│   ├── main.jsx
│   ├── App.jsx           ← navegación principal
│   ├── index.css         ← estilos globales
│   ├── lib/
│   │   ├── supabase.js   ← cliente Supabase
│   │   └── api.js        ← todas las llamadas a la base de datos
│   └── components/
│       ├── PunchScreen.jsx   ← PIN + cámara + GPS
│       ├── AdminScreen.jsx   ← registros con filtros y export
│       ├── ReportsScreen.jsx ← horas trabajadas por empleado
│       ├── AlertsScreen.jsx  ← tardanzas y ausencias
│       └── LoginScreen.jsx   ← login del administrador
└── supabase/
    ├── schema.sql                        ← tablas y políticas RLS
    └── functions/
        └── notificar-tardanza/
            └── index.ts                  ← email de alerta via Resend
```

---

## 🛠 Tecnologías usadas

| Tecnología | Uso | Costo |
|---|---|---|
| React + Vite | Frontend / PWA | Gratis |
| Supabase | Base de datos, auth, storage | Gratis hasta 50k filas |
| Vercel | Hosting | Gratis |
| Resend | Emails de alerta | Gratis (3k/mes) |

---

## ❓ Preguntas frecuentes

**¿Los empleados necesitan login?**
No. Solo ingresan su PIN de 4 dígitos para ponchar. El login es solo para el administrador.

**¿Funciona sin internet?**
La app requiere conexión para guardar los registros. Como PWA se puede instalar en el celular.

**¿Cómo instalar la app en el celular?**
Abre la URL en Chrome (Android) o Safari (iPhone) → menú → "Agregar a pantalla de inicio".

**¿Se puede cambiar el PIN de un empleado?**
Sí, directamente en Supabase → Table Editor → empleados → editar el campo `pin_hash`.
