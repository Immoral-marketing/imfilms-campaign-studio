-- Create help_articles table for Help Center content
CREATE TABLE IF NOT EXISTS public.help_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  type text NOT NULL DEFAULT 'article',
  keywords text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

-- Anyone can view help articles (public knowledge base)
CREATE POLICY "Anyone can view help articles"
ON public.help_articles
FOR SELECT
USING (true);

-- Only admins can manage help articles
CREATE POLICY "Admins can manage help articles"
ON public.help_articles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_help_articles_updated_at
BEFORE UPDATE ON public.help_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for search
CREATE INDEX help_articles_search_idx ON public.help_articles 
USING gin(to_tsvector('spanish', title || ' ' || content));

-- Add has_completed_onboarding to distributors table
ALTER TABLE public.distributors 
ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean DEFAULT false;

-- Insert initial FAQ content
INSERT INTO public.help_articles (title, content, category, type) VALUES
('¿Qué incluye el servicio de imfilms?', 'imfilms gestiona toda tu campaña digital: configuración de audiencias, creatividad de anuncios, activación en plataformas, optimización diaria y reporte final. Tú defines el objetivo y el presupuesto; nosotros nos encargamos de la ejecución técnica.', 'Sobre campañas y wizard', 'faq'),
('¿Cuánto tiempo antes del estreno debo crear la campaña?', 'Lo ideal es planificar con 6-8 semanas de anticipación para tener tiempo de aprobar creativos, configurar audiencias y empezar la pre-campaña. Si es urgente, podemos trabajar con menos tiempo, pero el impacto puede ser menor.', 'Sobre campañas y wizard', 'faq'),
('¿Puedo modificar la campaña después de enviarla?', 'Sí, hasta que no esté aprobada puedes hacer cambios. Una vez aprobada, los ajustes mayores requieren coordinación con nuestro equipo para no afectar la estrategia ya configurada.', 'Sobre campañas y wizard', 'faq'),
('¿Cómo se calcula el precio de la campaña?', 'El precio se compone de: inversión publicitaria (lo que pagas a las plataformas), comisión variable según el monto (6-10%), tarifas por plataforma (€700 primera, €300 adicionales) y extras opcionales. El sistema te muestra el desglose completo antes de confirmar.', 'Sobre precios y facturación', 'faq'),
('¿Qué pasa si mi película no llega al público esperado?', 'imfilms optimiza la campaña para maximizar el alcance dentro del presupuesto, pero el resultado final depende de muchos factores (película, competencia, timing). No garantizamos resultados de taquilla, pero sí transparencia total en métricas digitales.', 'Sobre resultados y reportes', 'faq'),
('¿Cuándo recibo el reporte final?', 'El reporte final se entrega entre 7-10 días después de finalizar la campaña. Incluye métricas completas: alcance, clics, CTR, mejores creativos, audiencias más receptivas y recomendaciones para futuros estrenos.', 'Sobre resultados y reportes', 'faq'),
('¿Puedo usar imfilms para estrenos internacionales?', 'Por ahora trabajamos principalmente en España. Si tienes un estreno en otro territorio, consúltanos; podemos valorar casos específicos según el mercado.', 'Sobre campañas y wizard', 'faq'),
('¿Necesito tener conocimientos de marketing digital?', 'No. Ese es precisamente nuestro valor: tú te enfocas en distribuir tu película, nosotros traducimos eso a estrategia digital efectiva. El wizard te guía con preguntas simples y nuestro equipo se encarga de la complejidad técnica.', 'Sobre campañas y wizard', 'faq');

-- Insert video placeholders
INSERT INTO public.help_articles (title, content, category, type) VALUES
('Cómo crear tu primera campaña', 'Video tutorial paso a paso mostrando cómo completar el wizard, elegir plataformas y configurar tu inversión. Duración: 5 minutos.', 'Sobre campañas y wizard', 'video_placeholder'),
('Cómo interpretar el reporte final', 'Explicación visual de cada métrica del reporte: alcance, CTR, frecuencia, y cómo usarlas para mejorar futuros estrenos. Duración: 4 minutos.', 'Sobre resultados y reportes', 'video_placeholder'),
('Diferencia entre pre-campaña y campaña principal', 'Entender las fases de la campaña y por qué cada momento requiere diferente presión publicitaria. Duración: 3 minutos.', 'Sobre campañas y wizard', 'video_placeholder');

-- Insert guide articles
INSERT INTO public.help_articles (title, content, category, type, keywords) VALUES
('Cómo elegir la inversión inicial de tu campaña', E'La inversión publicitaria es el dinero que pagas directamente a las plataformas (Instagram, TikTok, etc.) para mostrar tus anuncios.\n\nNuestra recomendación:\n\n• Estreno pequeño (< 100 copias): €5.000 - €8.000\n• Estreno mediano (100-250 copias): €15.000 - €25.000\n• Estreno grande (> 250 copias): €30.000+\n\nFactores a considerar:\n\n1. Número de copias: más salas = más público potencial = más presupuesto necesario.\n2. Competencia: si hay estrenos similares, necesitas más presión para destacar.\n3. Objetivos: llenar salas el fin de semana de estreno requiere más inversión que mantener ocupación estable.\n\nRecuerda: el sistema te muestra el alcance estimado según tu inversión. Puedes ajustar para ver diferentes escenarios.', 'Sobre campañas y wizard', 'article', ARRAY['inversión', 'presupuesto', 'copias']),
('Qué incluye el servicio de imfilms', E'imfilms es tu Growth Studio: nos encargamos de toda la parte digital de tu estreno.\n\nIncluye:\n\n• Estrategia: definimos audiencias, plataformas y timing óptimo.\n• Creatividad: adaptamos tus materiales a cada formato (Stories, Reels, anuncios).\n• Activación: configuramos y lanzamos campañas en todas las plataformas elegidas.\n• Optimización diaria: ajustamos pujas, audiencias y creativos según rendimiento.\n• Reporte final: métricas completas y aprendizajes para futuros estrenos.\n\nNo incluye:\n\n• Producción de contenido desde cero (usamos tu material promocional).\n• Garantías de taquilla (optimizamos alcance digital, no resultados de sala).\n• Distribución física o logística de copias.\n\nTu rol: defines el objetivo, compartes materiales y apruebas la propuesta. El resto es nuestro.', 'Sobre campañas y wizard', 'article', ARRAY['servicio', 'incluye', 'estrategia']),
('Diferencia entre pre-campaña y campaña principal', E'Toda campaña de imfilms se divide en momentos estratégicos:\n\nPre-campaña (2-3 semanas antes):\n• Objetivo: generar awareness, hacer que la gente conozca la película.\n• Inversión: 25-30% del presupuesto.\n• Formatos: teasers, adelantos, clips.\n\nFin de semana de estreno:\n• Objetivo: conversión, llenar salas.\n• Inversión: 50-60% del presupuesto.\n• Formatos: llamadas directas a comprar entradas, horarios, salas.\n\nPost-estreno (opcional, 1-2 semanas después):\n• Objetivo: alargar recorrido, ocupación entre semana.\n• Inversión: 15-20% del presupuesto.\n• Formatos: retargeting, recordatorios a indecisos.\n\nPor qué esta estructura:\nNo puedes gastar todo en el estreno porque la gente aún no conoce la película. Tampoco puedes gastar todo antes porque pierdes el momento de compra. La distribución equilibrada maximiza el impacto.', 'Sobre campañas y wizard', 'article', ARRAY['fases', 'momentos', 'pre-campaña', 'estreno']);