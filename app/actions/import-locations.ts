"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthClient } from "@/lib/google-business";
import { google } from "googleapis";

export interface ImportResult {
  success: boolean;
  imported: number;
  updated: number;
  errors: number;
  errorMessages?: string[];
}

/**
 * Rate Limiting Helper: Pausa l'esecuzione per evitare di superare i limiti API
 */
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry Helper: Esegue una chiamata API con gestione automatica degli errori 429
 */
async function apiCallWithRetry<T>(
  apiCall: () => Promise<T>,
  retryDelayMs: number = 5000
): Promise<T> {
  try {
    return await apiCall();
  } catch (error: any) {
    // Gestione specifica per errore 429 (Too Many Requests)
    if (error.code === 429 || error.status === 429) {
      console.warn(
        `⚠️  [Rate Limit] Received 429 error. Waiting ${retryDelayMs / 1000}s before retry...`
      );
      await delay(retryDelayMs);

      // Retry una volta sola
      try {
        return await apiCall();
      } catch (retryError: any) {
        console.error("❌ [Rate Limit] Retry failed:", retryError.message);
        throw retryError;
      }
    }

    // Se non è un 429, rilancia l'errore originale
    throw error;
  }
}

/**
 * Importa le locations da Google Business Profile
 * Crea automaticamente i clienti se non esistono
 */
export async function importLocationsFromGoogle(): Promise<{
  data?: ImportResult;
  error?: string;
}> {
  const supabase = await createClient();

  try {
    // Verifica autenticazione
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Non autenticato" };
    }

    // Recupera il profilo per ottenere agency_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.agency_id) {
      return { error: "Nessuna agenzia associata" };
    }

    // Verifica permessi (solo admin e manager)
    if (!["admin", "manager"].includes(profile.role)) {
      return {
        error:
          "Permessi insufficienti. Solo admin e manager possono importare locations.",
      };
    }

    console.log(
      `🚀 [Import] Starting location import for agency ${profile.agency_id}`
    );

    // Ottieni il client autenticato Google
    const authClient = await getAuthClient(profile.agency_id);

    if (!authClient) {
      return {
        error:
          "Nessuna integrazione Google Business trovata. Connetti prima il tuo account Google.",
      };
    }

    // Inizializza le API Google Business
    const mybusinessaccountmanagement = google.mybusinessaccountmanagement({
      version: "v1",
      auth: authClient.oauth2Client,
    });

    const mybusinessbusinessinformation =
      google.mybusinessbusinessinformation({
        version: "v1",
        auth: authClient.oauth2Client,
      });

    // STEP 1: Recupera tutti gli account
    console.log("📊 [Import] Fetching Google Business accounts...");
    const accountsResponse = await apiCallWithRetry(() =>
      mybusinessaccountmanagement.accounts.list()
    );

    const accounts = accountsResponse.data.accounts || [];

    // Rate limiting: pausa dopo la chiamata API
    await delay(2000);

    if (accounts.length === 0) {
      return {
        error:
          "Nessun account Google Business trovato. Assicurati di avere almeno una sede configurata su Google Business Profile.",
      };
    }

    console.log(`📊 [Import] Found ${accounts.length} account(s)`);

    let totalImported = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    const errorMessages: string[] = [];

    // STEP 2: Per ogni account, recupera le locations
    for (const account of accounts) {
      if (!account.name) continue;

      console.log(`📍 [Import] Fetching locations for account: ${account.name}`);

      try {
        // Recupera le locations per questo account con rate limiting
        const locationsResponse = await apiCallWithRetry(() =>
          mybusinessbusinessinformation.accounts.locations.list({
            parent: account.name,
            pageSize: 10, // Ridotto da default (100) per alleggerire il carico
            readMask: "name,title,storefrontAddress,phoneNumbers,latlng,websiteUri,regularHours,categories,storeCode",
          })
        );

        const locations = locationsResponse.data.locations || [];

        // Rate limiting: pausa dopo la chiamata API
        await delay(2000);

        console.log(
          `📍 [Import] Found ${locations.length} location(s) in account ${account.name}`
        );

        // STEP 3: Per ogni location, mappala e salvala nel DB
        for (const location of locations) {
          try {
            await importSingleLocation(
              supabase,
              location,
              profile.agency_id
            );

            // Determina se è un insert o update controllando se esiste già
            const existsCheck = await supabase
              .from("locations")
              .select("id")
              .eq("google_place_id", extractPlaceId(location.name || ""))
              .single();

            if (existsCheck.data) {
              totalUpdated++;
            } else {
              totalImported++;
            }

            // Rate limiting: piccola pausa tra location per distribuire il carico
            await delay(500);
          } catch (error: any) {
            console.error(
              `[Import] Error importing location ${location.title}:`,
              error
            );
            totalErrors++;
            errorMessages.push(
              `${location.title}: ${error.message || "Errore sconosciuto"}`
            );
          }
        }
      } catch (error: any) {
        console.error(
          `[Import] Error fetching locations for account ${account.name}:`,
          error
        );
        errorMessages.push(
          `Account ${account.accountName}: ${error.message || "Errore sconosciuto"}`
        );
      }

      // Rate limiting: pausa tra account per rispettare i limiti API
      await delay(2000);
    }

    console.log("✅ [Import] Import completed:", {
      imported: totalImported,
      updated: totalUpdated,
      errors: totalErrors,
    });

    return {
      data: {
        success: totalErrors === 0,
        imported: totalImported,
        updated: totalUpdated,
        errors: totalErrors,
        errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
      },
    };
  } catch (error: any) {
    console.error("[Import] Unexpected error:", error);
    return {
      error: `Errore durante l'importazione: ${error.message || "Errore sconosciuto"}`,
    };
  }
}

