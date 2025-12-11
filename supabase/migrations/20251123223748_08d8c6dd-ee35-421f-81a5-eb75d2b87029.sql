-- ============================================================================
-- MIGRACIÓN: Modelo B2B maduro para imfilms
-- ============================================================================

-- 1. SISTEMA ÚNICO DE DISTRIBUIDORAS
-- Añadir normalized_name y garantizar unicidad
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS normalized_name text;
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS main_country text;
ALTER TABLE distributors ADD COLUMN IF NOT EXISTS region text;

-- Crear función para normalizar nombres
CREATE OR REPLACE FUNCTION normalize_company_name(name text)
RETURNS text AS $$
BEGIN
  RETURN lower(trim(regexp_replace(
    translate(name, 
      'áéíóúàèìòùäëïöüâêîôûãõñçÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑÇ',
      'aeiouaeiouaeiouaeiouaoncAEIOUAEIOUAEIOUAEIOUAONC'
    ),
    '\s+', ' ', 'g'
  )));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Poblar normalized_name para distribuidoras existentes
UPDATE distributors 
SET normalized_name = normalize_company_name(company_name)
WHERE normalized_name IS NULL;

-- Deduplicar distribuidoras con mismo normalized_name
-- Mantener la más antigua, añadir sufijo a las demás
WITH duplicates AS (
  SELECT 
    id, 
    normalized_name,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY normalized_name ORDER BY created_at ASC) as rn
  FROM distributors
  WHERE normalized_name IN (
    SELECT normalized_name 
    FROM distributors 
    GROUP BY normalized_name 
    HAVING COUNT(*) > 1
  )
)
UPDATE distributors d
SET normalized_name = duplicates.normalized_name || '-' || duplicates.rn
FROM duplicates
WHERE d.id = duplicates.id
AND duplicates.rn > 1;

-- Crear índice único sobre normalized_name
CREATE UNIQUE INDEX IF NOT EXISTS idx_distributors_normalized_name 
ON distributors(normalized_name);

-- Trigger para mantener normalized_name actualizado
CREATE OR REPLACE FUNCTION update_distributor_normalized_name()
RETURNS trigger AS $$
BEGIN
  NEW.normalized_name := normalize_company_name(NEW.company_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_distributor_normalized_name ON distributors;
CREATE TRIGGER trigger_update_distributor_normalized_name
  BEFORE INSERT OR UPDATE OF company_name ON distributors
  FOR EACH ROW
  EXECUTE FUNCTION update_distributor_normalized_name();

-- 2. RELACIÓN USUARIOS ↔ DISTRIBUIDORA (MULTI-USUARIO)
CREATE TABLE IF NOT EXISTS distributor_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'marketing' CHECK (role IN ('owner', 'marketing', 'finance', 'readonly')),
  can_receive_reports boolean DEFAULT true,
  can_manage_campaigns boolean DEFAULT true,
  can_manage_billing boolean DEFAULT false,
  is_owner boolean DEFAULT false,
  pending_approval boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(distributor_id, user_id)
);

-- Índices para distributor_users
CREATE INDEX IF NOT EXISTS idx_distributor_users_distributor ON distributor_users(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_users_user ON distributor_users(user_id);
CREATE INDEX IF NOT EXISTS idx_distributor_users_pending ON distributor_users(pending_approval) WHERE pending_approval = true;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_distributor_users_updated_at ON distributor_users;
CREATE TRIGGER trigger_distributor_users_updated_at
  BEFORE UPDATE ON distributor_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrar usuarios existentes a distributor_users
INSERT INTO distributor_users (distributor_id, user_id, role, is_owner, can_receive_reports, can_manage_campaigns, can_manage_billing)
SELECT id, id, 'owner', true, true, true, true
FROM distributors
WHERE id NOT IN (SELECT user_id FROM distributor_users)
ON CONFLICT (distributor_id, user_id) DO NOTHING;

-- 3. ENTIDAD TITLES (PELÍCULAS SEPARADAS DE CAMPAÑAS)
CREATE TABLE IF NOT EXISTS titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  internal_title_code text,
  film_title text NOT NULL,
  planned_release_date date NOT NULL,
  status text DEFAULT 'en_desarrollo' CHECK (status IN ('en_desarrollo', 'confirmado', 'en_campana', 'finalizado')),
  genre text,
  country text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para titles
CREATE INDEX IF NOT EXISTS idx_titles_distributor ON titles(distributor_id);
CREATE INDEX IF NOT EXISTS idx_titles_release_date ON titles(planned_release_date);
CREATE INDEX IF NOT EXISTS idx_titles_status ON titles(status);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_titles_updated_at ON titles;
CREATE TRIGGER trigger_titles_updated_at
  BEFORE UPDATE ON titles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Migrar films existentes a titles
INSERT INTO titles (id, distributor_id, film_title, planned_release_date, status, genre, country)
SELECT id, distributor_id, title, release_date, 'en_campana', genre, country
FROM films
ON CONFLICT (id) DO NOTHING;

-- Añadir title_id a campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS title_id uuid REFERENCES titles(id);

-- Migrar relación film_id -> title_id
UPDATE campaigns SET title_id = film_id WHERE title_id IS NULL;

-- 4. REPORTES PDF
CREATE TABLE IF NOT EXISTS campaign_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title_id uuid REFERENCES titles(id),
  file_url text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  report_type text DEFAULT 'final' CHECK (report_type IN ('final', 'intermedio', 'otro')),
  version int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Índices para campaign_reports
CREATE INDEX IF NOT EXISTS idx_campaign_reports_campaign ON campaign_reports(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_reports_title ON campaign_reports(title_id);

-- Storage bucket para reportes
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaign-reports', 'campaign-reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para campaign_reports bucket
CREATE POLICY "Admins can upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-reports' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Distributors can view their reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'campaign-reports'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 
      FROM campaign_reports cr
      JOIN campaigns c ON cr.campaign_id = c.id
      JOIN distributor_users du ON c.distributor_id = du.distributor_id
      WHERE du.user_id = auth.uid()
      AND du.is_active = true
      AND split_part(storage.objects.name, '/', 1) = cr.campaign_id::text
    )
  )
);

