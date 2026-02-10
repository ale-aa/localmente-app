"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserAgency, requireRole } from "@/lib/auth-helper";
import { scanAllDirectories, type LocationData } from "@/lib/listing-scanner";

export interface ListingCredentials {
  username?: string;
  password?: string;
  notes?: string;
}

export interface ListingSync {
  id: string;
  location_id: string;
  directory_id: string;
  status: "synced" | "mismatch" | "missing" | "processing";
  last_check_at: string;
  listing_url: string | null;
  remote_data: any;
  submission_status?: "synced" | "processing" | "action_needed" | "failed" | null;
  last_manual_check?: string | null;
  admin_note?: string | null;
  credentials?: ListingCredentials | null;
  credentials_submitted_at?: string | null;
  directory: {
    id: string;
    name: string;
    icon_url: string | null;
    type?: "automated" | "manual";
    domain?: string | null;
  };
}

export interface ListingHealthResult {
  syncs: ListingSync[];
  healthScore: number;
  totalDirectories: number;
  syncedCount: number;
  mismatchCount: number;
  missingCount: number;
}

/**
 * Esegue un check dello stato di sincronizzazione di una location su tutte le directory
 * Usa DataForSEO organic search API per verificare presenza reale
 */
export async function checkListingHealth(
  locationId: string
): Promise<{ data?: ListingHealthResult; error?: string }> {
  const supabase = await createClient();

  // Ottieni il contesto dell'agenzia (multi-tenancy)
  let agencyId: string;
  try {
    agencyId = await getUserAgency();
  } catch (error: any) {
    return { error: error.message || "Errore di autenticazione" };
  }

  // Recupera la location (filtra per agency_id per sicurezza multi-tenancy)
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("*")
    .eq("id", locationId)
    .eq("agency_id", agencyId) // Usa il contesto dell'agenzia
    .single();

  if (locationError || !location) {
    return { error: "Location non trovata o non autorizzata" };
  }

  try {
    // Recupera tutte le directory con il campo domain
    const { data: directories, error: dirError } = await supabase
      .from("listing_directories")
      .select("*");

    if (dirError || !directories) {
      return { error: "Errore nel recupero delle directory" };
    }

    // Filtra solo le directory che hanno un dominio impostato
    const validDirectories = directories.filter((dir) => dir.domain);

    if (validDirectories.length === 0) {
      return { error: "Nessuna directory configurata con dominio" };
    }

    // 🔍 DEBUG: Log scan configuration
    console.log("🚀 [Listing Health] Starting real NAP audit:", {
      locationId,
      businessName: location.business_name,
      city: location.city,
      directoriesCount: validDirectories.length,
      directories: validDirectories.map((d) => d.id).join(", "),
    });

    // Prepara i dati della location per il scanner
    const locationData: LocationData = {
      name: location.business_name || location.title || "",
      city: location.city || "",
      phone: location.phone || undefined,
      address: location.address || undefined,
    };
    // Esegui la scansione reale su tutte le directory in parallelo
    // Concurrency = 3 per evitare rate limiting
    const scanResults = await scanAllDirectories(
      locationData,
      validDirectories.map((dir) => ({
        id: dir.id,
        domain: dir.domain,
      })),
      3 // concurrency
    );

    // Aggiorna i listing_syncs con i risultati reali
    const syncs: ListingSync[] = [];

    for (const directory of validDirectories) {
      const scanResult = scanResults[directory.id];

      if (!scanResult) {
        console.error(`[Listing Health] No scan result for directory ${directory.id}`);
        continue;
      }

      // Prepara remote_data in base ai risultati
      const remote_data = {
        last_scan: new Date().toISOString(),
        found: scanResult.status === "synced",
        mismatch: scanResult.mismatch || false,
        source: "dataforseo_organic_search",
      };

      // Upsert nella tabella listing_syncs
      const { data: sync, error: syncError } = await supabase
        .from("listing_syncs")
        .upsert(
          {
            location_id: locationId,
            directory_id: directory.id,
            status: scanResult.status,
            last_check_at: new Date().toISOString(),
            listing_url: scanResult.listing_url || null,
            remote_data,
          },
          {
            onConflict: "location_id,directory_id",
          }
        )
        .select()
        .single();

      if (!syncError && sync) {
        syncs.push({
          ...sync,
          directory,
        });
      } else if (syncError) {
        console.error(`[Listing Health] Error upserting sync for ${directory.id}:`, syncError);
      }
    }

    // Calcola statistiche
    const syncedCount = syncs.filter((s) => s.status === "synced").length;
    const mismatchCount = syncs.filter((s) => s.status === "mismatch").length;
    const missingCount = syncs.filter((s) => s.status === "missing").length;
    const healthScore = syncs.length > 0 ? Math.round((syncedCount / syncs.length) * 100) : 0;

    // 🔍 DEBUG: Log scan results summary
    console.log("✅ [Listing Health] Audit completed:", {
      totalDirectories: syncs.length,
      synced: syncedCount,
      mismatch: mismatchCount,
      missing: missingCount,
      healthScore: `${healthScore}%`,
    });

    return {
      data: {
        syncs,
        healthScore,
        totalDirectories: syncs.length,
        syncedCount,
        mismatchCount,
        missingCount,
      },
    };
  } catch (error: any) {
    console.error("[Listing Health] Error during audit:", error);
    return {
      error: `Errore durante l'audit: ${error.message}`,
    };
  }
}

