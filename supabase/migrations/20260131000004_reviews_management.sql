-- =============================================
-- REVIEWS MANAGEMENT - Reputation Tracking
-- =============================================
-- Sistema per gestire recensioni e risposte con AI mock
-- =============================================

-- Step 1: Crea tabella reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,

  -- Review Data
  author_name TEXT NOT NULL,
  star_rating INTEGER NOT NULL CHECK (star_rating >= 1 AND star_rating <= 5),
  content TEXT,
  review_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Reply Data
  reply_text TEXT,
  reply_date TIMESTAMPTZ,

  -- Status Management
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'archived')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Aggiungi indici per performance
CREATE INDEX IF NOT EXISTS idx_reviews_location_id ON public.reviews(location_id);
CREATE INDEX IF NOT EXISTS idx_reviews_agency_id ON public.reviews(agency_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_star_rating ON public.reviews(star_rating);
CREATE INDEX IF NOT EXISTS idx_reviews_review_date ON public.reviews(review_date DESC);

-- Step 3: Trigger per updated_at
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- Step 4: RLS Policies
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reviews from their agency
CREATE POLICY "reviews_select_own_agency"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert reviews for their agency
CREATE POLICY "reviews_insert_own_agency"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Policy: Users can update reviews in their agency
CREATE POLICY "reviews_update_own_agency"
  ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Step 5: Commenti
COMMENT ON TABLE public.reviews IS 'Recensioni dei clienti e risposte per Reputation Management';
COMMENT ON COLUMN public.reviews.star_rating IS 'Valutazione da 1 a 5 stelle';
COMMENT ON COLUMN public.reviews.status IS 'pending: da rispondere, replied: risposto, archived: archiviato';
COMMENT ON COLUMN public.reviews.reply_text IS 'Testo della risposta (generato da AI o modificato manualmente)';

-- Messaggio finale
SELECT '✅ Schema REVIEWS creato! Pronto per Reputation Management' as message;
