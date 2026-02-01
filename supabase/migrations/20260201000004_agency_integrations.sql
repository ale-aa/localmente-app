-- =============================================
-- AGENCY INTEGRATIONS (Google Business Profile OAuth)
-- =============================================
-- Tabella per salvare i token OAuth delle integrazioni
-- esterne a livello di agenzia
-- =============================================

-- Tabella agency_integrations
CREATE TABLE IF NOT EXISTS public.agency_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google_business',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  google_account_id TEXT,
  google_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Vincolo di unicità: un'agenzia può avere solo un'integrazione per provider
  UNIQUE(agency_id, provider)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_agency_integrations_agency_id ON public.agency_integrations(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_integrations_provider ON public.agency_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_agency_integrations_token_expiry ON public.agency_integrations(token_expiry);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_agency_integrations_updated_at
  BEFORE UPDATE ON public.agency_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commenti per documentazione
COMMENT ON TABLE public.agency_integrations IS 'OAuth tokens for external integrations (Google Business Profile, etc.) at agency level';
COMMENT ON COLUMN public.agency_integrations.access_token IS 'OAuth2 access token (short-lived, ~1h for Google)';
COMMENT ON COLUMN public.agency_integrations.refresh_token IS 'OAuth2 refresh token (long-lived, used to renew access_token)';
COMMENT ON COLUMN public.agency_integrations.token_expiry IS 'When the access_token expires (UTC timestamp)';
COMMENT ON COLUMN public.agency_integrations.google_account_id IS 'Google account ID (sub claim from userinfo)';
COMMENT ON COLUMN public.agency_integrations.google_email IS 'Google account email for display purposes';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.agency_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Gli utenti possono vedere solo le integrazioni della propria agenzia
CREATE POLICY "Users can view their agency integrations"
  ON public.agency_integrations FOR SELECT
  USING (
    agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- Policy: Solo admin e manager possono creare integrazioni
CREATE POLICY "Admin and managers can create agency integrations"
  ON public.agency_integrations FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
      LIMIT 1
    )
  );

-- Policy: Solo admin e manager possono aggiornare integrazioni
CREATE POLICY "Admin and managers can update agency integrations"
  ON public.agency_integrations FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
      LIMIT 1
    )
  );

-- Policy: Solo admin e manager possono eliminare integrazioni
CREATE POLICY "Admin and managers can delete agency integrations"
  ON public.agency_integrations FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
      LIMIT 1
    )
  );

-- Messaggio finale
SELECT '✅ Agency integrations schema creato con successo!' as message;
SELECT 'Tabella: agency_integrations (OAuth tokens storage)' as info;
