/**
 * Bing Places for Business - REAL Production API Client
 * Microsoft Advertising API / Bing Places Integration
 *
 * API Documentation:
 * - https://learn.microsoft.com/en-us/advertising/guides/
 * - https://learn.microsoft.com/en-us/advertising/customer-management-service/
 */

import { createClient } from "@/lib/supabase/server";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BingLocation {
  business_name: string;
  address: string;
  city: string;
  state?: string;
  zip_code?: string;
  country: string;
  phone?: string;
  website?: string;
  category?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface BingPlaceResponse {
  success: boolean;
  bing_place_id?: string;
  status?: "Active" | "Pending" | "Suspended";
  listing_url?: string;
  error?: string;
  error_code?: string;
}

export interface BingTokenRefreshResult {
  access_token: string;
  expires_in: number;
  error?: string;
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Refresh del Bing Access Token usando il Refresh Token
 * FONDAMENTALE: Chiamare sempre prima di ogni operazione API
 */
export async function refreshBingToken(
  agencyId: string
): Promise<BingTokenRefreshResult | null> {
  try {
    const supabase = await createClient();

    // Recupera l'integrazione Bing dall'agency
    const { data: integration, error: fetchError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("provider", "bing")
      .single();

    if (fetchError || !integration) {
      console.error("[Bing] Integrazione non trovata:", fetchError);
      return null;
    }

    // Controlla se il token è ancora valido (con buffer di 5 minuti)
    const expiresAt = new Date(integration.expires_at);
    const now = new Date();
    const bufferMinutes = 5 * 60 * 1000; // 5 minuti in millisecondi

    if (expiresAt.getTime() - now.getTime() > bufferMinutes) {
      // Token ancora valido, ritorna quello esistente
      return {
        access_token: integration.access_token,
        expires_in: Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
      };
    }

    // Token scaduto o in scadenza: refresh
    console.log("[Bing] Token scaduto, effettuo refresh...");

    const clientId = process.env.BING_CLIENT_ID!;
    const clientSecret = process.env.BING_CLIENT_SECRET!;

    const refreshResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: integration.refresh_token,
          grant_type: "refresh_token",
        }).toString(),
      }
    );

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.json();
      console.error("[Bing] Errore refresh token:", errorData);

      // Se il refresh token è invalido, disconnetti l'integrazione
      if (errorData.error === "invalid_grant") {
        await supabase
          .from("integrations")
          .update({
            status: "disconnected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", integration.id);
      }

      return null;
    }

    const tokenData = await refreshResponse.json();
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokenData.expires_in);

    // Aggiorna il DB con i nuovi token
    await supabase
      .from("integrations")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || integration.refresh_token,
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    console.log("[Bing] Token refreshed con successo");

    return {
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
    };
  } catch (error: any) {
    console.error("[Bing] Errore refresh token:", error);
    return null;
  }
}

// ============================================================================
// DATA MAPPING
// ============================================================================

/**
 * Mappa i dati della location locale nel formato richiesto da Bing Places API
 *
 * Bing API Endpoint: POST https://api.bingads.microsoft.com/CustomerManagement/v13/Locations
 * Schema: https://learn.microsoft.com/en-us/advertising/customer-management-service/location
 */
export function mapLocationToBingJSON(localData: BingLocation) {
  return {
    // Business Profile Data
    Name: localData.business_name,
    Description: localData.description || "",

    // Address Details
    Address: {
      StreetAddress: localData.address,
      City: localData.city,
      StateOrProvince: localData.state || "",
      PostalCode: localData.zip_code || "",
      CountryCode: localData.country || "IT", // Default Italia
    },

    // Contact Information
    PhoneNumber: localData.phone || "",
    WebsiteUrl: localData.website || "",

    // Geographic Coordinates (optional but recommended)
    ...(localData.latitude &&
      localData.longitude && {
        GeoCoordinates: {
          Latitude: localData.latitude,
          Longitude: localData.longitude,
        },
      }),

    // Business Category
    ...(localData.category && {
      BusinessCategory: localData.category,
    }),

    // Status (always Active for new listings)
    Status: "Active",
  };
}

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Pubblica una nuova location su Bing Places
 *
 * API Endpoint: POST https://api.bingads.microsoft.com/v13/Locations
 */
