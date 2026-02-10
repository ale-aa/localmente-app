"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserAgency } from "@/lib/auth-helper";
import { generateGrid } from "@/lib/geo-utils";
import { batchFetchRanks } from "@/lib/dataforseo";
import { z } from "zod";

// Schema validazione per avvio scansione
const scanSchema = z.object({
  locationId: z.string().uuid("ID location non valido"),
  keyword: z.string().min(2, "La keyword deve essere di almeno 2 caratteri"),
  gridSize: z.number().int().refine((val) => [3, 5, 7, 9].includes(val), {
    message: "Grid size deve essere 3, 5, 7 o 9",
  }),
  radiusMeters: z.number().int().min(500).max(10000, "Il raggio deve essere tra 500m e 10km"),
  zoom: z.number().int().min(10).max(20).default(15),
});

export type ScanFormData = z.infer<typeof scanSchema>;

/**
 * Avvia una nuova scansione rank per una location
 */
export async function startScan(data: ScanFormData) {
  const supabase = await createClient();

  // Ottieni il contesto dell'agenzia (multi-tenancy)
  let agencyId: string;
  try {
    agencyId = await getUserAgency();
  } catch (error: any) {
    return { error: error.message || "Errore di autenticazione" };
  }

  // Valida i dati
  const validatedData = scanSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      error: "Dati non validi",
      details: validatedData.error.flatten().fieldErrors,
    };
  }

  const { locationId, keyword, gridSize, radiusMeters, zoom } = validatedData.data;

  // Ottieni la location per verificare i permessi e le coordinate (filtra per agency_id)
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id, latitude, longitude, agency_id, business_name, place_id")
    .eq("id", locationId)
    .eq("agency_id", agencyId) // CHANGED: Verify agency ownership
    .single();

  if (locationError || !location) {
    return {
      error: "Location non trovata o non autorizzata",
    };
  }

  // Verifica che la location abbia coordinate
  if (!location.latitude || !location.longitude) {
    return {
      error: "La location non ha coordinate geografiche impostate",
    };
  }

  // Genera la griglia di punti
  const gridPoints = generateGrid(
    location.latitude,
    location.longitude,
    radiusMeters,
    gridSize
  );

  const totalPoints = gridPoints.length;

  // Crea il record della scansione
  const { data: scan, error: scanError } = await supabase
    .from("rank_scans")
    .insert({
      location_id: locationId,
      keyword,
      grid_size: gridSize,
      radius_meters: radiusMeters,
      zoom,
      status: "pending",
      total_points: totalPoints,
      completed_points: 0,
    })
    .select()
    .single();

  if (scanError || !scan) {
    console.error("Errore creazione scan:", scanError);
    return {
      error: `Errore durante la creazione della scansione: ${scanError?.message || "Sconosciuto"}`,
    };
  }

  // Avvia il processo di scansione in background
  // In produzione, questo sarebbe un job asincrono (es. Vercel Cron, Supabase Edge Functions, etc.)
  try {
    await performScan(scan.id, gridPoints, keyword, zoom, location.place_id, location.business_name);
  } catch (error: any) {
    console.error("Errore durante la scansione:", error);

    // Aggiorna lo status a failed
    await supabase
      .from("rank_scans")
      .update({
        status: "failed",
        error_message: error.message || "Errore sconosciuto durante la scansione",
      })
      .eq("id", scan.id);

    return {
      error: "Errore durante la scansione",
      details: error.message,
    };
  }

  revalidatePath(`/dashboard/locations/${locationId}`);

  return {
    success: true,
    scan,
  };
}

/**
 * Esegue la scansione reale usando DataForSEO API
 * @param scanId - ID della scansione
 * @param gridPoints - Punti della griglia da scansionare
 * @param keyword - Keyword di ricerca
 * @param zoom - Livello di zoom della mappa
 * @param targetPlaceId - Google Place ID della location (opzionale)
 * @param targetBusinessName - Nome dell'attività (fallback se place_id non disponibile)
 */
