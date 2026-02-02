"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema per la creazione/modifica di un cliente
const clientSchema = z.object({
  firstName: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  lastName: z.string().min(2, "Il cognome deve contenere almeno 2 caratteri"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  mobile: z.string().optional().or(z.literal("")),
  fiscalCode: z.string().optional().or(z.literal("")),
  vatNumber: z.string().optional().or(z.literal("")),
  clientType: z.enum(["individual", "company"]).default("individual"),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type ClientFormData = z.infer<typeof clientSchema>;

// Tipo per il cliente con conteggio sedi
export type ClientWithLocations = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  fiscal_code: string | null;
  vat_number: string | null;
  client_type: "individual" | "company";
  status: "active" | "inactive" | "archived";
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  locations_count: number;
};

/**
 * Recupera tutti i clienti dell'agenzia corrente con conteggio sedi
 */
export async function getClients() {
  const supabase = await createSupabaseClient();

  // Ottieni l'utente corrente
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Utente non autenticato",
      clients: [],
    };
  }

  // Ottieni il profilo e l'agenzia
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) {
    return {
      error: "Profilo o agenzia non trovati",
      clients: [],
    };
  }

  // Recupera i clienti con conteggio delle sedi
  const { data: clients, error } = await supabase
    .from("clients")
    .select(`
      *,
      locations:locations(count)
    `)
    .eq("agency_id", profile.agency_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Errore recupero clienti:", error);
    return {
      error: "Errore durante il recupero dei clienti",
      clients: [],
    };
  }

  // Trasforma i dati per includere il conteggio delle sedi
  const clientsWithCount: ClientWithLocations[] = (clients || []).map((client) => ({
    id: client.id,
    first_name: client.first_name,
    last_name: client.last_name,
    email: client.email,
    phone: client.phone,
    mobile: client.mobile,
    fiscal_code: client.fiscal_code,
    vat_number: client.vat_number,
    client_type: client.client_type,
    status: client.status,
    address: client.address,
    city: client.city,
    province: client.province,
    postal_code: client.postal_code,
    notes: client.notes,
    created_at: client.created_at,
    updated_at: client.updated_at,
    locations_count: client.locations?.[0]?.count || 0,
  }));

  return {
    clients: clientsWithCount,
  };
}

/**
 * Crea un nuovo cliente
 */
export async function createClient(data: ClientFormData) {
  const supabase = await createSupabaseClient();

  // Ottieni l'utente corrente
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Utente non autenticato",
    };
  }

  // Ottieni il profilo e l'agenzia
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) {
    return {
      error: "Profilo o agenzia non trovati",
    };
  }

  // Valida i dati
  const validatedData = clientSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      error: "Dati non validi",
      details: validatedData.error.flatten().fieldErrors,
    };
  }

  const clientData = validatedData.data;

  // Crea il cliente
  const { data: newClient, error: clientError } = await supabase
    .from("clients")
    .insert({
      agency_id: profile.agency_id,
      created_by: user.id,
      first_name: clientData.firstName,
      last_name: clientData.lastName,
      email: clientData.email || null,
      phone: clientData.phone || null,
      mobile: clientData.mobile || null,
      fiscal_code: clientData.fiscalCode || null,
      vat_number: clientData.vatNumber || null,
      client_type: clientData.clientType,
      address: clientData.address || null,
      city: clientData.city || null,
      province: clientData.province || null,
      postal_code: clientData.postalCode || null,
      notes: clientData.notes || null,
      status: "active",
    })
    .select()
    .single();

  if (clientError || !newClient) {
    console.error("Errore creazione cliente:", clientError);
    return {
      error: "Errore durante la creazione del cliente",
      details: clientError,
    };
  }

  revalidatePath("/dashboard/clients");

  return {
    success: true,
    client: newClient,
  };
}

/**
 * Aggiorna un cliente esistente
 */
