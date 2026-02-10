import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCoordinates, getRankColor } from "@/lib/geo-utils";
import { TrendingUp, MapPin, Calendar, Target, FileDown, Loader2 } from "lucide-react";
import { GeoGridMap } from "./geo-grid-map";
import { generateRankPDF } from "@/app/actions/generate-rank-pdf";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ScanResultsViewProps {
  scan: any;
  results: any[];
  isLoading: boolean;
  center: {
    latitude: number;
    longitude: number;
  };
}

export function ScanResultsView({ scan, results, isLoading, center }: ScanResultsViewProps) {
  const { toast } = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);

    try {
      const result = await generateRankPDF({ scanId: scan.id });

      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      // Converti il base64 in blob e scarica
      const byteCharacters = atob(result.pdf!);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      // Crea un link temporaneo e scarica
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename!;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "PDF Generato",
        description: "Il report è stato scaricato con successo",
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la generazione del PDF",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcola statistiche
  const rankedResults = results.filter((r) => r.rank !== null);
  const notFoundCount = results.length - rankedResults.length;
  const avgRank = rankedResults.length > 0
    ? rankedResults.reduce((sum, r) => sum + r.rank, 0) / rankedResults.length
    : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle>{scan.keyword}</CardTitle>
            <CardDescription className="mt-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-3 w-3" />
                <span>Griglia {scan.grid_size}x{scan.grid_size} • Raggio {scan.radius_meters}m</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(scan.created_at).toLocaleString("it-IT")}</span>
              </div>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={scan.status === "completed" ? "default" : "secondary"}>
              {scan.status === "completed" ? "Completata" : scan.status}
            </Badge>
            {scan.status === "completed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generazione...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Scarica Report PDF
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistiche */}
        {scan.status === "completed" && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {scan.best_rank || "N/A"}
              </div>
              <div className="text-xs text-muted-foreground">Miglior Rank</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold">
                {avgRank ? avgRank.toFixed(1) : "N/A"}
              </div>
              <div className="text-xs text-muted-foreground">Media</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {notFoundCount}
              </div>
              <div className="text-xs text-muted-foreground">Non Trovati</div>
            </div>
          </div>
        )}

        {/* Mappa Interattiva */}
        <div>
          <h3 className="font-medium mb-3">Mappa dei Risultati</h3>
          <GeoGridMap center={center} results={results} />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Clicca sui marker per vedere i dettagli del rank. Il marker blu 📍 indica la tua location.
          </p>
        </div>

        {/* Legenda Colori */}
        <div className="rounded-lg bg-muted p-3">
          <div className="text-xs font-medium mb-2">Legenda Colori</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getRankColor(1) }} />
              <span>Rank 1-3: Ottimo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getRankColor(5) }} />
              <span>Rank 4-10: Buono</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getRankColor(15) }} />
              <span>Rank 11-20: Scarso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: getRankColor(null) }} />
              <span>Non trovato</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
