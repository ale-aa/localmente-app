-- =============================================
-- Migration: Add onboarding_completed to profiles
-- Data: 2026-02-05
-- Descrizione: Aggiunge il flag onboarding_completed per forzare
--              il flusso di onboarding sui nuovi utenti
-- =============================================

-- Aggiungi il campo onboarding_completed alla tabella profiles
ALTER TABLE public.profiles
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Crea indice per performance sulle query filtrate
CREATE INDEX idx_profiles_onboarding_completed ON public.profiles(onboarding_completed);

-- Commento per documentazione
COMMENT ON COLUMN public.profiles.onboarding_completed IS
'Indica se l''utente ha completato il flusso di onboarding iniziale (scelta user_type)';

-- Log della migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completata: onboarding_completed aggiunto a profiles';
  RAISE NOTICE '   - Default: false (forza onboarding per nuovi utenti)';
  RAISE NOTICE '   - Indice creato per performance';
END $$;
