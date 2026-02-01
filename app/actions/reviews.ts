"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthClient } from "@/lib/google-business";
import { google } from "googleapis";

// Mock data per generare recensioni realistiche
const mockReviewsData = {
  positive: [
    { name: "Marco R.", text: "Servizio eccellente! Staff molto professionale e cortese. Tornerò sicuramente!", rating: 5 },
    { name: "Laura B.", text: "Esperienza fantastica! Tutto perfetto dall'inizio alla fine. Consigliatissimo!", rating: 5 },
    { name: "Giuseppe M.", text: "Ottimo posto, pulito e ben organizzato. Personale gentile e disponibile.", rating: 5 },
    { name: "Anna P.", text: "Molto soddisfatta del servizio ricevuto. Qualità eccellente!", rating: 4 },
    { name: "Francesco D.", text: "Buona esperienza nel complesso, qualche piccola pecca ma nulla di grave.", rating: 4 },
  ],
  negative: [
    { name: "Claudia S.", text: "Molto delusa. Servizio scadente e personale scortese. Non ci tornerò.", rating: 1 },
    { name: "Roberto T.", text: "Pessima esperienza. Tempi di attesa lunghissimi e qualità scadente.", rating: 2 },
    { name: "Elena V.", text: "Non all'altezza delle aspettative. Prezzi troppo alti per la qualità offerta.", rating: 2 },
    { name: "Stefano L.", text: "Servizio mediocre. Ho trovato di meglio altrove.", rating: 3 },
  ],
  noText: [
    { name: "Maria G.", text: "", rating: 5 },
    { name: "Paolo N.", text: "", rating: 4 },
    { name: "Valentina F.", text: "", rating: 3 },
    { name: "Luca C.", text: "", rating: 2 },
  ],
};

// Funzione per generare recensioni mock
export async function seedReviews(locationId: string) {
  const supabase = await createClient();

  // Ottieni l'utente corrente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Utente non autenticato" };
  }

  // Ottieni il profilo e l'agenzia
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) {
    return { error: "Profilo o agenzia non trovati" };
  }

  // Genera un mix di recensioni
  const allReviews = [
    ...mockReviewsData.positive.slice(0, 4), // 4 positive
    ...mockReviewsData.negative.slice(0, 3), // 3 negative
    ...mockReviewsData.noText.slice(0, 2),   // 2 senza testo
  ];

  // Shuffle array
  const shuffled = allReviews.sort(() => Math.random() - 0.5);

  // Genera date casuali negli ultimi 30 giorni
  const reviews = shuffled.slice(0, 9).map((review) => {
    const daysAgo = Math.floor(Math.random() * 30);
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() - daysAgo);
    reviewDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

    return {
      location_id: locationId,
      agency_id: profile.agency_id,
      author_name: review.name,
      star_rating: review.rating,
      content: review.text || null,
      review_date: reviewDate.toISOString(),
      status: "pending",
    };
  });

  // Inserisci le recensioni
  const { data, error } = await supabase
    .from("reviews")
    .insert(reviews)
    .select();

  if (error) {
    console.error("Errore durante la creazione delle recensioni:", error);
    return { error: "Errore durante la creazione delle recensioni" };
  }

  revalidatePath(`/dashboard/locations/${locationId}/reviews`);
  return { success: true, count: reviews.length };
}

// Mock AI Reply Engine
export async function generateAiReply(
  reviewContent: string,
  starRating: number,
  authorName: string
): Promise<{ reply: string }> {
  // Simula delay AI (1 secondo)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  let reply = "";

  if (starRating >= 4) {
    // Risposta positiva (4-5 stelle)
    const templates = [
      `Grazie mille ${authorName.split(" ")[0]} per la tua bellissima recensione! ⭐\n\nSiamo davvero felici di sapere che hai apprezzato il nostro servizio. Il tuo feedback ci motiva a continuare a dare il massimo ogni giorno.\n\nTi aspettiamo presto!\n\nCordiali saluti,\nIl Team`,
      `Ciao ${authorName.split(" ")[0]}, grazie per le tue parole! 🙏\n\nÈ un piacere sapere che la tua esperienza è stata positiva. Lavoriamo ogni giorno per offrire il miglior servizio possibile ai nostri clienti.\n\nA presto!\n\nIl Team`,
    ];
    reply = templates[Math.floor(Math.random() * templates.length)];
  } else if (starRating === 3) {
    // Risposta neutra (3 stelle)
    reply = `Ciao ${authorName.split(" ")[0]},\n\nGrazie per il tuo feedback. Ci fa piacere sapere che alcuni aspetti ti siano piaciuti, ma vorremmo migliorare la tua esperienza.\n\nSe hai suggerimenti specifici, siamo sempre disponibili ad ascoltarti. Il tuo parere è importante per noi.\n\nCordiali saluti,\nIl Team`;
  } else {
    // Risposta a recensione negativa (1-2 stelle)
    const templates = [
      `Gentile ${authorName.split(" ")[0]},\n\nCi dispiace molto che la tua esperienza non sia stata all'altezza delle aspettative. 😔\n\nPrendiamo molto seriamente il tuo feedback e vorremmo capire meglio cosa non ha funzionato per poter migliorare. Ti invitiamo a contattarci direttamente in modo da poter risolvere la situazione.\n\nGrazie per averci dato l'opportunità di crescere.\n\nCordiali saluti,\nIl Team`,
      `Caro/a ${authorName.split(" ")[0]},\n\nCi scusiamo sinceramente per l'esperienza negativa che hai avuto. Il tuo feedback è molto importante per noi.\n\nVorremmo avere l'opportunità di rimediare. Ti preghiamo di contattarci direttamente così potremo discutere di come migliorare il servizio.\n\nRestiamo a disposizione,\nIl Team`,
    ];
    reply = templates[Math.floor(Math.random() * templates.length)];
  }

  return { reply };
}

