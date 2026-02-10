import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserAgency } from "@/lib/auth-helper";

/**
 * GET /api/auth/bing
 * Inizia il flusso OAuth 2.0 per Microsoft Identity Platform
 * Redirect l'utente alla pagina di login Microsoft
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.BING_CLIENT_ID;
    const redirectUri = process.env.BING_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Configurazione Bing mancante. Contatta l'amministratore." },
        { status: 500 }
      );
    }

    // Microsoft Identity Platform OAuth 2.0
    const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");

    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);

    // Scope necessari per Bing Places/Microsoft Advertising
    // https://ads.microsoft.com/msads.manage - gestione campagne e location
    // offline_access - FONDAMENTALE per ottenere il refresh token
    const scopes = [
      "https://ads.microsoft.com/msads.manage",
      "offline_access",
      "openid",
      "profile",
      "email",
    ];
    authUrl.searchParams.set("scope", scopes.join(" "));

    authUrl.searchParams.set("response_mode", "query");

    // State per sicurezza (opzionale ma consigliato)
    // Puoi includere userId o agencyId criptato per validare il callback
    const state = Buffer.from(
      JSON.stringify({
        timestamp: Date.now(),
        // Aggiungi altri dati se necessario
      })
    ).toString("base64");
    authUrl.searchParams.set("state", state);

    // Redirect alla pagina di login Microsoft
    return NextResponse.redirect(authUrl.toString());
  } catch (error: any) {
    console.error("[Bing OAuth] Errore generazione auth URL:", error);
    return NextResponse.json(
      { error: "Errore durante la generazione dell'URL di autenticazione" },
      { status: 500 }
    );
  }
}
