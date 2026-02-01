-- =============================================
-- ADD COMPETITORS TO RANK_RESULTS
-- =============================================
-- Aggiunge la colonna competitors per salvare
-- i top 5 competitor per ogni punto della griglia
-- =============================================

-- Aggiungi colonna competitors (JSONB)
ALTER TABLE public.rank_results
ADD COLUMN IF NOT EXISTS competitors JSONB;

-- Aggiungi commento per documentazione
COMMENT ON COLUMN public.rank_results.competitors IS 'Top 5 competitors for this grid point. Format: [{"rank": 1, "name": "Business Name", "place_id": "ChIJ..."}, ...]';

-- Messaggio finale
SELECT 'Colonna competitors aggiunta a rank_results!' as message;
