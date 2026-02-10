-- =============================================
-- GPS & MAPS DIRECTORIES BATCH #2
-- =============================================
-- Aggiunge nuove directory GPS e Maps al sistema Listings
-- Tutte gestite tramite Concierge (Manual Tier)
-- =============================================

-- Aggiungi le 4 nuove directory GPS & Maps
INSERT INTO public.listing_directories (id, name, icon_url, domain, type) VALUES
  ('bing', 'Bing Places', 'https://www.google.com/s2/favicons?domain=bing.com&sz=64', 'bing.com', 'manual'),
  ('tomtom', 'TomTom', 'https://www.google.com/s2/favicons?domain=tomtom.com&sz=64', 'tomtom.com', 'manual'),
  ('here', 'Here WeGo', 'https://www.google.com/s2/favicons?domain=here.com&sz=64', 'here.com', 'manual'),
  ('waze', 'Waze', 'https://www.google.com/s2/favicons?domain=waze.com&sz=64', 'waze.com', 'manual')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon_url = EXCLUDED.icon_url,
  domain = EXCLUDED.domain,
  type = EXCLUDED.type;

-- Messaggio finale
SELECT '✅ GPS & Maps Directories Batch #2 aggiunte!' as message;
SELECT 'Nuove directory: Bing Places, TomTom, Here WeGo, Waze' as directories;
SELECT 'Totale directory: 10 (2 Automated + 8 Manual)' as total;
