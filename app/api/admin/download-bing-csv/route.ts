import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBingBulkCsv, generateBingCsvFilename } from "@/lib/services/bing-csv-generator";

/**
 * GET /api/admin/download-bing-csv
 *
 * Esporta tutte le location con status 'pending_upload' in formato CSV per Bing Places Bulk Upload
 * Solo accessibile agli Admin
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[Bing CSV Export] 📥 Richiesta export CSV");

    const supabase = await createClient();

    // ============================================================================
    // STEP 1: Verifica autenticazione
    // ============================================================================
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[Bing CSV Export] ❌ Non autenticato");
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    // ============================================================================
    // STEP 2: Verifica ruolo Admin
    // ============================================================================
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, user_type, agency_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[Bing CSV Export] ❌ Profilo non trovato:", profileError);
      return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
    }

    // Verifica che sia Admin (role = 'admin' oppure user_type = 'admin')
    const isAdmin = profile.role === "admin" || profile.user_type === "admin";

    if (!isAdmin) {
      console.error("[Bing CSV Export] ❌ Accesso negato: utente non è Admin");
      return NextResponse.json(
        { error: "Accesso negato. Solo gli Admin possono esportare il CSV." },
        { status: 403 }
      );
    }

    console.log("[Bing CSV Export] ✅ Utente Admin verificato:", user.email);

    // ============================================================================
    // STEP 3: Recupera tutte le location pending_upload per l'agency
    // ============================================================================
    const { data: locations, error: locationsError } = await supabase
      .from("locations")
      .select("*")
      .eq("agency_id", profile.agency_id)
      .eq("bing_sync_status", "pending_upload")
      .order("created_at", { ascending: false });

    if (locationsError) {
      console.error("[Bing CSV Export] ❌ Errore recupero locations:", locationsError);
      return NextResponse.json(
        { error: "Errore durante il recupero delle location" },
        { status: 500 }
      );
    }

    if (!locations || locations.length === 0) {
      console.log("[Bing CSV Export] ⚠️ Nessuna location in pending_upload");
      return NextResponse.json(
        {
          error: "Nessuna location in attesa di pubblicazione su Bing",
          count: 0,
        },
        { status: 404 }
      );
    }

    console.log(`[Bing CSV Export] 📊 Trovate ${locations.length} location da esportare`);

    // ============================================================================
    // STEP 4: Genera CSV
    // ============================================================================
    const csvContent = generateBingBulkCsv(locations);
    const filename = generateBingCsvFilename();

    console.log(`[Bing CSV Export] ✅ CSV generato: ${filename}`);
    console.log(`[Bing CSV Export] 📦 Dimensione: ${csvContent.length} caratteri`);

    // ============================================================================
    // STEP 5: Opzionale - Marca le location come 'processed'
    // ============================================================================
    // Puoi abilitare questa sezione se vuoi marcare le location come elaborate
    const updateStatus = request.nextUrl.searchParams.get("mark_processed") === "true";

    if (updateStatus) {
      const locationIds = locations.map((loc) => loc.id);

      const { error: updateError } = await supabase
        .from("locations")
        .update({
          bing_sync_status: "processed",
          updated_at: new Date().toISOString(),
        })
        .in("id", locationIds);

      if (updateError) {
        console.error("[Bing CSV Export] ⚠️ Errore aggiornamento status:", updateError);
        // Non blocchiamo il download anche se l'update fallisce
      } else {
        console.log(`[Bing CSV Export] ✅ ${locationIds.length} location marcate come 'processed'`);
      }
    }

    // ============================================================================
    // STEP 6: Ritorna il CSV come download
    // ============================================================================
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("[Bing CSV Export] ❌ Errore generale:", error);
    return NextResponse.json(
      {
        error: "Errore durante l'export del CSV",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