-- 5. PLANTILLAS DE CAMPAÑA
CREATE TABLE IF NOT EXISTS campaign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  platforms jsonb DEFAULT '[]'::jsonb,
  investment_distribution jsonb DEFAULT '{}'::jsonb,
  investment_range_min numeric,
  investment_range_max numeric,
  strategic_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para campaign_templates
CREATE INDEX IF NOT EXISTS idx_campaign_templates_distributor ON campaign_templates(distributor_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trigger_campaign_templates_updated_at ON campaign_templates;
CREATE TRIGGER trigger_campaign_templates_updated_at
  BEFORE UPDATE ON campaign_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. SHARE TOKENS PARA COMPARTIR CAMPAÑAS
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS public_share_token uuid DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_share_token ON campaigns(public_share_token);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- RLS para distributor_users
ALTER TABLE distributor_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their distributor associations"
ON distributor_users FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage team"
ON distributor_users FOR ALL
TO authenticated
USING (
  distributor_id IN (
    SELECT distributor_id 
    FROM distributor_users 
    WHERE user_id = auth.uid() 
    AND is_owner = true 
    AND is_active = true
  )
);

CREATE POLICY "Users can request distributor access"
ON distributor_users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND pending_approval = true);

-- RLS para titles
ALTER TABLE titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distributors can view their titles"
ON titles FOR SELECT
TO authenticated
USING (
  distributor_id IN (
    SELECT distributor_id 
    FROM distributor_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Distributors can insert their titles"
ON titles FOR INSERT
TO authenticated
WITH CHECK (
  distributor_id IN (
    SELECT distributor_id 
    FROM distributor_users 
    WHERE user_id = auth.uid() 
    AND can_manage_campaigns = true 
    AND is_active = true
  )
);

CREATE POLICY "Distributors can update their titles"
ON titles FOR UPDATE
TO authenticated
USING (
  distributor_id IN (
    SELECT distributor_id 
    FROM distributor_users 
    WHERE user_id = auth.uid() 
    AND can_manage_campaigns = true 
    AND is_active = true
  )
);

CREATE POLICY "Admins can view all titles"
ON titles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS para campaign_reports
ALTER TABLE campaign_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reports"
ON campaign_reports FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Distributors can view their reports"
ON campaign_reports FOR SELECT
TO authenticated
USING (
  campaign_id IN (
    SELECT c.id 
    FROM campaigns c
    JOIN distributor_users du ON c.distributor_id = du.distributor_id
    WHERE du.user_id = auth.uid() 
    AND du.can_receive_reports = true 
    AND du.is_active = true
  )
);

-- RLS para campaign_templates
ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distributors can view their templates"
ON campaign_templates FOR SELECT
TO authenticated
USING (
  distributor_id IN (
    SELECT distributor_id 
    FROM distributor_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Distributors can manage their templates"
ON campaign_templates FOR ALL
TO authenticated
USING (
  distributor_id IN (
    SELECT distributor_id 
    FROM distributor_users 
    WHERE user_id = auth.uid() 
    AND can_manage_campaigns = true 
    AND is_active = true
  )
);

-- Policy para compartir campañas públicamente
CREATE POLICY "Anyone can view shared campaigns"
ON campaigns FOR SELECT
TO anon, authenticated
USING (public_share_token IS NOT NULL);

-- Actualizar policies de campaigns para usar distributor_users
DROP POLICY IF EXISTS "Distributors can view their own campaigns" ON campaigns;
CREATE POLICY "Distributors can view their campaigns"
ON campaigns FOR SELECT
TO authenticated
USING (
  distributor_id IN (
    SELECT distributor_id 
    FROM distributor_users 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Distributors can insert their own campaigns" ON campaigns;
CREATE POLICY "Distributors can insert campaigns"
ON campaigns FOR INSERT
TO authenticated
WITH CHECK (
  distributor_id IN (
    SELECT distributor_id 
    FROM distributor_users 
    WHERE user_id = auth.uid() 
    AND can_manage_campaigns = true 
    AND is_active = true
  )
);

DROP POLICY IF EXISTS "Distributors can update their own campaigns" ON campaigns;
CREATE POLICY "Distributors can update campaigns"
ON campaigns FOR UPDATE
TO authenticated
USING (
  distributor_id IN (
    SELECT distributor_id 
    FROM distributor_users 
    WHERE user_id = auth.uid() 
    AND can_manage_campaigns = true 
    AND is_active = true
  )
);