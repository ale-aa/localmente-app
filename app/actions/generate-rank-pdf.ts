"use server";

import React from "react";
import { createClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { RankReportPDF } from "@/components/rank-tracker/rank-report-pdf";

interface GeneratePDFParams {
  scanId: string;
}

/**
 * Genera un PDF White Label per una scansione specifica
 */
export async function generateRankPDF({ scanId }: GeneratePDFParams) {
  try {
    const supabase = await createClient();

    // Ottieni i dati della scansione con location e agency
    const { data: scan, error: scanError } = await supabase
      .from("rank_scans")
      .select(`
        *,
        location:locations(
          business_name,
          address,
          city,
          agency_id,
          agency:agencies(
            id,
            name,
            logo_url,
            website
          )
        )
      `)
      .eq("id", scanId)
      .single();

    if (scanError || !scan) {
      return {
        error: "Scansione non trovata",
      };
    }

    // Ottieni i risultati con i competitor
    const { data: results, error: resultsError } = await supabase
      .from("rank_results")
      .select("*")
      .eq("scan_id", scanId)
      .order("rank", { ascending: true });

    if (resultsError) {
      console.error("Errore caricamento risultati:", resultsError);
      return {
        error: "Errore durante il caricamento dei risultati",
      };
    }

    // Estrai i competitor unici dai risultati (primi 5)
    const allCompetitors: any[] = [];
    results?.forEach((result) => {
      if (result.competitors && Array.isArray(result.competitors)) {
        result.competitors.forEach((comp: any) => {
          if (comp && comp.title && !allCompetitors.find((c) => c.title === comp.title)) {
            allCompetitors.push({
              title: comp.title,
              rank: comp.rank || "N/A",
              address: comp.address || "",
            });
          }
        });
      }
    });

    // Prendi i primi 5 competitor
    const topCompetitors = allCompetitors.slice(0, 5);

    // Calcola metriche aggiuntive
    const totalPoints = results?.length || 0;
    const foundPoints = results?.filter((r) => r.rank !== null).length || 0;
    const shareOfVoice = totalPoints > 0 ? ((foundPoints / totalPoints) * 100).toFixed(1) : "0";

    // Prepara i dati per il PDF
    const pdfData = {
      agencyName: scan.location?.agency?.name || "Agenzia",
      agencyLogo: scan.location?.agency?.logo_url || null,
      agencyWebsite: scan.location?.agency?.website || null,
      clientName: scan.location?.business_name || "Cliente",
      keyword: scan.keyword,
      city: scan.location?.city || "",
      date: new Date(scan.created_at).toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      bestRank: scan.best_rank || "N/A",
      averageRank: scan.average_rank ? scan.average_rank.toFixed(1) : "N/A",
      shareOfVoice,
      totalPoints,
      foundPoints,
      competitors: topCompetitors,
    };

    // Genera il PDF
    const buffer = await renderToBuffer(React.createElement(RankReportPDF, { data: pdfData }));

    // Converti il buffer in base64 per inviarlo al client
    const base64 = buffer.toString("base64");

    return {
      success: true,
      pdf: base64,
      filename: `report-${scan.keyword.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`,
    };
  } catch (error: any) {
    console.error("Errore generazione PDF:", error);
    return {
      error: error.message || "Errore durante la generazione del PDF",
    };
  }
}
