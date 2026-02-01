/**
 * DataForSEO API Client
 * Docs: https://docs.dataforseo.com/v3/serp/google/maps/live/advanced/
 */

// Interfacce per i tipi di risposta DataForSEO
export interface Competitor {
  rank: number;
  name: string;
  place_id: string;
  address?: string;
  rating?: number;
}

interface DataForSEOTask {
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
  result: DataForSEOResult[];
}

interface DataForSEOResult {
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
  items: DataForSEOItem[];
}

interface DataForSEOItem {
  type: string;
  rank_group: number;
  rank_absolute: number;
  position: string;
  xpath: string;
  domain: string;
  title: string;
  address: string;
  rating?: {
    rating_type: string;
    value: number;
    votes_count: number;
    rating_max: number;
  };
  place_id: string;
  phone?: string;
  main_image?: string;
  latitude: number;
  longitude: number;
}

interface DataForSEOResponse {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: DataForSEOTask[];
}

interface RankResult {
  rank: number | null;
  found: boolean;
  placeId: string | null;
  title: string | null;
  address: string | null;
  rating: number | null;
  latitude: number | null;
  longitude: number | null;
  competitors: Competitor[];
}

/**
 * Fetch rank from Google Maps for a specific keyword and location
 * @param keyword - Search keyword (e.g., "ristorante italiano")
 * @param lat - Latitude of the search point
 * @param lng - Longitude of the search point
 * @param zoom - Map zoom level (default 15)
 * @param targetPlaceId - Google Place ID to search for (optional)
 * @param targetBusinessName - Business name to search for (optional)
 * @returns Rank result with position and metadata
 */
