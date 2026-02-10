import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * GET /api/auth/bing/callback
 * Callback dopo l'autorizzazione Microsoft OAuth 2.0
 * Scambia il codice authorization per access_token e refresh_token
 *
 * LOGICA BLINDATA:
 * 1. Recupera utente autenticato
 * 2. Recupera agency_id dal profilo
 * 3. Token exchange con Microsoft
 * 4. Upsert token nel DB
 * 5. Revalidate cache
 * 6. Redirect con successo
 */
export async function GET(request: NextRequest) {
  console.log("\n========================================");
  console.log("[Bing Callback] 🚀 Inizio callback OAuth");
  console.log("========================================\n");

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const state = searchParams.get("state");

  // ============================================================================
  // STEP 1: Validazione parametri OAuth
  // ============================================================================

  if (error) {
    console.error("[Bing Callback] ❌ Errore OAuth dal provider:", {
      error,
      errorDescription,
    });
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?bing_error=${encodeURIComponent(
        errorDescription || error
      )}`
    );
  }

  if (!code) {
    console.error("[Bing Callback] ❌ Codice di autorizzazione mancante");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?bing_error=missing_code`
    );
  }

  console.log("[Bing Callback] ✅ Codice OAuth ricevuto:", code.substring(0, 20) + "...");

  try {
    // ============================================================================
    // STEP 2: Recupero Utente Autenticato
    // ============================================================================

    console.log("\n[Bing Callback] 🔐 STEP 2: Recupero utente autenticato...");

    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("[Bing Callback] ❌ Errore recupero utente:", authError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=unauthorized&redirect=/dashboard/settings`
      );
    }

    if (!user) {
      console.error("[Bing Callback] ❌ Nessun utente autenticato trovato");
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=unauthorized&redirect=/dashboard/settings`
      );
    }

    console.log("[Bing Callback] ✅ Utente autenticato:", {
      userId: user.id,
      email: user.email,
    });

    // ============================================================================
    // STEP 3: Recupero Agency ID
    // ============================================================================

    console.log("\n[Bing Callback] 🏢 STEP 3: Recupero agency_id dal profilo...");

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("agency_id, role, user_type")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[Bing Callback] ❌ Errore recupero profilo:", profileError);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?bing_error=profile_not_found`
      );
    }

    if (!profile?.agency_id) {
      console.error("[Bing Callback] ❌ Profilo senza agency_id:", { userId: user.id });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?bing_error=no_agency`
      );
    }

    const agencyId = profile.agency_id;
    console.log("[Bing Callback] ✅ Agency ID trovato:", agencyId);

    // ============================================================================
    // STEP 4: Token Exchange con Microsoft
    // ============================================================================

    console.log("\n[Bing Callback] 🔄 STEP 4: Token exchange con Microsoft...");

    const clientId = process.env.BING_CLIENT_ID;
    const clientSecret = process.env.BING_CLIENT_SECRET;
    const redirectUri = process.env.BING_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("[Bing Callback] ❌ Configurazione OAuth mancante:", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri,
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?bing_error=oauth_config_missing`
      );
    }

    const tokenResponse = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("[Bing Callback] ❌ Errore token exchange:", {
        status: tokenResponse.status,
        error: errorData,
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?bing_error=${encodeURIComponent(
          errorData.error_description || "Token exchange failed"
        )}`
      );
    }

    const tokenData = await tokenResponse.json();

    console.log("[Bing Callback] ✅ Token ricevuti da Microsoft:", {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
    });

    const { access_token, refresh_token, expires_in, scope } = tokenData;

    if (!access_token || !refresh_token) {
      console.error("[Bing Callback] ❌ Token mancanti nella risposta:", {
        hasAccessToken: !!access_token,
        hasRefreshToken: !!refresh_token,
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?bing_error=missing_tokens`
      );
    }

    // Calcola la scadenza del token
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

    console.log("[Bing Callback] 📅 Token expires at:", expiresAt.toISOString());

    // ============================================================================
    // STEP 5: Salvataggio Token nel Database (UPSERT)
    // ============================================================================

    console.log("\n[Bing Callback] 💾 STEP 5: Salvataggio token nel DB...");

    const integrationData = {
      agency_id: agencyId,
      provider: "bing",
      access_token: access_token,
      refresh_token: refresh_token,
      expires_at: expiresAt.toISOString(),
      scope: scope || "",
      status: "connected",
      metadata: {},
      updated_at: new Date().toISOString(),
    };

    console.log("[Bing Callback] 📝 Dati da salvare:", {
      agency_id: agencyId,
      provider: "bing",
      expires_at: expiresAt.toISOString(),
      scope: scope,
      status: "connected",
    });

    // Usa UPSERT per creare o aggiornare l'integrazione
    const { data: upsertedData, error: upsertError } = await supabase
      .from("integrations")
      .upsert(
        {
          ...integrationData,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: "agency_id,provider",
          ignoreDuplicates: false,
        }
      )
      .select();

    if (upsertError) {
      console.error("[Bing Callback] ❌ Errore salvataggio integrazione:", {
        error: upsertError,
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?bing_error=save_failed`
      );
    }

    console.log("[Bing Callback] ✅ Integrazione salvata con successo:", upsertedData);

    // ============================================================================
    // STEP 6: Verifica salvataggio
    // ============================================================================

    console.log("\n[Bing Callback] 🔍 STEP 6: Verifica integrazione salvata...");

    const { data: savedIntegration, error: verifyError } = await supabase
      .from("integrations")
      .select("*")
      .eq("agency_id", agencyId)
      .eq("provider", "bing")
      .single();

    if (verifyError || !savedIntegration) {
      console.error("[Bing Callback] ❌ Verifica fallita, integrazione non trovata:", verifyError);
    } else {
      console.log("[Bing Callback] ✅ Integrazione verificata nel DB:", {
        id: savedIntegration.id,
        agency_id: savedIntegration.agency_id,
        provider: savedIntegration.provider,
        status: savedIntegration.status,
        expires_at: savedIntegration.expires_at,
      });
    }

    // ============================================================================
    // STEP 7: Revalidate Cache
    // ============================================================================

    console.log("\n[Bing Callback] 🔄 STEP 7: Pulizia cache Next.js...");

    try {
      revalidatePath("/dashboard/settings");
      revalidatePath("/dashboard/locations");
      revalidatePath("/dashboard");
      console.log("[Bing Callback] ✅ Cache revalidata con successo");
    } catch (revalidateError) {
      console.error("[Bing Callback] ⚠️ Errore revalidate (non critico):", revalidateError);
    }

    // ============================================================================
    // STEP 8: Redirect finale
    // ============================================================================

    console.log("\n[Bing Callback] 🎉 SUCCESS! Redirect alla dashboard...");
    console.log("========================================\n");

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?bing_connected=true`
    );

  } catch (error: any) {
    console.error("\n========================================");
    console.error("[Bing Callback] ❌ ERRORE GENERALE:", {
      message: error.message,
      stack: error.stack,
    });
    console.error("========================================\n");

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?bing_error=${encodeURIComponent(
        error.message || "Unknown error"
      )}`
    );
  }
}
