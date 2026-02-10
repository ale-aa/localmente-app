-- =============================================
-- GOOGLE SYNC STATUS TRACKING
-- =============================================
-- Aggiunge campi per tracciare lo stato di sincronizzazione
-- con Google Business Profile per ogni location
-- =============================================

-- Aggiungi campi per tracking sync Google
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS google_sync_status TEXT CHECK (google_sync_status IN ('synced', 'pending', 'action_needed'));

ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS google_last_sync TIMESTAMPTZ;

ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS google_last_error TEXT;

-- Commenti per documentazione
COMMENT ON COLUMN public.locations.google_sync_status IS 'Stato sincronizzazione con Google Business Profile: synced (ok), pending (in attesa), action_needed (errore)';
COMMENT ON COLUMN public.locations.google_last_sync IS 'Timestamp dell''ultima sincronizzazione (tentativo) con Google';
COMMENT ON COLUMN public.locations.google_last_error IS 'Ultimo messaggio di errore dalla API Google (per debugging)';

-- Messaggio finale
SELECT '✅ Google Sync Status tracking abilitato!' as message;
SELECT 'Nuovi campi: google_sync_status, google_last_sync, google_last_error' as fields;
