-- =============================================
-- BING PLACES INTEGRATION
-- Data: 2026-02-05
-- Descrizione: Aggiunge supporto per Microsoft Bing Places
--              includendo OAuth tokens e metadati location
-- =============================================

-- =============================================
-- PARTE 1: Tabella INTEGRATIONS (se non esiste)
-- =============================================

-- Crea la tabella integrations per gestire le connessioni OAuth
-- con provider esterni (Google, Bing, Facebook, etc.)
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,

  -- Provider type
  provider TEXT NOT NULL CHECK (provider IN ('google', 'bing', 'facebook', 'apple')),

  -- OAuth Tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'expired', 'error')),

  -- Metadata aggiuntivi (es. account info, customer ID, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: un'agency può avere una sola integrazione per provider
  UNIQUE(agency_id, provider)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_integrations_agency_provider
ON public.integrations(agency_id, provider);

CREATE INDEX IF NOT EXISTS idx_integrations_status
ON public.integrations(status);

-- RLS (Row Level Security)
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Gli utenti possono vedere solo le integrations della propria agency
CREATE POLICY integrations_select_policy ON public.integrations
FOR SELECT USING (
  agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Policy: Gli utenti possono inserire integrations solo per la propria agency
CREATE POLICY integrations_insert_policy ON public.integrations
FOR INSERT WITH CHECK (
  agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Policy: Gli utenti possono aggiornare integrations solo della propria agency
CREATE POLICY integrations_update_policy ON public.integrations
FOR UPDATE USING (
  agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Policy: Gli utenti possono eliminare integrations solo della propria agency
CREATE POLICY integrations_delete_policy ON public.integrations
FOR DELETE USING (
  agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Commenti
COMMENT ON TABLE public.integrations IS
'Integrations OAuth con provider esterni (Google, Bing, Facebook, etc.)';

COMMENT ON COLUMN public.integrations.provider IS
'Tipo di provider: google, bing, facebook, apple';

COMMENT ON COLUMN public.integrations.access_token IS
'Token di accesso OAuth per chiamate API';

COMMENT ON COLUMN public.integrations.refresh_token IS
'Token per rinnovare l''access token quando scade';

COMMENT ON COLUMN public.integrations.expires_at IS
'Timestamp di scadenza dell''access token';


-- =============================================
-- PARTE 2: Campi BING nella tabella LOCATIONS
-- =============================================

-- Aggiungi campo bing_place_id (ID risorsa Bing)
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS bing_place_id TEXT;

-- Aggiungi campo bing_sync_status (stato del listing Bing)
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS bing_sync_status TEXT
CHECK (bing_sync_status IN ('Active', 'Pending', 'Suspended', 'Under Review'));

-- Aggiungi campo last_bing_sync (timestamp ultima sincronizzazione)
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS last_bing_sync TIMESTAMPTZ;

-- Aggiungi campo bing_listing_url (URL pubblico del listing)
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS bing_listing_url TEXT;

-- Indice per ricerche veloci
CREATE INDEX IF NOT EXISTS idx_locations_bing_place_id
ON public.locations(bing_place_id);

CREATE INDEX IF NOT EXISTS idx_locations_bing_sync_status
ON public.locations(bing_sync_status);

-- Commenti per documentazione
COMMENT ON COLUMN public.locations.bing_place_id IS
'ID univoco della location su Microsoft Bing Places (es: LocationId da Bing API)';

COMMENT ON COLUMN public.locations.bing_sync_status IS
'Stato di pubblicazione su Bing: Active (pubblicato), Pending (in attesa), Suspended (sospeso), Under Review (in revisione)';

COMMENT ON COLUMN public.locations.last_bing_sync IS
'Timestamp dell''ultima sincronizzazione con Bing Places';

COMMENT ON COLUMN public.locations.bing_listing_url IS
'URL pubblico del listing su Bing Maps';


-- =============================================
-- PARTE 3: Funzione di aggiornamento automatico updated_at
-- =============================================

-- Crea la funzione se non esiste
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per la tabella integrations
DROP TRIGGER IF EXISTS update_integrations_updated_at ON public.integrations;
CREATE TRIGGER update_integrations_updated_at
BEFORE UPDATE ON public.integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- =============================================
-- MESSAGGIO FINALE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Bing Places Integration abilitata!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabella INTEGRATIONS:';
  RAISE NOTICE '  - Gestisce token OAuth per Google, Bing, Facebook, etc.';
  RAISE NOTICE '  - Refresh automatico dei token';
  RAISE NOTICE '  - RLS abilitata per sicurezza multi-tenant';
  RAISE NOTICE '';
  RAISE NOTICE 'Campi LOCATIONS aggiunti:';
  RAISE NOTICE '  - bing_place_id (TEXT): ID risorsa Bing';
  RAISE NOTICE '  - bing_sync_status (TEXT): Active, Pending, Suspended, Under Review';
  RAISE NOTICE '  - last_bing_sync (TIMESTAMPTZ): Timestamp ultima sync';
  RAISE NOTICE '  - bing_listing_url (TEXT): URL pubblico del listing';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Pronto per pubblicare location su Bing Places!';
  RAISE NOTICE '';
END $$;
