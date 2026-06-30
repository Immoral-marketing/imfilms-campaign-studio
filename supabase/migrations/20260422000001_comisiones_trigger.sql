-- ============================================================
-- Sistema de Afiliados v2 · Comisiones automáticas · Abril 2026
-- ============================================================

-- Constraint única: una solicitud solo puede generar una comisión.
-- Necesaria para que ON CONFLICT funcione en el trigger.
CREATE UNIQUE INDEX IF NOT EXISTS comisiones_solicitud_id_unique
  ON public.comisiones (solicitud_id);

-- ------------------------------------------------------------
-- FUNCIÓN: auto_generate_comision
-- Se dispara AFTER UPDATE en solicitudes_afiliado.
--
-- Regla de negocio:
--   Si la solicitud pasa a estado 'cerrada' con partner_id e importe_cobrado > 0
--   → genera o actualiza la comisión al 10% del importe_cobrado.
--
--   Si la solicitud se re-abre (estado deja de ser 'cerrada')
--   → la comisión vuelve a 'pendiente' pero NO se elimina.
--
--   Si ya existe una comisión pagada → no se toca (pagada es estado final).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_generate_comision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.estado = 'cerrada'
     AND NEW.partner_id IS NOT NULL
     AND NEW.importe_cobrado IS NOT NULL
     AND NEW.importe_cobrado > 0
  THEN
    INSERT INTO public.comisiones (
      solicitud_id,
      partner_id,
      porcentaje,
      importe_base,
      importe_comision,
      estado
    )
    VALUES (
      NEW.id,
      NEW.partner_id,
      10,
      NEW.importe_cobrado,
      NEW.importe_cobrado * 0.10,
      'pendiente'
    )
    ON CONFLICT (solicitud_id) DO UPDATE SET
      partner_id       = EXCLUDED.partner_id,
      importe_base     = EXCLUDED.importe_base,
      importe_comision = EXCLUDED.importe_comision
    WHERE public.comisiones.estado <> 'pagada';

  ELSIF OLD.estado = 'cerrada' AND NEW.estado <> 'cerrada' THEN
    -- Solicitud re-abierta: revertir comisión a pendiente si no está pagada
    UPDATE public.comisiones
    SET estado = 'pendiente'
    WHERE solicitud_id = NEW.id
      AND estado <> 'pagada';
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- TRIGGER en solicitudes_afiliado
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS solicitudes_afiliado_auto_comision ON public.solicitudes_afiliado;

CREATE TRIGGER solicitudes_afiliado_auto_comision
  AFTER UPDATE ON public.solicitudes_afiliado
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_comision();
