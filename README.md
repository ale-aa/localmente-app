# Localmente - Dashboard SaaS

Piattaforma SaaS per la gestione di agenzie immobiliari locali con funzionalità di rank tracking, gestione recensioni e listings.

## Setup Completato ✅

- [x] Next.js 15 con App Router, TypeScript e Tailwind CSS
- [x] Supabase (Database PostgreSQL + Auth + RLS)
- [x] Shadcn/UI Components
- [x] Layout Dashboard con Sidebar
- [x] Autenticazione (Login/Signup/Logout)
- [x] Onboarding Agenzia
- [x] Form Aggiungi Location con Google Places API
- [x] Server Actions con validazione Zod
- [x] Middleware per protezione route

## Stack Tecnologico

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI
- **Database**: PostgreSQL (Supabase) con PostGIS
- **Auth**: Supabase Auth
- **Validation**: Zod
- **Forms**: React Hook Form

## Prossimi Passi

### 1. Configurazione Supabase

1. Vai su [https://app.supabase.com](https://app.supabase.com) e accedi
2. Copia le credenziali del tuo progetto:
   - Project URL
   - Anon Public Key
   - Service Role Key (⚠️ mantienila segreta!)

3. Aggiorna il file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tuo-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### 2. Esegui le Migrazioni Database

```bash
# Login su Supabase
npx supabase login

# Link al progetto remoto (sostituisci con il tuo Project ID)
npx supabase link --project-ref [TUO_PROJECT_ID]

# Push delle migrazioni
npx supabase db push

# (Opzionale) Carica dati di test
# Vai su Supabase Dashboard > SQL Editor e esegui il file supabase/seed.sql
```

### 3. (Opzionale) Google Places API

Per abilitare la ricerca indirizzi con Google Places:

1. Vai su [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuovo progetto o selezionane uno esistente
3. Abilita le API:
   - Places API
   - Geocoding API
4. Crea una API Key
5. Aggiungi al `.env.local`:

```env
GOOGLE_PLACES_API_KEY=AIza...
```

> **Nota**: Senza la chiave, l'app userà dati mock per la ricerca indirizzi.

### 4. Avvia il Server di Sviluppo

```bash
npm run dev
```

Visita [http://localhost:3000](http://localhost:3000)

## Struttura del Progetto

```
localmente-app/
├── app/
│   ├── actions/           # Server Actions
│   │   ├── auth.ts        # Login, Signup, Logout
│   │   ├── onboarding.ts  # Creazione agenzia
│   │   └── locations.ts   # CRUD locations
│   ├── auth/
│   │   ├── login/         # Pagina login
│   │   └── signup/        # Pagina registrazione
│   ├── dashboard/         # Dashboard protetta
│   │   ├── clients/       # Gestione clienti
│   │   ├── locations/     # Gestione sedi
│   │   │   └── new/       # Form nuova sede
│   │   ├── rank-tracker/  # Rank tracking
│   │   └── reviews/       # Recensioni
│   ├── onboarding/        # Setup iniziale agenzia
│   └── layout.tsx         # Root layout
├── components/
│   ├── dashboard/         # Componenti dashboard
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   └── ui/                # Shadcn components
├── lib/
│   ├── supabase/          # Client Supabase
│   │   ├── client.ts      # Client-side
│   │   ├── server.ts      # Server-side
│   │   └── middleware.ts  # Auth middleware
│   └── utils.ts           # Utilities
├── supabase/
│   ├── migrations/        # Database migrations
│   │   └── 20260131000000_initial_schema.sql
│   └── seed.sql           # Dati di test
└── middleware.ts          # Next.js middleware
```

## Database Schema

### Tabelle Principali

- **agencies**: Agenzie (clienti SaaS)
- **profiles**: Profili utenti (estende auth.users)
- **clients**: Clienti delle agenzie
- **locations**: Sedi/Immobili con coordinate PostGIS

### Row Level Security (RLS)

Tutte le tabelle hanno RLS abilitato per garantire multi-tenancy:
- Gli utenti vedono solo i dati della propria agenzia
- Permessi basati sul ruolo (admin, manager, agent)

## Funzionalità Implementate

### ✅ Autenticazione
- Registrazione con email/password
- Login
- Logout
- Protezione route con middleware

### ✅ Onboarding
- Creazione agenzia dopo signup
- Generazione automatica slug
- Collegamento profilo utente → agenzia

### ✅ Dashboard
- Layout con sidebar navigazione
- Overview statistiche
- Sezioni: Dashboard, Clienti, Locations, Rank Tracker, Recensioni

### ✅ Gestione Locations
- Lista locations
- Form creazione location con:
  - Ricerca indirizzo Google Places (o mock)
  - Dati cliente (nuovo o esistente)
  - Dettagli immobile
  - Coordinate geografiche (PostGIS)
  - Validazione Zod

## To-Do (Prossime Implementazioni)

- [ ] Gestione Clienti (CRUD completo)
- [ ] Upload immagini immobili
- [ ] Rank Tracking con API Google Maps
- [ ] Gestione Recensioni
- [ ] Analytics e Reportistica
- [ ] Notifiche
- [ ] Team Management (inviti, ruoli)
- [ ] Subscription & Billing
- [ ] Public Listings Page
- [ ] SEO Optimization

## Script Disponibili

```bash
# Sviluppo
npm run dev

# Build produzione
npm run build

# Start produzione
npm start

# Linting
npm run lint
```

## Deploy

### Vercel (Consigliato)

1. Push del codice su GitHub
2. Importa il progetto su Vercel
3. Configura le variabili d'ambiente
4. Deploy automatico

### Altre Piattaforme

L'app è compatibile con qualsiasi piattaforma che supporti Next.js:
- Netlify
- AWS Amplify
- Railway
- Digital Ocean App Platform

## Supporto

Per domande o problemi, apri una issue su GitHub o contatta il team di sviluppo.

---

**Versione**: 0.1.0 (MVP)
**Data**: Gennaio 2026
