import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth 2.0 Authorization URL Generator
 * GET /api/auth/google
 * Redirects user to Google OAuth consent screen
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica autenticazione utente
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/auth/login?error=unauthorized", request.url)
      );
    }

    // Recupera il profilo dell'utente per verificare agency_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("agency_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.agency_id) {
      return NextResponse.redirect(
        new URL("/dashboard?error=no_agency", request.url)
      );
    }

    // Verifica permessi (solo admin e manager possono connettere integrazioni)
    if (!["admin", "manager"].includes(profile.role)) {
      return NextResponse.redirect(
        new URL("/dashboard?error=insufficient_permissions", request.url)
      );
    }

    // Validate environment variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!clientId || !clientSecret || !appUrl) {
      console.error("Missing Google OAuth credentials in environment");
      return NextResponse.json(
        {
          error:
            "Google OAuth not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL",
        },
        { status: 500 }
      );
    }

    // Crea OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${appUrl}/api/auth/google/callback`
    );

    // Genera l'URL di autorizzazione
    const authUrl = oauth2Client.generateAuthUrl({
      // IMPORTANTE: access_type: 'offline' per ricevere il refresh_token
      access_type: "offline",
      // IMPORTANTE: prompt: 'consent' forza la schermata di consenso per ottenere sempre il refresh_token
      prompt: "consent",
      // Scopes richiesti
      scope: [
        "https://www.googleapis.com/auth/userinfo.email", // Email dell'utente
        "https://www.googleapis.com/auth/userinfo.profile", // Profilo dell'utente
        "https://www.googleapis.com/auth/business.manage", // Google Business Profile - Account Management
      ],
      // State parameter (opzionale ma raccomandato per sicurezza)
      state: Buffer.from(
        JSON.stringify({
          userId: user.id,
          agencyId: profile.agency_id,
          timestamp: Date.now(),
        })
      ).toString("base64"),
    });

    console.log("🔐 [Google OAuth] Redirecting to authorization URL");

    // Redireziona l'utente a Google OAuth
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("[Google OAuth] Error generating auth URL:", error);
    return NextResponse.json(
      {
        error: "Failed to initialize Google OAuth",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
