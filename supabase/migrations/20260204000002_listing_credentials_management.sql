-- =============================================
-- LISTING CREDENTIALS MANAGEMENT
-- =============================================
-- Aggiunge supporto per gestione credenziali cliente
-- e stati avanzati per workflow Concierge
-- =============================================

-- 1. Aggiorna il campo submission_status per includere 'failed'
ALTER TABLE public.listing_syncs
DROP CONSTRAINT IF EXISTS listing_syncs_submission_status_check;

ALTER TABLE public.listing_syncs
ADD CONSTRAINT listing_syncs_submission_status_check
CHECK (submission_status IN ('synced', 'processing', 'action_needed', 'failed'));

-- 2. Aggiungi campo per note admin visibili al cliente
ALTER TABLE public.listing_syncs
ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- 3. Aggiungi campo per credenziali del cliente (JSONB per flessibilità)
ALTER TABLE public.listing_syncs
ADD COLUMN IF NOT EXISTS credentials JSONB;

-- 4. Aggiungi campo per tracking quando cliente ha inviato credenziali
ALTER TABLE public.listing_syncs
ADD COLUMN IF NOT EXISTS credentials_submitted_at TIMESTAMPTZ;

-- 5. Aggiungi indice per performance su submission_status
DROP INDEX IF EXISTS idx_listing_syncs_submission_status;
CREATE INDEX idx_listing_syncs_submission_status ON public.listing_syncs(submission_status) WHERE submission_status IS NOT NULL;

-- 6. Aggiungi commenti per documentazione
COMMENT ON COLUMN public.listing_syncs.admin_note IS 'Note dell''admin visibili al cliente (es: "Password errata", "Serve 2FA")';
COMMENT ON COLUMN public.listing_syncs.credentials IS 'Credenziali fornite dal cliente per accesso directory (JSON: {username, password, notes})';
COMMENT ON COLUMN public.listing_syncs.credentials_submitted_at IS 'Timestamp quando cliente ha inviato le credenziali';

-- Messaggio finale
SELECT '✅ Listing Credentials Management schema aggiornato!' as message;
SELECT 'Stati: synced, processing, action_needed, failed' as states;
SELECT 'Nuovi campi: admin_note, credentials, credentials_submitted_at' as new_fields;
