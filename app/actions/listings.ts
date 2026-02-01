"use server";

import { createClient } from "@/lib/supabase/server";
import { scanAllDirectories, type LocationData } from "@/lib/listing-scanner";

export interface ListingSync {
  id: string;
  location_id: string;
  directory_id: string;
  status: "synced" | "mismatch" | "missing" | "processing";
  last_check_at: string;
  listing_url: string | null;
  remote_data: any;
  directory: {
    id: string;
    name: string;
    icon_url: string | null;
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

  // Verifica autenticazione
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Non autenticato" };
  }

  // Recupera la location con tutti i dati necessari per il NAP check
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("*")
    .eq("id", locationId)
    .single();

  if (locationError || !location) {
    return { error: "Location non trovata" };
  }

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

  try {
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
