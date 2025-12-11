-- Extender tabla campaigns con campos para detección de conflictos
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS main_goals text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_audience_text text,
ADD COLUMN IF NOT EXISTS copies_estimate text,
ADD COLUMN IF NOT EXISTS territory text DEFAULT 'España',
ADD COLUMN IF NOT EXISTS conflict_status text DEFAULT 'not_checked',
ADD COLUMN IF NOT EXISTS conflict_score integer DEFAULT 0;

-- Actualizar estados de campaña
ALTER TABLE campaigns 
ALTER COLUMN status SET DEFAULT 'borrador';

-- Crear tabla de conflictos entre campañas
CREATE TABLE IF NOT EXISTS campaign_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  other_campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  conflict_level text NOT NULL CHECK (conflict_level IN ('low', 'medium', 'high')),
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(campaign_id, other_campaign_id)
);

-- Crear tabla de assets/creativos de campaña
CREATE TABLE IF NOT EXISTS campaign_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('trailer', 'poster', 'banner_vertical', 'banner_horizontal', 'copy', 'otro')),
  file_url text NOT NULL,
  status text DEFAULT 'pendiente_revision' CHECK (status IN ('pendiente_revision', 'aprobado', 'rechazado')),
  uploaded_by uuid REFERENCES auth.users(id) NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Crear tabla de mensajería por campaña
CREATE TABLE IF NOT EXISTS campaign_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('admin', 'distributor')),
  message text NOT NULL,
  read_by_admin boolean DEFAULT false,
  read_by_distributor boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS campaign_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE campaign_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies para campaign_conflicts
CREATE POLICY "Distributors can view their campaign conflicts"
ON campaign_conflicts FOR SELECT
USING (
  auth.uid() IN (
    SELECT distributor_id FROM campaigns WHERE id = campaign_id
  )
);

CREATE POLICY "Admins can view all conflicts"
ON campaign_conflicts FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert conflicts"
ON campaign_conflicts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies para campaign_assets
CREATE POLICY "Distributors can view their campaign assets"
ON campaign_assets FOR SELECT
USING (
  auth.uid() IN (
    SELECT distributor_id FROM campaigns WHERE id = campaign_id
  )
);

CREATE POLICY "Distributors can upload their campaign assets"
ON campaign_assets FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT distributor_id FROM campaigns WHERE id = campaign_id
  )
);

CREATE POLICY "Admins can view all assets"
ON campaign_assets FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update assets"
ON campaign_assets FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies para campaign_messages
CREATE POLICY "Campaign participants can view messages"
ON campaign_messages FOR SELECT
USING (
  auth.uid() = sender_id OR
  auth.uid() IN (
    SELECT distributor_id FROM campaigns WHERE id = campaign_id
  ) OR
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can send messages to their campaigns"
ON campaign_messages FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT distributor_id FROM campaigns WHERE id = campaign_id
  ) OR
  has_role(auth.uid(), 'admin')
);

-- RLS Policies para campaign_notifications
CREATE POLICY "Users can view their own notifications"
ON campaign_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON campaign_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON campaign_notifications FOR INSERT
WITH CHECK (true);

-- Trigger para updated_at en campaign_assets
CREATE TRIGGER update_campaign_assets_updated_at
BEFORE UPDATE ON campaign_assets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Añadir género a films si no existe
ALTER TABLE films
ADD COLUMN IF NOT EXISTS genre text;