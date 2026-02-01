-- =============================================
-- RANK TRACKER SCHEMA
-- =============================================

-- Tabella rank_scans
-- Contiene le richieste di scansione rank per keyword
CREATE TABLE IF NOT EXISTS public.rank_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  grid_size INTEGER NOT NULL CHECK (grid_size IN (3, 5, 7, 9)),
  radius_meters INTEGER NOT NULL CHECK (radius_meters > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  error_message TEXT,
  total_points INTEGER,
  completed_points INTEGER DEFAULT 0,
  average_rank NUMERIC(5, 2),
  best_rank INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_rank_scans_location_id ON public.rank_scans(location_id);
CREATE INDEX IF NOT EXISTS idx_rank_scans_status ON public.rank_scans(status);
CREATE INDEX IF NOT EXISTS idx_rank_scans_created_at ON public.rank_scans(created_at DESC);

-- Tabella rank_results
-- Contiene i risultati individuali per ogni punto della griglia
CREATE TABLE IF NOT EXISTS public.rank_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.rank_scans(id) ON DELETE CASCADE,
  grid_index INTEGER NOT NULL,
  rank INTEGER,
  found_place_id TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_rank_results_scan_id ON public.rank_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_rank_results_rank ON public.rank_results(rank);
CREATE INDEX IF NOT EXISTS idx_rank_results_grid_index ON public.rank_results(grid_index);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_rank_scans_updated_at BEFORE UPDATE ON public.rank_scans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funzione per calcolare statistiche scan automaticamente
CREATE OR REPLACE FUNCTION update_scan_statistics()
RETURNS TRIGGER AS $$
DECLARE
  scan_stats RECORD;
BEGIN
  -- Calcola statistiche aggregate
  SELECT
    COUNT(*) as total,
    COUNT(rank) as with_rank,
    AVG(rank) FILTER (WHERE rank IS NOT NULL) as avg_rank,
    MIN(rank) FILTER (WHERE rank IS NOT NULL) as best_rank
  INTO scan_stats
  FROM public.rank_results
  WHERE scan_id = NEW.scan_id;

  -- Aggiorna la scan
  UPDATE public.rank_scans
  SET
    completed_points = scan_stats.total,
    average_rank = scan_stats.avg_rank,
    best_rank = scan_stats.best_rank,
    updated_at = NOW()
  WHERE id = NEW.scan_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare statistiche quando viene inserito un risultato
CREATE TRIGGER update_scan_stats_on_result_insert
  AFTER INSERT ON public.rank_results
  FOR EACH ROW EXECUTE FUNCTION update_scan_statistics();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.rank_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_results ENABLE ROW LEVEL SECURITY;

-- Policy RANK_SCANS
-- Gli utenti possono vedere solo le scansioni delle location della propria agenzia
CREATE POLICY "Users can view rank scans in their agency"
  ON public.rank_scans FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM public.locations
      WHERE agency_id IN (
        SELECT agency_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Gli utenti possono creare scansioni per le location della propria agenzia
CREATE POLICY "Users can create rank scans for their agency locations"
  ON public.rank_scans FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT id FROM public.locations
      WHERE agency_id IN (
        SELECT agency_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Gli utenti possono aggiornare le scansioni della propria agenzia
CREATE POLICY "Users can update rank scans in their agency"
  ON public.rank_scans FOR UPDATE
  USING (
    location_id IN (
      SELECT id FROM public.locations
      WHERE agency_id IN (
        SELECT agency_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Admin e manager possono eliminare scansioni
CREATE POLICY "Admin and managers can delete rank scans"
  ON public.rank_scans FOR DELETE
  USING (
    location_id IN (
      SELECT l.id FROM public.locations l
      JOIN public.profiles p ON p.agency_id = l.agency_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
  );

-- Policy RANK_RESULTS
-- Gli utenti possono vedere i risultati delle scansioni della propria agenzia
CREATE POLICY "Users can view rank results in their agency"
  ON public.rank_results FOR SELECT
  USING (
    scan_id IN (
      SELECT rs.id FROM public.rank_scans rs
      JOIN public.locations l ON l.id = rs.location_id
      WHERE l.agency_id IN (
        SELECT agency_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Gli utenti possono creare risultati per le scansioni della propria agenzia
CREATE POLICY "Users can create rank results for their agency scans"
  ON public.rank_results FOR INSERT
  WITH CHECK (
    scan_id IN (
      SELECT rs.id FROM public.rank_scans rs
      JOIN public.locations l ON l.id = rs.location_id
      WHERE l.agency_id IN (
        SELECT agency_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Admin e manager possono eliminare risultati
CREATE POLICY "Admin and managers can delete rank results"
  ON public.rank_results FOR DELETE
  USING (
    scan_id IN (
      SELECT rs.id FROM public.rank_scans rs
      JOIN public.locations l ON l.id = rs.location_id
      JOIN public.profiles p ON p.agency_id = l.agency_id
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'manager')
    )
  );

-- Messaggio finale
SELECT 'Rank Tracker schema creato con successo!' as message;
