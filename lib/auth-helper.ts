/**
 * Auth Helper - Multi-Tenancy Support
 *
 * Questo modulo fornisce utilities per gestire il contesto di autenticazione
 * e il multi-tenancy basato su agency_id.
 *
 * ARCHITETTURA MULTI-TENANCY:
 * User (auth.users) -> Profile (profiles) -> Agency (agencies) -> [Clients, Locations, Reviews, etc.]
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Risultato dell'autenticazione con contesto agenzia
 */
export interface AuthContext {
  userId: string;
  agencyId: string;
  role?: string;
  userType: "agency" | "business";
}

/**
 * Recupera l'agency_id dell'utente corrente
 *
 * Questa è la funzione CENTRALE per il multi-tenancy.
 * Tutte le operazioni CRUD devono usare questa funzione per ottenere
 * il contesto dell'agenzia prima di operare sui dati.
 *
 * @throws Error se l'utente non è autenticato o non ha un'agenzia associata
 * @returns agency_id dell'utente corrente
 *
 * @example
 * ```typescript
 * const agencyId = await getUserAgency();
 * await supabase.from("clients").insert({ agency_id: agencyId, ... });
 * ```
 */
export async function getUserAgency(): Promise<string> {
  const supabase = await createClient();

  // 1. Ottieni l'utente autenticato
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Utente non autenticato");
  }

  // 2. Recupera il profilo con l'agency_id e user_type
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("agency_id, role, user_type")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[Auth Helper] Errore recupero profilo:", profileError);
    throw new Error("Profilo utente non trovato");
  }

  if (!profile?.agency_id) {
    console.error("[Auth Helper] Profilo senza agency_id:", { userId: user.id });
    // In futuro, qui potremmo reindirizzare a un flow di onboarding
    throw new Error("Nessuna agenzia associata all'utente. Contatta l'amministratore.");
  }

  console.log(`[Auth Helper] ✅ Agency context: userId=${user.id}, agencyId=${profile.agency_id}, userType=${profile.user_type || "agency"}`);

  return profile.agency_id;
}

/**
 * Recupera il contesto di autenticazione completo (user + agency + role)
 *
 * Utile quando serve accedere a più informazioni oltre all'agency_id,
 * come il ruolo dell'utente per controlli di permessi.
 *
 * @throws Error se l'utente non è autenticato o non ha un'agenzia associata
 * @returns Contesto completo di autenticazione
 *
 * @example
 * ```typescript
 * const { userId, agencyId, role } = await getAuthContext();
 * if (role !== 'admin') throw new Error('Permesso negato');
 * ```
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();

  // 1. Ottieni l'utente autenticato
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Utente non autenticato");
  }

  // 2. Recupera il profilo con agency_id, role e user_type
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("agency_id, role, user_type")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[Auth Helper] Errore recupero profilo:", profileError);
    throw new Error("Profilo utente non trovato");
  }

  if (!profile?.agency_id) {
    console.error("[Auth Helper] Profilo senza agency_id:", { userId: user.id });
    throw new Error("Nessuna agenzia associata all'utente. Contatta l'amministratore.");
  }

  return {
    userId: user.id,
    agencyId: profile.agency_id,
    role: profile.role,
    userType: profile.user_type || "agency", // Default ad agency per retrocompatibilità
  };
}

/**
 * Verifica che l'utente abbia uno dei ruoli specificati
 *
 * @param allowedRoles - Array di ruoli permessi (es. ['admin', 'manager'])
 * @throws Error se l'utente non ha uno dei ruoli richiesti
 *
 * @example
 * ```typescript
 * await requireRole(['admin', 'manager']); // Lancia errore se utente non è admin o manager
 * ```
 */
export async function requireRole(allowedRoles: string[]): Promise<void> {
  const { role } = await getAuthContext();

  if (!role || !allowedRoles.includes(role)) {
    throw new Error(
      `Permesso negato. Ruoli richiesti: ${allowedRoles.join(", ")}. Ruolo corrente: ${role || "nessuno"}`
    );
  }
}

/**
 * Recupera solo il user_type dell'utente corrente
 * Utility per componenti UI che devono adattarsi al tipo utente
 *
 * @returns "agency" | "business"
 * @throws Error se l'utente non è autenticato
 */
export async function getUserType(): Promise<"agency" | "business"> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Utente non autenticato");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_type")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("[Auth Helper] Errore recupero user_type:", profileError);
    return "agency"; // Default ad agency per retrocompatibilità
  }

  return profile.user_type || "agency";
}

/**
 * Verifica che una risorsa appartenga all'agenzia dell'utente corrente
 *
 * Utility di sicurezza per validare che un ID passato dall'utente
 * appartenga effettivamente alla sua agenzia.
 *
 * @param table - Nome della tabella da verificare
 * @param resourceId - ID della risorsa da verificare
 * @throws Error se la risorsa non appartiene all'agenzia dell'utente
 *
 * @example
 * ```typescript
 * await verifyResourceOwnership('clients', clientId);
 * // Procede solo se il client appartiene all'agenzia
 * ```
 */
export async function verifyResourceOwnership(
  table: string,
  resourceId: string
): Promise<void> {
  const supabase = await createClient();
  const agencyId = await getUserAgency();

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", resourceId)
    .eq("agency_id", agencyId)
    .single();

  if (error || !data) {
    throw new Error(
      `Risorsa non trovata o non autorizzata: ${table}/${resourceId}`
    );
  }
}
