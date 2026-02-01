-- =============================================
-- LOCALMENTE - Setup Semplificato (Senza PostGIS)
-- =============================================
-- Esegui questo script nella Supabase Dashboard SQL Editor
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

-- Tabella Locations (senza PostGIS, usa latitudine/longitudine normali)
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

-- Indici
CREATE INDEX IF NOT EXISTS idx_agencies_slug ON public.agencies(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON public.profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_clients_agency_id ON public.clients(agency_id);
CREATE INDEX IF NOT EXISTS idx_locations_agency_id ON public.locations(agency_id);
CREATE INDEX IF NOT EXISTS idx_locations_city ON public.locations(city);

-- Funzione per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations
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

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Policy AGENCIES
CREATE POLICY "Users can view their own agency"
  ON public.agencies FOR SELECT
  USING (id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admin can update their agency"
  ON public.agencies FOR UPDATE
  USING (id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Anyone can create agency"
  ON public.agencies FOR INSERT
  WITH CHECK (true);

-- Policy PROFILES
CREATE POLICY "Users can view profiles in their agency"
  ON public.profiles FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Anyone can create profile"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

-- Policy CLIENTS
CREATE POLICY "Users can view clients in their agency"
  ON public.clients FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create clients for their agency"
  ON public.clients FOR INSERT
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update clients in their agency"
  ON public.clients FOR UPDATE
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admin and managers can delete clients"
  ON public.clients FOR DELETE
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Policy LOCATIONS
CREATE POLICY "Users can view locations in their agency"
  ON public.locations FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create locations for their agency"
  ON public.locations FOR INSERT
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update locations in their agency"
  ON public.locations FOR UPDATE
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admin and managers can delete locations"
  ON public.locations FOR DELETE
  USING (agency_id IN (SELECT agency_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- Messaggio finale
SELECT 'Setup completato! Tabelle create con successo.' as message;
