# Autenticazione OAuth 2.0 con Microsoft Bing Places

Sistema completo di autenticazione OAuth 2.0 per collegare account Microsoft Bing a Localmente.

## Setup Completato

### ✅ TASK 1: Configurazione Ambiente

Le variabili d'ambiente sono già configurate in `.env.local`:

```env
BING_CLIENT_ID=your_bing_client_id_here
BING_CLIENT_SECRET=your_bing_client_secret_here
BING_REDIRECT_URI=http://localhost:3000/api/auth/bing/callback
```

**Come ottenere le credenziali:**
1. Vai su https://ads.microsoft.com/
2. Naviga su **Tools → API Center**
3. Crea una nuova applicazione OAuth
4. Copia Client ID e Client Secret e sostituiscili nei placeholder

---

### ✅ TASK 2: Route di Autenticazione

**File:** `app/api/auth/bing/route.ts`

Implementa l'inizializzazione del flusso OAuth 2.0:

- **Endpoint:** `GET /api/auth/bing`
- **Provider:** Microsoft Identity Platform
- **URL:** `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`
- **Parametri:**
  - `client_id`: da env
  - `response_type`: code
  - `redirect_uri`: da env
  - `scope`: `offline_access https://ads.microsoft.com/msads.manage openid profile email`
  - `state`: stringa base64 per sicurezza

**Scopes:**
- `https://ads.microsoft.com/msads.manage` - Gestione campagne e location
- `offline_access` - **FONDAMENTALE** per ottenere il refresh token
- `openid`, `profile`, `email` - Informazioni base utente

---

### ✅ TASK 3: Route di Callback

**File:** `app/api/auth/bing/callback/route.ts`

Implementa la gestione del callback OAuth:

1. **Riceve il code** dalla query string
2. **Token Exchange** - POST a `https://login.microsoftonline.com/common/oauth2/v2.0/token`
3. **Ottiene tokens:**
   ```json
   {
     "access_token": "eyJ0...",
     "refresh_token": "0.AX...",
     "expires_in": 3600,
     "scope": "...",
     "token_type": "Bearer"
   }
   ```
4. **Salva nel DB** - Tabella `integrations`:
   - `agency_id`: ID dell'agenzia
   - `provider`: "bing"
   - `access_token`: token di accesso
   - `refresh_token`: token di refresh
   - `expires_at`: timestamp scadenza
   - `scope`: scope concessi
   - `status`: "connected"

5. **Redirect** alla dashboard con messaggio di successo

---

### ✅ TASK 4: Componenti UI

#### 1. **ConnectBingButton** (Componente Semplice)

**File:** `components/bing/connect-bing-button.tsx`

Componente leggero per collegare l'account Bing:

```tsx
import { ConnectBingButton } from "@/components/bing";

export function SettingsPage() {
  return (
    <div>
      <h2>Integrazioni</h2>
      <ConnectBingButton onConnectionChange={(connected) => {
        console.log("Bing connesso:", connected);
      }} />
    </div>
  );
}
```

**Features:**
- Verifica automaticamente lo stato della connessione
- Mostra badge "Collegato" se già connesso
- Gestisce i callback OAuth (query params `bing_connected` e `bing_error`)
- Toast notifications per successo/errore

---

#### 2. **BingConnectionCard** (Componente Completo)

**File:** `components/bing/bing-connection-card.tsx`

Card completa per gestire la connessione Bing di una location:

```tsx
import { BingConnectionCard } from "@/components/bing";

export function LocationDetailsPage({ locationId }: { locationId: string }) {
  return (
    <div className="space-y-4">
      {/* Altri componenti... */}

      <BingConnectionCard
        locationId={locationId}
        locationName="Pizzeria Da Mario"
        locationCity="Roma"
        onUpdate={() => {
          // Callback dopo sincronizzazione/scollegamento
          console.log("Location aggiornata");
        }}
      />
    </div>
  );
}
```

**Features:**
- Verifica se l'account Bing è collegato
- Mostra bottone "Collega Account" se non collegato
- Mostra stato della location (pubblicata/non pubblicata)
- Bottoni per:
  - **Pubblica su Bing** - Prima pubblicazione
  - **Sincronizza** - Aggiorna dati esistenti
  - **Scollega** - Rimuove da Bing Places
- Mostra metadati:
  - Bing Place ID
  - Stato sincronizzazione
  - Ultima sincronizzazione
  - Link a Bing Maps

---

## Architettura

