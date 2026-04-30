-- ============================================
-- SCHEMA: Control de Asistencia
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de empleados
CREATE TABLE empleados (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  departamento TEXT NOT NULL,
  pin_hash    TEXT NOT NULL,         -- PIN encriptado con bcrypt
  horas_meta  NUMERIC(4,1) DEFAULT 8.0,
  activo      BOOLEAN DEFAULT TRUE,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de registros de ponche
CREATE TABLE registros (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('entrada','salida')),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitud     NUMERIC(10,7),
  longitud    NUMERIC(10,7),
  foto_url    TEXT,
  ip_address  TEXT
);

-- Tabla de configuración
CREATE TABLE configuracion (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  hora_limite     TIME NOT NULL DEFAULT '09:00',
  email_alertas   TEXT,
  activo          BOOLEAN DEFAULT TRUE,
  CHECK (id = 1)   -- solo 1 fila
);

INSERT INTO configuracion DEFAULT VALUES;

-- Índices para rendimiento
CREATE INDEX idx_registros_empleado ON registros(empleado_id);
CREATE INDEX idx_registros_timestamp ON registros(timestamp DESC);
CREATE INDEX idx_registros_tipo ON registros(tipo);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE empleados   ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros   ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Política: solo usuarios autenticados (admin) ven empleados
CREATE POLICY "admin_all_empleados" ON empleados
  FOR ALL USING (auth.role() = 'authenticated');

-- Política: solo admin ve/modifica registros
CREATE POLICY "admin_all_registros" ON registros
  FOR ALL USING (auth.role() = 'authenticated');

-- Política: solo admin modifica configuración
CREATE POLICY "admin_config" ON configuracion
  FOR ALL USING (auth.role() = 'authenticated');

-- Política pública para insertar registros (ponche sin login)
CREATE POLICY "public_insert_registros" ON registros
  FOR INSERT WITH CHECK (TRUE);

-- Política pública para leer empleados (verificar PIN)
CREATE POLICY "public_read_empleados" ON empleados
  FOR SELECT USING (activo = TRUE);

-- ============================================
-- DATOS DE EJEMPLO
-- PINs en texto plano para desarrollo:
-- María Torres: 1234
-- Luis Pérez:   5678
-- Ana Rivera:   9012
-- Carlos Díaz:  3456
-- (en producción usar bcrypt desde la app)
-- ============================================

INSERT INTO empleados (nombre, departamento, pin_hash, horas_meta) VALUES
  ('María Torres',  'Ventas',          '1234', 8.0),
  ('Luis Pérez',    'Operaciones',     '5678', 8.0),
  ('Ana Rivera',    'Administración',  '9012', 8.0),
  ('Carlos Díaz',   'IT',              '3456', 8.0);