/**
 * Importa una singola location nel database
 * Crea automaticamente un client se non esiste
 */
async function importSingleLocation(
  supabase: any,
  googleLocation: any,
  agencyId: string
) {
  // Estrai il Place ID dal nome della location (formato: accounts/{accountId}/locations/{locationId})
  const placeId = extractPlaceId(googleLocation.name || "");

  if (!placeId) {
    throw new Error("Place ID non trovato nella location Google");
  }

  // Mappa i dati da Google al nostro schema
  const locationData = mapGoogleLocationToSchema(googleLocation, placeId);

  // STEP 3.1: Crea o recupera il cliente
  // Per ora, creiamo un cliente con lo stesso nome della location (logica semplificata)
  let clientId: string | null = null;

  // Verifica se esiste già un cliente con lo stesso nome
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("business_name", locationData.business_name)
    .single();

  if (existingClient) {
    clientId = existingClient.id;
  } else {
    // Crea un nuovo cliente
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        agency_id: agencyId,
        business_name: locationData.business_name,
        email: null, // Potremmo non averlo da Google
        phone: locationData.phone || null,
        notes: "Cliente creato automaticamente dall'import Google Business Profile",
      })
      .select("id")
      .single();

    if (clientError) {
      throw new Error(`Errore creazione cliente: ${clientError.message}`);
    }

    clientId = newClient.id;
    console.log(`👤 [Import] Created new client: ${locationData.business_name}`);
  }

  // STEP 3.2: Upsert della location (inserisci o aggiorna se esiste già)
  const { error: locationError } = await supabase.from("locations").upsert(
    {
      ...locationData,
      agency_id: agencyId,
      client_id: clientId,
    },
    {
      onConflict: "google_place_id",
      ignoreDuplicates: false, // Aggiorna se esiste
    }
  );

  if (locationError) {
    throw new Error(`Errore salvataggio location: ${locationError.message}`);
  }

  console.log(`📍 [Import] Imported/Updated location: ${locationData.business_name}`);
}

/**
 * Estrae il Place ID dal nome della risorsa Google
 * Formato: "accounts/{accountId}/locations/{locationId}"
 */
function extractPlaceId(resourceName: string): string {
  const parts = resourceName.split("/");
  return parts[parts.length - 1] || "";
}

/**
 * Mappa i dati da Google Business Profile al nostro schema database
 */
function mapGoogleLocationToSchema(googleLocation: any, placeId: string) {
  // Componi l'indirizzo
  const address = googleLocation.storefrontAddress;
  let fullAddress = "";
  let city = "";
  let postalCode = "";

  if (address) {
    // addressLines è un array
    if (address.addressLines && address.addressLines.length > 0) {
      fullAddress = address.addressLines.join(", ");
    }

    city = address.locality || "";
    postalCode = address.postalCode || "";
  }

  // Telefono principale
  let phone = null;
  if (
    googleLocation.phoneNumbers &&
    googleLocation.phoneNumbers.primaryPhone
  ) {
    phone = googleLocation.phoneNumbers.primaryPhone;
  }

  // Coordinate (latlng)
  let latitude = null;
  let longitude = null;

  if (googleLocation.latlng) {
    latitude = googleLocation.latlng.latitude || null;
    longitude = googleLocation.latlng.longitude || null;
  }

  // Categoria principale
  let category = null;
  if (
    googleLocation.categories &&
    googleLocation.categories.primaryCategory
  ) {
    category = googleLocation.categories.primaryCategory.displayName || null;
  }

  // Website
  const website = googleLocation.websiteUri || null;

  return {
    google_place_id: placeId,
    business_name: googleLocation.title || "Location senza nome",
    address: fullAddress || null,
    city: city || null,
    postal_code: postalCode || null,
    phone: phone,
    latitude: latitude,
    longitude: longitude,
    category: category,
    website: website,
    // Campi opzionali che potremmo non avere
    email: null,
    place_id: null, // Questo è diverso da google_place_id
    opening_hours: null,
  };
}
