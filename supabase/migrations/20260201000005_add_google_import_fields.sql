-- =============================================
-- ADD GOOGLE IMPORT FIELDS TO LOCATIONS
-- =============================================
-- Aggiunge campi necessari per l'import da Google Business Profile
-- =============================================

-- Aggiungi google_place_id come chiave univoca per l'import
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS google_place_id TEXT UNIQUE;

-- Aggiungi postal_code se non esiste
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Aggiungi opening_hours (JSONB per flessibilità)
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS opening_hours JSONB;

-- Indice per google_place_id (per performance upsert)
CREATE INDEX IF NOT EXISTS idx_locations_google_place_id ON public.locations(google_place_id);

-- Commenti per documentazione
COMMENT ON COLUMN public.locations.google_place_id IS 'Google Business Profile Location ID (formato: accounts/{accountId}/locations/{locationId}) - Chiave univoca per import';
COMMENT ON COLUMN public.locations.postal_code IS 'Codice postale/CAP';
COMMENT ON COLUMN public.locations.opening_hours IS 'Orari di apertura in formato JSON (Google regularHours format)';

-- Messaggio finale
SELECT '✅ Campi Google import aggiunti a locations!' as message;
SELECT 'Colonne: google_place_id (UNIQUE), postal_code, opening_hours (JSONB)' as info;
