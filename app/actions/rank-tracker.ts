"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  // Ottieni l'utente corrente
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Utente non autenticato",
    };
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

  // Ottieni la location per verificare i permessi e le coordinate
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("id, latitude, longitude, agency_id, business_name, place_id")
    .eq("id", locationId)
    .single();

  if (locationError || !location) {
    return {
      error: "Location non trovata",
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

  // Ottieni i dettagli della scansione
  const { data: scan, error: scanError } = await supabase
    .from("rank_scans")
    .select(`
      *,
      location:locations(business_name, address, city)
    `)
    .eq("id", scanId)
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
