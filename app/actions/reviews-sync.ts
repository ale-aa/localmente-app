"use server";

import { createClient } from "@/lib/supabase/server";
import { getAuthClient } from "@/lib/google-business";
import { google } from "googleapis";

export interface ReviewsSyncResult {
  success: boolean;
  synced: number;
  updated: number;
  errors: number;
  errorMessages?: string[];
}

/**
 * Sincronizza le recensioni da Google Business Profile per una location
 * @param locationId - ID della location nel nostro database
 */
export async function syncReviewsFromGoogle(
  locationId: string
): Promise<{
  data?: ReviewsSyncResult;
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

    // Recupera la location con google_place_id
    const { data: location, error: locationError } = await supabase
      .from("locations")
      .select("id, google_place_id, business_name, agency_id")
      .eq("id", locationId)
      .single();

    if (locationError || !location) {
      return { error: "Location non trovata" };
    }

    if (!location.google_place_id) {
      return {
        error:
          "Questa location non ha un google_place_id. Importala da Google Business prima di sincronizzare le recensioni.",
      };
    }

    // Verifica permessi
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, role")
      .eq("id", user.id)
      .single();

    if (profile?.agency_id !== location.agency_id) {
      return { error: "Non hai i permessi per accedere a questa location" };
    }

    console.log(
      `🚀 [Reviews Sync] Starting sync for location ${location.business_name} (${location.google_place_id})`
    );

    // Ottieni il client autenticato Google
    const authClient = await getAuthClient(location.agency_id);

    if (!authClient) {
      return {
        error:
          "Nessuna integrazione Google Business trovata. Connetti prima il tuo account Google.",
      };
    }

    // Costruisci il resource name per le API Google
    // Formato: accounts/{accountId}/locations/{locationId}
    const resourceName = `accounts/-/locations/${location.google_place_id}`;

    // Inizializza l'API Google My Business Business Information
    const mybusinessaccountmanagement = google.mybusinessaccountmanagement({
      version: "v1",
      auth: authClient.oauth2Client,
    });

    console.log(`📊 [Reviews Sync] Fetching reviews from Google for ${resourceName}`);

    // NOTA: L'API delle recensioni è deprecata in v4, usiamo Business Information API v1
    // Tuttavia, potrebbe non essere disponibile per tutti gli account.
    // Per il momento, usiamo un approccio che tenta di recuperare le recensioni.

    let reviews: any[] = [];

    try {
      // Tentativo con l'API v1 (nuova)
      // NOTA: Questa API potrebbe non restituire recensioni se la location non è verificata
      const response = await mybusinessaccountmanagement.locations.get({
        name: resourceName,
        readMask: "reviews",
      });

      reviews = response.data.reviews || [];
    } catch (apiError: any) {
      console.error("[Reviews Sync] Google API error:", apiError);

      // Gestisci errori comuni
      if (apiError.code === 403) {
        return {
          error:
            "Accesso negato alle recensioni. Assicurati che la location sia verificata su Google Business Profile e che l'account abbia i permessi necessari.",
        };
      }

      if (apiError.code === 404) {
        return {
          error:
            "Location non trovata su Google Business Profile. Verifica che il google_place_id sia corretto.",
        };
      }

      throw new Error(
        `Errore API Google: ${apiError.message || "Errore sconosciuto"}`
      );
    }

    if (reviews.length === 0) {
      console.log("ℹ️  [Reviews Sync] No reviews found on Google for this location");
      return {
        data: {
          success: true,
          synced: 0,
          updated: 0,
          errors: 0,
        },
      };
    }

    console.log(`📊 [Reviews Sync] Found ${reviews.length} review(s) on Google`);

    let totalSynced = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    const errorMessages: string[] = [];

    // Sync ogni recensione
    for (const googleReview of reviews) {
      try {
        await syncSingleReview(supabase, googleReview, locationId, location.agency_id);

        // Verifica se è nuova o aggiornamento
        const existsCheck = await supabase
          .from("reviews")
          .select("id")
          .eq("google_review_id", extractReviewId(googleReview.name || ""))
          .single();

        if (existsCheck.data) {
          totalUpdated++;
        } else {
          totalSynced++;
        }
      } catch (error: any) {
        console.error(
          `[Reviews Sync] Error syncing review ${googleReview.reviewId}:`,
          error
        );
        totalErrors++;
        errorMessages.push(
          `Recensione ${googleReview.reviewer?.displayName || "sconosciuta"}: ${error.message || "Errore sconosciuto"}`
        );
      }
    }

    console.log("✅ [Reviews Sync] Sync completed:", {
      synced: totalSynced,
      updated: totalUpdated,
      errors: totalErrors,
    });

    return {
      data: {
        success: totalErrors === 0,
        synced: totalSynced,
        updated: totalUpdated,
        errors: totalErrors,
        errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
      },
    };
  } catch (error: any) {
    console.error("[Reviews Sync] Unexpected error:", error);
    return {
      error: `Errore durante la sincronizzazione: ${error.message || "Errore sconosciuto"}`,
    };
  }
}

/**
 * Sincronizza una singola recensione da Google
 */
async function syncSingleReview(
  supabase: any,
  googleReview: any,
  locationId: string,
  agencyId: string
) {
  // Estrai il Review ID dal resource name
  const reviewId = extractReviewId(googleReview.name || "");

  if (!reviewId) {
    throw new Error("Review ID non trovato nella recensione Google");
  }

  // Converti star rating da enum a numero
  const starRating = convertStarRating(googleReview.starRating);

  // Prepara i dati della recensione
  const reviewData = {
    google_review_id: reviewId,
    location_id: locationId,
    agency_id: agencyId,
    source: "google",
    reviewer_display_name:
      googleReview.reviewer?.displayName || "Utente Google",
    reviewer_photo_url:
      googleReview.reviewer?.profilePhotoUrl || null,
    author_name: googleReview.reviewer?.displayName || "Utente Google",
    star_rating: starRating,
    content: googleReview.comment || null,
    review_date: googleReview.createTime
      ? new Date(googleReview.createTime).toISOString()
      : new Date().toISOString(),
    // Se c'è già una risposta su Google, importala
    reply_text: googleReview.reviewReply?.comment || null,
    reply_date: googleReview.reviewReply?.updateTime
      ? new Date(googleReview.reviewReply.updateTime).toISOString()
      : null,
    status: googleReview.reviewReply ? "replied" : "pending",
  };

  // Upsert (inserisci o aggiorna se esiste già)
  const { error } = await supabase.from("reviews").upsert(reviewData, {
    onConflict: "google_review_id",
    ignoreDuplicates: false, // Aggiorna se esiste
  });

  if (error) {
    throw new Error(`Errore salvataggio recensione: ${error.message}`);
  }

  console.log(
    `📝 [Reviews Sync] Synced review from ${reviewData.reviewer_display_name} (${starRating}⭐)`
  );
}

/**
 * Estrae il Review ID dal resource name
 * Formato: "accounts/{accountId}/locations/{locationId}/reviews/{reviewId}"
 */
function extractReviewId(resourceName: string): string {
  const parts = resourceName.split("/");
  return parts[parts.length - 1] || "";
}

/**
 * Converte lo star rating da enum Google a numero
 * Google restituisce: "ONE", "TWO", "THREE", "FOUR", "FIVE"
 */
function convertStarRating(starRatingEnum: string): number {
  const mapping: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };

  return mapping[starRatingEnum] || 5; // Default a 5 se non riconosciuto
}
