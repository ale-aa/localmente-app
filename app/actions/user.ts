"use server";

import { getUserType } from "@/lib/auth-helper";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Server action per recuperare il tipo di utente (agency o business)
 * Usato da componenti client che devono adattare la UI
 */
export async function getUserTypeAction(): Promise<"agency" | "business"> {
  try {
    return await getUserType();
  } catch (error) {
    console.error("[getUserTypeAction] Error:", error);
    // Default ad agency per retrocompatibilità
    return "agency";
  }
}

/**
 * Server action per aggiornare il tipo di utente
 * Usato durante l'onboarding o dalle impostazioni
 */
export async function updateUserTypeAction(
  userType: "agency" | "business"
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Ottieni l'utente corrente
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Utente non autenticato" };
    }

    // Aggiorna il profilo con il nuovo user_type e marca onboarding come completato
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        user_type: userType,
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[updateUserTypeAction] Error:", updateError);
      return {
        error: "Errore durante l'aggiornamento del tipo di utente",
      };
    }

    // Revalida tutte le pagine che potrebbero mostrare dati diversi
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard/locations");

    console.log(
      `[updateUserTypeAction] User type updated to: ${userType}, onboarding completed`
    );

    return { success: true };
  } catch (error: any) {
    console.error("[updateUserTypeAction] Exception:", error);
    return {
      error: error.message || "Errore imprevisto",
    };
  }
}
