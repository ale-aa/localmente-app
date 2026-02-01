-- =============================================
-- UPDATE LISTING DIRECTORIES FOR NAP AUDIT
-- =============================================
-- Aggiorna le directory per il sistema di audit NAP
-- basato su DataForSEO organic search API
-- =============================================

-- Rimuovi le vecchie directory (se esistono sync, verranno cancellati in cascata)
DELETE FROM public.listing_directories WHERE id IN ('google', 'bing', 'apple', 'waze');

-- Aggiorna/Inserisci le 5 directory per l'audit NAP
INSERT INTO public.listing_directories (id, name, icon_url) VALUES
  ('facebook', 'Facebook', 'https://www.google.com/s2/favicons?domain=facebook.com&sz=64'),
  ('yelp', 'Yelp', 'https://www.google.com/s2/favicons?domain=yelp.com&sz=64'),
  ('tripadvisor', 'TripAdvisor', 'https://www.google.com/s2/favicons?domain=tripadvisor.com&sz=64'),
  ('paginegialle', 'PagineGialle', 'https://www.google.com/s2/favicons?domain=paginegialle.it&sz=64'),
  ('instagram', 'Instagram', 'https://www.google.com/s2/favicons?domain=instagram.com&sz=64')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon_url = EXCLUDED.icon_url;

-- Aggiungi colonna domain per facilitare le query DataForSEO
ALTER TABLE public.listing_directories
ADD COLUMN IF NOT EXISTS domain TEXT;

-- Aggiorna i domini
UPDATE public.listing_directories SET domain = 'facebook.com' WHERE id = 'facebook';
UPDATE public.listing_directories SET domain = 'yelp.com' WHERE id = 'yelp';
UPDATE public.listing_directories SET domain = 'tripadvisor.com' WHERE id = 'tripadvisor';
UPDATE public.listing_directories SET domain = 'paginegialle.it' WHERE id = 'paginegialle';
UPDATE public.listing_directories SET domain = 'instagram.com' WHERE id = 'instagram';

-- Commento per documentazione
COMMENT ON COLUMN public.listing_directories.domain IS 'Domain used for DataForSEO site: queries (e.g., "facebook.com")';

-- Messaggio finale
SELECT '✅ Listing directories aggiornate per NAP audit!' as message;
SELECT 'Directory: Facebook, Yelp, TripAdvisor, PagineGialle, Instagram' as info;
