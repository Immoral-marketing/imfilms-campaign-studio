-- Create table for storing verification codes
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '15 minutes'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    verified BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Only server can insert/select (service_role)
-- But we might need public insert if we do it from client side? 
-- No, we said we will use Edge Function. Edge Function uses service_role key.
-- So we can keep it private or allow anon insert if needed, but best is service_role.

-- Let's stick to service_role mostly. 
-- However, if we want to debug easily, we might allow select for authenticated users? No security risk.
-- Actually, let's keep it locked down. Only Edge Functions should interact with this.

CREATE POLICY "Service role full access" ON public.verification_codes
    AS PERMISSIVE FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_verification_codes_email_code ON public.verification_codes(email, code);
