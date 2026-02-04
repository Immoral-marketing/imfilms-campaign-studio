-- Create access_logs table to track user logins/activity
CREATE TABLE IF NOT EXISTS access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);

-- RLS
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Users can insert their own logs
CREATE POLICY "Users can insert their own access logs"
  ON access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2. Admins can view all logs
CREATE POLICY "Admins can view all access logs"
  ON access_logs
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. Users can view their own logs (optional, but good for completeness)
CREATE POLICY "Users can view their own access logs"
  ON access_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE access_logs IS 'Tracks user access events for analytics';
