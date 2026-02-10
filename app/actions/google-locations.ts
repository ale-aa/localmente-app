"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserAgency } from "@/lib/auth-helper";
import {
  listGoogleLocations,
  type GoogleLocation,
} from "@/lib/google-business";

/**
 * Recupera tutte le sedi Google Business disponibili per l'agenzia
 * Gestisce automaticamente la paginazione
 */
export async function getGoogleLocationsAvailable(): Promise<{
  locations?: GoogleLocation[];
  error?: string;
}> {
  try {
    // Ottieni il contesto dell'agenzia
    const agencyId = await getUserAgency();

    // Chiama la funzione che recupera le locations da Google
    const locations = await listGoogleLocations(agencyId);

    return { locations };
  } catch (error: any) {
    console.error("[getGoogleLocationsAvailable] Error:", error);
    return {
      error: error.message || "Errore durante il recupero delle sedi Google",
    };
  }
}

/**
 * Collega una sede locale con una sede Google Business Profile
 * @param locationId - ID della location nel database Supabase
 * @param googleLocationName - Resource name della location Google (es: "accounts/123/locations/456")
 * @param googleLocationData - Dati completi della location Google per salvare metadati
 */
export async function linkGoogleLocation(
  locationId: string,
  googleLocationName: string,
  googleLocationData?: GoogleLocation
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Ottieni il contesto dell'agenzia per sicurezza multi-tenancy
    const agencyId = await getUserAgency();

    // Verifica che la location appartenga all'agenzia
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("id, business_name")
      .eq("id", locationId)
      .eq("agency_id", agencyId)
      .single();

    if (locationError || !location) {
      return { error: "Location non trovata o non autorizzata" };
    }

    // Prepara i metadati da salvare (opzionale, per referenza futura)
    const googleMetadata = googleLocationData
      ? {
          locationName: googleLocationData.locationName,
          storeCode: googleLocationData.storeCode,
          address: googleLocationData.address,
          phoneNumbers: googleLocationData.phoneNumbers,
          websiteUri: googleLocationData.websiteUri,
          linkedAt: new Date().toISOString(),
        }
      : null;

    // Aggiorna la location con il collegamento Google
    const { error: updateError } = await supabase
      .from("locations")
      .update({
        google_location_id: googleLocationName,
        google_sync_status: "linked",
        google_metadata: googleMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", locationId);

    if (updateError) {
      console.error("[linkGoogleLocation] Update error:", updateError);
      return {
        error: "Errore durante il collegamento della sede",
      };
    }

    console.log(
      `✅ [Google Location Link] Location ${location.business_name} linked to ${googleLocationName}`
    );

    // Revalida la pagina della location
    revalidatePath(`/dashboard/locations/${locationId}`);
    revalidatePath("/dashboard/locations");

    return { success: true };
  } catch (error: any) {
    console.error("[linkGoogleLocation] Error:", error);
    return {
      error: error.message || "Errore durante il collegamento",
    };
  }
}

/**
 * Scollega una sede da Google Business Profile
 * @param locationId - ID della location nel database Supabase
 */
export async function unlinkGoogleLocation(
  locationId: string
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Ottieni il contesto dell'agenzia per sicurezza multi-tenancy
    const agencyId = await getUserAgency();

    // Verifica che la location appartenga all'agenzia
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("id, business_name")
      .eq("id", locationId)
      .eq("agency_id", agencyId)
      .single();

    if (locationError || !location) {
      return { error: "Location non trovata o non autorizzata" };
    }

    // Rimuovi il collegamento Google
    const { error: updateError } = await supabase
      .from("locations")
      .update({
        google_location_id: null,
        google_sync_status: null,
        google_metadata: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", locationId);

    if (updateError) {
      console.error("[unlinkGoogleLocation] Update error:", updateError);
      return {
        error: "Errore durante lo scollegamento della sede",
      };
    }

    console.log(
      `✅ [Google Location Unlink] Location ${location.business_name} unlinked from Google`
    );

    // Revalida la pagina della location
    revalidatePath(`/dashboard/locations/${locationId}`);
    revalidatePath("/dashboard/locations");

    return { success: true };
  } catch (error: any) {
    console.error("[unlinkGoogleLocation] Error:", error);
    return {
      error: error.message || "Errore durante lo scollegamento",
    };
  }
}
