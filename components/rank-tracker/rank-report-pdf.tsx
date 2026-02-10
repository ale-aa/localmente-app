import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

// Stili per il PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#3B82F6",
  },
  logo: {
    width: 80,
    height: 80,
    objectFit: "contain",
  },
  agencyInfo: {
    textAlign: "right",
  },
  agencyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  agencyWebsite: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 25,
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 5,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoCard: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1F2937",
  },
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#F0F9FF",
    padding: 15,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    color: "#1E40AF",
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E3A8A",
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableCell: {
    fontSize: 10,
    color: "#4B5563",
  },
  col1: {
    width: "10%",
  },
  col2: {
    width: "50%",
  },
  col3: {
    width: "40%",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerText: {
    fontSize: 10,
    color: "#6B7280",
  },
  poweredBy: {
    fontSize: 9,
    color: "#9CA3AF",
    marginTop: 4,
  },
});

interface PDFData {
  agencyName: string;
  agencyLogo: string | null;
  agencyWebsite: string | null;
  clientName: string;
  keyword: string;
  city: string;
  date: string;
  bestRank: number | string;
  averageRank: number | string;
  shareOfVoice: string;
  totalPoints: number;
  foundPoints: number;
  competitors: Array<{
    title: string;
    rank: number | string;
    address: string;
  }>;
}

interface RankReportPDFProps {
  data: PDFData;
}

export function RankReportPDF({ data }: RankReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header con Logo */}
        <View style={styles.header}>
          <View>
            {data.agencyLogo ? (
              <Image src={data.agencyLogo} style={styles.logo} />
            ) : (
              <View style={{ width: 80, height: 80, backgroundColor: "#E5E7EB", borderRadius: 4 }} />
            )}
          </View>
          <View style={styles.agencyInfo}>
            <Text style={styles.agencyName}>{data.agencyName}</Text>
            {data.agencyWebsite && (
              <Text style={styles.agencyWebsite}>{data.agencyWebsite}</Text>
            )}
          </View>
        </View>

        {/* Titolo */}
        <Text style={styles.title}>Report Posizionamento Locale</Text>
        <Text style={styles.subtitle}>Analisi SEO Local - {data.date}</Text>

        {/* Info Cliente e Keyword */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informazioni Analisi</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Cliente</Text>
              <Text style={styles.infoValue}>{data.clientName}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Keyword Analizzata</Text>
              <Text style={styles.infoValue}>{data.keyword}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Località</Text>
              <Text style={styles.infoValue}>{data.city}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Punti Scansionati</Text>
              <Text style={styles.infoValue}>{data.foundPoints} / {data.totalPoints}</Text>
            </View>
          </View>
        </View>

        {/* Metriche Principali */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Metriche di Posizionamento</Text>
          <View style={styles.metricsContainer}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Miglior Posizione</Text>
              <Text style={styles.metricValue}>#{data.bestRank}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Posizione Media</Text>
              <Text style={styles.metricValue}>#{data.averageRank}</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Share of Voice</Text>
              <Text style={styles.metricValue}>{data.shareOfVoice}%</Text>
            </View>
          </View>
        </View>

        {/* Tabella Competitor */}
        {data.competitors.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top 5 Competitor Rilevati</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, styles.col1]}>#</Text>
                <Text style={[styles.tableHeaderCell, styles.col2]}>Nome Attività</Text>
                <Text style={[styles.tableHeaderCell, styles.col3]}>Indirizzo</Text>
              </View>
              {data.competitors.map((competitor, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.col1]}>{index + 1}</Text>
                  <Text style={[styles.tableCell, styles.col2]}>{competitor.title}</Text>
                  <Text style={[styles.tableCell, styles.col3]}>{competitor.address}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Report generato il {new Date().toLocaleDateString("it-IT")}
          </Text>
          <Text style={styles.poweredBy}>
            Powered by {data.agencyName}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