/**
 * Recupera lo stato attuale dei listing sync per una location
 */
export async function getListingSyncs(
  locationId: string
): Promise<{ syncs?: ListingSync[]; error?: string }> {
  const supabase = await createClient();

  // Ottieni il contesto dell'agenzia (multi-tenancy)
  let agencyId: string;
  try {
    agencyId = await getUserAgency();
  } catch (error: any) {
    return { error: error.message || "Errore di autenticazione" };
  }

  // Verifica che la location appartenga all'agenzia (sicurezza multi-tenancy)
  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("agency_id", agencyId)
    .single();

  if (!location) {
    return { error: "Location non trovata o non autorizzata" };
  }

  // Recupera i listing syncs per questa location
  const { data: syncs, error } = await supabase
    .from("listing_syncs")
    .select(
      `
      *,
      directory:listing_directories(*)
    `
    )
    .eq("location_id", locationId);

  if (error) {
    return { error: error.message };
  }

  return { syncs: syncs as any };
}

/**
 * Recupera tutte le directory disponibili
 */
export async function getDirectories() {
  const supabase = await createClient();

  const { data: directories, error } = await supabase
    .from("listing_directories")
    .select("*")
    .order("name");

  if (error) {
    return { directories: [], error: error.message };
  }

  return { directories: directories || [] };
}

/**
 * Sincronizza un singolo listing (gestione ibrida)
 * - Per directory AUTOMATICHE (Google, Facebook): esegue scan reale con DataForSEO
 * - Per directory MANUALI (Yelp, TripAdvisor, PagineGialle, Apple): imposta richiesta per Concierge
 */