export async function publishLocationToBing(
  agencyId: string,
  locationData: BingLocation
): Promise<BingPlaceResponse> {
  try {
    // Step 1: Ottieni un access token valido
    const tokenResult = await refreshBingToken(agencyId);

    if (!tokenResult) {
      return {
        success: false,
        error: "Account Bing non collegato o token scaduto",
        error_code: "AUTH_ERROR",
      };
    }

    const { access_token } = tokenResult;

    // Step 2: Prepara i dati nel formato Bing
    const bingPayload = mapLocationToBingJSON(locationData);

    console.log("[Bing] Invio location a Bing Places API:", bingPayload);

    // Step 3: Chiamata API reale
    const apiResponse = await fetch(
      "https://api.bingads.microsoft.com/CustomerManagement/v13/Locations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "Localmente-App/1.0",
        },
        body: JSON.stringify(bingPayload),
      }
    );

    if (!apiResponse.ok) {
      // Prima leggi la risposta come testo
      const responseText = await apiResponse.text();
      console.error("[Bing] ❌ Errore API response:", {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        headers: Object.fromEntries(apiResponse.headers.entries()),
        body: responseText,
      });

      // Prova a parsare come JSON se possibile
      let errorMessage = "Errore durante la pubblicazione su Bing";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error_description || errorMessage;
      } catch {
        // Se non è JSON, usa il testo raw
        errorMessage = responseText.substring(0, 200) || apiResponse.statusText;
      }

      return {
        success: false,
        error: `${apiResponse.status}: ${errorMessage}`,
        error_code: apiResponse.status.toString(),
      };
    }

    const responseData = await apiResponse.json();

    /*
    Risposta attesa:
    {
      LocationId: "12345678",
      Status: "Active",
      Url: "https://www.bing.com/maps/place/..."
    }
    */

    return {
      success: true,
      bing_place_id: responseData.LocationId || responseData.Id,
      status: responseData.Status || "Active",
      listing_url: responseData.Url || undefined,
    };
  } catch (error: any) {
    console.error("[Bing] Errore pubblicazione location:", error);
    return {
      success: false,
      error: error.message || "Errore di rete durante la pubblicazione",
      error_code: "NETWORK_ERROR",
    };
  }
}

/**
 * Aggiorna una location esistente su Bing Places
 *
 * API Endpoint: PUT https://api.bingads.microsoft.com/v13/Locations/{locationId}
 */
export async function updateBingLocation(
  agencyId: string,
  bingPlaceId: string,
  locationData: Partial<BingLocation>
): Promise<BingPlaceResponse> {
  try {
    const tokenResult = await refreshBingToken(agencyId);

    if (!tokenResult) {
      return {
        success: false,
        error: "Account Bing non collegato o token scaduto",
        error_code: "AUTH_ERROR",
      };
    }

    const { access_token } = tokenResult;

    // Mappa solo i campi forniti
    const bingPayload = mapLocationToBingJSON(locationData as BingLocation);

    console.log("[Bing] Aggiornamento location su Bing Places:", bingPlaceId);

    const apiResponse = await fetch(
      `https://api.bingads.microsoft.com/CustomerManagement/v13/Locations/${bingPlaceId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "Localmente-App/1.0",
        },
        body: JSON.stringify(bingPayload),
      }
    );

    if (!apiResponse.ok) {
      const responseText = await apiResponse.text();
      console.error("[Bing] ❌ Errore aggiornamento:", {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        body: responseText,
      });

      let errorMessage = "Errore durante l'aggiornamento su Bing";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error_description || errorMessage;
      } catch {
        errorMessage = responseText.substring(0, 200) || apiResponse.statusText;
      }

      return {
        success: false,
        error: `${apiResponse.status}: ${errorMessage}`,
        error_code: apiResponse.status.toString(),
      };
    }

    const responseData = await apiResponse.json();

    return {
      success: true,
      bing_place_id: responseData.LocationId || bingPlaceId,
      status: responseData.Status || "Active",
      listing_url: responseData.Url || undefined,
    };
  } catch (error: any) {
    console.error("[Bing] Errore aggiornamento location:", error);
    return {
      success: false,
      error: error.message || "Errore di rete durante l'aggiornamento",
      error_code: "NETWORK_ERROR",
    };
  }
}

/**
 * Elimina una location da Bing Places
 *
 * API Endpoint: DELETE https://api.bingads.microsoft.com/v13/Locations/{locationId}
 */
export async function deleteBingLocation(
  agencyId: string,
  bingPlaceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenResult = await refreshBingToken(agencyId);

    if (!tokenResult) {
      return {
        success: false,
        error: "Account Bing non collegato o token scaduto",
      };
    }

    const { access_token } = tokenResult;

    const apiResponse = await fetch(
      `https://api.bingads.microsoft.com/CustomerManagement/v13/Locations/${bingPlaceId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "Localmente-App/1.0",
        },
      }
    );

    if (!apiResponse.ok) {
      const responseText = await apiResponse.text();
      console.error("[Bing] ❌ Errore eliminazione:", {
        status: apiResponse.status,
        body: responseText,
      });

      let errorMessage = "Errore durante l'eliminazione";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error_description || errorMessage;
      } catch {
        errorMessage = responseText.substring(0, 200) || apiResponse.statusText;
      }

      return {
        success: false,
        error: `${apiResponse.status}: ${errorMessage}`,
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Bing] Errore eliminazione location:", error);
    return {
      success: false,
      error: error.message || "Errore di rete",
    };
  }
}

/**
 * Verifica se un'agency ha un'integrazione Bing attiva
 */
export async function isBingConnected(agencyId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data: integration } = await supabase
      .from("integrations")
      .select("status")
      .eq("agency_id", agencyId)
      .eq("provider", "bing")
      .single();

    return integration?.status === "connected";
  } catch (error) {
    return false;
  }
}
