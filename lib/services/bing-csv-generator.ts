/**
 * BING CSV GENERATOR SERVICE
 * Genera file CSV per Bing Places Bulk Upload
 * https://help.bingplaces.com/s/article/Upload-multiple-locations
 */

interface Location {
  id: string;
  business_name: string;
  address: string;
  city: string;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  phone?: string | null;
  website?: string | null;
  category?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_hours?: any;
}

/**
 * Formatta gli orari di apertura nel formato Bing
 * Input: JSON object con orari
 * Output: "Mon 09:00-18:00;Tue 09:00-18:00;Wed 09:00-18:00"
 */
function formatHoursForBing(openingHours: any): string {
  if (!openingHours) {
    return "";
  }

  try {
    // Se è già una stringa, ritornala
    if (typeof openingHours === "string") {
      return openingHours;
    }

    // Se è un oggetto JSON, convertilo
    const dayMap: { [key: string]: string } = {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
    };

    const hoursArray: string[] = [];

    for (const [day, hours] of Object.entries(openingHours)) {
      const dayAbbrev = dayMap[day.toLowerCase()];
      if (!dayAbbrev) continue;

      if (typeof hours === "object" && hours !== null) {
        const { open, close } = hours as any;
        if (open && close) {
          // Formato: "Mon 09:00-18:00"
          hoursArray.push(`${dayAbbrev} ${open}-${close}`);
        }
      }
    }

    return hoursArray.join(";");
  } catch (error) {
    console.error("[CSV] Errore formattazione orari:", error);
    return "";
  }
}

/**
 * Escapa caratteri speciali per CSV (gestisce virgole, virgolette, newline)
 */
function escapeCsvField(field: string | null | undefined): string {
  if (!field) return "";

  const str = String(field);

  // Se contiene virgola, virgolette o newline, racchiudi tra virgolette e raddoppia le virgolette interne
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Genera il CSV per Bing Places Bulk Upload
 *
 * Formato Bing Places:
 * - ClientId: ID interno della location (per tracking)
 * - BusinessName: Nome attività (required)
 * - AddressLine: Indirizzo completo (required)
 * - City: Città (required)
 * - StateOrProvince: Provincia/Stato
 * - PostalCode: CAP
 * - CountryOrRegion: Codice paese (IT, US, etc.) (required)
 * - Phone: Numero telefono
 * - Website: URL sito web
 * - Category: Categoria business
 * - Description: Descrizione
 * - Latitude: Latitudine (formato decimale)
 * - Longitude: Longitudine (formato decimale)
 * - Hours: Orari (formato: "Mon 09:00-18:00;Tue 09:00-18:00")
 */
export function generateBingBulkCsv(locations: Location[]): string {
  // Header CSV
  const headers = [
    "ClientId",
    "BusinessName",
    "AddressLine",
    "City",
    "StateOrProvince",
    "PostalCode",
    "CountryOrRegion",
    "Phone",
    "Website",
    "Category",
    "Description",
    "Latitude",
    "Longitude",
    "Hours",
  ];

  // Genera le righe
  const rows = locations.map((location) => {
    return [
      escapeCsvField(location.id), // ClientId (nostro ID interno)
      escapeCsvField(location.business_name), // BusinessName (required)
      escapeCsvField(location.address), // AddressLine (required)
      escapeCsvField(location.city), // City (required)
      escapeCsvField(location.state || ""), // StateOrProvince
      escapeCsvField(location.zip_code || ""), // PostalCode
      escapeCsvField(location.country || "IT"), // CountryOrRegion (default IT)
      escapeCsvField(location.phone || ""), // Phone
      escapeCsvField(location.website || ""), // Website
      escapeCsvField(location.category || "Local Business"), // Category (default)
      escapeCsvField(location.description || ""), // Description
      location.latitude?.toString() || "", // Latitude
      location.longitude?.toString() || "", // Longitude
      escapeCsvField(formatHoursForBing(location.opening_hours)), // Hours
    ].join(",");
  });

  // Combina header e righe
  return [headers.join(","), ...rows].join("\n");
}

/**
 * Genera il nome file per il CSV export
 * Formato: bing-upload-YYYY-MM-DD.csv
 */
export function generateBingCsvFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `bing-upload-${year}-${month}-${day}.csv`;
}

/**
 * Valida se una location ha i campi minimi richiesti per Bing
 */
export function validateLocationForBing(location: Location): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!location.business_name) {
    errors.push("BusinessName è obbligatorio");
  }

  if (!location.address) {
    errors.push("AddressLine è obbligatorio");
  }

  if (!location.city) {
    errors.push("City è obbligatorio");
  }

  if (!location.country) {
    errors.push("CountryOrRegion è obbligatorio");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
