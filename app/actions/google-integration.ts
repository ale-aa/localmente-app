"use server";

import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { getAuthClient } from "@/lib/google-business";
import { getUserAgency } from "@/lib/auth-helper";
import { revalidatePath } from "next/cache";

export interface UpdateGoogleLocationData {
  businessName?: string;
  address?: string;
  streetNumber?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
}

export interface GoogleUpdateResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  message?: string;
}

/**
 * Aggiorna i dati NAP (Name, Address, Phone) di una location su Google Business Profile
 *
 * @param locationId - ID della location da aggiornare
 * @param data - Dati da aggiornare (opzionali, usa quelli del DB se non forniti)
 * @returns Risultato dell'operazione con gestione errori
 */
export async function updateGoogleLocation(
  locationId: string,
  data?: UpdateGoogleLocationData
): Promise<GoogleUpdateResult> {
  const supabase = await createClient();

  try {
    // 1. Ottieni il contesto dell'agenzia (multi-tenancy)
    const agencyId = await getUserAgency();

    // 2. Recupera la location con tutti i dati necessari (filtra per agency_id per sicurezza)
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("*")
      .eq("id", locationId)
      .eq("agency_id", agencyId) // Usa il contesto dell'agenzia
      .single();

    if (locationError || !location) {
      return {
        success: false,
        error: "Location non trovata o non autorizzata",
      };
    }

    // 3. Verifica che la location abbia un google_location_name (necessario per API)
    if (!location.google_location_name) {
      return {
        success: false,
        error: "Questa location non è ancora collegata a Google Business Profile. Importa prima la location da Google.",
        errorCode: "NO_GOOGLE_LOCATION",
      };
    }

    // 4. Recupera il client OAuth autenticato per l'agenzia
    const authClient = await getAuthClient(agencyId); // Usa il contesto dell'agenzia

    if (!authClient) {
      return {
        success: false,
        error: "Integrazione Google non configurata. Vai nelle Impostazioni per collegare l'account Google Business.",
        errorCode: "NO_INTEGRATION",
      };
    }

    console.log(`🚀 [Google Update] Starting update for location ${location.business_name}`);
    console.log(`📍 [Google Update] Google Location Name: ${location.google_location_name}`);

    // 6. Prepara i dati per l'aggiornamento (usa dati forniti o quelli del DB)
    const updateData = {
      businessName: data?.businessName || location.business_name,
      address: data?.address || location.address,
      streetNumber: data?.streetNumber || location.street_number,
      city: data?.city || location.city,
      province: data?.province || location.province,
      postalCode: data?.postalCode || location.postal_code,
      phone: data?.phone || location.phone,
      website: data?.website || location.website,
      latitude: data?.latitude || location.latitude,
      longitude: data?.longitude || location.longitude,
    };

    // 7. Mappa i dati nel formato Google Business Profile API
    const googleLocationData = mapToGoogleFormat(updateData);

    console.log("📦 [Google Update] Mapped data:", JSON.stringify(googleLocationData, null, 2));

    // 8. Inizializza l'API Google My Business
    const mybusiness = google.mybusinessbusinessinformation({
      version: "v1",
      auth: authClient.oauth2Client,
    });

    // 9. Esegui l'aggiornamento con PATCH
    try {
      // L'endpoint è: locations/{location_name}
      // Es: accounts/123456/locations/987654
      const response = await mybusiness.locations.patch({
        name: location.google_location_name,
        updateMask: getUpdateMask(googleLocationData),
        requestBody: googleLocationData,
      });

      console.log("✅ [Google Update] Success!", response.data);

      // 10. Aggiorna lo stato nel DB a 'synced'
      await supabase
        .from("locations")
        .update({
          google_last_sync: new Date().toISOString(),
          google_sync_status: "synced",
          google_last_error: null,
        })
        .eq("id", locationId);

      // 11. Se esiste un listing_sync per Google, aggiornalo
      await supabase
        .from("listing_syncs")
        .update({
          status: "synced",
          last_check_at: new Date().toISOString(),
          submission_status: "synced",
        })
        .eq("location_id", locationId)
        .eq("directory_id", "google");

      revalidatePath(`/dashboard/locations/${locationId}`);

      return {
        success: true,
        message: "Location aggiornata su Google Business Profile con successo",
      };
    } catch (apiError: any) {
      // 12. Gestione errori API Google
      console.error("❌ [Google Update] API Error:", apiError);

      const errorInfo = parseGoogleApiError(apiError);

      // Salva l'errore nel DB
      await supabase
        .from("locations")
        .update({
          google_sync_status: "action_needed",
          google_last_error: errorInfo.message,
          google_last_sync: new Date().toISOString(),
        })
        .eq("id", locationId);

      // Aggiorna anche il listing_sync se esiste
      await supabase
        .from("listing_syncs")
        .update({
          status: "mismatch",
          submission_status: "action_needed",
          admin_note: errorInfo.adminMessage,
          last_check_at: new Date().toISOString(),
        })
        .eq("location_id", locationId)
        .eq("directory_id", "google");

      revalidatePath(`/dashboard/locations/${locationId}`);

      return {
        success: false,
        error: errorInfo.userMessage,
        errorCode: errorInfo.code,
      };
    }
  } catch (error: any) {
    console.error("❌ [Google Update] Unexpected error:", error);

    // Salva errore generico nel DB
    try {
      await supabase
        .from("locations")
        .update({
          google_sync_status: "action_needed",
          google_last_error: error.message,
          google_last_sync: new Date().toISOString(),
        })
        .eq("id", locationId);
    } catch (dbError) {
      console.error("Failed to save error to DB:", dbError);
    }

    return {
      success: false,
      error: "Errore imprevisto durante l'aggiornamento. Il nostro team è stato notificato.",
      errorCode: "UNEXPECTED_ERROR",
    };
  }
}

