/**
 * Utilities geografiche per il calcolo di griglie e distanze
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GridPoint extends GeoPoint {
  index: number;
}

/**
 * Calcola la distanza in metri tra due punti geografici (Formula di Haversine)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Raggio della Terra in metri
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Converte metri in gradi di latitudine
 * 1 grado di latitudine ≈ 111,320 metri (costante)
 */
export function metersToLatitude(meters: number): number {
  return meters / 111320;
}

/**
 * Converte metri in gradi di longitudine
 * La conversione dipende dalla latitudine (i meridiani convergono ai poli)
 */
export function metersToLongitude(meters: number, atLatitude: number): number {
  const latRad = (atLatitude * Math.PI) / 180;
  return meters / (111320 * Math.cos(latRad));
}

/**
 * Genera una griglia quadrata di punti geografici
 *
 * @param centerLat - Latitudine del centro
 * @param centerLng - Longitudine del centro
 * @param radiusMeters - Raggio dal centro al bordo della griglia (in metri)
 * @param gridSize - Dimensione della griglia (3 = 3x3 = 9 punti, 5 = 5x5 = 25 punti, etc.)
 * @returns Array di punti geografici con indice
 *
 * Esempio con gridSize=3:
 * ```
 * 6 7 8
 * 3 4 5
 * 0 1 2
 * ```
 */
export function generateGrid(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  gridSize: number
): GridPoint[] {
  const points: GridPoint[] = [];

  // Calcola la distanza tra i punti della griglia
  // Se gridSize=3, abbiamo 2 intervalli (3-1), quindi step = radius*2/2 = radius
  // Se gridSize=5, abbiamo 4 intervalli (5-1), quindi step = radius*2/4 = radius/2
  const totalDistance = radiusMeters * 2; // Diametro della griglia
  const step = totalDistance / (gridSize - 1);

  // Converti il raggio in offset lat/lng
  const latOffset = metersToLatitude(radiusMeters);
  const lngOffset = metersToLongitude(radiusMeters, centerLat);

  // Punto in alto a sinistra della griglia
  const topLeftLat = centerLat + latOffset;
  const topLeftLng = centerLng - lngOffset;

  let index = 0;

  // Genera la griglia dal basso verso l'alto, da sinistra a destra
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      // Calcola l'offset dal punto top-left
      const latStep = metersToLatitude(step * row);
      const lngStep = metersToLongitude(step * col, centerLat);

      const latitude = topLeftLat - latStep;
      const longitude = topLeftLng + lngStep;

      points.push({
        index,
        latitude,
        longitude,
      });

      index++;
    }
  }

  return points;
}

/**
 * Calcola il centro di una griglia di punti
 */
export function calculateGridCenter(points: GeoPoint[]): GeoPoint {
  if (points.length === 0) {
    throw new Error("Cannot calculate center of empty grid");
  }

  const sum = points.reduce(
    (acc, point) => ({
      latitude: acc.latitude + point.latitude,
      longitude: acc.longitude + point.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: sum.latitude / points.length,
    longitude: sum.longitude / points.length,
  };
}

/**
 * Verifica se un punto è dentro un raggio dal centro
 */
export function isPointInRadius(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(pointLat, pointLng, centerLat, centerLng);
  return distance <= radiusMeters;
}

/**
 * Formatta le coordinate in formato leggibile
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`;
}

/**
 * Calcola i bounds (bounding box) di una griglia
 */
export function calculateGridBounds(points: GeoPoint[]): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  if (points.length === 0) {
    throw new Error("Cannot calculate bounds of empty grid");
  }

  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}

/**
 * Genera un colore basato sul rank (verde = buono, rosso = cattivo)
 * @param rank - Posizione (1-20 o null)
 * @returns Colore esadecimale
 */
export function getRankColor(rank: number | null): string {
  if (rank === null) return "#9CA3AF"; // Grigio (non trovato)
  if (rank <= 3) return "#10B981"; // Verde (ottimo)
  if (rank <= 10) return "#F59E0B"; // Arancione (buono)
  if (rank <= 20) return "#EF4444"; // Rosso (scarso)
  return "#9CA3AF"; // Grigio (oltre la 20esima posizione)
}

/**
 * Calcola il raggio consigliato in base alla città
 * @param city - Nome della città
 * @returns Raggio in metri
 */
export function getRecommendedRadius(city?: string): number {
  // Città grandi: raggio più ampio
  const largeCities = ["roma", "milano", "napoli", "torino", "palermo"];
  const isLargeCity = city?.toLowerCase().match(new RegExp(largeCities.join("|")));

  if (isLargeCity) {
    return 5000; // 5 km per città grandi
  }

  return 2000; // 2 km per città medie/piccole
}
