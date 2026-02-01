"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Schema per la creazione di un cliente
const clientSchema = z.object({
  firstName: z.string().min(2, "Il nome è obbligatorio"),
  lastName: z.string().min(2, "Il cognome è obbligatorio"),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  fiscalCode: z.string().optional(),
  clientType: z.enum(["individual", "company"]).default("individual"),
});

// Schema per la creazione di una location SEO
const locationSchema = z.object({
  // Cliente (può essere esistente o nuovo)
  clientId: z.string().uuid().optional(),
  newClient: z.boolean().default(false),

  // Dati del nuovo cliente (se newClient = true)
  client: clientSchema.optional(),

  // NAP Data (Source of Truth per Local SEO)
  businessName: z.string().min(2, "Il nome dell'attività è obbligatorio"),
  phone: z.string().optional(),
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  website: z.string().url("URL non valido").optional().or(z.literal("")),

  // Indirizzo
  address: z.string().min(5, "L'indirizzo è obbligatorio"),
  streetNumber: z.string().optional(),
  city: z.string().min(2, "La città è obbligatoria"),
  province: z.string().min(2, "La provincia è obbligatoria"),
  postalCode: z.string().optional(),

  // Coordinate (per Geo-Grid Ranking)
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  // Metadata SEO
  category: z.string().optional(),
  description: z.string().optional(),
  placeId: z.string().optional(),
});

export type LocationFormData = z.infer<typeof locationSchema>;

export async function createLocation(data: LocationFormData) {
  const supabase = await createClient();

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
  const validatedData = locationSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      error: "Dati non validi",
      details: validatedData.error.flatten().fieldErrors,
    };
  }

  const locationData = validatedData.data;
  let ownerId = locationData.clientId;

  // Se è un nuovo cliente, crealo prima
  if (locationData.newClient && locationData.client) {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        agency_id: profile.agency_id,
        created_by: user.id,
        first_name: locationData.client.firstName,
        last_name: locationData.client.lastName,
        email: locationData.client.email || null,
        phone: locationData.client.phone || null,
        mobile: locationData.client.mobile || null,
        fiscal_code: locationData.client.fiscalCode || null,
        client_type: locationData.client.clientType,
        status: "active",
      })
      .select()
      .single();

    if (clientError || !newClient) {
      return {
        error: "Errore durante la creazione del cliente",
        details: clientError,
      };
    }

    ownerId = newClient.id;
  }

  // Crea la location SEO
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .insert({
      agency_id: profile.agency_id,
      created_by: user.id,
      owner_id: ownerId || null,

      // NAP Data (Source of Truth)
      business_name: locationData.businessName,
      phone: locationData.phone || null,
      email: locationData.email || null,
      website: locationData.website || null,

      // Indirizzo
      address: locationData.address,
      street_number: locationData.streetNumber || null,
      city: locationData.city,
      province: locationData.province,
      postal_code: locationData.postalCode || null,

      // Coordinate (per Geo-Grid Ranking)
      latitude: locationData.latitude || null,
      longitude: locationData.longitude || null,

      // Metadata SEO
      category: locationData.category || null,
      description: locationData.description || null,
      place_id: locationData.placeId || null,
      is_active: true,
    })
    .select()
    .single();

  if (locationError || !location) {
    return {
      error: "Errore durante la creazione della location",
      details: locationError,
    };
  }

  revalidatePath("/dashboard/locations");
  return {
    success: true,
    location,
  };
}

// Funzione per cercare un indirizzo con Google Places API
export async function searchPlaces(query: string) {
  // Per ora ritorniamo un mock
  // In produzione, qui faresti una chiamata all'API di Google Places

  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!GOOGLE_PLACES_API_KEY) {
    // Mock per sviluppo
    return {
      predictions: [
        {
          place_id: "mock_1",
          description: "Via del Corso, 123, Roma, RM, Italia",
          structured_formatting: {
            main_text: "Via del Corso, 123",
            secondary_text: "Roma, RM, Italia",
          },
        },
        {
          place_id: "mock_2",
          description: "Piazza Navona, 45, Roma, RM, Italia",
          structured_formatting: {
            main_text: "Piazza Navona, 45",
            secondary_text: "Roma, RM, Italia",
          },
        },
      ],
    };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query
      )}&key=${GOOGLE_PLACES_API_KEY}&components=country:it&language=it`,
      { cache: "no-store" }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Errore ricerca Google Places:", error);
    return { predictions: [] };
  }
}

// Funzione per ottenere i dettagli di un place da Google
export async function getPlaceDetails(placeId: string) {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

  if (!GOOGLE_PLACES_API_KEY) {
    // Mock per sviluppo
    return {
      result: {
        place_id: placeId,
        name: "Ristorante Da Mario",
        formatted_address: "Via del Corso, 123, 00186 Roma RM, Italia",
        formatted_phone_number: "+39 06 1234567",
        website: "https://www.ristorantedamario.it",
        geometry: {
          location: {
            lat: 41.9028,
            lng: 12.4964,
          },
        },
        address_components: [
          { long_name: "123", short_name: "123", types: ["street_number"] },
          { long_name: "Via del Corso", short_name: "Via del Corso", types: ["route"] },
          { long_name: "Roma", short_name: "Roma", types: ["locality"] },
          { long_name: "RM", short_name: "RM", types: ["administrative_area_level_2"] },
          { long_name: "00186", short_name: "00186", types: ["postal_code"] },
        ],
      },
    };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}&language=it&fields=place_id,name,formatted_address,formatted_phone_number,website,geometry,address_components`,
      { cache: "no-store" }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Errore dettagli Google Places:", error);
    return null;
  }
}

// Funzione per ottenere tutte le locations dell'agenzia
export async function getLocations() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { locations: [] };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) {
    return { locations: [] };
  }

  const { data: locations, error } = await supabase
    .from("locations")
    .select(`
      *,
      owner:clients(first_name, last_name, email)
    `)
    .eq("agency_id", profile.agency_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Errore caricamento locations:", error);
    return { locations: [] };
  }

  return { locations: locations || [] };
}
