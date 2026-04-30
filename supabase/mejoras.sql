-- ============================================
-- MEJORAS: Nómina, Vacaciones, Geofencing
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de tarifas de empleados (para nómina)
ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS tarifa_hora NUMERIC(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_pago   TEXT DEFAULT 'hora' CHECK (tipo_pago IN ('hora','salario'));

-- Tabla de solicitudes de vacaciones
CREATE TABLE IF NOT EXISTS vacaciones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id  UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  motivo       TEXT,
  estado       TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada')),
  admin_nota   TEXT,
  creado_en    TIMESTAMPTZ DEFAULT NOW(),
  revisado_en  TIMESTAMPTZ
);

-- Tabla de configuración de geofencing
CREATE TABLE IF NOT EXISTS geofencing (
  id        INTEGER PRIMARY KEY DEFAULT 1,
  latitud   NUMERIC(10,7) NOT NULL DEFAULT 18.4655,
  longitud  NUMERIC(10,7) NOT NULL DEFAULT -66.1057,
  radio_m   INTEGER NOT NULL DEFAULT 200,
  activo    BOOLEAN DEFAULT TRUE,
  CHECK (id = 1)
);

INSERT INTO geofencing DEFAULT VALUES ON CONFLICT DO NOTHING;

-- Permisos
GRANT ALL ON vacaciones  TO anon, authenticated;
GRANT ALL ON geofencing  TO anon, authenticated;
ALTER TABLE vacaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE geofencing DISABLE ROW LEVEL SECURITY;
