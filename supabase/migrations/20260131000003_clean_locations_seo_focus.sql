-- =============================================
-- CLEAN LOCATIONS TABLE - SEO FOCUS
-- =============================================
-- Rimuove tutti i campi immobiliari e mantiene solo
-- i dati necessari per Local SEO (NAP + Geo-Grid)
-- =============================================

-- Step 1: Aggiungi nuovi campi SEO-focused (se non esistono)
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS place_id TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS description TEXT;

-- Step 2: Migra i dati esistenti
UPDATE public.locations
SET business_name = title
WHERE business_name IS NULL AND title IS NOT NULL;

-- Step 3: Rimuovi campi immobiliari non necessari per SEO
ALTER TABLE public.locations DROP COLUMN IF EXISTS property_type CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS contract_type CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS status CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS floor CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS total_floors CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS rooms CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS bedrooms CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS bathrooms CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS surface_area CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS terrace_area CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS garden_area CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS parking_spaces CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS price CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS price_per_sqm CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS monthly_rent CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS condominium_fees CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS heating_costs CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS energy_class CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS furnished CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS elevator CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS balcony CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS terrace CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS garden CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS parking CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS reference_code CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS catasto_data CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS features CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS images CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS virtual_tour_url CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS is_published CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS published_at CASCADE;
ALTER TABLE public.locations DROP COLUMN IF EXISTS views_count CASCADE;

-- Step 4: Rimuovi il vecchio campo title (ora abbiamo business_name)
ALTER TABLE public.locations DROP COLUMN IF EXISTS title CASCADE;

-- Step 5: Aggiungi constraint NOT NULL su campi obbligatori SEO
ALTER TABLE public.locations ALTER COLUMN business_name SET NOT NULL;

-- Step 6: Aggiungi indici utili per SEO
CREATE INDEX IF NOT EXISTS idx_locations_place_id ON public.locations(place_id);
CREATE INDEX IF NOT EXISTS idx_locations_category ON public.locations(category);
CREATE INDEX IF NOT EXISTS idx_locations_is_active ON public.locations(is_active);

-- Step 7: Rimuovi trigger non più necessari
DROP TRIGGER IF EXISTS calculate_location_price_per_sqm ON public.locations;
DROP FUNCTION IF EXISTS calculate_price_per_sqm();

-- Step 8: Aggiungi commento alla tabella
COMMENT ON TABLE public.locations IS 'Sedi/Location per Local SEO - Source of Truth per NAP (Name, Address, Phone)';
COMMENT ON COLUMN public.locations.business_name IS 'Nome dell''attività (N in NAP)';
COMMENT ON COLUMN public.locations.address IS 'Indirizzo via (A in NAP)';
COMMENT ON COLUMN public.locations.phone IS 'Telefono principale (P in NAP)';
COMMENT ON COLUMN public.locations.email IS 'Email attività';
COMMENT ON COLUMN public.locations.website IS 'Sito web attività';
COMMENT ON COLUMN public.locations.latitude IS 'Latitudine per Geo-Grid Ranking';
COMMENT ON COLUMN public.locations.longitude IS 'Longitudine per Geo-Grid Ranking';
COMMENT ON COLUMN public.locations.category IS 'Categoria Google Business (es: restaurant, hotel, store)';
COMMENT ON COLUMN public.locations.place_id IS 'Google Place ID';

-- Messaggio finale
SELECT '✅ Schema LOCATIONS pulito! Focus su Local SEO (NAP + Geo-Grid)' as message;
SELECT 'Campi rimossi: ' || COUNT(*)::text || ' campi immobiliari eliminati' as info
FROM information_schema.columns
WHERE table_name = 'locations'
AND table_schema = 'public'
AND column_name IN ('property_type', 'price', 'rooms', 'energy_class');
