# GPS & Maps Directories - Batch #2

## 📋 Overview

Espansione della sezione Listings con l'aggiunta di **4 nuove directory GPS & Maps**, tutte gestite tramite **Concierge (Manual Tier)**.

---

## ✅ Directory Aggiunte

| # | Nome | Slug | Domain | Tier | Icona |
|---|------|------|--------|------|-------|
| 1 | **Bing Places** | `bing` | bing.com | Manual/Concierge | Favicon Bing |
| 2 | **TomTom** | `tomtom` | tomtom.com | Manual/Concierge | Favicon TomTom |
| 3 | **Here WeGo** | `here` | here.com | Manual/Concierge | Favicon Here |
| 4 | **Waze** | `waze` | waze.com | Manual/Concierge | Favicon Waze |

**Nota:** Apple Maps era già presente nel sistema (aggiunto in Batch #1), quindi sono state aggiunte solo 4 directory invece di 5.

---

## 📊 Totale Directory nel Sistema

### Prima dell'aggiornamento (6 directory)
1. Google Maps - Automated
2. Facebook - Automated
3. Yelp - Manual
4. TripAdvisor - Manual
5. PagineGialle - Manual
6. Apple Maps - Manual

### Dopo l'aggiornamento (10 directory)
1. Google Maps - Automated
2. Facebook - Automated
3. Yelp - Manual
4. TripAdvisor - Manual
5. PagineGialle - Manual
6. Apple Maps - Manual
7. **Bing Places** - Manual ✨
8. **TomTom** - Manual ✨
9. **Here WeGo** - Manual ✨
10. **Waze** - Manual ✨

**Distribuzione Tier:**
- **Tier 1 (Automated):** 2 directory (20%)
- **Tier 2 (Manual/Concierge):** 8 directory (80%)

---

## 🗄️ Database Schema

### Migration SQL

**File:** `supabase/migrations/20260204000003_add_gps_maps_directories.sql`

```sql
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
```

### Applicazione Migration

```bash
# Visualizza la migration
npm run migrate

# Copia l'SQL e applicalo in Supabase SQL Editor:
# https://supabase.com/dashboard/project/ycvxnsgikfgnygnnumxe/sql/new
```

---

## 🎨 UI/UX

### Layout
- **Tipo:** Lista verticale con `space-y-3`
- **Responsive:** Scala automaticamente con 10 elementi
- **Scroll:** Attivo se necessario su mobile

### Badge per Nuove Directory
Tutte le 4 nuove directory mostrano:
- Badge **"Concierge"** (icona UserCheck)
- Badge stato: "Credenziali Mancanti" / "In Lavorazione" / "Aggiornato"
- Pulsante: **"Richiedi Aggiornamento"** o **"Inserisci Dati Accesso"**

### Workflow Cliente
Per le nuove directory GPS & Maps, il workflow è identico alle altre directory Manual:

1. **Cliente** clicca "Richiedi Aggiornamento"
2. Sistema imposta `submission_status = 'action_needed'`
3. **Cliente** clicca "Inserisci Dati Accesso"
4. **Cliente** fornisce credenziali (username, password, note)
5. Sistema imposta `submission_status = 'processing'`
6. **Staff Concierge** aggiorna manualmente il listing
7. **Staff** conferma con `updateListingStatus('synced')`

---

## 🔧 Modifiche al Codice

### ✅ Nessuna Modifica Necessaria!

Il sistema è **completamente dinamico**:
- ✅ Le directory vengono caricate automaticamente dal DB
- ✅ L'UI si adatta automaticamente al numero di directory
- ✅ I badge e gli stati funzionano per tutte le directory Manual
- ✅ Il sistema di credenziali è già compatibile

**File coinvolti (nessuna modifica richiesta):**
- `app/actions/listings.ts` - Già compatibile
- `components/listings/listings-health-card.tsx` - Già compatibile
- `components/listings/submit-credentials-dialog.tsx` - Già compatibile

---

## 🧪 Testing

### 1. Applica Migration
```bash
npm run migrate
# Copia SQL in Supabase SQL Editor
```

### 2. Verifica Directory
Vai in `/dashboard/locations/[id]/listings` e clicca "Scansiona Ora".
Dovresti vedere **10 directory** nella lista:
- 2 con badge "Auto" (Google, Facebook)
- 8 con badge "Concierge" (incluse le 4 nuove)

### 3. Test Workflow
Per una delle nuove directory (es. Bing Places):
1. Clicca "Richiedi Aggiornamento"
2. Verifica badge "In Lavorazione"
3. Simula richiesta credenziali:
   ```sql
   UPDATE listing_syncs
   SET submission_status = 'action_needed',
       admin_note = 'Serve accesso Bing Places'
   WHERE directory_id = 'bing' AND location_id = 'uuid-location';
   ```
4. Ricarica → Vedi "Inserisci Dati Accesso"
5. Compila il form e invia
6. Verifica che stato torni a "processing"

---

## 🚀 Creazione Automatica Sync

Quando viene creata una nuova location, il sistema crea automaticamente i record `listing_syncs` per **tutte** le directory nel DB, incluse le 4 nuove.

### Funzione `checkListingHealth()`
```typescript
// In app/actions/listings.ts (linea ~60)
const { data: directories } = await supabase
  .from("listing_directories")
  .select("*");

// ⬆️ Questo query prende automaticamente TUTTE le directory,
// incluse Bing, TomTom, Here, Waze
```

**Stato di default:** `status = 'missing'` (rosso)

---

## 📈 Prossimi Batch

### Batch #3 - Social & Review Platforms
- LinkedIn
- Twitter/X Business
- Foursquare
- Zomato
- TheFork

### Batch #4 - Regional & Niche
- Virgilio Pagine Gialle
- Tuttocittà
- MisterWhat
- Cylex
- Hotfrog

---

## 🎉 Recap

✅ **4 nuove directory GPS & Maps** aggiunte (Bing, TomTom, Here, Waze)
✅ **Totale directory:** 10 (2 Auto + 8 Manual)
✅ **Nessuna modifica codice necessaria** - Sistema già dinamico
✅ **UI/UX compatibile** - Layout scala automaticamente
✅ **Workflow completo** - Gestione credenziali già attiva

**Il sistema è pronto per essere testato!** 🚀

Applica la migration SQL e verifica il funzionamento nella pagina Listings.
