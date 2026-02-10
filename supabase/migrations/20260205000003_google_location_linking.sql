-- =============================================
-- GOOGLE LOCATION LINKING
-- Data: 2026-02-05
-- Descrizione: Aggiunge i campi necessari per collegare
--              una Location locale con una Google Business Location
-- =============================================

-- 1. Aggiungi campo google_location_id (Resource Name da Google)
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS google_location_id TEXT;

-- Indice per ricerche veloci
CREATE INDEX IF NOT EXISTS idx_locations_google_location_id
ON public.locations(google_location_id);

-- 2. Aggiungi campo google_metadata (JSONB per metadati completi)
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS google_metadata JSONB;

-- Indice GIN per query su JSONB
CREATE INDEX IF NOT EXISTS idx_locations_google_metadata
ON public.locations USING GIN(google_metadata);

-- 3. Aggiorna il CHECK constraint per google_sync_status
-- Rimuovi il vecchio constraint
ALTER TABLE public.locations
DROP CONSTRAINT IF EXISTS locations_google_sync_status_check;

-- Aggiungi il nuovo constraint con 'linked'
ALTER TABLE public.locations
ADD CONSTRAINT locations_google_sync_status_check
CHECK (google_sync_status IN ('linked', 'synced', 'pending', 'action_needed'));

-- 4. Commenti per documentazione
COMMENT ON COLUMN public.locations.google_location_id IS
'Resource name della location su Google Business Profile (es: accounts/123/locations/456)';

COMMENT ON COLUMN public.locations.google_metadata IS
'Metadati completi della location Google (nome, indirizzo, telefono, etc.) in formato JSON';

-- 5. Aggiorna il commento per google_sync_status
COMMENT ON COLUMN public.locations.google_sync_status IS
'Stato sincronizzazione Google: linked (collegato), synced (sincronizzato), pending (in attesa), action_needed (richiede azione)';

-- Messaggio finale
DO $$
BEGIN
  RAISE NOTICE '✅ Google Location Linking abilitato!';
  RAISE NOTICE '   Campi aggiunti:';
  RAISE NOTICE '   - google_location_id (TEXT): Resource name Google';
  RAISE NOTICE '   - google_metadata (JSONB): Metadati completi';
  RAISE NOTICE '   - google_sync_status: Aggiunto stato "linked"';
END $$;
