# Local Rank Tracker - Documentazione

## Panoramica

Il **Local Rank Tracker** è il motore backend per tracciare il posizionamento di una location su Google Maps/Local Search attraverso una griglia geografica (Geo-Grid).

## Architettura

### Database Schema

#### Tabella `rank_scans`
Contiene le richieste di scansione per keyword specifiche.

**Campi principali:**
- `location_id`: FK alla location da tracciare
- `keyword`: La keyword da cercare (es: "agenzia immobiliare roma")
- `grid_size`: Dimensione griglia (3, 5, 7, 9)
- `radius_meters`: Raggio dal centro della location
- `status`: pending | running | completed | failed
- `average_rank`: Media dei rank trovati
- `best_rank`: Miglior posizionamento trovato

#### Tabella `rank_results`
Contiene i risultati individuali per ogni punto della griglia.

**Campi principali:**
- `scan_id`: FK alla scansione
- `grid_index`: Indice del punto nella griglia (0-80)
- `rank`: Posizione trovata (1-20 o NULL)
- `latitude/longitude`: Coordinate del punto
- `found_place_id`: ID del place trovato (per future integrazioni)

### Logica Griglia Geografica

La griglia viene generata da `lib/geo-utils.ts` con la funzione `generateGrid()`.

**Come funziona:**
1. Prende il centro (lat/lng della location)
2. Calcola un quadrato con lato = `radius * 2`
3. Divide il quadrato in `gridSize x gridSize` punti
4. Restituisce array di coordinate

**Esempio con gridSize=3:**
```
[6] [7] [8]
[3] [4] [5]  ← 4 è il centro
[0] [1] [2]
```

**Conversioni geografiche:**
- 1° latitudine ≈ 111,320 metri (costante)
- 1° longitudine ≈ 111,320 * cos(latitudine) metri (varia con la latitudine)

### Server Actions

#### `startScan(data: ScanFormData)`
Avvia una nuova scansione:
1. Valida i dati con Zod
2. Verifica che la location abbia coordinate
3. Genera la griglia di punti
4. Crea il record `rank_scans`
5. Esegue la scansione (mock o reale)
6. Salva i risultati in `rank_results`
7. Aggiorna le statistiche

#### `getScansForLocation(locationId: string)`
Ottiene tutte le scansioni per una location (ordinate per data).

#### `getScanResults(scanId: string)`
Ottiene i dettagli di una scansione e tutti i suoi risultati.

#### `getLocationRankStats(locationId: string)`
Calcola statistiche aggregate:
- Numero totale scansioni
- Rank medio
- Miglior rank
- Ultima scansione

### Fase Mock (Attuale)

La funzione `performScan()` attualmente genera rank casuali:
- **40%** probabilità rank 1-10 (buon posizionamento)
- **30%** probabilità rank 11-20 (medio)
- **30%** probabilità NULL (non trovato)

**In produzione**, questa funzione farà chiamate a Google Places API:
```typescript
// Esempio di integrazione futura
const rank = await callGooglePlacesAPI(
  point.latitude,
  point.longitude,
  keyword,
  location.place_id
);
```

## UI Components

### `/dashboard/locations/[id]`
Pagina dettaglio location con 2 tab:
- **Dettagli**: Informazioni immobile
- **Rank Tracker**: Gestione scansioni

### `<RankTrackerTab>`
Form per avviare scansioni + lista scansioni recenti.

**Form fields:**
- Keyword (required)
- Grid Size (3x3, 5x5, 7x7, 9x9)
- Radius (500-10000m)

**Lista scansioni:**
Mostra keyword, data, status, miglior rank.

### `<ScanResultsView>`
Visualizzazione risultati:
- Statistiche aggregate (miglior rank, media, non trovati)
- Tabella risultati per punto
- Legenda colori

