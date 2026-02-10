"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { startScan, startBulkScans, getScansForLocation, getScanResults, getRankHistory } from "@/app/actions/rank-tracker";
import { generateLocalKeywords } from "@/app/actions/ai-suggestions";
import { getRecommendedRadius } from "@/lib/geo-utils";
import { Loader2, TrendingUp, Target, MapPin, Calendar, Sparkles } from "lucide-react";
import { ScanResultsView } from "./scan-results-view";
import { RankHistoryChart } from "./rank-history-chart";

interface RankTrackerTabProps {
  locationId: string;
  location: any;
}

export function RankTrackerTab({ locationId, location }: RankTrackerTabProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scans, setScans] = useState<any[]>([]);
  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [rankHistory, setRankHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [formData, setFormData] = useState({
    keyword: "",
    gridSize: 5,
    radiusMeters: getRecommendedRadius(location.city),
    zoom: 15,
  });

  // Carica le scansioni all'avvio
  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    const { scans: loadedScans } = await getScansForLocation(locationId);
    setScans(loadedScans);
  };

  const handleAiSuggestions = async () => {
    setIsLoadingAi(true);
    setAiSuggestions([]);

    try {
      const result = await generateLocalKeywords({
        businessName: location.business_name,
        city: location.city,
        category: location.category,
      });

      if (result.error) {
        toast({
          title: "Errore AI",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      if (result.keywords && result.keywords.length > 0) {
        setAiSuggestions(result.keywords);
        toast({
          title: "Suggerimenti generati",
          description: `${result.keywords.length} keyword pronte per te`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la generazione dei suggerimenti",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleSelectKeyword = (keyword: string) => {
    // Ottieni le keyword attualmente presenti (splitta per virgola)
    const currentKeywords = formData.keyword
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    // Controlla se la keyword è già presente
    const isSelected = currentKeywords.includes(keyword);

    let newKeywords: string[];
    if (isSelected) {
      // Rimuovi la keyword
      newKeywords = currentKeywords.filter((k) => k !== keyword);
      toast({
        title: "Keyword rimossa",
        description: `"${keyword}" è stata rimossa dalla selezione`,
      });
    } else {
      // Aggiungi la keyword
      newKeywords = [...currentKeywords, keyword];
      toast({
        title: "Keyword aggiunta",
        description: `"${keyword}" è stata aggiunta alla selezione`,
      });
    }

    // Ricostruisci la stringa separata da virgole
    setFormData({ ...formData, keyword: newKeywords.join(", ") });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Parsing delle keyword: splitta per virgola e rimuovi spazi
      const keywords = formData.keyword
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      if (keywords.length === 0) {
        toast({
          title: "Errore",
          description: "Inserisci almeno una keyword",
          variant: "destructive",
        });
        return;
      }

      // Se c'è una sola keyword, usa startScan
      if (keywords.length === 1) {
        const result = await startScan({
          locationId,
          keyword: keywords[0],
          gridSize: formData.gridSize,
          radiusMeters: formData.radiusMeters,
          zoom: formData.zoom,
        });

        if (result.error) {
          toast({
            title: "Errore",
            description: result.error,
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Scansione avviata",
          description: "La scansione è stata avviata con successo",
        });
      } else {
        // Se ci sono più keyword, usa startBulkScans
        const result = await startBulkScans({
          locationId,
          keywords,
          gridSize: formData.gridSize,
          radiusMeters: formData.radiusMeters,
          zoom: formData.zoom,
        });

        if (result.error) {
          toast({
            title: "Errore",
            description: result.error,
            variant: "destructive",
          });
          return;
        }

        // Mostra messaggio di successo con dettagli
        if (result.failed && result.failed > 0) {
          toast({
            title: "Scansioni parzialmente avviate",
            description: `${result.succeeded} su ${result.total} scansioni avviate con successo`,
            variant: "default",
          });
        } else {
          toast({
            title: "Scansioni avviate",
            description: `${result.succeeded} scansioni avviate con successo`,
          });
        }
      }

      // Ricarica le scansioni
      await loadScans();

      // Reset form
      setFormData({ ...formData, keyword: "" });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'avvio delle scansioni",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewResults = async (scan: any) => {
    setSelectedScan(scan);
    setIsLoadingResults(true);
    setIsLoadingHistory(true);

    try {
      // Carica risultati e storico in parallelo
      const [resultsData, historyData] = await Promise.all([
        getScanResults(scan.id),
        getRankHistory(locationId, scan.keyword),
      ]);

      setScanResults(resultsData.results);
      setRankHistory(historyData.history);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il caricamento dei dati",
        variant: "destructive",
      });
    } finally {
      setIsLoadingResults(false);
      setIsLoadingHistory(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      running: "outline",
      failed: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status === "completed" && "Completata"}
        {status === "pending" && "In attesa"}
        {status === "running" && "In corso"}
        {status === "failed" && "Fallita"}
      </Badge>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Colonna Sinistra: Form + Lista Scansioni */}
      <div className="space-y-6">
        {/* Form Nuova Scansione */}
        <Card>
          <CardHeader>
            <CardTitle>Nuova Scansione</CardTitle>
            <CardDescription>
              Avvia una nuova scansione per tracciare il posizionamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="keyword">Keyword *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAiSuggestions}
                    disabled={isLoadingAi}
                    className="h-8 gap-1 text-xs"
                  >
                    {isLoadingAi ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Analisi in corso...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        Suggerisci Keyword
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  id="keyword"
                  placeholder="es: pizzeria roma, ristorante centro (separa con virgola)"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                  required
                />
                {aiSuggestions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-muted-foreground">
                      Suggerimenti AI - Clicca per selezionare (multipla):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {aiSuggestions.map((keyword, index) => {
                        // Controlla se la keyword è già selezionata
                        const selectedKeywords = formData.keyword
                          .split(",")
                          .map((k) => k.trim())
                          .filter((k) => k.length > 0);
                        const isSelected = selectedKeywords.includes(keyword);

                        return (
                          <Badge
                            key={index}
                            variant={isSelected ? "default" : "secondary"}
                            className={`cursor-pointer transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                                : "hover:bg-primary hover:text-primary-foreground"
                            }`}
                            onClick={() => handleSelectKeyword(keyword)}
                          >
                            {keyword}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gridSize">Dimensione Griglia</Label>
                    <Select
                      value={formData.gridSize.toString()}
                      onValueChange={(value) =>
                        setFormData({ ...formData, gridSize: parseInt(value) })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3x3 (9 punti)</SelectItem>
                        <SelectItem value="5">5x5 (25 punti)</SelectItem>
                        <SelectItem value="7">7x7 (49 punti)</SelectItem>
                        <SelectItem value="9">9x9 (81 punti)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="radius">Raggio (metri)</Label>
                    <Input
                      id="radius"
                      type="number"
                      min="500"
                      max="10000"
                      step="100"
                      value={formData.radiusMeters}
                      onChange={(e) =>
                        setFormData({ ...formData, radiusMeters: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zoom">Zoom Mappa</Label>
                  <Select
                    value={formData.zoom.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, zoom: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 - Area molto ampia</SelectItem>
                      <SelectItem value="12">12 - Area ampia</SelectItem>
                      <SelectItem value="15">15 - Zona locale (consigliato)</SelectItem>
                      <SelectItem value="17">17 - Zona precisa</SelectItem>
                      <SelectItem value="20">20 - Zona molto precisa</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Livello di zoom per le ricerche API. Valori più alti = area più ristretta.
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Avvio in corso...
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4" />
                    Avvia Scansione
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista Scansioni */}
        <Card>
          <CardHeader>
            <CardTitle>Scansioni Recenti</CardTitle>
            <CardDescription>
              {scans.length} scansioni effettuate
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>Nessuna scansione ancora</p>
                <p className="text-sm">Avvia la prima scansione per iniziare</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent cursor-pointer"
                    onClick={() => handleViewResults(scan)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{scan.keyword}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>Griglia {scan.grid_size}x{scan.grid_size}</span>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(scan.created_at).toLocaleDateString("it-IT")}</span>
                      </div>
                      {scan.status === "completed" && scan.best_rank && (
                        <div className="mt-1 text-sm">
                          <span className="text-green-600 font-medium">
                            Miglior rank: #{scan.best_rank}
                          </span>
                          {scan.average_rank && (
                            <span className="text-muted-foreground ml-2">
                              • Media: {scan.average_rank.toFixed(1)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {getStatusBadge(scan.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Colonna Destra: Grafico + Risultati */}
      <div className="space-y-6">
        {selectedScan ? (
          <>
            {/* Grafico Storico Andamento */}
            {!isLoadingHistory && rankHistory.length > 0 && (
              <RankHistoryChart data={rankHistory} keyword={selectedScan.keyword} />
            )}

            {/* Risultati Scansione */}
            <ScanResultsView
              scan={selectedScan}
              results={scanResults}
              isLoading={isLoadingResults}
              center={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
            />
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Seleziona una scansione per vedere i risultati
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