async function performScan(
  scanId: string,
  gridPoints: any[],
  keyword: string,
  zoom: number,
  targetPlaceId?: string | null,
  targetBusinessName?: string | null
) {
  const supabase = await createClient();

  // 🔍 DEBUG: Log scan configuration
  console.log("🚀 [Scan] Starting scan:", {
    scanId,
    keyword,
    zoom,
    gridSize: `${Math.sqrt(gridPoints.length)}x${Math.sqrt(gridPoints.length)} (${gridPoints.length} points)`,
    targetPlaceId: targetPlaceId || "NOT SET",
    targetBusinessName: targetBusinessName || "NOT SET",
  });

  // Aggiorna status a "running"
  await supabase
    .from("rank_scans")
    .update({ status: "running" })
    .eq("id", scanId);

  try {
    // Esegui la scansione batch con DataForSEO API
    // Batch size = 5 per evitare timeout e rate limiting
    const apiResults = await batchFetchRanks(
      keyword,
      gridPoints,
      zoom,
      targetPlaceId || undefined,
      targetBusinessName || undefined,
      5 // batch size
    );

    // Mappa i risultati API al formato del database
    const dbResults = apiResults.map((result) => ({
      scan_id: scanId,
      grid_index: result.gridIndex,
      rank: result.rank,
      found_place_id: result.placeId,
      latitude: gridPoints.find((p) => p.index === result.gridIndex)?.latitude || 0,
      longitude: gridPoints.find((p) => p.index === result.gridIndex)?.longitude || 0,
      competitors: result.competitors || [],
    }));

    // Inserisci tutti i risultati in batch
    const { error: resultsError } = await supabase
      .from("rank_results")
      .insert(dbResults);

    if (resultsError) {
      throw new Error(`Errore inserimento risultati: ${resultsError.message}`);
    }

    // Calcola statistiche
    const validRanks = dbResults.filter((r) => r.rank !== null).map((r) => r.rank!);
    const avgRank = validRanks.length > 0
      ? validRanks.reduce((sum, r) => sum + r, 0) / validRanks.length
      : null;
    const bestRank = validRanks.length > 0 ? Math.min(...validRanks) : null;

    // 🔍 DEBUG: Log scan results summary
    console.log("✅ [Scan] Completed successfully:", {
      totalPoints: dbResults.length,
      foundCount: validRanks.length,
      notFoundCount: dbResults.length - validRanks.length,
      bestRank,
      avgRank: avgRank ? avgRank.toFixed(1) : "N/A",
    });

    // Aggiorna lo status a "completed" con statistiche
    await supabase
      .from("rank_scans")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completed_points: dbResults.length,
        average_rank: avgRank,
        best_rank: bestRank,
      })
      .eq("id", scanId);
  } catch (error: any) {
    console.error("Errore durante performScan:", error);

    // Aggiorna lo status a "failed"
    await supabase
      .from("rank_scans")
      .update({
        status: "failed",
        error_message: error.message || "Errore sconosciuto durante la scansione",
      })
      .eq("id", scanId);

    throw error;
  }
}

/**
 * Ottiene tutte le scansioni per una location
 */
export async function getScansForLocation(locationId: string) {
  const supabase = await createClient();

  // Ottieni il contesto dell'agenzia (multi-tenancy)
  let agencyId: string;
  try {
    agencyId = await getUserAgency();
  } catch (error: any) {
    console.error("Errore autenticazione:", error);
    return { scans: [] };
  }

  // Verifica che la location appartenga all'agenzia (sicurezza multi-tenancy)
  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("agency_id", agencyId)
    .single();

  if (!location) {
    console.error("Location non trovata o non autorizzata");
    return { scans: [] };
  }

  // Recupera le scansioni
  const { data: scans, error } = await supabase
    .from("rank_scans")
    .select("*")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Errore caricamento scans:", error);
    return { scans: [] };
  }

  return { scans: scans || [] };
}

/**
 * Ottiene i risultati di una scansione specifica
 */
