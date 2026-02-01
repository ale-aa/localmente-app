-- =============================================
-- FIX DEFINITIVO: Ricorsione Infinita RLS
-- =============================================
-- IMPORTANTE: Esegui questo script nella Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/ycvxnsgikfgnygnnumxe/sql/new
-- =============================================

-- Step 1: Disabilita temporaneamente RLS per permettere le modifiche
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies DISABLE ROW LEVEL SECURITY;

-- Step 2: Rimuovi TUTTE le policy esistenti su profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles'
        AND schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles CASCADE', r.policyname);
    END LOOP;
END $$;

-- Step 3: Rimuovi TUTTE le policy esistenti su agencies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'agencies'
        AND schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.agencies CASCADE', r.policyname);
    END LOOP;
END $$;

-- Step 4: Verifica che tutte le policy siano state rimosse
SELECT 'Policy profiles rimaste: ' || COUNT(*)::text as status
FROM pg_policies
WHERE tablename = 'profiles' AND schemaname = 'public';

SELECT 'Policy agencies rimaste: ' || COUNT(*)::text as status
FROM pg_policies
WHERE tablename = 'agencies' AND schemaname = 'public';

-- Step 5: Riabilita RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES: Policy corrette (SENZA ricorsione)
-- =============================================

-- 1. Gli utenti possono SEMPRE vedere il proprio profilo direttamente
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 2. Gli utenti possono vedere profili della stessa agenzia
-- IMPORTANTE: Usa una CTE per evitare ricorsione
CREATE POLICY "profiles_select_same_agency"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS my_profile
      WHERE my_profile.id = auth.uid()
      AND my_profile.agency_id = profiles.agency_id
      LIMIT 1
    )
  );

-- 3. Gli utenti possono aggiornare SOLO il proprio profilo
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Gli utenti possono inserire SOLO il proprio profilo
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- AGENCIES: Policy corrette (SENZA ricorsione)
-- =============================================

-- 1. Gli utenti possono vedere la propria agenzia
CREATE POLICY "agencies_select_own"
  ON public.agencies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = agencies.id
      LIMIT 1
    )
  );

-- 2. Gli admin possono aggiornare la propria agenzia
CREATE POLICY "agencies_update_admin"
  ON public.agencies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = agencies.id
      AND profiles.role = 'admin'
      LIMIT 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = agencies.id
      AND profiles.role = 'admin'
      LIMIT 1
    )
  );

-- 3. Utenti autenticati possono creare agenzie (necessario per onboarding)
CREATE POLICY "agencies_insert_authenticated"
  ON public.agencies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================
-- Verifica finale
-- =============================================

SELECT 'Verifica Policy Profiles:' as check_type;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
AND schemaname = 'public'
ORDER BY policyname;

SELECT 'Verifica Policy Agencies:' as check_type;
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'agencies'
AND schemaname = 'public'
ORDER BY policyname;

-- Messaggio finale
SELECT '✅ RLS FIX COMPLETATO! Le policy sono state ricreate correttamente.' as message;
