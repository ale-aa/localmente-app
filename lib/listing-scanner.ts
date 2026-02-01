/**
 * Listing Scanner Service
 * Uses DataForSEO Organic Search API to verify business presence on directories
 * Docs: https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/
 */

// Interfacce per i tipi di risposta DataForSEO Organic Search
interface DataForSEOOrganicTask {
  id: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  result_count: number;
  path: string[];
  data: {
    api: string;
    function: string;
  };
  result: DataForSEOOrganicResult[];
}

interface DataForSEOOrganicResult {
  keyword: string;
  type: string;
  se_domain: string;
  location_code: number;
  language_code: string;
  check_url: string;
  datetime: string;
  spell: any;
  item_types: string[];
  se_results_count: number;
  items_count: number;
  items: DataForSEOOrganicItem[];
}

interface DataForSEOOrganicItem {
  type: string;
  rank_group: number;
  rank_absolute: number;
  position: string;
  xpath: string;
  domain: string;
  title: string;
  description?: string;
  url: string;
  breadcrumb?: string;
  website_name?: string;
}

interface DataForSEOOrganicResponse {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: DataForSEOOrganicTask[];
}

export interface ScanResult {
  status: 'synced' | 'missing';
  listing_url?: string;
  mismatch?: boolean;
}

export interface LocationData {
  name: string;
  city: string;
  phone?: string;
  address?: string;
}

/**
 * Scansiona una directory per verificare la presenza di una location
 * @param location - Dati della location da cercare
 * @param directoryDomain - Dominio della directory (es. "facebook.com")
 * @returns Risultato della scansione con status e URL
 */
export async function scanDirectory(
  location: LocationData,
  directoryDomain: string
): Promise<ScanResult> {
  // Validate environment variables
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  if (!login || !password) {
    throw new Error(
      "DataForSEO credentials not configured. Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in .env.local"
    );
  }

  // Basic Auth credentials
  const credentials = Buffer.from(`${login}:${password}`).toString("base64");

  // API endpoint
  const endpoint = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";

  // Costruisci la query: site:{domain} "{name}" "{city}"
  const query = `site:${directoryDomain} "${location.name}" "${location.city}"`;

  // Request body
  const body = [
    {
      keyword: query,
      location_code: 2380, // Italy
      language_code: "it",
      depth: 10, // Get top 10 results (usually we need just the first)
    },
  ];

  // 🔍 DEBUG: Log search parameters
  console.log("🔍 [Listing Scanner] Search params:", {
    directoryDomain,
    businessName: location.name,
    city: location.city,
    query,
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `DataForSEO API error (${response.status}): ${errorText}`
      );
    }

    const data: DataForSEOOrganicResponse = await response.json();

    // Check for API errors
    if (data.status_code !== 20000) {
      throw new Error(
        `DataForSEO API returned error: ${data.status_message}`
      );
    }

    // Check if we have results
    if (!data.tasks || data.tasks.length === 0) {
      console.log(`❌ [Listing Scanner] No tasks returned for ${directoryDomain}`);
      return {
        status: "missing",
      };
    }

    const task = data.tasks[0];

    // Check for task errors
    if (task.status_code !== 20000) {
      throw new Error(
        `DataForSEO task error: ${task.status_message}`
      );
    }

    // Check if we have organic results
    if (!task.result || task.result.length === 0 || !task.result[0].items) {
      console.log(`❌ [Listing Scanner] No results found for ${directoryDomain}`);
      return {
        status: "missing",
      };
    }

    const items = task.result[0].items;

    // 🔍 DEBUG: Log API response (first 3 results)
    console.log(`📊 [Listing Scanner] API returned ${items.length} results for ${directoryDomain}. First 3:`);
    items.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. "${item.title}" | URL: ${item.url} | Rank: ${item.rank_group}`);
    });

    // Se abbiamo almeno un risultato, consideriamo la location presente
    if (items.length > 0) {
      const firstResult = items[0];

      console.log(`✅ [Listing Scanner] Business FOUND on ${directoryDomain}! URL: ${firstResult.url}`);

      return {
        status: "synced",
        listing_url: firstResult.url,
        // TODO: In futuro, implementare NAP check più sofisticato
        // confrontando phone/address dai risultati con i dati della location
        mismatch: false,
      };
    }

    // Nessun risultato trovato
    console.log(`❌ [Listing Scanner] Business NOT FOUND on ${directoryDomain}`);
    return {
      status: "missing",
    };
  } catch (error: any) {
    console.error(`[Listing Scanner] Error scanning ${directoryDomain}:`, error);
    throw new Error(`Failed to scan directory ${directoryDomain}: ${error.message}`);
  }
}

/**
 * Scansiona tutte le directory per una location con concurrency control
 * @param location - Dati della location da cercare
 * @param directories - Array di {id, domain} delle directory da scansionare
 * @param concurrency - Numero di richieste parallele (default 3)
 * @returns Mappa directory_id -> ScanResult
 */
export async function scanAllDirectories(
  location: LocationData,
  directories: Array<{ id: string; domain: string }>,
  concurrency: number = 3
): Promise<Record<string, ScanResult>> {
  const results: Record<string, ScanResult> = {};

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < directories.length; i += concurrency) {
    const batch = directories.slice(i, i + concurrency);

    // Execute batch in parallel
    const batchPromises = batch.map(async (directory) => {
      try {
        const result = await scanDirectory(location, directory.domain);
        return {
          directoryId: directory.id,
          result,
        };
      } catch (error: any) {
        console.error(
          `Error scanning directory ${directory.id}:`,
          error
        );
        // Return missing status on error for this specific directory
        return {
          directoryId: directory.id,
          result: {
            status: "missing" as const,
          },
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    // Aggiungi risultati al record
    batchResults.forEach(({ directoryId, result }) => {
      results[directoryId] = result;
    });

    // Small delay between batches to avoid rate limiting
    if (i + concurrency < directories.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return results;
}