export async function syncListing(
  locationId: string,
  directoryId: string
): Promise<{ success?: boolean; error?: string; message?: string }> {
  const supabase = await createClient();

  // Ottieni il contesto dell'agenzia (multi-tenancy)
  let agencyId: string;
  try {
    agencyId = await getUserAgency();
  } catch (error: any) {
    return { error: error.message || "Errore di autenticazione" };
  }

  // Recupera la location (filtra per agency_id per sicurezza multi-tenancy)
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("*")
    .eq("id", locationId)
    .eq("agency_id", agencyId) // Usa il contesto dell'agenzia
    .single();

  if (locationError || !location) {
    return { error: "Location non trovata o non autorizzata" };
  }

  // Recupera la directory per sapere se è automated o manual
  const { data: directory, error: dirError } = await supabase
    .from("listing_directories")
    .select("*")
    .eq("id", directoryId)
    .single();

  if (dirError || !directory) {
    return { error: "Directory non trovata" };
  }

  console.log(`🔄 [Sync Listing] ${directory.name} (${directory.type}) for location ${location.business_name}`);

  // TIER 1: Directory AUTOMATICHE (Google, Facebook)
  if (directory.type === "automated") {
    if (!directory.domain) {
      return { error: "Directory senza dominio configurato" };
    }

    try {
      // Prepara i dati della location per il scanner
      const locationData: LocationData = {
        name: location.business_name || location.title || "",
        city: location.city || "",
        phone: location.phone || undefined,
        address: location.address || undefined,
      };

      // Esegui la scansione reale su questa directory
      const scanResults = await scanAllDirectories(
        locationData,
        [{ id: directory.id, domain: directory.domain }],
        1 // concurrency = 1 per singola directory
      );

      const scanResult = scanResults[directory.id];

      if (!scanResult) {
        return { error: "Errore durante la scansione" };
      }

      // Prepara remote_data in base ai risultati
      const remote_data = {
        last_scan: new Date().toISOString(),
        found: scanResult.status === "synced",
        mismatch: scanResult.mismatch || false,
        source: "dataforseo_organic_search",
      };

      // Aggiorna il sync nella tabella
      const { error: syncError } = await supabase
        .from("listing_syncs")
        .upsert(
          {
            location_id: locationId,
            directory_id: directoryId,
            status: scanResult.status,
            last_check_at: new Date().toISOString(),
            listing_url: scanResult.listing_url || null,
            remote_data,
          },
          {
            onConflict: "location_id,directory_id",
          }
        );

      if (syncError) {
        console.error(`[Sync Listing] Error upserting sync:`, syncError);
        return { error: "Errore durante l'aggiornamento del sync" };
      }

      console.log(`✅ [Sync Listing] Automated scan completed: ${scanResult.status}`);

      return {
        success: true,
        message: `Scansione completata: ${scanResult.status === "synced" ? "Trovato" : scanResult.status === "mismatch" ? "Discrepanza" : "Non trovato"}`,
      };
    } catch (error: any) {
      console.error("[Sync Listing] Error during automated scan:", error);
      return {
        error: `Errore durante la scansione: ${error.message}`,
      };
    }
  }

  // TIER 2: Directory MANUALI (Yelp, TripAdvisor, PagineGialle, Apple Maps)
  if (directory.type === "manual") {
    try {
      // Ottieni l'user ID per il log
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || "unknown";

      // Imposta lo status a 'processing' e submission_status a 'action_needed'
      const { error: syncError } = await supabase
        .from("listing_syncs")
        .upsert(
          {
            location_id: locationId,
            directory_id: directoryId,
            status: "processing",
            submission_status: "action_needed",
            last_check_at: new Date().toISOString(),
            remote_data: {
              requested_at: new Date().toISOString(),
              requested_by: userId,
              type: "manual_concierge",
            },
          },
          {
            onConflict: "location_id,directory_id",
          }
        );

      if (syncError) {
        console.error(`[Sync Listing] Error creating manual request:`, syncError);
        return { error: "Errore durante la creazione della richiesta" };
      }

      console.log(`📝 [Sync Listing] Manual request created for ${directory.name}`);

      // TODO: Invia notifica al team Concierge (email, Slack, webhook, etc.)
      // await sendConciergeNotification(location, directory, user);

      return {
        success: true,
        message: `Richiesta inviata al team Concierge per ${directory.name}`,
      };
    } catch (error: any) {
      console.error("[Sync Listing] Error during manual request:", error);
      return {
        error: `Errore durante la richiesta: ${error.message}`,
      };
    }
  }

  return { error: "Tipo di directory non valido" };
}

/**
 * Aggiorna manualmente lo stato di un listing dopo intervento Concierge
 * Usato dal team interno quando completa l'aggiornamento di un listing manuale
 */
export async function updateManualListingStatus(
  locationId: string,
  directoryId: string,
  newStatus: "synced" | "mismatch" | "missing",
  listingUrl?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // Verifica permessi: solo admin e manager
  let userId: string;
  try {
    await requireRole(["admin", "manager"]);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Non autenticato" };
    }
    userId = user.id;
  } catch (error: any) {
    return { error: error.message || "Permessi insufficienti" };
  }

  try {
    // Aggiorna il sync con i nuovi dati
    const { error: updateError } = await supabase
      .from("listing_syncs")
      .update({
        status: newStatus,
        submission_status: "synced",
        last_manual_check: new Date().toISOString(),
        last_check_at: new Date().toISOString(),
        listing_url: listingUrl || null,
        remote_data: {
          updated_by: user.id,
          updated_at: new Date().toISOString(),
          type: "manual_update",
        },
      })
      .eq("location_id", locationId)
      .eq("directory_id", directoryId);

    if (updateError) {
      console.error("[Update Manual Listing] Error:", updateError);
      return { error: "Errore durante l'aggiornamento" };
    }

    console.log(`✅ [Update Manual Listing] Status updated to ${newStatus}`);

    return { success: true };
  } catch (error: any) {
    console.error("[Update Manual Listing] Exception:", error);
    return { error: error.message };
  }
}