export async function getScanResults(scanId: string) {
  const supabase = await createClient();

  // Ottieni il contesto dell'agenzia (multi-tenancy)
  let agencyId: string;
  try {
    agencyId = await getUserAgency();
  } catch (error: any) {
    console.error("Errore autenticazione:", error);
    return { scan: null, results: [] };
  }

  // Ottieni i dettagli della scansione con verifica agency ownership
  const { data: scan, error: scanError } = await supabase
    .from("rank_scans")
    .select(`
      *,
      location:locations!inner(business_name, address, city, agency_id)
    `)
    .eq("id", scanId)
    .eq("location.agency_id", agencyId) // CHANGED: Verify agency ownership through location
    .single();

  if (scanError || !scan) {
    return { scan: null, results: [] };
  }

  // Ottieni i risultati
  const { data: results, error: resultsError } = await supabase
    .from("rank_results")
    .select("*")
    .eq("scan_id", scanId)
    .order("grid_index", { ascending: true });

  if (resultsError) {
    console.error("Errore caricamento risultati:", resultsError);
    return { scan, results: [] };
  }

  return { scan, results: results || [] };
}

/**
 * Elimina una scansione e tutti i suoi risultati
 */
export async function deleteScan(scanId: string) {
  const supabase = await createClient();

  // Ottieni il contesto dell'agenzia (multi-tenancy)
  let agencyId: string;
  try {
    agencyId = await getUserAgency();
  } catch (error: any) {
    return { error: error.message || "Errore di autenticazione" };
  }

  // Verifica che la scansione appartenga a una location dell'agenzia
  const { data: scan } = await supabase
    .from("rank_scans")
    .select("location_id, location:locations!inner(agency_id)")
    .eq("id", scanId)
    .eq("location.agency_id", agencyId)
    .single();

  if (!scan) {
    return { error: "Scansione non trovata o non autorizzata" };
  }

  // Elimina la scansione
  const { error } = await supabase
    .from("rank_scans")
    .delete()
    .eq("id", scanId);

  if (error) {
    console.error("Errore eliminazione scan:", error);
    return {
      error: "Errore durante l'eliminazione della scansione",
    };
  }

  return { success: true };
}

/**
 * Ottiene le statistiche aggregate per una location
 */
