-- =============================================
-- HYBRID LISTING MANAGEMENT (Strada Concierge)
-- =============================================
-- Aggiunge supporto per gestione ibrida dei listing:
-- - Tier 1 (Automatico): Google Maps, Facebook
-- - Tier 2 (Concierge): Yelp, TripAdvisor, PagineGialle, Apple Maps
-- =============================================

-- 1. Aggiungi campo 'type' alla tabella listing_directories
ALTER TABLE public.listing_directories
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'automated' CHECK (type IN ('automated', 'manual'));

-- 2. Aggiungi Google Maps e Apple Maps alle directory
INSERT INTO public.listing_directories (id, name, icon_url, domain, type) VALUES
  ('google', 'Google Maps', 'https://www.google.com/s2/favicons?domain=google.com&sz=64', 'google.com', 'automated'),
  ('apple', 'Apple Maps', 'https://www.google.com/s2/favicons?domain=apple.com&sz=64', 'apple.com', 'manual')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon_url = EXCLUDED.icon_url,
  domain = EXCLUDED.domain,
  type = EXCLUDED.type;

-- 3. Aggiorna il tipo delle directory esistenti
UPDATE public.listing_directories SET type = 'automated' WHERE id = 'facebook';
UPDATE public.listing_directories SET type = 'manual' WHERE id IN ('yelp', 'tripadvisor', 'paginegialle');

-- 4. Rimuovi Instagram (non necessario per il sistema Concierge)
DELETE FROM public.listing_directories WHERE id = 'instagram';

-- 5. Aggiungi campi per gestione manuale alla tabella listing_syncs
ALTER TABLE public.listing_syncs
ADD COLUMN IF NOT EXISTS submission_status TEXT CHECK (submission_status IN ('synced', 'processing', 'action_needed'));

ALTER TABLE public.listing_syncs
ADD COLUMN IF NOT EXISTS last_manual_check TIMESTAMPTZ;

-- 6. Aggiungi commenti per documentazione
COMMENT ON COLUMN public.listing_directories.type IS 'Type of directory management: "automated" (via API) or "manual" (Concierge service)';
COMMENT ON COLUMN public.listing_syncs.submission_status IS 'Status for manual listings: synced, processing, action_needed. NULL for automated listings.';
COMMENT ON COLUMN public.listing_syncs.last_manual_check IS 'Timestamp of last manual verification for Concierge listings';

-- 7. Crea indice per performance su submission_status
CREATE INDEX IF NOT EXISTS idx_listing_syncs_submission_status ON public.listing_syncs(submission_status) WHERE submission_status IS NOT NULL;

-- Messaggio finale
SELECT '✅ Hybrid Listing Management schema aggiornato!' as message;
SELECT 'Tier 1 (Automated): Google Maps, Facebook' as tier1;
SELECT 'Tier 2 (Concierge): Yelp, TripAdvisor, PagineGialle, Apple Maps' as tier2;
