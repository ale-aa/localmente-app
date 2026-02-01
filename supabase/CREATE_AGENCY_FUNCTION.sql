-- =============================================
-- SOLUZIONE DEFINITIVA: Funzione per Creare Agenzia
-- =============================================
-- Questa funzione bypassa RLS in modo sicuro
-- permettendo all'utente di creare l'agenzia e il profilo
-- senza incorrere in ricorsioni
-- =============================================

-- Drop della funzione se esiste
DROP FUNCTION IF EXISTS create_agency_with_profile(
  p_user_id UUID,
  p_agency_name TEXT,
  p_agency_slug TEXT,
  p_vat_number TEXT,
  p_address TEXT,
  p_city TEXT,
  p_province TEXT,
  p_postal_code TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_user_email TEXT,
  p_full_name TEXT
);

-- Crea la funzione con SECURITY DEFINER (esegue con privilegi del creatore)
CREATE OR REPLACE FUNCTION create_agency_with_profile(
  p_user_id UUID,
  p_agency_name TEXT,
  p_agency_slug TEXT,
  p_vat_number TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_province TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Esegue con privilegi elevati, bypassando RLS
SET search_path = public
AS $$
DECLARE
  v_agency_id UUID;
  v_existing_agency_id UUID;
BEGIN
  -- 1. Verifica se lo slug è già in uso
  SELECT id INTO v_existing_agency_id
  FROM public.agencies
  WHERE slug = p_agency_slug
  LIMIT 1;

  IF v_existing_agency_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'slug_already_exists',
      'message', 'Questo slug è già in uso'
    );
  END IF;

  -- 2. Verifica se l'utente ha già un'agenzia
  SELECT agency_id INTO v_existing_agency_id
  FROM public.profiles
  WHERE id = p_user_id
  LIMIT 1;

  IF v_existing_agency_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'user_already_has_agency',
      'message', 'Utente già associato a un''agenzia'
    );
  END IF;

  -- 3. Crea l'agenzia
  INSERT INTO public.agencies (
    name,
    slug,
    vat_number,
    address,
    city,
    province,
    postal_code,
    phone,
    email,
    status,
    subscription_tier
  ) VALUES (
    p_agency_name,
    p_agency_slug,
    p_vat_number,
    p_address,
    p_city,
    p_province,
    p_postal_code,
    p_phone,
    p_email,
    'trial',
    'basic'
  )
  RETURNING id INTO v_agency_id;

  -- 4. Crea o aggiorna il profilo dell'utente
  INSERT INTO public.profiles (
    id,
    agency_id,
    email,
    full_name,
    role,
    is_active
  ) VALUES (
    p_user_id,
    v_agency_id,
    COALESCE(p_user_email, ''),
    COALESCE(p_full_name, ''),
    'admin',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    agency_id = v_agency_id,
    role = 'admin',
    is_active = true,
    updated_at = NOW();

  -- 5. Ritorna successo con l'ID dell'agenzia
  RETURN json_build_object(
    'success', true,
    'agency_id', v_agency_id,
    'message', 'Agenzia creata con successo'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- In caso di errore, ritorna il messaggio
    RETURN json_build_object(
      'success', false,
      'error', 'database_error',
      'message', SQLERRM
    );
END;
$$;

-- Permetti agli utenti autenticati di chiamare questa funzione
GRANT EXECUTE ON FUNCTION create_agency_with_profile TO authenticated;

-- Messaggio finale
SELECT '✅ Funzione create_agency_with_profile creata con successo!' as message;
SELECT 'Questa funzione bypassa RLS in modo sicuro per l''onboarding.' as info;
