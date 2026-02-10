# Sistema di Gestione Credenziali Listing - "Strada Concierge"

## 📋 Overview

Sistema ibrido completo per la gestione dei listing su directory esterne con supporto per richiesta e gestione delle credenziali cliente.

### Tier System

- **Tier 1 (Automated):** Google Maps, Facebook - Gestiti automaticamente via API
- **Tier 2 (Concierge):** Yelp, TripAdvisor, PagineGialle, Apple Maps - Gestiti manualmente dallo staff Localmente

## 🗄️ Database Schema

### Nuove Colonne su `listing_syncs`

```sql
-- Stati avanzati
submission_status: 'synced' | 'processing' | 'action_needed' | 'failed'

-- Comunicazione admin → cliente
admin_note: TEXT (es: "Password errata", "Serve codice 2FA")

-- Credenziali fornite dal cliente
credentials: JSONB {
  username: string,
  password: string,
  notes: string
}

-- Timestamp invio credenziali
credentials_submitted_at: TIMESTAMPTZ
```

### Migration SQL

**File:** `supabase/migrations/20260204000002_listing_credentials_management.sql`

Per applicare:
```bash
# Visualizza la migration
npm run migrate

# Copia l'SQL e applicalo in Supabase SQL Editor:
# https://supabase.com/dashboard/project/ycvxnsgikfgnygnnumxe/sql/new
```

## 🎯 Stati e Workflow

### Stati `submission_status`

| Stato | Badge Color | Significato | Azioni Disponibili |
|-------|------------|-------------|-------------------|
| `synced` | 🟢 Verde | Tutto ok, listing aggiornato | Richiedi Aggiornamento |
| `processing` | 🟡 Giallo | Staff sta lavorando | Pulsante disabilitato |
| `action_needed` | 🔴 Rosso | Servono credenziali cliente | **Inserisci Dati Accesso** |
| `failed` | ⚫ Grigio | Impossibile aggiornare | Pulsante disabilitato |

### Workflow Completo

#### 1. Cliente Richiede Aggiornamento (Tier 2)
```
Cliente → Clicca "Richiedi Aggiornamento"
↓
Sistema → Crea richiesta (submission_status='action_needed')
↓
Cliente → Vede badge "Credenziali Mancanti"
↓
Cliente → Clicca "Inserisci Dati Accesso"
```

#### 2. Cliente Fornisce Credenziali
```
Cliente → Apre Dialog
↓
Cliente → Inserisce:
  - Username/Email
  - Password
  - Note (es: "Codice 2FA via SMS a Mario")
↓
Sistema → Salva credentials in DB (JSONB)
↓
Sistema → submission_status = 'processing'
↓
Staff → Riceve notifica (TODO: implementare email/Slack)
```

#### 3. Staff Aggiorna Listing
```
Staff → Vede richiesta con credenziali
↓
Staff → Accede alla directory
↓
Staff → Aggiorna informazioni NAP

--- Se successo ---
↓
Staff → updateListingStatus('synced')
↓
Cliente → Vede badge "Aggiornato" 🟢

--- Se fallimento (es: password errata) ---
↓
Staff → updateListingStatus('action_needed', "Password errata, verificare")
↓
Cliente → Vede nota admin + badge rosso
↓
Cliente → Reinvia credenziali corrette
```

## 🔧 Server Actions

### Per il Cliente

#### `submitListingCredentials()`
```typescript
await submitListingCredentials(
  locationId: string,
  directoryId: string,
  credentials: {
    username?: string,
    password?: string,
    notes?: string
  }
)
```

**Effetti:**
- Salva credentials in DB (JSONB)
- submission_status → 'processing'
- admin_note → null (reset)
- credentials_submitted_at → now()

### Per lo Staff (Admin/Manager)

#### `updateListingStatus()`
```typescript
await updateListingStatus(
  locationId: string,
  directoryId: string,
  submissionStatus: 'synced' | 'processing' | 'action_needed' | 'failed',
  adminNote?: string
)
```

**Esempi:**
```typescript
// Successo
await updateListingStatus(locationId, 'yelp', 'synced');

// Serve 2FA
await updateListingStatus(
  locationId,
  'yelp',
  'action_needed',
  'Serve codice 2FA. Dove arriva?'
);

// Password errata
await updateListingStatus(
  locationId,
  'yelp',
  'action_needed',
  'Password errata. Verificare e reinviare.'
);

// Impossibile aggiornare
await updateListingStatus(
  locationId,
  'apple',
  'failed',
  'Account sospeso. Contattare Apple Business.'
);
```

## 🎨 UI Components

### Badge Tier
- **Auto** (⚡ Badge grigio) - Directory automatiche
- **Concierge** (✓ Badge outline) - Directory gestite da staff

### Badge Stati
- **In Lavorazione (Staff Localmente)** - Giallo, con icona refresh
- **Credenziali Mancanti** - Rosso, con icona lock
- **Aggiornato** - Verde, con icona check
- **Impossibile aggiornare** - Grigio, con icona X

