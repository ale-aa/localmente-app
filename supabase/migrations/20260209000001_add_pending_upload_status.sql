-- =============================================
-- ADD PENDING_UPLOAD STATUS TO BING_SYNC_STATUS
-- Data: 2026-02-09
-- Descrizione: Aggiunge 'pending_upload' come valore valido
--              per bing_sync_status (CSV fallback strategy)
-- =============================================

-- Drop il constraint esistente
ALTER TABLE public.locations
DROP CONSTRAINT IF EXISTS locations_bing_sync_status_check;

-- Ricrea il constraint con il nuovo valore 'pending_upload'
ALTER TABLE public.locations
ADD CONSTRAINT locations_bing_sync_status_check
CHECK (bing_sync_status IN ('Active', 'Pending', 'Suspended', 'Under Review', 'pending_upload'));

-- Commento aggiornato
COMMENT ON COLUMN public.locations.bing_sync_status IS
'Stato di pubblicazione su Bing: Active (pubblicato), Pending (in attesa), Suspended (sospeso), Under Review (in revisione), pending_upload (in attesa di export CSV)';

-- Messaggio finale
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Aggiunto valore pending_upload a bing_sync_status';
  RAISE NOTICE '   Ora supporta: Active, Pending, Suspended, Under Review, pending_upload';
  RAISE NOTICE '';
END $$;
