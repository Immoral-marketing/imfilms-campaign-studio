-- ============================================================
-- Sistema de Afiliados v1 · Imfilms Campaign Studio · Abril 2026
-- Portado desde immoralia-catalogo-procesos
-- ============================================================

-- ------------------------------------------------------------
-- TABLA: partners
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partners (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre      text NOT NULL,
  email       text UNIQUE NOT NULL,
  slug        text UNIQUE NOT NULL,  -- usado en ?ref=slug
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- TABLA: referral_clicks
-- Escritura pública (visitantes anónimos), lectura solo autenticados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_clicks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  ip_hash     text,  -- hash de IP (opcional)
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- TABLA: solicitudes_afiliado
-- Registra leads referidos por partners.
-- Nombre distinto a "solicitudes" para no colisionar con tablas existentes.
-- Insert público (visitantes anónimos), lectura solo propia.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solicitudes_afiliado (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  datos_formulario  jsonb NOT NULL DEFAULT '{}',
  estado            text NOT NULL DEFAULT 'pendiente',
    -- pendiente | en_proceso | aprobada | cerrada | pagada
  importe_cobrado   numeric,
  override_manual   boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_solicitudes_afiliado_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS solicitudes_afiliado_updated_at ON public.solicitudes_afiliado;
CREATE TRIGGER solicitudes_afiliado_updated_at
  BEFORE UPDATE ON public.solicitudes_afiliado
  FOR EACH ROW EXECUTE FUNCTION public.set_solicitudes_afiliado_updated_at();

-- ------------------------------------------------------------
-- TABLA: comisiones
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comisiones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id     uuid NOT NULL REFERENCES public.solicitudes_afiliado(id) ON DELETE CASCADE,
  partner_id       uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  porcentaje       numeric NOT NULL DEFAULT 15,
  importe_base     numeric NOT NULL,       -- importe_cobrado de la solicitud
  importe_comision numeric NOT NULL,       -- importe_base * 0.15
  estado           text NOT NULL DEFAULT 'pendiente',
    -- pendiente | confirmada | pagada
  created_at       timestamptz NOT NULL DEFAULT now(),
  pagada_at        timestamptz
);

-- ------------------------------------------------------------
-- TABLA: super_admins_afiliados
-- Usuarios con acceso total al sistema de afiliados.
-- Nombre diferenciado para no colisionar con otros sistemas de admin.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.super_admins_afiliados (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre     text NOT NULL,
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- FUNCIÓN HELPER: is_afiliados_admin()
-- Usada en políticas RLS para verificar permisos de super admin
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_afiliados_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins_afiliados WHERE user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- FUNCIÓN: get_partner_id_by_slug
-- SECURITY DEFINER permite que usuarios anónimos consulten
-- el partner_id sin acceso directo a la tabla partners
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_partner_id_by_slug(p_slug text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM public.partners
  WHERE slug = p_slug AND activo = true
  LIMIT 1;
$$;

-- Permitir ejecución a todos (anon + authenticated)
GRANT EXECUTE ON FUNCTION public.get_partner_id_by_slug(text) TO anon, authenticated;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

-- PARTNERS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Partner puede leer su propio registro
CREATE POLICY "partner_read_own" ON public.partners
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Super admin tiene acceso total
CREATE POLICY "afiliados_admin_all_partners" ON public.partners
  FOR ALL TO authenticated
  USING (public.is_afiliados_admin())
  WITH CHECK (public.is_afiliados_admin());

-- REFERRAL_CLICKS
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede insertar (visitantes anónimos)
CREATE POLICY "clicks_insert_public" ON public.referral_clicks
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Partner puede contar sus propios clicks
CREATE POLICY "clicks_read_own" ON public.referral_clicks
  FOR SELECT TO authenticated
  USING (
    partner_id = (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- Super admin puede leer todo
CREATE POLICY "afiliados_admin_read_clicks" ON public.referral_clicks
  FOR SELECT TO authenticated
  USING (public.is_afiliados_admin());

-- SOLICITUDES_AFILIADO
ALTER TABLE public.solicitudes_afiliado ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede insertar
CREATE POLICY "solicitudes_insert_public" ON public.solicitudes_afiliado
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Partner puede leer sus propias solicitudes
CREATE POLICY "solicitudes_read_own" ON public.solicitudes_afiliado
  FOR SELECT TO authenticated
  USING (
    partner_id = (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- Super admin tiene acceso total
CREATE POLICY "afiliados_admin_all_solicitudes" ON public.solicitudes_afiliado
  FOR ALL TO authenticated
  USING (public.is_afiliados_admin())
  WITH CHECK (public.is_afiliados_admin());

-- COMISIONES
ALTER TABLE public.comisiones ENABLE ROW LEVEL SECURITY;

-- Partner puede leer sus propias comisiones
CREATE POLICY "comisiones_read_own" ON public.comisiones
  FOR SELECT TO authenticated
  USING (
    partner_id = (SELECT id FROM public.partners WHERE user_id = auth.uid())
  );

-- Super admin tiene acceso total
CREATE POLICY "afiliados_admin_all_comisiones" ON public.comisiones
  FOR ALL TO authenticated
  USING (public.is_afiliados_admin())
  WITH CHECK (public.is_afiliados_admin());

-- SUPER_ADMINS_AFILIADOS
ALTER TABLE public.super_admins_afiliados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins_afiliados_read_own" ON public.super_admins_afiliados
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- ÍNDICES para rendimiento
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_referral_clicks_partner_id ON public.referral_clicks(partner_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_afiliado_partner_id ON public.solicitudes_afiliado(partner_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_afiliado_estado ON public.solicitudes_afiliado(estado);
CREATE INDEX IF NOT EXISTS idx_comisiones_partner_id ON public.comisiones(partner_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_solicitud_id ON public.comisiones(solicitud_id);

-- ------------------------------------------------------------
-- NOTAS DE USO
-- ------------------------------------------------------------
-- 1. Para crear un super admin, insertar manualmente en super_admins_afiliados:
--    INSERT INTO public.super_admins_afiliados (user_id, nombre, email)
--    VALUES ('<uuid>', 'Nombre', 'email@imfilms.es');
--
-- 2. Para crear un partner, usar la Edge Function create-partner desde el admin.
--    La Edge Function usa service_role key (bypasa RLS).
--
-- 3. La comisión (15%) se crea manualmente desde admin cuando estado = 'aprobada':
--    INSERT INTO public.comisiones (solicitud_id, partner_id, importe_base, importe_comision)
--    VALUES ('<sol_id>', '<partner_id>', <importe>, <importe * 0.15>);
-- ------------------------------------------------------------
