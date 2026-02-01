-- =============================================
-- ADD ZOOM FIELD TO RANK_SCANS
-- =============================================
-- Aggiunge il parametro zoom alle scansioni rank
-- per permettere di controllare il livello di zoom
-- nelle chiamate all'API DataForSEO
-- =============================================

-- Aggiungi campo zoom (default 15, che è un buon compromesso per Local SEO)
ALTER TABLE public.rank_scans
ADD COLUMN IF NOT EXISTS zoom INTEGER DEFAULT 15 CHECK (zoom >= 10 AND zoom <= 20);

-- Aggiungi commento per documentazione
COMMENT ON COLUMN public.rank_scans.zoom IS 'Map zoom level for DataForSEO API (10-20). Higher = more precise location. Default: 15';

-- Messaggio finale
SELECT 'Campo zoom aggiunto a rank_scans!' as message;