/**
 * Salva le credenziali del cliente per una directory manuale
 * Il cliente usa questa funzione per fornire username/password
 */
export async function submitListingCredentials(
  locationId: string,
  directoryId: string,
  credentials: ListingCredentials
): Promise<{ success?: boolean; error?: string; message?: string }> {
  const supabase = await createClient();

  // Ottieni il contesto dell'agenzia (multi-tenancy)
  let agencyId: string;
  let userId: string;
  try {
    agencyId = await getUserAgency();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Non autenticato" };
    }
    userId = user.id;
  } catch (error: any) {
    return { error: error.message || "Errore di autenticazione" };
  }

  // Verifica che la location appartenga all'agenzia (sicurezza multi-tenancy)
  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("agency_id", agencyId) // Filtra per agency_id
    .single();

  if (!location) {
    return { error: "Location non trovata o non autorizzata" };
  }

  // Valida che ci siano almeno username O password
  if (!credentials.username && !credentials.password) {
    return { error: "Inserisci almeno username o password" };
  }

  try {
    // Aggiorna il sync con le credenziali
    const { error: updateError } = await supabase
      .from("listing_syncs")
      .update({
        credentials: credentials,
        credentials_submitted_at: new Date().toISOString(),
        submission_status: "processing", // Riporta a processing così l'admin sa che può riprovare
        admin_note: null, // Resetta la nota admin precedente
        remote_data: {
          ...{}, // Mantieni i dati esistenti se presenti
          credentials_updated_by: user.id,
          credentials_updated_at: new Date().toISOString(),
        },
      })
      .eq("location_id", locationId)
      .eq("directory_id", directoryId);

    if (updateError) {
      console.error("[Submit Credentials] Error:", updateError);
      return { error: "Errore durante il salvataggio delle credenziali" };
    }

    console.log(`✅ [Submit Credentials] Credentials saved for directory ${directoryId}`);
    console.log(`📧 [Submit Credentials] TODO: Notify admin team that credentials are ready`);

    // TODO: Invia notifica al team admin (email, Slack, webhook)
    // await notifyAdminCredentialsSubmitted(locationId, directoryId, user);

    return {
      success: true,
      message: "Credenziali salvate con successo. Il nostro team le userà per aggiornare il tuo listing.",
    };
  } catch (error: any) {
    console.error("[Submit Credentials] Exception:", error);
    return { error: error.message };
  }
}

/**
 * Aggiorna lo stato di un listing (Admin only)
 * Permette di impostare submission_status e admin_note
 */
export async function updateListingStatus(
  locationId: string,
  directoryId: string,
  submissionStatus: "synced" | "processing" | "action_needed" | "failed",
  adminNote?: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  // Verifica permessi: solo admin e manager
  try {
    await requireRole(["admin", "manager"]);
  } catch (error: any) {
    return { error: error.message || "Permessi insufficienti" };
  }

  try {
    // Aggiorna il sync
    const { error: updateError } = await supabase
      .from("listing_syncs")
      .update({
        submission_status: submissionStatus,
        admin_note: adminNote || null,
        last_check_at: new Date().toISOString(),
      })
      .eq("location_id", locationId)
      .eq("directory_id", directoryId);

    if (updateError) {
      console.error("[Update Listing Status] Error:", updateError);
      return { error: "Errore durante l'aggiornamento dello stato" };
    }

    console.log(`✅ [Update Listing Status] Status updated to ${submissionStatus}`);

    return { success: true };
  } catch (error: any) {
    console.error("[Update Listing Status] Exception:", error);
    return { error: error.message };
  }
}