### Database Schema

**Tabella: `integrations`**

```sql
CREATE TABLE integrations (
  id UUID PRIMARY KEY,
  agency_id UUID REFERENCES agencies(id),
  provider TEXT CHECK (provider IN ('google', 'bing', 'facebook', 'apple')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  status TEXT DEFAULT 'connected',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, provider)
);
```

**Tabella: `locations` (campi Bing)**

- `bing_place_id`: ID risorsa Bing
- `bing_sync_status`: Active, Pending, Suspended, Under Review
- `last_bing_sync`: Timestamp ultima sync
- `bing_listing_url`: URL pubblico del listing

---

## Server Actions

**File:** `app/actions/bing.ts`

### 1. `connectBingAccountAction()`
Ritorna l'URL per avviare il flusso OAuth.

### 2. `checkBingConnectionStatus()`
Verifica se l'account Bing è collegato.

### 3. `syncBingLocationAction(locationId)`
Pubblica o aggiorna una location su Bing Places.

### 4. `unlinkBingLocationAction(locationId)`
Rimuove una location da Bing Places.

### 5. `disconnectBingAccountAction()`
Scollega l'account Bing (rimuove integrazione).

### 6. `getBingLocationData(locationId)`
Recupera i dati di sincronizzazione Bing di una location.

---

## Flusso Completo

```
1. Utente clicca "Collega Account Bing"
   ↓
2. Redirect a /api/auth/bing
   ↓
3. Costruzione URL OAuth Microsoft
   ↓
4. Redirect a login.microsoftonline.com
   ↓
5. Utente fa login e accetta permessi
   ↓
6. Microsoft redirect a /api/auth/bing/callback?code=...
   ↓
7. Token Exchange (code → access_token + refresh_token)
   ↓
8. Salvataggio tokens in tabella integrations
   ↓
9. Redirect a /dashboard?bing_connected=true
   ↓
10. ConnectBingButton mostra toast di successo
```

---

## Multi-Tenancy

Il sistema utilizza `getUserAgency()` per garantire l'isolamento multi-tenant:

```typescript
import { getUserAgency } from "@/lib/auth-helper";

const agencyId = await getUserAgency();
// Tutte le operazioni CRUD usano agencyId
```

**Row Level Security (RLS):**
- Gli utenti vedono solo le integrations della propria agency
- Policies su SELECT, INSERT, UPDATE, DELETE

---

## Sicurezza

1. **State Parameter**: Previene attacchi CSRF
2. **HTTPS**: Tutti gli endpoint OAuth usano HTTPS
3. **Token Storage**: Access/refresh token salvati in DB (encrypted at rest)
4. **RLS**: Isolamento multi-tenant tramite Supabase RLS
5. **Scope Minimali**: Solo `msads.manage` + `offline_access`

---

## Testing

### Test Locale

1. Assicurati che le credenziali siano configurate in `.env.local`
2. Avvia il server: `npm run dev`
3. Naviga su http://localhost:3000/dashboard
4. Clicca su "Collega Account Bing"
5. Completa il flusso OAuth
6. Verifica che il toast mostri "Account Bing collegato"

### Test su Location

1. Vai su una pagina location: `/dashboard/locations/[id]`
2. Verifica che `BingConnectionCard` mostri lo stato corretto
3. Clicca "Pubblica su Bing" per testare la sincronizzazione
4. Verifica che i dati vengano salvati nella tabella `locations`

---

## Troubleshooting

### Errore: "Configurazione Bing mancante"
- Verifica che `BING_CLIENT_ID` e `BING_REDIRECT_URI` siano impostati in `.env.local`
- Riavvia il server: `npm run dev`

### Errore: "Missing tokens in response"
- Verifica che lo scope `offline_access` sia presente
- Controlla la console Microsoft Advertising per configurazione corretta

### Errore: "Nessuna agenzia associata all'utente"
- L'utente non ha un `agency_id` nel profilo
- Completa l'onboarding o assegna manualmente un'agency

---

## Prossimi Passi

- [ ] Implementare refresh automatico dei token scaduti
- [ ] Aggiungere webhook per notifiche Bing
- [ ] Dashboard analytics per performance Bing
- [ ] Bulk sync per pubblicare multiple location

---

## References

- [Microsoft Identity Platform Docs](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [Microsoft Advertising API](https://docs.microsoft.com/en-us/advertising/guides/)
- [Bing Places for Business](https://www.bingplaces.com/)
