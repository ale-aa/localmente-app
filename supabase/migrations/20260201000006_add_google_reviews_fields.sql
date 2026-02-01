-- =============================================
-- ADD GOOGLE REVIEWS INTEGRATION FIELDS
-- =============================================
-- Aggiunge campi per integrare recensioni da Google Business Profile
-- =============================================

-- Aggiungi google_review_id come chiave univoca per sync
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS google_review_id TEXT UNIQUE;

-- Aggiungi campi per reviewer info da Google
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS reviewer_display_name TEXT;

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS reviewer_photo_url TEXT;

-- Aggiungi source per distinguere recensioni locali vs Google
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'google', 'facebook', 'yelp'));

-- Indice per google_review_id (per performance sync)
CREATE INDEX IF NOT EXISTS idx_reviews_google_review_id ON public.reviews(google_review_id);
CREATE INDEX IF NOT EXISTS idx_reviews_source ON public.reviews(source);

-- Migra i dati esistenti: author_name -> reviewer_display_name se non c'è già
UPDATE public.reviews
SET reviewer_display_name = author_name
WHERE reviewer_display_name IS NULL;

-- Commenti per documentazione
COMMENT ON COLUMN public.reviews.google_review_id IS 'Google Review ID (formato: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}) - Chiave univoca per sync';
COMMENT ON COLUMN public.reviews.reviewer_display_name IS 'Nome visualizzato del recensore (può essere diverso da author_name per privacy)';
COMMENT ON COLUMN public.reviews.reviewer_photo_url IS 'URL foto profilo del recensore da Google';
COMMENT ON COLUMN public.reviews.source IS 'Fonte della recensione: manual (inserita manualmente), google (da Google Business), facebook, yelp, etc.';
COMMENT ON COLUMN public.reviews.author_name IS 'Nome autore recensione (deprecato, usare reviewer_display_name)';

-- Messaggio finale
SELECT '✅ Campi Google Reviews aggiunti!' as message;
SELECT 'Colonne: google_review_id (UNIQUE), reviewer_display_name, reviewer_photo_url, source' as info;