export async function fetchGoogleMapsRank(
  keyword: string,
  lat: number,
  lng: number,
  zoom: number = 15,
  targetPlaceId?: string,
  targetBusinessName?: string
): Promise<RankResult> {
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
  const endpoint = "https://api.dataforseo.com/v3/serp/google/maps/live/advanced";

  // Request body
  const body = [
    {
      keyword,
      location_coordinate: `${lat},${lng},${zoom}z`,
      location_code: 2380, // Italy
      language_code: "it",
      depth: 20, // Get top 20 results
    },
  ];

  // 🔍 DEBUG: Log search parameters
  console.log("🔍 [DataForSEO] Search params:", {
    keyword,
    coordinates: `${lat},${lng}`,
    zoom,
    targetPlaceId: targetPlaceId || "NOT SET",
    targetBusinessName: targetBusinessName || "NOT SET",
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

    const data: DataForSEOResponse = await response.json();

    // Check for API errors
    if (data.status_code !== 20000) {
      throw new Error(
        `DataForSEO API returned error: ${data.status_message}`
      );
    }

    // Check if we have results
    if (!data.tasks || data.tasks.length === 0) {
      return {
        rank: null,
        found: false,
        placeId: null,
        title: null,
        address: null,
        rating: null,
        latitude: null,
        longitude: null,
        competitors: [],
      };
    }

    const task = data.tasks[0];

    // Check for task errors
    if (task.status_code !== 20000) {
      throw new Error(
        `DataForSEO task error: ${task.status_message}`
      );
    }

    // Check if we have results
    if (!task.result || task.result.length === 0 || !task.result[0].items) {
      return {
        rank: null,
        found: false,
        placeId: null,
        title: null,
        address: null,
        rating: null,
        latitude: null,
        longitude: null,
        competitors: [],
      };
    }

    const items = task.result[0].items;

    // 🔍 DEBUG: Log API response (first 5 results)
    console.log(`📊 [DataForSEO] API returned ${items.length} results. First 5:`);
    items.slice(0, 5).forEach((item, index) => {
      console.log(`  ${index + 1}. "${item.title}" | Place ID: ${item.place_id} | Rank: ${item.rank_group}`);
    });

    // Search for the target business
    let foundItem: DataForSEOItem | null = null;
    let matchMethod = "";

    if (targetPlaceId) {
      // Search by Place ID (most accurate)
      foundItem = items.find((item) => item.place_id === targetPlaceId) || null;
      if (foundItem) {
        matchMethod = "PLACE_ID";
      }
    }

    if (!foundItem && targetBusinessName) {
      // Fallback: Search by business name (multiple strategies)
      const normalizedTargetName = targetBusinessName.toLowerCase().trim();

      // Strategy 1: Exact match
      foundItem = items.find((item) => {
        const normalizedItemTitle = item.title.toLowerCase().trim();
        return normalizedItemTitle === normalizedTargetName;
      }) || null;

      if (foundItem) {
        matchMethod = "NAME_EXACT";
      }

      // Strategy 2: Contains match (either direction)
      if (!foundItem) {
        foundItem = items.find((item) => {
          const normalizedItemTitle = item.title.toLowerCase().trim();
          return (
            normalizedItemTitle.includes(normalizedTargetName) ||
            normalizedTargetName.includes(normalizedItemTitle)
          );
        }) || null;

        if (foundItem) {
          matchMethod = "NAME_CONTAINS";
        }
      }

      // Strategy 3: Partial word match (split by space and check each word)
      if (!foundItem) {
        const targetWords = normalizedTargetName.split(/\s+/).filter(w => w.length > 2);
        foundItem = items.find((item) => {
          const normalizedItemTitle = item.title.toLowerCase().trim();
          const itemWords = normalizedItemTitle.split(/\s+/);

          // At least 50% of target words must be in item title
          const matchingWords = targetWords.filter(targetWord =>
            itemWords.some(itemWord =>
              itemWord.includes(targetWord) || targetWord.includes(itemWord)
            )
          );

          return matchingWords.length >= Math.ceil(targetWords.length * 0.5);
        }) || null;

        if (foundItem) {
          matchMethod = "NAME_PARTIAL_WORDS";
        }
      }
    }

    // Extract top 5 competitors from the results
    const topCompetitors: Competitor[] = items
      .slice(0, 5)
      .map((item) => ({
        rank: item.rank_group,
        name: item.title,
        place_id: item.place_id,
        address: item.address,
        rating: item.rating?.value,
      }));

    if (!foundItem) {
      // Business not found in top 20 results
      console.log("❌ [DataForSEO] Business NOT FOUND in top 20 results");
      return {
        rank: null,
        found: false,
        placeId: null,
        title: null,
        address: null,
        rating: null,
        latitude: null,
        longitude: null,
        competitors: topCompetitors,
      };
    }

    // Business found!
    console.log(`✅ [DataForSEO] Business FOUND via ${matchMethod}! Rank: #${foundItem.rank_group} | Title: "${foundItem.title}"`);
    return {
      rank: foundItem.rank_group,
      found: true,
      placeId: foundItem.place_id,
      title: foundItem.title,
      address: foundItem.address,
      rating: foundItem.rating?.value || null,
      latitude: foundItem.latitude,
      longitude: foundItem.longitude,
      competitors: topCompetitors,
    };
  } catch (error: any) {
    console.error("DataForSEO API error:", error);
    throw new Error(`Failed to fetch rank from DataForSEO: ${error.message}`);
  }
}

/**
 * Batch fetch ranks for multiple grid points with concurrency control
 * @param keyword - Search keyword
 * @param gridPoints - Array of {latitude, longitude, index} points
 * @param zoom - Map zoom level
 * @param targetPlaceId - Google Place ID to search for
 * @param targetBusinessName - Business name to search for
 * @param batchSize - Number of concurrent requests (default 5)
 * @returns Array of rank results with grid index
 */
export async function batchFetchRanks(
  keyword: string,
  gridPoints: Array<{ latitude: number; longitude: number; index: number }>,
  zoom: number,
  targetPlaceId?: string,
  targetBusinessName?: string,
  batchSize: number = 5
): Promise<Array<RankResult & { gridIndex: number }>> {
  const results: Array<RankResult & { gridIndex: number }> = [];

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < gridPoints.length; i += batchSize) {
    const batch = gridPoints.slice(i, i + batchSize);

    // Execute batch in parallel
    const batchPromises = batch.map(async (point) => {
      try {
        const result = await fetchGoogleMapsRank(
          keyword,
          point.latitude,
          point.longitude,
          zoom,
          targetPlaceId,
          targetBusinessName
        );

        return {
          ...result,
          gridIndex: point.index,
        };
      } catch (error: any) {
        console.error(
          `Error fetching rank for grid point ${point.index}:`,
          error
        );
        // Return null rank on error for this specific point
        return {
          rank: null,
          found: false,
          placeId: null,
          title: null,
          address: null,
          rating: null,
          latitude: null,
          longitude: null,
          competitors: [],
          gridIndex: point.index,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < gridPoints.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
