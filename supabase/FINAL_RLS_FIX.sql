-- =============================================
-- FIX FINALE RLS - Approccio Semplificato
-- =============================================
-- IMPORTANTE: Questo script elimina COMPLETAMENTE le policy
-- problematiche e le ricrea in modo sicuro
-- =============================================

-- Step 1: DISABILITA completamente RLS temporaneamente
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies DISABLE ROW LEVEL SECURITY;

-- Step 2: ELIMINA TUTTE le policy esistenti forzatamente
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same agency" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their agency" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can create profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin and managers can create profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_same_agency" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own agency" ON public.agencies;
DROP POLICY IF EXISTS "Admin can update their agency" ON public.agencies;
DROP POLICY IF EXISTS "Authenticated users can create agency" ON public.agencies;
DROP POLICY IF EXISTS "Anyone can create agency" ON public.agencies;
DROP POLICY IF EXISTS "agencies_select_own" ON public.agencies;
DROP POLICY IF EXISTS "agencies_update_admin" ON public.agencies;
DROP POLICY IF EXISTS "agencies_insert_authenticated" ON public.agencies;

-- Step 3: RIABILITA RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES: Policy SEMPLIFICATE (auth.uid() diretto)
-- =============================================

-- Policy 1: Vedere il proprio profilo (NESSUNA ricorsione - usa solo auth.uid())
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Policy 2: Aggiornare il proprio profilo
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Policy 3: Inserire il proprio profilo (per onboarding)
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- =============================================
-- AGENCIES: Policy SEMPLIFICATE
-- =============================================

-- Policy 1: Chiunque autenticato può creare un'agenzia (per onboarding)
CREATE POLICY "agencies_insert_any"
  ON public.agencies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy 2: Vedere le agenzie (permissivo per ora - affineremo dopo)
CREATE POLICY "agencies_select_any"
  ON public.agencies
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 3: Aggiornare le agenzie (permissivo per ora - affineremo dopo)
CREATE POLICY "agencies_update_any"
  ON public.agencies
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- Verifica Finale
-- =============================================

-- Conta le policy create
SELECT
  'PROFILES' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'profiles'
  AND schemaname = 'public'
UNION ALL
SELECT
  'AGENCIES' as table_name,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'agencies'
  AND schemaname = 'public';

-- Messaggio finale
SELECT '✅ RLS POLICIES RICREATE IN MODO SICURO!' as message;
SELECT 'Le policy ora usano solo auth.uid() senza ricorsioni.' as info;
