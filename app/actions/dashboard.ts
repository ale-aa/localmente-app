"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAgencyStats() {
  const supabase = await createClient();

  // Ottieni l'utente corrente
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  // Ottieni il profilo e l'agenzia
  const { data: profile } = await supabase
    .from("profiles")
    .select("agency_id, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.agency_id) {
    return null;
  }

  // Query parallele per performance
  const [
    agencyResult,
    locationsResult,
    reviewsResult,
    rankScansResult,
    listingSyncsResult,
  ] = await Promise.all([
    // 1. Dati Agenzia
    supabase
      .from("agencies")
      .select("*")
      .eq("id", profile.agency_id)
      .single(),

    // 2. Tutte le locations
    supabase
      .from("locations")
      .select("id, business_name, city, province")
      .eq("agency_id", profile.agency_id),

    // 3. Recensioni pending
    supabase
      .from("reviews")
      .select("id, location_id, star_rating, status, author_name, review_date")
      .eq("agency_id", profile.agency_id)
      .order("review_date", { ascending: false }),

    // 4. Ultime scansioni rank (ultime 24h)
    supabase
      .from("rank_scans")
      .select(`
        id,
        location_id,
        avg_rank,
        created_at,
        locations(business_name)
      `)
      .eq("agency_id", profile.agency_id)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false }),

    // 5. Listing syncs
    supabase
      .from("listing_syncs")
      .select("status")
      .in("location_id", []),  // Riempiremo dopo aver ottenuto le locations
  ]);

  const agency = agencyResult.data;
  const locations = locationsResult.data || [];
  const allReviews = reviewsResult.data || [];
  const rankScans = rankScansResult.data || [];

  // Calcola statistiche
  const totalLocations = locations.length;
  const pendingReviews = allReviews.filter(r => r.status === "pending").length;

  // Calcola rank medio dalle ultime scansioni (una per location)
  const latestScansByLocation = new Map();
  rankScans.forEach(scan => {
    if (!latestScansByLocation.has(scan.location_id)) {
      latestScansByLocation.set(scan.location_id, scan);
    }
  });
  const avgRank = latestScansByLocation.size > 0
    ? Array.from(latestScansByLocation.values()).reduce((sum, scan) => sum + (scan.avg_rank || 0), 0) / latestScansByLocation.size
    : 0;

  // Locations che richiedono attenzione
  const locationIssues = new Map();

  // Aggiungi locations con recensioni pending
  allReviews.forEach(review => {
    if (review.status === "pending") {
      const current = locationIssues.get(review.location_id) || {
        locationId: review.location_id,
        pendingReviewsCount: 0,
        negativeReviewsCount: 0,
        avgRank: null,
      };
      current.pendingReviewsCount++;
      if (review.star_rating <= 2) {
        current.negativeReviewsCount++;
      }
      locationIssues.set(review.location_id, current);
    }
  });

  // Aggiungi locations con rank alto
  latestScansByLocation.forEach((scan, locationId) => {
    if (scan.avg_rank && scan.avg_rank > 20) {
      const current = locationIssues.get(locationId) || {
        locationId,
        pendingReviewsCount: 0,
        negativeReviewsCount: 0,
        avgRank: null,
      };
      current.avgRank = scan.avg_rank;
      locationIssues.set(locationId, current);
    }
  });

  // Converti in array e aggiungi dati location
  const locationsNeedingAttention = Array.from(locationIssues.values())
    .map(issue => {
      const location = locations.find(l => l.id === issue.locationId);
      return {
        ...issue,
        locationName: location?.business_name || "Location sconosciuta",
        city: location?.city,
        province: location?.province,
      };
    })
    .sort((a, b) => {
      // Ordina per priorità: prima negative, poi pending, poi rank alto
      const priorityA = (a.negativeReviewsCount * 10) + a.pendingReviewsCount + (a.avgRank && a.avgRank > 20 ? 5 : 0);
      const priorityB = (b.negativeReviewsCount * 10) + b.pendingReviewsCount + (b.avgRank && b.avgRank > 20 ? 5 : 0);
      return priorityB - priorityA;
    })
    .slice(0, 5);

  // Recent Activity (mock per ora - ultime 10 recensioni o scansioni)
  const recentActivity = [];

  // Aggiungi ultime recensioni
  allReviews.slice(0, 5).forEach(review => {
    const location = locations.find(l => l.id === review.location_id);
    recentActivity.push({
      type: "review",
      message: `Nuova recensione ${review.star_rating}⭐ per ${location?.business_name || "Location"}`,
      timestamp: review.review_date,
      locationId: review.location_id,
    });
  });

  // Aggiungi ultime scansioni
  rankScans.slice(0, 5).forEach(scan => {
    recentActivity.push({
      type: "scan",
      message: `Scansione completata per ${(scan.locations as any)?.business_name || "Location"} (Rank medio: ${scan.avg_rank?.toFixed(1)})`,
      timestamp: scan.created_at,
      locationId: scan.location_id,
    });
  });

  // Ordina per timestamp
  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Calcola Listing Sync Score (mock per ora)
  // In produzione faresti una query vera su listing_syncs
  const listingSyncScore = totalLocations > 0 ? 85 : 0;

  return {
    agency,
    profile,
    stats: {
      totalLocations,
      pendingReviews,
      avgRank: avgRank > 0 ? avgRank : null,
      listingSyncScore,
    },
    locationsNeedingAttention,
    recentActivity: recentActivity.slice(0, 10),
  };
}
