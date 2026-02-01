-- =============================================
-- LISTING MANAGEMENT
-- =============================================
-- Tabelle per gestire la sincronizzazione delle location
-- su directory esterne (Google, Bing, Apple Maps, Waze, Facebook)
-- =============================================

-- Tabella listing_directories (dati statici delle directory)
CREATE TABLE IF NOT EXISTS public.listing_directories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserisci le 5 directory statiche
INSERT INTO public.listing_directories (id, name, icon_url) VALUES
  ('google', 'Google Business Profile', 'https://www.google.com/s2/favicons?domain=google.com&sz=64'),
  ('bing', 'Bing Places', 'https://www.google.com/s2/favicons?domain=bing.com&sz=64'),
  ('apple', 'Apple Maps', 'https://www.google.com/s2/favicons?domain=apple.com&sz=64'),
  ('waze', 'Waze', 'https://www.google.com/s2/favicons?domain=waze.com&sz=64'),
  ('facebook', 'Facebook Places', 'https://www.google.com/s2/favicons?domain=facebook.com&sz=64')
ON CONFLICT (id) DO NOTHING;

-- Tabella listing_syncs (stato di sincronizzazione per location)
CREATE TABLE IF NOT EXISTS public.listing_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  directory_id TEXT NOT NULL REFERENCES public.listing_directories(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('synced', 'mismatch', 'missing', 'processing')),
  last_check_at TIMESTAMPTZ DEFAULT NOW(),
  listing_url TEXT,
  remote_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Vincolo di unicità: una location può avere solo un sync per directory
  UNIQUE(location_id, directory_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_listing_syncs_location_id ON public.listing_syncs(location_id);
CREATE INDEX IF NOT EXISTS idx_listing_syncs_directory_id ON public.listing_syncs(directory_id);
CREATE INDEX IF NOT EXISTS idx_listing_syncs_status ON public.listing_syncs(status);
CREATE INDEX IF NOT EXISTS idx_listing_syncs_last_check ON public.listing_syncs(last_check_at DESC);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_listing_syncs_updated_at
  BEFORE UPDATE ON public.listing_syncs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.listing_directories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_syncs ENABLE ROW LEVEL SECURITY;

-- Policy per listing_directories (tutti possono leggere le directory)
CREATE POLICY "Anyone can view directories"
  ON public.listing_directories FOR SELECT
  TO authenticated
  USING (true);

-- Policy per listing_syncs (gli utenti vedono solo i sync delle location della propria agenzia)
CREATE POLICY "Users can view listing syncs in their agency"
  ON public.listing_syncs FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM public.locations
      WHERE agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Users can create listing syncs for their agency locations"
  ON public.listing_syncs FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT id FROM public.locations
      WHERE agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Users can update listing syncs in their agency"
  ON public.listing_syncs FOR UPDATE
  USING (
    location_id IN (
      SELECT id FROM public.locations
      WHERE agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Admin and managers can delete listing syncs"
  ON public.listing_syncs FOR DELETE
  USING (
    location_id IN (
      SELECT l.id FROM public.locations l
      WHERE l.agency_id = (
        SELECT agency_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
        LIMIT 1
      )
    )
  );

-- Messaggio finale
SELECT '✅ Listing Management schema creato con successo!' as message;
SELECT 'Tabelle: listing_directories (5 directory), listing_syncs' as info;
