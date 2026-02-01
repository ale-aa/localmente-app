"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema per la creazione dell'agenzia
const agencySchema = z.object({
  name: z.string().min(2, "Il nome dell'agenzia è obbligatorio"),
  slug: z
    .string()
    .min(3, "Lo slug deve essere di almeno 3 caratteri")
    .regex(/^[a-z0-9-]+$/, "Lo slug può contenere solo lettere minuscole, numeri e trattini"),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email non valida").optional(),
});

export async function createAgency(formData: FormData) {
  const supabase = await createClient();

  // Ottieni l'utente corrente
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: { general: "Utente non autenticato" },
    };
  }

  // Valida i dati
  const validatedFields = agencySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    vatNumber: formData.get("vatNumber"),
    address: formData.get("address"),
    city: formData.get("city"),
    province: formData.get("province"),
    postalCode: formData.get("postalCode"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  // Usa la funzione PostgreSQL che bypassa RLS in modo sicuro
  const { data: result, error: rpcError } = await supabase.rpc(
    "create_agency_with_profile",
    {
      p_user_id: user.id,
      p_agency_name: data.name,
      p_agency_slug: data.slug,
      p_vat_number: data.vatNumber || null,
      p_address: data.address || null,
      p_city: data.city || null,
      p_province: data.province || null,
      p_postal_code: data.postalCode || null,
      p_phone: data.phone || null,
      p_email: data.email || null,
      p_user_email: user.email || null,
      p_full_name: user.user_metadata?.full_name || null,
    }
  );

  if (rpcError) {
    console.error("Errore RPC:", rpcError);
    return {
      error: { general: `Errore durante la creazione dell'agenzia: ${rpcError.message}` },
    };
  }

  // Controlla il risultato della funzione
  if (!result || !result.success) {
    const errorMessage = result?.message || "Errore sconosciuto";
    const errorType = result?.error || "general";

    console.error("Errore creazione agenzia:", result);

    // Gestisci errori specifici
    if (errorType === "slug_already_exists") {
      return {
        error: { slug: errorMessage },
      };
    }

    return {
      error: { general: errorMessage },
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

// Funzione helper per generare uno slug dal nome
export async function generateSlug(name: string): Promise<string> {
  const baseSlug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Rimuove accenti
    .replace(/[^a-z0-9\s-]/g, "") // Rimuove caratteri speciali
    .trim()
    .replace(/\s+/g, "-") // Sostituisce spazi con trattini
    .replace(/-+/g, "-"); // Rimuove trattini multipli

  return baseSlug;
}
