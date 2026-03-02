-- ============================================================================
-- MIGRACIÓN: Tabla de estados de lectura por usuario único
-- Fecha: 2026-03-01
-- Descripción: Permite que cada usuario (Admin o Distribuidora) tenga su propia marca de lectura
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.message_read_states (
    message_id uuid REFERENCES public.campaign_messages(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at timestamptz DEFAULT now() NOT NULL,
    PRIMARY KEY (message_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.message_read_states ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users can view their own read states"
    ON public.message_read_states
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read states"
    ON public.message_read_states
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Índices para optimizar consultas de mensajes no leídos
CREATE INDEX IF NOT EXISTS idx_message_read_states_user_id ON public.message_read_states(user_id);
CREATE INDEX IF NOT EXISTS idx_message_read_states_message_id ON public.message_read_states(message_id);

COMMENT ON TABLE public.message_read_states IS 'Registra qué mensajes/notificaciones ha leído cada usuario individualmente';