export async function getLocationRankStats(locationId: string) {
  const supabase = await createClient();

  // Ottieni il contesto dell'agenzia (multi-tenancy)
  let agencyId: string;
  try {
    agencyId = await getUserAgency();
  } catch (error: any) {
    return {
      totalScans: 0,
      averageRank: null,
      bestRank: null,
      latestScan: null,
    };
  }

  // Verifica che la location appartenga all'agenzia
  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("agency_id", agencyId)
    .single();

  if (!location) {
    return {
      totalScans: 0,
      averageRank: null,
      bestRank: null,
      latestScan: null,
    };
  }

  const { data: scans } = await supabase
    .from("rank_scans")
    .select("*")
    .eq("location_id", locationId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(10);

  if (!scans || scans.length === 0) {
    return {
      totalScans: 0,
      averageRank: null,
      bestRank: null,
      latestScan: null,
    };
  }

  const validRanks = scans
    .filter((s) => s.average_rank !== null)
    .map((s) => s.average_rank);

  const bestRanks = scans
    .filter((s) => s.best_rank !== null)
    .map((s) => s.best_rank);

  return {
    totalScans: scans.length,
    averageRank:
      validRanks.length > 0
        ? validRanks.reduce((a, b) => a + b, 0) / validRanks.length
        : null,
    bestRank: bestRanks.length > 0 ? Math.min(...bestRanks) : null,
    latestScan: scans[0],
  };
}

/**
 * Ottiene lo storico delle scansioni per una location e keyword specifica
 * Usato per visualizzare il grafico dell'andamento nel tempo
 */
export async function getRankHistory(locationId: string, keyword?: string) {
  const supabase = await createClient();

  // Ottieni il contesto dell'agenzia (multi-tenancy)
  let agencyId: string;
  try {
    agencyId = await getUserAgency();
  } catch (error: any) {
    console.error("Errore autenticazione:", error);
    return { history: [] };
  }

  // Verifica che la location appartenga all'agenzia
  const { data: location } = await supabase
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("agency_id", agencyId)
    .single();

  if (!location) {
    console.error("Location non trovata o non autorizzata");
    return { history: [] };
  }

  let query = supabase
    .from("rank_scans")
    .select("id, keyword, created_at, best_rank, average_rank, status")
    .eq("location_id", locationId)
    .eq("status", "completed")
    .order("created_at", { ascending: true });

  // Se specificata una keyword, filtra per quella
  if (keyword) {
    query = query.eq("keyword", keyword);
  }

  const { data: history, error } = await query;

  if (error) {
    console.error("Errore caricamento storico:", error);
    return { history: [] };
  }

  return { history: history || [] };
}

/**
 * Avvia scansioni multiple in blocco per più keyword
 */
export async function startBulkScans(data: ScanFormData & { keywords: string[] }) {
  const supabase = await createClient();

  // Ottieni il contesto dell'agenzia (multi-tenancy)
  let agencyId: string;
  try {
    agencyId = await getUserAgency();
  } catch (error: any) {
    return { error: error.message || "Errore di autenticazione" };
  }

  const { locationId, gridSize, radiusMeters, zoom, keywords } = data;

  // Valida che ci siano keyword
  if (!keywords || keywords.length === 0) {
    return {
      error: "Nessuna keyword specificata",
    };
  }

  // Ottieni la location per verificare i permessi e le coordinate (filtra per agency_id)
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id, latitude, longitude, agency_id, business_name, place_id")
    .eq("id", locationId)
    .eq("agency_id", agencyId) // CHANGED: Verify agency ownership
    .single();

  if (locationError || !location) {
    return {
      error: "Location non trovata o non autorizzata",
    };
  }

  // Verifica che la location abbia coordinate
  if (!location.latitude || !location.longitude) {
    return {
      error: "La location non ha coordinate geografiche impostate",
    };
  }

  // Genera la griglia di punti (uguale per tutte le scansioni)
  const gridPoints = generateGrid(
    location.latitude,
    location.longitude,
    radiusMeters,
    gridSize
  );

  const totalPoints = gridPoints.length;

  // Array per memorizzare i risultati
  const results = [];
  const errors = [];

  // Crea una scansione per ogni keyword
  for (const keyword of keywords) {
    try {
      // Crea il record della scansione
      const { data: scan, error: scanError } = await supabase
        .from("rank_scans")
        .insert({
          location_id: locationId,
          keyword,
          grid_size: gridSize,
          radius_meters: radiusMeters,
          zoom,
          status: "pending",
          total_points: totalPoints,
          completed_points: 0,
        })
        .select()
        .single();

      if (scanError || !scan) {
        console.error(`Errore creazione scan per "${keyword}":`, scanError);
        errors.push({
          keyword,
          error: scanError?.message || "Errore sconosciuto",
        });
        continue;
      }

      // Avvia la scansione in background
      try {
        // Non aspettiamo il completamento, lanciamo in background
        performScan(scan.id, gridPoints, keyword, zoom, location.place_id, location.business_name).catch((err) => {
          console.error(`Errore esecuzione scan per "${keyword}":`, err);
        });

        results.push({
          keyword,
          scanId: scan.id,
          success: true,
        });
      } catch (error: any) {
        console.error(`Errore avvio scan per "${keyword}":`, error);
        errors.push({
          keyword,
          error: error.message || "Errore durante l'avvio",
        });
      }
    } catch (error: any) {
      console.error(`Errore generale per "${keyword}":`, error);
      errors.push({
        keyword,
        error: error.message || "Errore sconosciuto",
      });
    }
  }

  revalidatePath(`/dashboard/locations/${locationId}`);

  return {
    success: true,
    results,
    errors,
    total: keywords.length,
    succeeded: results.length,
    failed: errors.length,
  };
}