export async function updateClient(id: string, data: Partial<ClientFormData>) {
  const supabase = await createSupabaseClient();

  // Ottieni l'utente corrente
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Utente non autenticato",
    };
  }

  // Verifica che il cliente appartenga all'agenzia dell'utente
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) {
    return {
      error: "Profilo o agenzia non trovati",
    };
  }

  // Prepara i dati per l'aggiornamento
  const updateData: any = {};

  if (data.firstName) updateData.first_name = data.firstName;
  if (data.lastName) updateData.last_name = data.lastName;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.mobile !== undefined) updateData.mobile = data.mobile || null;
  if (data.fiscalCode !== undefined) updateData.fiscal_code = data.fiscalCode || null;
  if (data.vatNumber !== undefined) updateData.vat_number = data.vatNumber || null;
  if (data.clientType) updateData.client_type = data.clientType;
  if (data.address !== undefined) updateData.address = data.address || null;
  if (data.city !== undefined) updateData.city = data.city || null;
  if (data.province !== undefined) updateData.province = data.province || null;
  if (data.postalCode !== undefined) updateData.postal_code = data.postalCode || null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;

  // Aggiorna il cliente
  const { data: updatedClient, error: updateError } = await supabase
    .from("clients")
    .update(updateData)
    .eq("id", id)
    .eq("agency_id", profile.agency_id)
    .select()
    .single();

  if (updateError || !updatedClient) {
    console.error("Errore aggiornamento cliente:", updateError);
    return {
      error: "Errore durante l'aggiornamento del cliente",
      details: updateError,
    };
  }

  revalidatePath("/dashboard/clients");

  return {
    success: true,
    client: updatedClient,
  };
}

/**
 * Elimina un cliente
 * NOTA: Se il cliente ha sedi collegate, l'eliminazione fallirà a meno che
 * non si gestiscano prima le sedi (set owner_id = null oppure CASCADE)
 */
export async function deleteClient(id: string) {
  const supabase = await createSupabaseClient();

  // Ottieni l'utente corrente
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Utente non autenticato",
    };
  }

  // Verifica che l'utente sia admin o manager
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) {
    return {
      error: "Profilo o agenzia non trovati",
    };
  }

  if (!["admin", "manager"].includes(profile.role)) {
    return {
      error: "Non hai i permessi per eliminare clienti",
    };
  }

  // Verifica se il cliente ha sedi collegate
  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("id")
    .eq("owner_id", id);

  if (locationsError) {
    console.error("Errore verifica sedi:", locationsError);
    return {
      error: "Errore durante la verifica delle sedi collegate",
    };
  }

  if (locations && locations.length > 0) {
    return {
      error: `Impossibile eliminare il cliente. Ha ${locations.length} sede/i collegata/e. Rimuovi prima le sedi o assegnale ad un altro cliente.`,
    };
  }

  // Elimina il cliente
  const { error: deleteError } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("agency_id", profile.agency_id);

  if (deleteError) {
    console.error("Errore eliminazione cliente:", deleteError);
    return {
      error: "Errore durante l'eliminazione del cliente",
      details: deleteError,
    };
  }

  revalidatePath("/dashboard/clients");

  return {
    success: true,
  };
}

/**
 * Cambia lo stato di un cliente (active/inactive/archived)
 */
export async function updateClientStatus(
  id: string,
  status: "active" | "inactive" | "archived"
) {
  const supabase = await createSupabaseClient();

  // Ottieni l'utente corrente
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Utente non autenticato",
    };
  }

  // Verifica che il cliente appartenga all'agenzia dell'utente
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) {
    return {
      error: "Profilo o agenzia non trovati",
    };
  }

  // Aggiorna lo stato
  const { error: updateError } = await supabase
    .from("clients")
    .update({ status })
    .eq("id", id)
    .eq("agency_id", profile.agency_id);

  if (updateError) {
    console.error("Errore aggiornamento stato cliente:", updateError);
    return {
      error: "Errore durante l'aggiornamento dello stato",
      details: updateError,
    };
  }

  revalidatePath("/dashboard/clients");

  return {
    success: true,
  };
}
