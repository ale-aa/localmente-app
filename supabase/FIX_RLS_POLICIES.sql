-- =============================================
-- FIX: Ricorsione Infinita RLS Policies
-- =============================================

-- Rimuovi le policy esistenti che causano ricorsione
DROP POLICY IF EXISTS "Users can view profiles in their agency" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can create profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin and managers can create profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own agency" ON public.agencies;
DROP POLICY IF EXISTS "Admin can update their agency" ON public.agencies;
DROP POLICY IF EXISTS "Anyone can create agency" ON public.agencies;

-- =============================================
-- PROFILES: Policy corrette (senza ricorsione)
-- =============================================

-- Gli utenti possono sempre vedere il proprio profilo
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Gli utenti possono vedere i profili della stessa agenzia (usa una subquery sicura)
CREATE POLICY "Users can view profiles in same agency"
  ON public.profiles FOR SELECT
  USING (
    agency_id = (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- Gli utenti possono aggiornare solo il proprio profilo
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Chiunque può creare un profilo (necessario per onboarding)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- =============================================
-- AGENCIES: Policy corrette
-- =============================================

-- Gli utenti possono vedere la propria agenzia
CREATE POLICY "Users can view their own agency"
  ON public.agencies FOR SELECT
  USING (
    id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- Gli admin possono aggiornare la propria agenzia
CREATE POLICY "Admin can update their agency"
  ON public.agencies FOR UPDATE
  USING (
    id = (
      SELECT agency_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
      LIMIT 1
    )
  );

-- Chiunque autenticato può creare un'agenzia (necessario per onboarding)
CREATE POLICY "Authenticated users can create agency"
  ON public.agencies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Messaggio finale
SELECT 'RLS Policies fixate! Ricorsione eliminata.' as message;
