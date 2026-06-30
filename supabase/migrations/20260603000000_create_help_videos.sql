-- Migración: help_videos
-- Tabla para almacenar vídeos tutoriales del Centro de Ayuda
-- Gestión por admins, lectura pública

CREATE TABLE IF NOT EXISTS help_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  iframe_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para ordenación
CREATE INDEX IF NOT EXISTS help_videos_order_idx ON help_videos(display_order ASC);

-- RLS
ALTER TABLE help_videos ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario (incluso anónimo) puede leer los vídeos
CREATE POLICY "help_videos_public_read" ON help_videos
  FOR SELECT USING (true);

-- Solo admins pueden insertar, actualizar y borrar
CREATE POLICY "help_videos_admin_insert" ON help_videos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "help_videos_admin_update" ON help_videos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "help_videos_admin_delete" ON help_videos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_help_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER help_videos_updated_at
  BEFORE UPDATE ON help_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_help_videos_updated_at();

-- rollback: DROP TABLE IF EXISTS help_videos;