### Dialog Credenziali
- **Input:** Username/Email
- **Input:** Password (type="password")
- **Textarea:** Note aggiuntive
- **Alert:** Privacy garantita, dati crittografati

### Alert Note Admin
Quando lo staff lascia una nota (`admin_note`):
```
┌──────────────────────────────────────────┐
│ ⚠️ Nota dello staff:                     │
│ Password errata. Verificare e reinviare. │
└──────────────────────────────────────────┘
```

## 🧪 Testing Manuale

### 1. Applica Migration
```bash
npm run migrate
# Copia SQL in Supabase SQL Editor
```

### 2. Simula Richiesta Credenziali (Console Browser)
```javascript
// Vai in /dashboard/locations/[id]/listings
// Apri console e simula stato 'action_needed':

// Ottieni il sync ID dalla pagina (inspeciona il DOM)
const syncId = 'uuid-del-sync';

// Update manuale via Supabase (per testing)
// In produzione, lo staff userà updateListingStatus()
```

### 3. Test Flow Completo
1. Vai nella pagina Listings di una location
2. Clicca su "Scansiona Ora" per vedere i listing
3. Per una directory Concierge (Yelp, TripAdvisor), clicca "Richiedi Aggiornamento"
4. Lo stato diventa "processing"
5. Simula che lo staff imposti `submission_status = 'action_needed'` con nota:
   ```sql
   UPDATE listing_syncs
   SET submission_status = 'action_needed',
       admin_note = 'Serve password per Yelp'
   WHERE directory_id = 'yelp' AND location_id = 'uuid-location';
   ```
6. Ricarica la pagina → Vedi badge "Credenziali Mancanti" + nota admin
7. Clicca "Inserisci Dati Accesso"
8. Compila il form e invia
9. Verifica che lo stato torni a "processing"
10. Come staff, aggiorna a 'synced':
   ```typescript
   await updateListingStatus(locationId, 'yelp', 'synced');
   ```

## 📊 Prossimi Sviluppi (TODO)

### Notifiche Staff
```typescript
// Quando cliente invia credenziali:
async function sendConciergeNotification(location, directory, credentials) {
  // Opzione 1: Email
  await sendEmail({
    to: 'concierge@localmente.it',
    subject: `Nuove credenziali per ${directory.name}`,
    body: `Cliente ha inviato credenziali per ${location.business_name}`
  });

  // Opzione 2: Slack
  await postToSlack({
    channel: '#concierge-requests',
    text: `🔐 Nuove credenziali: ${location.business_name} → ${directory.name}`
  });

  // Opzione 3: Webhook interno
  await fetch('/api/webhooks/concierge', {
    method: 'POST',
    body: JSON.stringify({ locationId, directoryId })
  });
}
```

### Dashboard Staff
Creare pagina `/dashboard/admin/concierge` con:
- Lista di tutte le richieste pending (`submission_status = 'action_needed'`)
- Visualizzazione credenziali (solo per admin/manager)
- Pulsanti quick action:
  - ✅ Segna come completato
  - ❌ Richiedi nuove credenziali (con nota)
  - 🚫 Segna come fallito

### Crittografia Credenziali
```typescript
// Usare libreria per crittografare prima del salvataggio
import { encrypt, decrypt } from '@/lib/encryption';

const encryptedPassword = await encrypt(credentials.password);
await supabase.from('listing_syncs').update({
  credentials: {
    username: credentials.username,
    password: encryptedPassword, // ← Crittografato
    notes: credentials.notes
  }
});
```

## 🔐 Sicurezza

### Attuale (v1)
- ✅ Credenziali salvate in JSONB (non visibili nei log)
- ✅ Password input type="password" (nascosta visivamente)
- ✅ Solo utenti autenticati possono inviare credenziali
- ✅ Solo admin/manager possono leggere credenziali

### Raccomandazioni Future (v2)
- 🔜 Crittografia a riposo (AES-256)
- 🔜 Audit log per accesso credenziali
- 🔜 Rotazione automatica credenziali dopo X giorni
- 🔜 Integrazione con password manager aziendale

## 📝 File Modificati

| File | Descrizione |
|------|-------------|
| `supabase/migrations/20260204000002_listing_credentials_management.sql` | **NUOVO** - Schema DB per credenziali |
| `app/actions/listings.ts` | Aggiunto `submitListingCredentials()`, `updateListingStatus()` |
| `components/listings/submit-credentials-dialog.tsx` | **NUOVO** - Dialog inserimento credenziali |
| `components/listings/listings-health-card.tsx` | Gestione stati avanzati, apertura dialog, note admin |

## 🎉 Recap

✅ **Database**: 4 nuovi campi (`submission_status`, `admin_note`, `credentials`, `credentials_submitted_at`)
✅ **Server Actions**: 2 nuove funzioni per cliente e staff
✅ **UI**: Dialog credenziali + 4 stati badge + note admin
✅ **Workflow**: Flusso completo cliente → staff → cliente

Il sistema è pronto per essere testato! 🚀
