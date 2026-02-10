/**
 * BING API TEST SERVICE
 * Testa vari endpoint Microsoft per verificare permessi e accessibilità
 */

import { refreshBingToken } from "./bing-real";

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  response: any;
  error?: string;
}

/**
 * Test completo di vari endpoint Microsoft Advertising/Bing
 */
export async function testBingAPIAccess(agencyId: string): Promise<{
  results: TestResult[];
  summary: string;
}> {
  console.log("\n========================================");
  console.log("🧪 BING API TEST - Inizio test completo");
  console.log("========================================\n");

  const results: TestResult[] = [];

  // Step 1: Ottieni token valido
  console.log("📌 STEP 1: Recupero token...");
  const tokenResult = await refreshBingToken(agencyId);

  if (!tokenResult) {
    return {
      results: [],
      summary: "❌ Impossibile recuperare token di accesso",
    };
  }

  const { access_token } = tokenResult;
  console.log("✅ Token ottenuto con successo\n");

  // ============================================================================
  // TEST 1: Microsoft Advertising - Customer Management (Account Info)
  // ============================================================================
  console.log("🔍 TEST 1: Customer Management - GetUser");
  try {
    const response = await fetch(
      "https://clientcenter.api.bingads.microsoft.com/Api/CustomerManagement/v13/CustomerManagementService.svc",
      {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          Authorization: `Bearer ${access_token}`,
          SOAPAction: "GetUser",
        },
        body: `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <h:ApplicationToken xmlns:h="https://bingads.microsoft.com/Customer/v13">Bearer ${access_token}</h:ApplicationToken>
  </s:Header>
  <s:Body>
    <GetUserRequest xmlns="https://bingads.microsoft.com/Customer/v13">
      <UserId i:nil="true" xmlns:i="http://www.w3.org/2001/XMLSchema-instance"/>
    </GetUserRequest>
  </s:Body>
</s:Envelope>`,
      }
    );

    const text = await response.text();
    results.push({
      endpoint: "CustomerManagement.GetUser",
      method: "SOAP",
      status: response.status,
      success: response.ok,
      response: text.substring(0, 500),
    });
    console.log(`   Status: ${response.status} ${response.ok ? "✅" : "❌"}\n`);
  } catch (error: any) {
    results.push({
      endpoint: "CustomerManagement.GetUser",
      method: "SOAP",
      status: 0,
      success: false,
      response: null,
      error: error.message,
    });
    console.log(`   Error: ${error.message} ❌\n`);
  }

  // ============================================================================
  // TEST 2: Microsoft Advertising - Campaign Management (Accounts)
  // ============================================================================
  console.log("🔍 TEST 2: Campaign Management - REST API");
  try {
    const response = await fetch(
      "https://campaign.api.bingads.microsoft.com/CampaignManagement/v13/Accounts",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = await response.text();
    results.push({
      endpoint: "CampaignManagement.Accounts",
      method: "GET",
      status: response.status,
      success: response.ok,
      response: text.substring(0, 500),
    });
    console.log(`   Status: ${response.status} ${response.ok ? "✅" : "❌"}\n`);
  } catch (error: any) {
    results.push({
      endpoint: "CampaignManagement.Accounts",
      method: "GET",
      status: 0,
      success: false,
      response: null,
      error: error.message,
    });
    console.log(`   Error: ${error.message} ❌\n`);
  }

  // ============================================================================
  // TEST 3: Bing Content API (Merchant Center)
  // ============================================================================
  console.log("🔍 TEST 3: Content API - Products");
  try {
    const response = await fetch(
      "https://content.api.bingads.microsoft.com/shopping/v9.1/bmc/products",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = await response.text();
    results.push({
      endpoint: "ContentAPI.Products",
      method: "GET",
      status: response.status,
      success: response.ok,
      response: text.substring(0, 500),
    });
    console.log(`   Status: ${response.status} ${response.ok ? "✅" : "❌"}\n`);
  } catch (error: any) {
    results.push({
      endpoint: "ContentAPI.Products",
      method: "GET",
      status: 0,
      success: false,
      response: null,
      error: error.message,
    });
    console.log(`   Error: ${error.message} ❌\n`);
  }

  // ============================================================================
  // TEST 4: Bing Places API (Endpoint sperimentale)
  // ============================================================================
  console.log("🔍 TEST 4: Bing Places API (tentativo diretto)");
  try {
    const response = await fetch(
      "https://api.bingplaces.com/v1/locations",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = await response.text();
    results.push({
      endpoint: "BingPlaces.Locations",
      method: "GET",
      status: response.status,
      success: response.ok,
      response: text.substring(0, 500),
    });
    console.log(`   Status: ${response.status} ${response.ok ? "✅" : "❌"}\n`);
  } catch (error: any) {
    results.push({
      endpoint: "BingPlaces.Locations",
      method: "GET",
      status: 0,
      success: false,
      response: null,
      error: error.message,
    });
    console.log(`   Error: ${error.message} ❌\n`);
  }

  // ============================================================================
  // TEST 5: Microsoft Graph API (Business Profile)
  // ============================================================================
  console.log("🔍 TEST 5: Microsoft Graph API");
  try {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const text = await response.text();
    results.push({
      endpoint: "Graph.Me",
      method: "GET",
      status: response.status,
      success: response.ok,
      response: text.substring(0, 500),
    });
    console.log(`   Status: ${response.status} ${response.ok ? "✅" : "❌"}\n`);
  } catch (error: any) {
    results.push({
      endpoint: "Graph.Me",
      method: "GET",
      status: 0,
      success: false,
      response: null,
      error: error.message,
    });
    console.log(`   Error: ${error.message} ❌\n`);
  }

  // ============================================================================
  // TEST 6: Bing Local Business API (tentativo)
  // ============================================================================
  console.log("🔍 TEST 6: Bing Local Business Center");
  try {
    const response = await fetch(
      "https://businesscenter.api.bingads.microsoft.com/v1/businesses",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = await response.text();
    results.push({
      endpoint: "BusinessCenter.Businesses",
      method: "GET",
      status: response.status,
      success: response.ok,
      response: text.substring(0, 500),
    });
    console.log(`   Status: ${response.status} ${response.ok ? "✅" : "❌"}\n`);
  } catch (error: any) {
    results.push({
      endpoint: "BusinessCenter.Businesses",
      method: "GET",
      status: 0,
      success: false,
      response: null,
      error: error.message,
    });
    console.log(`   Error: ${error.message} ❌\n`);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("========================================");
  console.log("📊 RIEPILOGO TEST");
  console.log("========================================");

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  console.log(`✅ Successi: ${successCount}`);
  console.log(`❌ Fallimenti: ${failureCount}\n`);

  results.forEach((result) => {
    const icon = result.success ? "✅" : "❌";
    console.log(`${icon} ${result.endpoint} (${result.method}) - Status: ${result.status}`);
  });

  console.log("\n========================================\n");

  const summary = `Test completato: ${successCount}/${results.length} endpoint accessibili`;

  return {
    results,
    summary,
  };
}

/**
 * Test di pubblicazione di una location (tentativo su vari endpoint)
 */
export async function testPublishLocation(
  agencyId: string,
  locationData: {
    name: string;
    address: string;
    city: string;
    country: string;
    phone?: string;
    website?: string;
    latitude?: number;
    longitude?: number;
  }
): Promise<{
  success: boolean;
  endpoint?: string;
  response?: any;
  error?: string;
}> {
  console.log("\n========================================");
  console.log("🚀 TEST PUBBLICAZIONE LOCATION");
  console.log("========================================\n");

  const tokenResult = await refreshBingToken(agencyId);

  if (!tokenResult) {
    return {
      success: false,
      error: "Token non disponibile",
    };
  }

  const { access_token } = tokenResult;

  // ============================================================================
  // TENTATIVO 1: Bing Places API Direct
  // ============================================================================
  console.log("📌 Tentativo 1: POST a Bing Places API");
  try {
    const payload = {
      name: locationData.name,
      address: {
        streetAddress: locationData.address,
        addressLocality: locationData.city,
        addressCountry: locationData.country,
      },
      telephone: locationData.phone,
      url: locationData.website,
      geo: locationData.latitude && locationData.longitude ? {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
      } : undefined,
    };

    console.log("📝 Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(
      "https://api.bingplaces.com/v1/locations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await response.text();
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response: ${text.substring(0, 500)}\n`);

    if (response.ok) {
      try {
        const data = JSON.parse(text);
        return {
          success: true,
          endpoint: "BingPlaces.Locations (POST)",
          response: data,
        };
      } catch {
        return {
          success: true,
          endpoint: "BingPlaces.Locations (POST)",
          response: text,
        };
      }
    }
  } catch (error: any) {
    console.log(`❌ Errore: ${error.message}\n`);
  }

  // ============================================================================
  // TENTATIVO 2: Content API (Product/Business Listing)
  // ============================================================================
  console.log("📌 Tentativo 2: POST a Content API");
  try {
    const payload = {
      contentLanguage: "it",
      targetCountry: locationData.country,
      channel: "local",
      title: locationData.name,
      description: `Business location in ${locationData.city}`,
      link: locationData.website || "https://example.com",
      customAttributes: [
        {
          name: "address",
          value: locationData.address,
        },
        {
          name: "city",
          value: locationData.city,
        },
      ],
    };

    const response = await fetch(
      "https://content.api.bingads.microsoft.com/shopping/v9.1/bmc/products",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const text = await response.text();
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response: ${text.substring(0, 500)}\n`);

    if (response.ok) {
      try {
        const data = JSON.parse(text);
        return {
          success: true,
          endpoint: "ContentAPI.Products (POST)",
          response: data,
        };
      } catch {
        return {
          success: true,
          endpoint: "ContentAPI.Products (POST)",
          response: text,
        };
      }
    }
  } catch (error: any) {
    console.log(`❌ Errore: ${error.message}\n`);
  }

  // ============================================================================
  // RISULTATO FINALE
  // ============================================================================
  console.log("========================================");
  console.log("❌ Nessun endpoint ha accettato la pubblicazione");
  console.log("========================================\n");

  return {
    success: false,
    error: "Nessun endpoint disponibile per la pubblicazione di location",
  };
}
