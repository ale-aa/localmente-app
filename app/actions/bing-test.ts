"use server";

import { getUserAgency } from "@/lib/auth-helper";
import { testBingAPIAccess, testPublishLocation } from "@/lib/services/bing-test-api";

/**
 * Test completo di accesso alle API Microsoft/Bing
 */
export async function runBingAPITest() {
  try {
    const agencyId = await getUserAgency();
    const result = await testBingAPIAccess(agencyId);

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("[Bing Test] Errore:", error);
    return {
      success: false,
      error: error.message || "Errore durante il test delle API",
    };
  }
}

/**
 * Test di pubblicazione di una location
 */
export async function runBingPublishTest(locationId: string) {
  try {
    const agencyId = await getUserAgency();

    // Mock data per il test
    const testLocation = {
      name: "Test Business - Localmente",
      address: "Via Roma, 1",
      city: "Milano",
      country: "IT",
      phone: "+39 02 1234567",
      website: "https://example.com",
      latitude: 45.464,
      longitude: 9.189,
    };

    console.log("\n[Bing Test] 🚀 Inizio test pubblicazione location");
    console.log("[Bing Test] Location test:", testLocation);

    const result = await testPublishLocation(agencyId, testLocation);

    console.log("[Bing Test] ✅ Test completato");
    console.log("[Bing Test] Risultato:", result);

    return {
      success: result.success,
      data: result,
    };
  } catch (error: any) {
    console.error("[Bing Test] ❌ Errore:", error);
    return {
      success: false,
      error: error.message || "Errore durante il test di pubblicazione",
    };
  }
}
