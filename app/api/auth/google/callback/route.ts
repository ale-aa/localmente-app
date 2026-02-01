import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth 2.0 Callback Handler
 * GET /api/auth/google/callback
 * Receives authorization code and exchanges it for tokens
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Gestisci errori da Google (es. utente nega il consenso)
    if (error) {
      console.error("[Google OAuth Callback] Error from Google:", error);
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?error=google_oauth_${error}`,
          request.url
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=missing_code", request.url)
      );
    }

    // Decodifica lo state per recuperare userId e agencyId
    let userId: string | null = null;
    let agencyId: string | null = null;

    if (state) {
      try {
        const decodedState = JSON.parse(
          Buffer.from(state, "base64").toString("utf-8")
        );
        userId = decodedState.userId;
        agencyId = decodedState.agencyId;
      } catch (error) {
        console.error("[Google OAuth Callback] Failed to decode state:", error);
      }
    }

    // Validate environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !clientSecret || !appUrl) {
      console.error("Missing Google OAuth credentials in environment");
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=oauth_config", request.url)
      );
    }

    // Crea OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${appUrl}/api/auth/google/callback`
    );

    console.log("🔐 [Google OAuth Callback] Exchanging code for tokens...");

    // Scambia il code per i tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      console.error(
        "[Google OAuth Callback] Missing tokens in response:",
        tokens
      );
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=missing_tokens", request.url)
      );
    }

    console.log("✅ [Google OAuth Callback] Tokens received successfully");

    // Imposta le credenziali per recuperare le info utente
    oauth2Client.setCredentials(tokens);

    // Recupera le informazioni dell'account Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    console.log("👤 [Google OAuth Callback] User info:", {
      email: userInfo.email,
      id: userInfo.id,
    });

    // Crea il client Supabase
    const supabase = await createClient();

    // Se non abbiamo l'agencyId dallo state, recuperalo dal profilo utente
    if (!agencyId && userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("agency_id")
        .eq("id", userId)
        .single();

      agencyId = profile?.agency_id || null;
    }

    // Se ancora non abbiamo l'agencyId, proviamo a recuperarlo dall'utente corrente
    if (!agencyId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("agency_id")
          .eq("id", user.id)
          .single();

        agencyId = profile?.agency_id || null;
      }
    }

    if (!agencyId) {
      console.error("[Google OAuth Callback] No agency_id found");
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=no_agency", request.url)
      );
    }

    // Calcola la scadenza del token (default 1 ora)
    const expiresIn = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    // Salva o aggiorna i tokens nel database
    const { error: upsertError } = await supabase
      .from("agency_integrations")
      .upsert(
        {
          agency_id: agencyId,
          provider: "google_business",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expiry: expiresIn.toISOString(),
          google_account_id: userInfo.id || null,
          google_email: userInfo.email || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "agency_id,provider",
        }
      );

    if (upsertError) {
      console.error(
        "[Google OAuth Callback] Failed to save tokens:",
        upsertError
      );
      return NextResponse.redirect(
        new URL("/dashboard/settings?error=save_failed", request.url)
      );
    }

    console.log(
      "💾 [Google OAuth Callback] Tokens saved successfully for agency:",
      agencyId
    );

    // Redireziona alla dashboard con successo
    return NextResponse.redirect(
      new URL("/dashboard/settings?success=google_connected", request.url)
    );
  } catch (error: any) {
    console.error("[Google OAuth Callback] Unexpected error:", error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?error=callback_failed&details=${encodeURIComponent(error.message)}`,
        request.url
      )
    );
  }
}
