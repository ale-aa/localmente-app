-- Abilita estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Tabella Agencies
-- Ogni agenzia rappresenta un cliente SaaS di Localmente
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- Per URL personalizzati (es: agenzia-roma)
  vat_number TEXT, -- Partita IVA
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

-- Indici per performance
CREATE INDEX idx_agencies_slug ON public.agencies(slug);
CREATE INDEX idx_agencies_status ON public.agencies(status);

-- Tabella Profiles
-- Estende auth.users con informazioni specifiche del dominio
CREATE TABLE public.profiles (
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

-- Indici per performance
CREATE INDEX idx_profiles_agency_id ON public.profiles(agency_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Tabella Clients
-- Clienti delle agenzie (inquilini, proprietari, acquirenti, etc.)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  fiscal_code TEXT, -- Codice Fiscale
  vat_number TEXT, -- Partita IVA (se azienda)
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
  tags TEXT[], -- Array di tag per categorizzazione
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_clients_agency_id ON public.clients(agency_id);
CREATE INDEX idx_clients_created_by ON public.clients(created_by);
CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_clients_phone ON public.clients(phone);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_tags ON public.clients USING GIN(tags);

-- Tabella Locations
-- Immobili gestiti dalle agenzie
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,

  -- Informazioni base
  title TEXT NOT NULL,
  description TEXT,
  property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house', 'commercial', 'office', 'land', 'garage', 'other')),
  contract_type TEXT NOT NULL CHECK (contract_type IN ('sale', 'rent', 'rent_to_buy')),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold', 'rented', 'unavailable')),

  -- Indirizzo
  address TEXT NOT NULL,
  street_number TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'IT',

  -- Coordinate geografiche (PostGIS)
  coordinates GEOGRAPHY(POINT, 4326), -- Lat/Lng in formato WGS84

  -- Caratteristiche immobile
  floor INTEGER,
  total_floors INTEGER,
  rooms INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  surface_area NUMERIC(10, 2), -- mq
  terrace_area NUMERIC(10, 2),
  garden_area NUMERIC(10, 2),
  parking_spaces INTEGER DEFAULT 0,

  -- Prezzi e costi
  price NUMERIC(12, 2),
  price_per_sqm NUMERIC(10, 2),
  monthly_rent NUMERIC(10, 2),
  condominium_fees NUMERIC(10, 2),
  heating_costs NUMERIC(10, 2),

  -- Caratteristiche aggiuntive
  energy_class TEXT CHECK (energy_class IN ('A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G')),
  furnished BOOLEAN DEFAULT false,
  elevator BOOLEAN DEFAULT false,
  balcony BOOLEAN DEFAULT false,
  terrace BOOLEAN DEFAULT false,
  garden BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT false,

  -- Metadati
  reference_code TEXT UNIQUE, -- Codice riferimento interno agenzia
  catasto_data JSONB, -- Dati catastali in formato JSON
  features JSONB, -- Caratteristiche aggiuntive flessibili
  images TEXT[], -- Array di URL immagini
  virtual_tour_url TEXT,

  -- Visibilità e pubblicazione
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX idx_locations_agency_id ON public.locations(agency_id);
CREATE INDEX idx_locations_created_by ON public.locations(created_by);
CREATE INDEX idx_locations_owner_id ON public.locations(owner_id);
CREATE INDEX idx_locations_property_type ON public.locations(property_type);
CREATE INDEX idx_locations_contract_type ON public.locations(contract_type);
CREATE INDEX idx_locations_status ON public.locations(status);
CREATE INDEX idx_locations_city ON public.locations(city);
CREATE INDEX idx_locations_price ON public.locations(price);
CREATE INDEX idx_locations_reference_code ON public.locations(reference_code);

-- Indice spaziale per query geografiche
CREATE INDEX idx_locations_coordinates ON public.locations USING GIST(coordinates);

-- Funzione per aggiornare updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_agencies_updated_at BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Abilita RLS su tutte le tabelle
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Policy per AGENCIES
-- Gli utenti possono vedere solo la propria agenzia
CREATE POLICY "Users can view their own agency"
  ON public.agencies FOR SELECT
  USING (
    id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Solo admin possono modificare l'agenzia
CREATE POLICY "Admin can update their agency"
  ON public.agencies FOR UPDATE
  USING (
    id IN (
      SELECT agency_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy per PROFILES
-- Gli utenti possono vedere i profili della propria agenzia
CREATE POLICY "Users can view profiles in their agency"
  ON public.profiles FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Gli utenti possono aggiornare il proprio profilo
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- Solo admin e manager possono creare nuovi utenti
CREATE POLICY "Admin and managers can create profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Policy per CLIENTS
-- Gli utenti possono vedere i clienti della propria agenzia
CREATE POLICY "Users can view clients in their agency"
  ON public.clients FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Gli utenti possono creare clienti per la propria agenzia
CREATE POLICY "Users can create clients for their agency"
  ON public.clients FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Gli utenti possono aggiornare clienti della propria agenzia
CREATE POLICY "Users can update clients in their agency"
  ON public.clients FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Solo admin e manager possono eliminare clienti
CREATE POLICY "Admin and managers can delete clients"
  ON public.clients FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Policy per LOCATIONS
-- Gli utenti possono vedere le location della propria agenzia
CREATE POLICY "Users can view locations in their agency"
  ON public.locations FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Gli utenti possono creare location per la propria agenzia
CREATE POLICY "Users can create locations for their agency"
  ON public.locations FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Gli utenti possono aggiornare location della propria agenzia
CREATE POLICY "Users can update locations in their agency"
  ON public.locations FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Solo admin e manager possono eliminare location
CREATE POLICY "Admin and managers can delete locations"
  ON public.locations FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- =============================================
-- FUNZIONI HELPER
-- =============================================

-- Funzione per calcolare il prezzo al mq automaticamente
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

-- Funzione per validare le coordinate geografiche
CREATE OR REPLACE FUNCTION validate_coordinates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.coordinates IS NOT NULL THEN
    -- Verifica che le coordinate siano valide (Italia circa)
    IF ST_Y(NEW.coordinates::geometry) < 35 OR ST_Y(NEW.coordinates::geometry) > 48 THEN
      RAISE EXCEPTION 'Latitudine fuori dal range valido per l''Italia';
    END IF;
    IF ST_X(NEW.coordinates::geometry) < 6 OR ST_X(NEW.coordinates::geometry) > 19 THEN
      RAISE EXCEPTION 'Longitudine fuori dal range valido per l''Italia';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_location_coordinates
  BEFORE INSERT OR UPDATE ON public.locations
  FOR EACH ROW EXECUTE FUNCTION validate_coordinates();
