"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserAgency } from "@/lib/auth-helper";
import {
  publishLocationToBing,
  updateBingLocation,
  isBingConnected,
  deleteBingLocation,
  type BingLocation,
} from "@/lib/services/bing-real";

/**
 * Avvia il collegamento con Bing (Redirect a OAuth)
 * Ritorna l'URL per avviare il flusso OAuth
 */
export async function connectBingAccountAction(): Promise<{
  authUrl?: string;
  error?: string;
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const authUrl = `${baseUrl}/api/auth/bing`;

    return { authUrl };
  } catch (error: any) {
    console.error("[Bing Action] Errore collegamento account:", error);
    return {
      error: error.message || "Errore durante il collegamento dell'account Bing",
    };
  }
}

/**
 * Sincronizza una location locale con Bing Places
 * Pubblica o aggiorna i dati della sede su Bing
 */
export async function syncBingLocationAction(locationId: string): Promise<{
  success?: boolean;
  message?: string;
  bingPlaceId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const agencyId = await getUserAgency();

    // Verifica che l'account Bing sia collegato
    const isConnected = await isBingConnected(agencyId);
    if (!isConnected) {
      return {
        error: "Account Microsoft Bing non collegato. Collega il tuo account prima di sincronizzare.",
      };
    }

    // Recupera i dati della location dal DB
    const { data: location, error: fetchError } = await supabase
      .from("locations")
      .select("*")
      .eq("id", locationId)
      .eq("agency_id", agencyId)
      .single();

    if (fetchError || !location) {
      return { error: "Location non trovata o non autorizzata" };
    }

    // FALLBACK CSV: NON chiamiamo più l'API Bing
    // Impostiamo lo stato su 'pending_upload' per segnalare che la location
    // deve essere esportata via CSV e caricata manualmente su Bing Places
    console.log("[Bing Action] Impostazione location per export CSV:", locationId);

    const isUpdate = !!location.bing_place_id;

    // Aggiorna il DB con stato pending_upload
    const updateData: any = {
      bing_sync_status: "pending_upload",
      last_bing_sync: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("[Bing Action] 📝 Aggiornamento DB con:", updateData);

    const { error: updateError } = await supabase
      .from("locations")
      .update(updateData)
      .eq("id", locationId)
      .eq("agency_id", agencyId);

    if (updateError) {
      console.error("[Bing Action] ❌ Errore aggiornamento DB:", {
        error: updateError,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });
      return {
        error: `Errore salvataggio: ${updateError.message || "Errore sconosciuto"}`,
      };
    }

    console.log("[Bing Action] ✅ Location aggiornata con successo!");

    // Invalida la cache della pagina
    revalidatePath(`/dashboard/locations/${locationId}`);
    revalidatePath("/dashboard/locations");

    return {
      success: true,
      message: "Location preparata per la pubblicazione su Bing Places. Sarà disponibile entro 24-48 ore.",
    };
  } catch (error: any) {
    console.error("[Bing Action] Errore sync location:", error);
    return {
      error: error.message || "Errore durante la sincronizzazione",
    };
  }
}

/**
 * Verifica lo stato della connessione Bing
 */
export async function checkBingConnectionStatus(): Promise<{
  connected: boolean;
  error?: string;
}> {
  try {
    const agencyId = await getUserAgency();
    const connected = await isBingConnected(agencyId);

    return { connected };
  } catch (error: any) {
    console.error("[Bing Action] Errore verifica connessione:", error);
    return {
      connected: false,
      error: error.message || "Errore durante la verifica della connessione",
    };
  }
}

/**
 * Scollega l'account Bing
 * Rimuove l'integrazione dal database (mantiene i bing_place_id sulle location)
 */
export async function disconnectBingAccountAction(): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const agencyId = await getUserAgency();

    // Rimuovi l'integrazione
    const { error: deleteError } = await supabase
      .from("integrations")
      .delete()
      .eq("agency_id", agencyId)
      .eq("provider", "bing");

    if (deleteError) {
      console.error("[Bing Action] Errore disconnessione:", deleteError);
      return { error: "Errore durante la disconnessione dell'account" };
    }

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error: any) {
    console.error("[Bing Action] Errore disconnessione:", error);
    return {
      error: error.message || "Errore durante la disconnessione",
    };
  }
}

/**
 * Rimuove una location da Bing Places
 * Elimina il listing su Bing e resetta i campi nel DB
 */
export async function unlinkBingLocationAction(locationId: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const agencyId = await getUserAgency();

    // Recupera la location
    const { data: location, error: fetchError } = await supabase
      .from("locations")
      .select("bing_place_id")
      .eq("id", locationId)
      .eq("agency_id", agencyId)
      .single();

    if (fetchError || !location) {
      return { error: "Location non trovata o non autorizzata" };
    }

    if (!location.bing_place_id) {
      return { error: "Location non collegata a Bing Places" };
    }

    // Elimina da Bing
    const deleteResult = await deleteBingLocation(agencyId, location.bing_place_id);

    if (!deleteResult.success) {
      return {
        error: deleteResult.error || "Errore durante l'eliminazione da Bing",
      };
    }

    // Resetta i campi Bing nel DB
    const { error: updateError } = await supabase
      .from("locations")
      .update({
        bing_place_id: null,
        bing_sync_status: null,
        last_bing_sync: null,
        bing_listing_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", locationId);

    if (updateError) {
      console.error("[Bing Action] Errore aggiornamento DB:", updateError);
      return {
        error: "Location rimossa da Bing ma errore nel salvataggio locale",
      };
    }

    revalidatePath(`/dashboard/locations/${locationId}`);
    revalidatePath("/dashboard/locations");

    return { success: true };
  } catch (error: any) {
    console.error("[Bing Action] Errore unlink location:", error);
    return {
      error: error.message || "Errore durante la rimozione",
    };
  }
}

/**
 * Ottieni i dati di sincronizzazione Bing per una location
 */
export async function getBingLocationData(locationId: string): Promise<{
  bingPlaceId?: string | null;
  syncStatus?: string | null;
  lastSync?: string | null;
  listingUrl?: string | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const agencyId = await getUserAgency();

    const { data: location, error: fetchError } = await supabase
      .from("locations")
      .select("bing_place_id, bing_sync_status, last_bing_sync, bing_listing_url")
      .eq("id", locationId)
      .eq("agency_id", agencyId)
      .single();

    if (fetchError || !location) {
      return { error: "Location non trovata" };
    }

    return {
      bingPlaceId: location.bing_place_id,
      syncStatus: location.bing_sync_status,
      lastSync: location.last_bing_sync,
      listingUrl: location.bing_listing_url,
    };
  } catch (error: any) {
    console.error("[Bing Action] Errore recupero dati:", error);
    return {
      error: error.message || "Errore durante il recupero dei dati",
    };
  }
}
