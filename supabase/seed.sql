-- Seed Data per Testing
-- ATTENZIONE: Questi sono dati di esempio. Non usare in produzione.

-- Inserisci un'agenzia di test
INSERT INTO public.agencies (
  id,
  name,
  slug,
  vat_number,
  address,
  city,
  province,
  postal_code,
  email,
  phone,
  status,
  subscription_tier
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Agenzia Immobiliare Roma Centro',
  'agenzia-roma-centro',
  'IT12345678901',
  'Via del Corso, 123',
  'Roma',
  'RM',
  '00186',
  'info@agenziaromacentro.it',
  '+39 06 1234567',
  'active',
  'pro'
);

-- Nota: I profili utente verranno creati automaticamente quando un utente si registra
-- attraverso Supabase Auth. Questo è solo un esempio di come verrebbero collegati.

-- Inserisci alcuni clienti di esempio
INSERT INTO public.clients (
  agency_id,
  first_name,
  last_name,
  email,
  phone,
  mobile,
  client_type,
  status,
  city,
  province
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Mario',
    'Rossi',
    'mario.rossi@email.it',
    '+39 06 9876543',
    '+39 333 1234567',
    'individual',
    'active',
    'Roma',
    'RM'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Laura',
    'Bianchi',
    'laura.bianchi@email.it',
    '+39 06 8765432',
    '+39 347 7654321',
    'individual',
    'active',
    'Roma',
    'RM'
  );

-- Inserisci alcune location di esempio
INSERT INTO public.locations (
  agency_id,
  title,
  description,
  property_type,
  contract_type,
  status,
  address,
  street_number,
  city,
  province,
  postal_code,
  coordinates,
  floor,
  total_floors,
  rooms,
  bedrooms,
  bathrooms,
  surface_area,
  price,
  monthly_rent,
  energy_class,
  furnished,
  elevator,
  balcony,
  reference_code,
  is_published
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Appartamento luminoso a Trastevere',
    'Bellissimo appartamento di 85 mq situato nel cuore di Trastevere, completamente ristrutturato con finiture di pregio.',
    'apartment',
    'sale',
    'available',
    'Via della Scala',
    '42',
    'Roma',
    'RM',
    '00153',
    ST_SetSRID(ST_MakePoint(12.4698, 41.8902), 4326)::geography, -- Coordinate Trastevere
    2,
    4,
    3,
    2,
    1,
    85.00,
    385000.00,
    NULL,
    'C',
    false,
    true,
    true,
    'ROM-TRAS-001',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Monolocale moderno Prati',
    'Monolocale arredato di recente costruzione, ideale per studenti o giovani professionisti.',
    'apartment',
    'rent',
    'available',
    'Via Cola di Rienzo',
    '156',
    'Roma',
    'RM',
    '00192',
    ST_SetSRID(ST_MakePoint(12.4634, 41.9072), 4326)::geography, -- Coordinate Prati
    5,
    7,
    1,
    0,
    1,
    45.00,
    NULL,
    950.00,
    'B',
    true,
    true,
    false,
    'ROM-PRAT-002',
    true
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Villa con giardino Appia Antica',
    'Splendida villa indipendente con ampio giardino, zona prestigiosa e tranquilla.',
    'house',
    'sale',
    'available',
    'Via Appia Antica',
    '89',
    'Roma',
    'RM',
    '00179',
    ST_SetSRID(ST_MakePoint(12.5136, 41.8566), 4326)::geography, -- Coordinate Appia
    0,
    2,
    6,
    4,
    3,
    280.00,
    1250000.00,
    NULL,
    'A',
    false,
    false,
    true,
    'ROM-APPI-003',
    true
  );

-- Aggiorna il contatore views per test
UPDATE public.locations
SET views_count = floor(random() * 100 + 1)::integer
WHERE agency_id = '00000000-0000-0000-0000-000000000001';
