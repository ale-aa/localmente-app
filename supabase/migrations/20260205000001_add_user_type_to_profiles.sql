-- =============================================
-- Migration: Add user_type to profiles
-- Data: 2026-02-05
-- Descrizione: Aggiunge il campo user_type per supportare
--              la Business Mode (agency vs business users)
-- =============================================

-- Aggiungi il campo user_type alla tabella profiles
ALTER TABLE public.profiles
ADD COLUMN user_type TEXT NOT NULL DEFAULT 'agency'
CHECK (user_type IN ('agency', 'business'));

-- Crea indice per performance sulle query filtrate per user_type
CREATE INDEX idx_profiles_user_type ON public.profiles(user_type);

-- Commento per documentazione
COMMENT ON COLUMN public.profiles.user_type IS
'Tipo di utente: agency (gestisce più clienti) o business (gestisce solo la propria attività)';

-- Log della migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration completata: user_type aggiunto a profiles';
  RAISE NOTICE '   - Default: agency (per retrocompatibilità)';
  RAISE NOTICE '   - Valori ammessi: agency, business';
  RAISE NOTICE '   - Indice creato per performance';
END $$;