// Ottieni tutte le recensioni per una location
export async function getReviews(locationId: string, filter?: "all" | "pending" | "negative") {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { reviews: [] };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) {
    return { reviews: [] };
  }

  let query = supabase
    .from("reviews")
    .select("*")
    .eq("location_id", locationId)
    .eq("agency_id", profile.agency_id)
    .order("review_date", { ascending: false });

  // Applica filtri
  if (filter === "pending") {
    query = query.eq("status", "pending");
  } else if (filter === "negative") {
    query = query.lte("star_rating", 2);
  }

  const { data: reviews, error } = await query;

  if (error) {
    console.error("Errore caricamento recensioni:", error);
    return { reviews: [] };
  }

  return { reviews: reviews || [] };
}

// Pubblica una risposta
export async function publishReply(reviewId: string, replyText: string) {
  const supabase = await createClient();

  try {
    // Verifica autenticazione
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Non autenticato" };
    }

    // Recupera la recensione con i dati della location
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select(`
        id,
        google_review_id,
        source,
        location_id,
        agency_id,
        locations!inner (
          google_place_id,
          business_name
        )
      `)
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      return { error: "Recensione non trovata" };
    }

    // Verifica permessi
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, role")
      .eq("id", user.id)
      .single();

    if (profile?.agency_id !== review.agency_id) {
      return { error: "Non hai i permessi per rispondere a questa recensione" };
    }

    // Se la recensione proviene da Google, pubblica prima su Google
    if (review.source === "google" && review.google_review_id) {
      console.log(
        `📤 [Reviews Reply] Publishing reply to Google for review ${review.google_review_id}`
      );

      // Ottieni il client autenticato Google
      const authClient = await getAuthClient(review.agency_id);

      if (!authClient) {
        return {
          error:
            "Nessuna integrazione Google Business trovata. Connetti prima il tuo account Google.",
        };
      }

      const location = review.locations as any;
      if (!location?.google_place_id) {
        return {
          error:
            "Questa location non ha un google_place_id. Importala da Google Business prima di rispondere alle recensioni.",
        };
      }

      // Costruisci il resource name per la recensione
      // Formato: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
      // Usiamo accounts/- come wildcard per l'account
      const reviewResourceName = `accounts/-/locations/${location.google_place_id}/reviews/${review.google_review_id}`;

      // Inizializza l'API Google My Business Account Management
      const mybusinessaccountmanagement = google.mybusinessaccountmanagement({
        version: "v1",
        auth: authClient.oauth2Client,
      });

      try {
        // Pubblica la risposta su Google
        // NOTA: L'API delle recensioni utilizza un endpoint specifico per le risposte
        await mybusinessaccountmanagement.accounts.locations.reviews.updateReply(
          {
            name: reviewResourceName,
            requestBody: {
              comment: replyText,
            },
          } as any
        );

        console.log(
          `✅ [Reviews Reply] Successfully published reply to Google for review ${review.google_review_id}`
        );
      } catch (apiError: any) {
        console.error("[Reviews Reply] Google API error:", apiError);

        // Gestisci errori comuni
        if (apiError.code === 403) {
          return {
            error:
              "Accesso negato. Assicurati che la location sia verificata su Google Business Profile e che l'account abbia i permessi necessari.",
          };
        }

        if (apiError.code === 404) {
          return {
            error:
              "Recensione non trovata su Google Business Profile. Potrebbe essere stata eliminata.",
          };
        }

        throw new Error(
          `Errore API Google: ${apiError.message || "Errore sconosciuto"}`
        );
      }
    } else {
      console.log(
        `📝 [Reviews Reply] Publishing local reply for review ${reviewId}`
      );
    }

    // Aggiorna il database locale (solo se la pubblicazione su Google è riuscita o se è una recensione locale)
    const { data, error } = await supabase
      .from("reviews")
      .update({
        reply_text: replyText,
        reply_date: new Date().toISOString(),
        status: "replied",
      })
      .eq("id", reviewId)
      .select()
      .single();

    if (error) {
      console.error("Errore pubblicazione risposta:", error);
      return { error: "Errore durante la pubblicazione della risposta" };
    }

    revalidatePath(`/dashboard/locations`);
    return { success: true, review: data };
  } catch (error: any) {
    console.error("[Reviews Reply] Unexpected error:", error);
    return {
      error: `Errore durante la pubblicazione: ${error.message || "Errore sconosciuto"}`,
    };
  }
}
