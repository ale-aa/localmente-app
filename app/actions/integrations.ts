"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getGoogleIntegrationInfo,
  disconnectGoogleIntegration,
} from "@/lib/google-business";

export interface IntegrationStatus {
  connected: boolean;
  email: string | null;
  accountId: string | null;
  tokenExpiry: string | null;
}

/**
 * Recupera lo stato dell'integrazione Google Business per l'agenzia corrente
 */
export async function getGoogleIntegrationStatus(): Promise<{
  data?: IntegrationStatus;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Verifica autenticazione
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Non autenticato" };
    }

    // Recupera l'agency_id dal profilo
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("id", user.id)
      .single();

    if (!profile?.agency_id) {
      return { error: "Nessuna agenzia associata" };
    }

    // Recupera le informazioni sull'integrazione
    const info = await getGoogleIntegrationInfo(profile.agency_id);

    if (!info) {
      return {
        data: {
          connected: false,
          email: null,
          accountId: null,
          tokenExpiry: null,
        },
      };
    }

    return { data: info };
  } catch (error: any) {
    console.error("[Integrations] Error getting Google status:", error);
    return { error: error.message };
  }
}

/**
 * Disconnette l'integrazione Google Business per l'agenzia corrente
 */
export async function disconnectGoogle(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Verifica autenticazione
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Non autenticato" };
    }

    // Recupera il profilo per verificare permessi
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.agency_id) {
      return { success: false, error: "Nessuna agenzia associata" };
    }

    // Verifica permessi (solo admin e manager)
    if (!["admin", "manager"].includes(profile.role)) {
      return {
        success: false,
        error: "Permessi insufficienti. Solo admin e manager possono disconnettere le integrazioni.",
      };
    }

    // Disconnetti l'integrazione
    const result = await disconnectGoogleIntegration(profile.agency_id);

    return result;
  } catch (error: any) {
    console.error("[Integrations] Error disconnecting Google:", error);
    return { success: false, error: error.message };
  }
}
