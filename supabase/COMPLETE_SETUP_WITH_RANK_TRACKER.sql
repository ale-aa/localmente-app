-- =============================================
-- LOCALMENTE - Setup Completo + Rank Tracker
-- =============================================
-- Esegui questo script nella Supabase Dashboard SQL Editor
-- Include: Tabelle base + Rank Tracker
-- =============================================

-- Tabella Agencies
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  vat_number TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'IT',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
  subscription_tier TEXT DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'pro', 'enterprise')),
  max_users INTEGER DEFAULT 5,
  max_clients INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'manager', 'agent')),
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  fiscal_code TEXT,
  vat_number TEXT,
  birth_date DATE,
  birth_place TEXT,
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'IT',
  client_type TEXT DEFAULT 'individual' CHECK (client_type IN ('individual', 'company')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella Locations
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house', 'commercial', 'office', 'land', 'garage', 'other')),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('sale', 'rent', 'rent_to_buy')),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'rented', 'unavailable')),
  address TEXT NOT NULL,
  street_number TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'IT',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  floor INTEGER,
  total_floors INTEGER,
  rooms INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  surface_area NUMERIC(10, 2),
  terrace_area NUMERIC(10, 2),
  garden_area NUMERIC(10, 2),
  parking_spaces INTEGER DEFAULT 0,
  price NUMERIC(12, 2),
  price_per_sqm NUMERIC(10, 2),
  monthly_rent NUMERIC(10, 2),
  condominium_fees NUMERIC(10, 2),
  heating_costs NUMERIC(10, 2),
  energy_class TEXT CHECK (energy_class IN ('A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G')),
  furnished BOOLEAN DEFAULT false,
  elevator BOOLEAN DEFAULT false,
  balcony BOOLEAN DEFAULT false,
  terrace BOOLEAN DEFAULT false,
  garden BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT false,
  reference_code TEXT UNIQUE,
  catasto_data JSONB,
  features JSONB,
  images TEXT[],
  virtual_tour_url TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RANK TRACKER TABLES
-- =============================================

-- Tabella rank_scans
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

-- Tabella rank_results
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

-- =============================================
-- INDICI
-- =============================================

CREATE INDEX IF NOT EXISTS idx_agencies_slug ON public.agencies(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON public.profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON public.clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_locations_agency_id ON public.locations(agency_id);
CREATE INDEX IF NOT EXISTS idx_locations_city ON public.locations(city);
CREATE INDEX IF NOT EXISTS idx_rank_scans_location_id ON public.rank_scans(location_id);
CREATE INDEX IF NOT EXISTS idx_rank_scans_status ON public.rank_scans(status);
CREATE INDEX IF NOT EXISTS idx_rank_scans_created_at ON public.rank_scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rank_results_scan_id ON public.rank_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_rank_results_rank ON public.rank_results(rank);
CREATE INDEX IF NOT EXISTS idx_rank_results_grid_index ON public.rank_results(grid_index);

-- =============================================
-- FUNZIONI E TRIGGER
-- =============================================

-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger updated_at
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rank_scans_updated_at BEFORE UPDATE ON public.rank_scans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calcolo prezzo al mq
CREATE OR REPLACE FUNCTION calculate_price_per_sqm()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.surface_area > 0 AND NEW.price > 0 THEN
    NEW.price_per_sqm = NEW.price / NEW.surface_area;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_location_price_per_sqm
  BEFORE INSERT OR UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION calculate_price_per_sqm();

-- Aggiornamento statistiche scan
CREATE OR REPLACE FUNCTION update_scan_statistics()
RETURNS TRIGGER AS $$
DECLARE
  scan_stats RECORD;
BEGIN
  SELECT
    COUNT(*) as total,
    COUNT(rank) as with_rank,
    AVG(rank) FILTER (WHERE rank IS NOT NULL) as avg_rank,
    MIN(rank) FILTER (WHERE rank IS NOT NULL) as best_rank
  INTO scan_stats
  FROM public.rank_results
  WHERE scan_id = NEW.scan_id;

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

CREATE TRIGGER update_scan_stats_on_result_insert
  AFTER INSERT ON public.rank_results
  FOR EACH ROW EXECUTE FUNCTION update_scan_statistics();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_results ENABLE ROW LEVEL SECURITY;

-- Policy PROFILES (senza ricorsione)
-- Gli utenti possono sempre vedere il proprio profilo
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- Gli utenti possono vedere i profili della stessa agenzia (usa LIMIT 1 per evitare ricorsione)
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

-- Chiunque può creare il proprio profilo (necessario per onboarding)
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Policy AGENCIES (senza ricorsione)
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

-- Policy CLIENTS
CREATE POLICY "Users can view clients in their agency"
  ON public.clients FOR SELECT
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Users can create clients for their agency"
  ON public.clients FOR INSERT
  WITH CHECK (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Users can update clients in their agency"
  ON public.clients FOR UPDATE
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Admin and managers can delete clients"
  ON public.clients FOR DELETE
  USING (
    agency_id = (
      SELECT agency_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
      LIMIT 1
    )
  );

-- Policy LOCATIONS
CREATE POLICY "Users can view locations in their agency"
  ON public.locations FOR SELECT
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Users can create locations for their agency"
  ON public.locations FOR INSERT
  WITH CHECK (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Users can update locations in their agency"
  ON public.locations FOR UPDATE
  USING (agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1));

CREATE POLICY "Admin and managers can delete locations"
  ON public.locations FOR DELETE
  USING (
    agency_id = (
      SELECT agency_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
      LIMIT 1
    )
  );

-- Policy RANK_SCANS
CREATE POLICY "Users can view rank scans in their agency"
  ON public.rank_scans FOR SELECT
  USING (
    location_id IN (
      SELECT id FROM public.locations
      WHERE agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Users can create rank scans for their agency locations"
  ON public.rank_scans FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT id FROM public.locations
      WHERE agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Users can update rank scans in their agency"
  ON public.rank_scans FOR UPDATE
  USING (
    location_id IN (
      SELECT id FROM public.locations
      WHERE agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Admin and managers can delete rank scans"
  ON public.rank_scans FOR DELETE
  USING (
    location_id IN (
      SELECT l.id FROM public.locations l
      WHERE l.agency_id = (
        SELECT agency_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
        LIMIT 1
      )
    )
  );

-- Policy RANK_RESULTS
CREATE POLICY "Users can view rank results in their agency"
  ON public.rank_results FOR SELECT
  USING (
    scan_id IN (
      SELECT rs.id FROM public.rank_scans rs
      JOIN public.locations l ON l.id = rs.location_id
      WHERE l.agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Users can create rank results for their agency scans"
  ON public.rank_results FOR INSERT
  WITH CHECK (
    scan_id IN (
      SELECT rs.id FROM public.rank_scans rs
      JOIN public.locations l ON l.id = rs.location_id
      WHERE l.agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
    )
  );

CREATE POLICY "Admin and managers can delete rank results"
  ON public.rank_results FOR DELETE
  USING (
    scan_id IN (
      SELECT rs.id FROM public.rank_scans rs
      JOIN public.locations l ON l.id = rs.location_id
      WHERE l.agency_id = (
        SELECT agency_id FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
        LIMIT 1
      )
    )
  );

-- Messaggio finale
SELECT 'Setup completo! Tabelle create con successo (incluso Rank Tracker).' as message;
