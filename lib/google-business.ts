/**
 * Google Business Profile Service Layer
 * Gestisce l'autenticazione OAuth 2.0 e le chiamate API
 */

import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";

export interface GoogleAuthClient {
  oauth2Client: any;
  accountEmail: string | null;
  accountId: string | null;
}

/**
 * Recupera e verifica i token OAuth per un'agenzia
 * Se il token è scaduto, lo rinnova automaticamente usando il refresh_token
 * @param agencyId - ID dell'agenzia
 * @returns OAuth2 client autenticato
 */
export async function getAuthClient(
  agencyId: string
): Promise<GoogleAuthClient | null> {
  const supabase = await createClient();

  // Recupera l'integrazione dal database
  const { data: integration, error } = await supabase
    .from("agency_integrations")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("provider", "google_business")
    .single();

  if (error || !integration) {
    console.log(
      `ℹ️  [Google Business] No integration found for agency ${agencyId}`
    );
    return null;
  }

  // Validate environment variables
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!clientId || !clientSecret || !appUrl) {
    throw new Error(
      "Google OAuth not configured. Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or NEXT_PUBLIC_APP_URL"
    );
  }

  // Crea OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appUrl}/api/auth/google/callback`
  );

  // Imposta le credenziali esistenti
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    expiry_date: new Date(integration.token_expiry).getTime(),
  });

  // Verifica se il token è scaduto o sta per scadere (entro 5 minuti)
  const now = Date.now();
  const expiryTime = new Date(integration.token_expiry).getTime();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiryTime - now < fiveMinutes) {
    console.log(
      "🔄 [Google Business] Access token expired or expiring soon, refreshing..."
    );

    try {
      // Rinnova il token usando il refresh_token
      const { credentials } = await oauth2Client.refreshAccessToken();

      console.log("✅ [Google Business] Token refreshed successfully");

      // Aggiorna i token nel database
      const newExpiryDate = credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : new Date(Date.now() + 3600 * 1000);

      await supabase
        .from("agency_integrations")
        .update({
          access_token: credentials.access_token!,
          // Il refresh_token potrebbe non essere restituito se non è cambiato
          refresh_token: credentials.refresh_token || integration.refresh_token,
          token_expiry: newExpiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("agency_id", agencyId)
        .eq("provider", "google_business");

      // Aggiorna le credenziali nel client
      oauth2Client.setCredentials(credentials);
    } catch (error: any) {
      console.error("[Google Business] Failed to refresh token:", error);
      throw new Error(
        `Failed to refresh Google OAuth token: ${error.message}`
      );
    }
  }

  return {
    oauth2Client,
    accountEmail: integration.google_email,
    accountId: integration.google_account_id,
  };
}

/**
 * Verifica se un'agenzia ha un'integrazione Google Business attiva
 * @param agencyId - ID dell'agenzia
 * @returns true se l'integrazione esiste
 */
export async function hasGoogleIntegration(
  agencyId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("agency_integrations")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("provider", "google_business")
    .single();

  return !!data;
}

/**
 * Recupera le informazioni dell'integrazione Google Business
 * @param agencyId - ID dell'agenzia
 * @returns Informazioni sull'integrazione (email, stato, ecc.)
 */
export async function getGoogleIntegrationInfo(agencyId: string): Promise<{
  connected: boolean;
  email: string | null;
  accountId: string | null;
  tokenExpiry: string | null;
} | null> {
  const supabase = await createClient();

  const { data: integration } = await supabase
    .from("agency_integrations")
    .select("google_email, google_account_id, token_expiry")
    .eq("agency_id", agencyId)
    .eq("provider", "google_business")
    .single();

  if (!integration) {
    return {
      connected: false,
      email: null,
      accountId: null,
      tokenExpiry: null,
    };
  }

  return {
    connected: true,
    email: integration.google_email,
    accountId: integration.google_account_id,
    tokenExpiry: integration.token_expiry,
  };
}

/**
 * Disconnette l'integrazione Google Business per un'agenzia
 * @param agencyId - ID dell'agenzia
 */
export async function disconnectGoogleIntegration(
  agencyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Prima di eliminare, potremmo voler revocare il token su Google
  // Ma per semplicità nell'MVP, eliminiamo solo dal database
  const { error } = await supabase
    .from("agency_integrations")
    .delete()
    .eq("agency_id", agencyId)
    .eq("provider", "google_business");

  if (error) {
    console.error("[Google Business] Failed to disconnect:", error);
    return {
      success: false,
      error: error.message,
    };
  }

  console.log(
    `✅ [Google Business] Integration disconnected for agency ${agencyId}`
  );

  return { success: true };
}

/**
 * Lista tutti gli account Business Profile disponibili
 * @param agencyId - ID dell'agenzia
 */
export async function listBusinessAccounts(agencyId: string) {
  const authClient = await getAuthClient(agencyId);

  if (!authClient) {
    throw new Error("No Google Business integration found");
  }

  try {
    // API Google Business Profile (v1)
    const mybusinessaccountmanagement = google.mybusinessaccountmanagement({
      version: "v1",
      auth: authClient.oauth2Client,
    });

    const response = await mybusinessaccountmanagement.accounts.list();

    console.log("📊 [Google Business] Business accounts:", response.data);

    return response.data.accounts || [];
  } catch (error: any) {
    console.error("[Google Business] Failed to list accounts:", error);
    throw new Error(`Failed to list business accounts: ${error.message}`);
  }
}

export interface GoogleLocation {
  name: string; // Resource name (es: "accounts/123/locations/456")
  locationName: string; // Display name della sede
  storeCode?: string; // Codice identificativo opzionale
  address?: {
    addressLines?: string[];
    locality?: string; // Città
    administrativeArea?: string; // Provincia/Stato
    postalCode?: string;
    regionCode?: string; // Codice paese (es: "IT")
  };
  phoneNumbers?: {
    primaryPhone?: string;
  };
  websiteUri?: string;
  regularHours?: any;
  categories?: any;
}

/**
 * Recupera tutte le locations disponibili da Google Business Profile
 * Gestisce automaticamente la paginazione
 * @param agencyId - ID dell'agenzia
 * @returns Array di locations Google
 */
export async function listGoogleLocations(
  agencyId: string
): Promise<GoogleLocation[]> {
  const authClient = await getAuthClient(agencyId);

  if (!authClient) {
    throw new Error("No Google Business integration found");
  }

  try {
    // Prima recupera tutti gli account
    const mybusinessaccountmanagement = google.mybusinessaccountmanagement({
      version: "v1",
      auth: authClient.oauth2Client,
    });

    const accountsResponse = await mybusinessaccountmanagement.accounts.list();
    const accounts = accountsResponse.data.accounts || [];

    if (accounts.length === 0) {
      console.log("⚠️  [Google Business] No accounts found");
      return [];
    }

    console.log(
      `📊 [Google Business] Found ${accounts.length} account(s), fetching locations...`
    );

    // API per le locations
    const mybusiness = google.mybusinessbusinessinformation({
      version: "v1",
      auth: authClient.oauth2Client,
    });

    // Recupera le locations per ogni account
    const allLocations: GoogleLocation[] = [];

    for (const account of accounts) {
      if (!account.name) continue;

      let pageToken: string | undefined = undefined;
      let hasMore = true;

      // Gestione paginazione
      while (hasMore) {
        try {
          const locationsResponse = await mybusiness.accounts.locations.list({
            parent: account.name,
            pageSize: 100, // Max allowed
            pageToken,
            readMask: "name,title,storeCode,storefrontAddress,phoneNumbers,websiteUri",
          });

          const locations = locationsResponse.data.locations || [];

          // Mappa i dati nel nostro formato
          for (const loc of locations) {
            allLocations.push({
              name: loc.name || "",
              locationName: loc.title || "",
              storeCode: loc.storeCode || undefined,
              address: loc.storefrontAddress
                ? {
                    addressLines: loc.storefrontAddress.addressLines || [],
                    locality: loc.storefrontAddress.locality || undefined,
                    administrativeArea:
                      loc.storefrontAddress.administrativeArea || undefined,
                    postalCode: loc.storefrontAddress.postalCode || undefined,
                    regionCode: loc.storefrontAddress.regionCode || undefined,
                  }
                : undefined,
              phoneNumbers: loc.phoneNumbers
                ? {
                    primaryPhone: loc.phoneNumbers.primaryPhone || undefined,
                  }
                : undefined,
              websiteUri: loc.websiteUri || undefined,
            });
          }

          // Check se ci sono altre pagine
          pageToken = locationsResponse.data.nextPageToken || undefined;
          hasMore = !!pageToken;
        } catch (error: any) {
          console.error(
            `[Google Business] Error fetching locations for account ${account.name}:`,
            error
          );
          // Continue con il prossimo account
          break;
        }
      }
    }

    console.log(
      `✅ [Google Business] Retrieved ${allLocations.length} location(s)`
    );

    return allLocations;
  } catch (error: any) {
    console.error("[Google Business] Failed to list locations:", error);
    throw new Error(`Failed to list Google locations: ${error.message}`);
  }
}