**Colori rank:**
- Verde (#10B981): Rank 1-3 (ottimo)
- Arancione (#F59E0B): Rank 4-10 (buono)
- Rosso (#EF4444): Rank 11-20 (scarso)
- Grigio (#9CA3AF): Non trovato

## Row Level Security (RLS)

Tutte le tabelle hanno RLS abilitato:
- Gli utenti vedono solo scansioni delle location della propria agenzia
- Admin e manager possono eliminare scansioni
- Le policies seguono la gerarchia: agencies → locations → rank_scans → rank_results

## Test & Utilizzo

### 1. Setup Database

Esegui lo script SQL completo:
```bash
# Apri Supabase Dashboard SQL Editor
# https://app.supabase.com/project/ycvxnsgikfgnygnnumxe/sql/new

# Incolla e esegui:
supabase/COMPLETE_SETUP_WITH_RANK_TRACKER.sql
```

### 2. Crea una Location

1. Vai su `/dashboard/locations/new`
2. Aggiungi una location con coordinate (usa Google Places search)
3. Salva

### 3. Avvia una Scansione

1. Clicca sulla location creata
2. Vai al tab "Rank Tracker"
3. Compila il form:
   - Keyword: "agenzia immobiliare [città]"
   - Grid Size: 5x5 (consigliato per test)
   - Radius: 2000m (default)
4. Clicca "Avvia Scansione"

### 4. Visualizza Risultati

1. Attendi qualche secondo (la scansione è quasi istantanea in mock mode)
2. Clicca sulla scansione nella lista
3. Vedi i risultati con statistiche e mappa di calore

## Roadmap & Integrazioni Future

### Google Places API Integration
```typescript
// 1. Ottieni API Key da Google Cloud Console
// 2. Abilita Places API
// 3. Implementa callGooglePlacesAPI():

async function callGooglePlacesAPI(
  lat: number,
  lng: number,
  keyword: string,
  targetPlaceId: string
): Promise<number | null> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
    {
      params: {
        location: `${lat},${lng}`,
        radius: 50, // Raggio di ricerca dal punto
        keyword: keyword,
        key: process.env.GOOGLE_PLACES_API_KEY,
      }
    }
  );

  const data = await response.json();

  // Trova la posizione del targetPlaceId nei risultati
  const index = data.results.findIndex(
    (r: any) => r.place_id === targetPlaceId
  );

  return index >= 0 ? index + 1 : null;
}
```

### Visualizzazione Mappa
- Integra Leaflet o Mapbox
- Mostra heatmap dei rank sulla griglia
- Permetti drill-down su singoli punti

### Scheduling Automatico
- Cron job per scansioni periodiche
- Notifiche quando rank cambia significativamente
- Trend analysis nel tempo

### Analytics Avanzate
- Confronto keyword multiple
- Analisi competitor
- Suggerimenti ottimizzazione

## Limiti Attuali (Mock Mode)

- ✅ Griglia geografica calcolata correttamente
- ✅ Database schema completo
- ✅ UI funzionante
- ⚠️ Rank generati casualmente (non Google Places API reale)
- ⚠️ Nessuna persistenza place_id reale
- ⚠️ Nessuna mappa visuale

## File Importanti

```
app/
├── actions/
│   └── rank-tracker.ts          ← Server Actions
└── dashboard/
    └── locations/
        └── [id]/
            └── page.tsx          ← Pagina dettaglio

components/
└── rank-tracker/
    ├── rank-tracker-tab.tsx     ← Tab principale
    └── scan-results-view.tsx    ← Visualizzazione risultati

lib/
└── geo-utils.ts                 ← Utility geografiche

supabase/
└── migrations/
    └── 20260131000001_rank_tracker.sql  ← Schema database
```

## Troubleshooting

### Errore: "La location non ha coordinate"
Assicurati che la location abbia `latitude` e `longitude` impostati.

### Scansione rimane in "pending"
Controlla i log del server per errori. In development, la scansione dovrebbe completarsi in ~1-2 secondi.

### RLS Error
Verifica che l'utente sia autenticato e che la location appartenga alla sua agenzia.

---

**Versione**: 1.0.0 (Mock Phase)
**Data**: Gennaio 2026
