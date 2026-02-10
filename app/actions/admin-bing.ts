"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserAgency } from "@/lib/auth-helper";
import { revalidatePath } from "next/cache";

/**
 * Verifica che l'utente sia Admin
 */
async function verifyAdminAccess(): Promise<boolean> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, user_type")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return false;
    }

    return profile.role === "admin" || profile.user_type === "admin";
  } catch (error) {
    console.error("[Admin Bing] Errore verifica admin:", error);
    return false;
  }
}

/**
 * Recupera tutte le location in stato 'pending_upload'
 */
export async function getPendingBingLocations(): Promise<{
  locations?: any[];
  error?: string;
}> {
  try {
    const isAdmin = await verifyAdminAccess();

    if (!isAdmin) {
      return {
        error: "Accesso negato. Solo gli Admin possono accedere a questa funzione.",
      };
    }

    const supabase = await createClient();
    const agencyId = await getUserAgency();

    const { data: locations, error: locationsError } = await supabase
      .from("locations")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("bing_sync_status", "pending_upload")
      .order("last_bing_sync", { ascending: false });

    if (locationsError) {
      console.error("[Admin Bing] Errore recupero locations:", locationsError);
      return {
        error: "Errore durante il recupero delle location",
      };
    }

    return {
      locations: locations || [],
    };
  } catch (error: any) {
    console.error("[Admin Bing] Errore:", error);
    return {
      error: error.message || "Errore durante il recupero delle location",
    };
  }
}

/**
 * Marca le location selezionate come 'active' (completate)
 */
export async function markBingLocationsAsCompleted(
  locationIds: string[]
): Promise<{
  success?: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const isAdmin = await verifyAdminAccess();

    if (!isAdmin) {
      return {
        error: "Accesso negato. Solo gli Admin possono accedere a questa funzione.",
      };
    }

    if (!locationIds || locationIds.length === 0) {
      return {
        error: "Nessuna location selezionata",
      };
    }

    const supabase = await createClient();
    const agencyId = await getUserAgency();

    // Aggiorna le location selezionate
    const { error: updateError, count } = await supabase
      .from("locations")
      .update({
        bing_sync_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("agency_id", agencyId)
      .in("id", locationIds);

    if (updateError) {
      console.error("[Admin Bing] Errore aggiornamento:", updateError);
      return {
        error: "Errore durante l'aggiornamento delle location",
      };
    }

    console.log(`[Admin Bing] ✅ ${count} location marcate come 'active'`);

    // Invalida cache
    revalidatePath("/dashboard/admin/bing");
    revalidatePath("/dashboard/locations");

    return {
      success: true,
      count: count || 0,
    };
  } catch (error: any) {
    console.error("[Admin Bing] Errore:", error);
    return {
      error: error.message || "Errore durante l'aggiornamento",
    };
  }
}

/**
 * Marca TUTTE le location pending come 'active'
 */
export async function markAllBingLocationsAsCompleted(): Promise<{
  success?: boolean;
  count?: number;
  error?: string;
}> {
  try {
    const isAdmin = await verifyAdminAccess();

    if (!isAdmin) {
      return {
        error: "Accesso negato. Solo gli Admin possono accedere a questa funzione.",
      };
    }

    const supabase = await createClient();
    const agencyId = await getUserAgency();

    // Aggiorna tutte le location pending_upload
    const { error: updateError, count } = await supabase
      .from("locations")
      .update({
        bing_sync_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("agency_id", agencyId)
      .eq("bing_sync_status", "pending_upload");

    if (updateError) {
      console.error("[Admin Bing] Errore aggiornamento:", updateError);
      return {
        error: "Errore durante l'aggiornamento delle location",
      };
    }

    console.log(`[Admin Bing] ✅ ${count} location marcate come 'active'`);

    // Invalida cache
    revalidatePath("/dashboard/admin/bing");
    revalidatePath("/dashboard/locations");

    return {
      success: true,
      count: count || 0,
    };
  } catch (error: any) {
    console.error("[Admin Bing] Errore:", error);
    return {
      error: error.message || "Errore durante l'aggiornamento",
    };
  }
}