/**
 * Mappa i dati del DB locale nel formato Google Business Profile API
 */
function mapToGoogleFormat(data: UpdateGoogleLocationData): any {
  const googleLocation: any = {};

  // 1. Title (Nome attività)
  if (data.businessName) {
    googleLocation.title = data.businessName;
  }

  // 2. Storefront Address
  if (data.address || data.city || data.province) {
    googleLocation.storefrontAddress = {
      regionCode: "IT", // Italia
      languageCode: "it",
      postalCode: data.postalCode || undefined,
      administrativeArea: data.province || undefined, // Provincia
      locality: data.city || undefined, // Città
      addressLines: data.address
        ? [
            data.streetNumber
              ? `${data.address}, ${data.streetNumber}`
              : data.address,
          ]
        : undefined,
    };
  }

  // 3. Primary Phone
  if (data.phone) {
    googleLocation.phoneNumbers = {
      primaryPhone: data.phone,
    };
  }

  // 4. Website URL
  if (data.website) {
    googleLocation.websiteUri = data.website;
  }

  // 5. Lat/Lng
  if (data.latitude && data.longitude) {
    googleLocation.latlng = {
      latitude: data.latitude,
      longitude: data.longitude,
    };
  }

  return googleLocation;
}

/**
 * Genera l'updateMask per l'API Google (indica quali campi aggiornare)
 */
function getUpdateMask(googleLocation: any): string {
  const fields: string[] = [];

  if (googleLocation.title) fields.push("title");
  if (googleLocation.storefrontAddress) fields.push("storefrontAddress");
  if (googleLocation.phoneNumbers) fields.push("phoneNumbers");
  if (googleLocation.websiteUri) fields.push("websiteUri");
  if (googleLocation.latlng) fields.push("latlng");

  return fields.join(",");
}

/**
 * Parsifica gli errori API Google e restituisce messaggi user-friendly
 */
function parseGoogleApiError(error: any): {
  code: string;
  message: string;
  userMessage: string;
  adminMessage: string;
} {
  const statusCode = error.response?.status || error.code;
  const errorMessage = error.message || "Unknown error";
  const errorDetails =
    error.response?.data?.error?.message || error.response?.statusText || "";

  console.log(`📊 [Google API Error] Status: ${statusCode}, Message: ${errorMessage}`);
  console.log(`📊 [Google API Error] Details: ${errorDetails}`);

  // Errore 403: Permessi insufficienti
  if (statusCode === 403) {
    return {
      code: "PERMISSION_DENIED",
      message: `Permission denied: ${errorDetails}`,
      userMessage:
        "Impossibile aggiornare automaticamente (permessi API insufficienti). Richiesta passata all'assistenza.",
      adminMessage:
        "Errore 403: Verifica che l'account Google abbia i permessi per modificare questa location.",
    };
  }

  // Errore 429: Rate limit
  if (statusCode === 429) {
    return {
      code: "RATE_LIMIT",
      message: `Rate limit exceeded: ${errorDetails}`,
      userMessage:
        "Impossibile aggiornare automaticamente (limite API raggiunto). Richiesta passata all'assistenza.",
      adminMessage:
        "Errore 429: Limite API Google raggiunto. Riprova tra qualche minuto.",
    };
  }

  // Errore 404: Location non trovata
  if (statusCode === 404) {
    return {
      code: "LOCATION_NOT_FOUND",
      message: `Location not found: ${errorDetails}`,
      userMessage:
        "Location non trovata su Google Business Profile. Verifica che sia ancora attiva.",
      adminMessage:
        "Errore 404: La location non esiste più su Google o il nome è cambiato.",
    };
  }

  // Errore 400: Dati non validi
  if (statusCode === 400) {
    return {
      code: "INVALID_DATA",
      message: `Invalid data: ${errorDetails}`,
      userMessage:
        "Alcuni dati non sono validi per Google. Controlla indirizzo e numero di telefono.",
      adminMessage: `Errore 400: Dati non validi. Dettagli: ${errorDetails}`,
    };
  }

  // Errore generico
  return {
    code: "API_ERROR",
    message: errorMessage,
    userMessage:
      "Impossibile aggiornare automaticamente. Richiesta passata all'assistenza.",
    adminMessage: `Errore API Google (${statusCode}): ${errorMessage}. Dettagli: ${errorDetails}`,
  };
}

/**
 * Verifica se ci sono differenze tra i dati locali e quelli su Google
 * (Feature TODO: implementare fetch della location da Google e comparare)
 */
export async function checkGoogleLocationDiff(
  locationId: string
): Promise<{
  hasDifferences: boolean;
  differences?: string[];
  error?: string;
}> {
  // TODO: Implementare fetch location da Google e comparazione
  // Per ora ritorna sempre true per permettere l'aggiornamento manuale
  return {
    hasDifferences: true,
    differences: ["Differenze non ancora calcolate (feature in sviluppo)"],
  };
}
