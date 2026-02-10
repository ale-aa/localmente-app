/**
 * Bing Places for Business - Service Layer (MOCK)
 *
 * Questo è un mock per sviluppo/testing.
 * Una volta ottenute le credenziali di produzione Microsoft,
 * sostituiremo le chiamate simulate con quelle reali.
 */

export interface BingLocationData {
  business_name: string;
  address: string;
  city: string;
  state?: string;
  zip_code?: string;
  country?: string;
  phone?: string;
  website?: string;
  category?: string;
  description?: string;
}

export interface BingSyncResult {
  success: boolean;
  bing_place_id?: string;
  status?: "Published" | "Pending" | "Under Review";
  message?: string;
  error?: string;
}

export interface BingListingStatus {
  bing_place_id: string;
  status: "Published" | "Pending" | "Under Review" | "Rejected";
  last_updated: string;
  listing_url?: string;
}

export class BingService {
  /**
   * Genera l'URL per l'autenticazione Microsoft OAuth
   * In produzione: utilizzerà il Microsoft Identity Platform
   */
  static getAuthUrl(redirectUri: string): string {
    // Mock: URL fittizia
    const clientId = process.env.MICROSOFT_CLIENT_ID || "mock-client-id";
    const scopes = "User.Read openid profile email";

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}`;
  }

  /**
   * Sincronizza una location locale con Bing Places
   * Mock: Simula un ritardo e restituisce un successo finto
   */
  static async syncLocation(locationData: BingLocationData): Promise<BingSyncResult> {
    // Simula un ritardo di rete (1 secondo)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock: genera un ID finto di Bing Places
    const mockBingPlaceId = `bing-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Simulazione: 90% successo, 10% pending review
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      return {
        success: true,
        bing_place_id: mockBingPlaceId,
        status: "Published",
        message: "Listing pubblicato con successo su Bing Places",
      };
    } else {
      return {
        success: true,
        bing_place_id: mockBingPlaceId,
        status: "Under Review",
        message: "Listing inviato a Bing Places, in attesa di revisione",
      };
    }
  }

  /**
   * Recupera lo stato di un listing Bing Places esistente
   * Mock: Restituisce sempre "Published" per i test
   */
  static async getListingStatus(bingPlaceId: string): Promise<BingListingStatus> {
    // Simula un ritardo di rete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Mock: stato finto
    return {
      bing_place_id: bingPlaceId,
      status: "Published",
      last_updated: new Date().toISOString(),
      listing_url: `https://www.bing.com/maps?q=${encodeURIComponent(bingPlaceId)}`,
    };
  }

  /**
   * Verifica se le credenziali Microsoft sono valide
   * Mock: Sempre true per development
   */
  static async verifyCredentials(accessToken: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return true;
  }

  /**
   * Aggiorna un listing Bing esistente
   * Mock: Simula un aggiornamento riuscito
   */
  static async updateLocation(
    bingPlaceId: string,
    locationData: Partial<BingLocationData>
  ): Promise<BingSyncResult> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      success: true,
      bing_place_id: bingPlaceId,
      status: "Published",
      message: "Listing aggiornato con successo su Bing Places",
    };
  }

  /**
   * Elimina un listing Bing
   * Mock: Simula l'eliminazione
   */
  static async deleteLocation(bingPlaceId: string): Promise<{ success: boolean; message?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    return {
      success: true,
      message: "Listing rimosso da Bing Places",
    };
  }
}

/**
 * Note per l'integrazione reale:
 *
 * 1. Microsoft Identity Platform OAuth 2.0:
 *    - Registrare l'app su Azure Portal
 *    - Ottenere Client ID e Client Secret
 *    - Configurare redirect URIs
 *
 * 2. Bing Places API:
 *    - Documentazione: https://www.bingmapsportal.com/
 *    - Endpoint per creare/aggiornare location
 *    - Gestione immagini e media
 *
 * 3. Credenziali richieste (.env.local):
 *    MICROSOFT_CLIENT_ID=xxx
 *    MICROSOFT_CLIENT_SECRET=xxx
 *    MICROSOFT_TENANT_ID=xxx
 *    BING_PLACES_API_KEY=xxx
 */
