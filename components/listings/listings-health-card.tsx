"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { checkListingHealth, getListingSyncs, type ListingSync } from "@/app/actions/listings";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  TrendingUp,
  Globe
} from "lucide-react";

interface ListingsHealthCardProps {
  locationId: string;
}

export function ListingsHealthCard({ locationId }: ListingsHealthCardProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [syncs, setSyncs] = useState<ListingSync[]>([]);
  const [healthScore, setHealthScore] = useState(0);

  // Carica i sync esistenti all'avvio
  useEffect(() => {
    loadSyncs();
  }, [locationId]);

  const loadSyncs = async () => {
    setIsLoading(true);
    const { syncs: loadedSyncs } = await getListingSyncs(locationId);

    if (loadedSyncs && loadedSyncs.length > 0) {
      setSyncs(loadedSyncs);
      calculateHealthScore(loadedSyncs);
    }

    setIsLoading(false);
  };

  const calculateHealthScore = (syncList: ListingSync[]) => {
    if (syncList.length === 0) {
      setHealthScore(0);
      return;
    }

    const syncedCount = syncList.filter((s) => s.status === "synced").length;
    const score = Math.round((syncedCount / syncList.length) * 100);
    setHealthScore(score);
  };

  const handleScanNow = async () => {
    setIsScanning(true);

    try {
      const { data, error } = await checkListingHealth(locationId);

      if (error) {
        toast({
          title: "Errore",
          description: error,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setSyncs(data.syncs);
        setHealthScore(data.healthScore);

        toast({
          title: "Scansione completata",
          description: `${data.syncedCount}/${data.totalDirectories} directory sincronizzate`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la scansione",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any; label: string }> = {
      synced: { variant: "default", icon: CheckCircle2, label: "Sincronizzato" },
      mismatch: { variant: "outline", icon: AlertTriangle, label: "Disallineato" },
      missing: { variant: "destructive", icon: XCircle, label: "Mancante" },
      processing: { variant: "secondary", icon: RefreshCw, label: "In elaborazione" },
    };

    const config = variants[status] || variants.synced;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
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
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con Health Score */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Salute dei Listing
              </CardTitle>
              <CardDescription>
                Monitora lo stato di sincronizzazione su directory esterne
              </CardDescription>
            </div>
            <Button onClick={handleScanNow} disabled={isScanning}>
              {isScanning ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Scansione...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Scansiona Ora
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {syncs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium">Nessuna scansione ancora</p>
              <p className="text-sm">Clicca "Scansiona Ora" per verificare lo stato dei tuoi listing</p>
            </div>
          ) : (
            <>
              {/* Punteggio di Salute */}
              <div className="mb-6 p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Punteggio di Salute
                    </div>
                    <div className={`text-4xl font-bold ${getHealthScoreColor(healthScore)}`}>
                      {healthScore}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {syncs.filter((s) => s.status === "synced").length} / {syncs.length}
                    </div>
                    <div className="text-xs text-muted-foreground">directory sincronizzate</div>
                  </div>
                </div>
              </div>

              {/* Statistiche */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="text-center p-3 rounded-lg border">
                  <div className="text-2xl font-bold text-green-600">
                    {syncs.filter((s) => s.status === "synced").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Sincronizzati</div>
                </div>
                <div className="text-center p-3 rounded-lg border">
                  <div className="text-2xl font-bold text-yellow-600">
                    {syncs.filter((s) => s.status === "mismatch").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Disallineati</div>
                </div>
                <div className="text-center p-3 rounded-lg border">
                  <div className="text-2xl font-bold text-red-600">
                    {syncs.filter((s) => s.status === "missing").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Mancanti</div>
                </div>
              </div>

              {/* Lista Directory */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Directory Monitorate</h3>
                {syncs.map((sync) => (
                  <div
                    key={sync.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Icona Directory */}
                      {sync.directory.icon_url ? (
                        <img
                          src={sync.directory.icon_url}
                          alt={sync.directory.name}
                          className="h-10 w-10 rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Globe className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}

                      {/* Nome e Stato */}
                      <div className="flex-1">
                        {sync.listing_url ? (
                          <a
                            href={sync.listing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:underline hover:text-primary inline-flex items-center gap-1"
                          >
                            {sync.directory.name}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <div className="font-medium">{sync.directory.name}</div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Ultimo check: {new Date(sync.last_check_at).toLocaleString("it-IT")}
                        </div>
                      </div>

                      {/* Badge Stato */}
                      {getStatusBadge(sync.status)}
                    </div>

                    {/* Azioni */}
                    <div className="flex items-center gap-2 ml-4">
                      {sync.listing_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <a
                            href={sync.listing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Vedi Link
                          </a>
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Correggi
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Info ultimo check */}
              {syncs.length > 0 && (
                <div className="mt-4 text-xs text-muted-foreground text-center">
                  Ultima scansione: {new Date(syncs[0].last_check_at).toLocaleString("it-IT")}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
