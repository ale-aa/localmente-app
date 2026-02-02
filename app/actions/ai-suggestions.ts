"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateKeywordsParams {
  businessName: string;
  city: string;
  category?: string;
}

interface GenerateKeywordsResult {
  keywords?: string[];
  error?: string;
}

/**
 * Genera keyword transazionali Local SEO usando l'AI di OpenAI
 * Ottimizzate per intent "visit" o "buy" e specifiche per la città
 */
export async function generateLocalKeywords({
  businessName,
  city,
  category,
}: GenerateKeywordsParams): Promise<GenerateKeywordsResult> {
  try {
    // Validazione input
    if (!businessName || !city) {
      return {
        error: "Nome attività e città sono obbligatori",
      };
    }

    // Verifica che l'API key sia configurata
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "your_openai_api_key_here") {
      return {
        error: "OPENAI_API_KEY non configurata. Aggiungi la chiave API nel file .env.local",
      };
    }

    const categoryInfo = category ? `, Categoria: ${category}` : "";

    const systemPrompt = `Sei un esperto SEO Local per il mercato italiano.
Il tuo compito è generare keyword transazionali altamente performanti per attività locali.

REGOLE:
1. Intent: Le keyword devono avere intent "visit" o "buy" (utenti pronti a visitare/acquistare)
2. Località: Includi SEMPRE la città o varianti geografiche (centro, zona, quartiere)
3. Long-tail: Preferisci keyword specifiche (3-5 parole) rispetto a keyword generiche
4. Italiano: Usa solo italiano naturale e colloquiale
5. Variazioni: Includi sinonimi, varianti colloquiali, domande implicite
6. Formato: Restituisci SOLO un array JSON di stringhe, senza markdown, senza spiegazioni

ESEMPI BUONI:
- "miglior pizzeria napoletana milano centro"
- "dove mangiare pizza margherita roma"
- "ristorante pesce fresco venezia"
- "prenota tavolo pizzeria napoli"
- "pizzeria aperta domenica sera torino"

ESEMPI CATTIVI (evita):
- "pizza" (troppo generico)
- "ristorante" (nessuna località)
- "pizza napoletana" (manca intent e località)`;

    const userPrompt = `Genera 8 keyword transazionali Local SEO per questa attività:

Attività: ${businessName}
Città: ${city}${categoryInfo}

Restituisci SOLO un array JSON di stringhe.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Veloce ed economico
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7, // Bilanciamento creatività/accuratezza
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0].message.content;

    if (!responseContent) {
      return {
        error: "Nessuna risposta dall'AI",
      };
    }

    // Parse della risposta JSON
    const parsedResponse = JSON.parse(responseContent);

    // L'API potrebbe restituire diverse strutture JSON
    let keywords: string[] = [];

    if (Array.isArray(parsedResponse)) {
      keywords = parsedResponse;
    } else if (parsedResponse.keywords && Array.isArray(parsedResponse.keywords)) {
      keywords = parsedResponse.keywords;
    } else if (parsedResponse.suggestions && Array.isArray(parsedResponse.suggestions)) {
      keywords = parsedResponse.suggestions;
    } else {
      // Prova a estrarre il primo array trovato
      const firstArray = Object.values(parsedResponse).find(Array.isArray);
      if (firstArray) {
        keywords = firstArray as string[];
      }
    }

    if (keywords.length === 0) {
      return {
        error: "L'AI non ha generato keyword valide",
      };
    }

    // Filtra keyword valide (almeno 3 caratteri, massimo 100)
    const validKeywords = keywords
      .filter((kw) => typeof kw === "string" && kw.length >= 3 && kw.length <= 100)
      .slice(0, 8); // Massimo 8 keyword

    if (validKeywords.length === 0) {
      return {
        error: "Nessuna keyword valida generata",
      };
    }

    return {
      keywords: validKeywords,
    };
  } catch (error: any) {
    console.error("Errore generazione keyword AI:", error);

    // Gestione errori specifici OpenAI
    if (error.code === "insufficient_quota") {
      return {
        error: "Quota OpenAI esaurita. Verifica il tuo account su platform.openai.com",
      };
    }

    if (error.code === "invalid_api_key") {
      return {
        error: "Chiave API OpenAI non valida. Verifica la configurazione in .env.local",
      };
    }

    return {
      error: error.message || "Errore durante la generazione delle keyword",
    };
  }
}
