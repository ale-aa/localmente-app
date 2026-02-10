"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { checkListingHealth, getListingSyncs, syncListing, type ListingSync } from "@/app/actions/listings";
import { SubmitCredentialsDialog } from "./submit-credentials-dialog";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  TrendingUp,
  Globe,
  Zap,
  UserCheck,
  Lock,
  AlertCircle
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
  const [syncingListingId, setSyncingListingId] = useState<string | null>(null);

  // Stati per il dialog credenziali
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [selectedDirectory, setSelectedDirectory] = useState<{
    id: string;
    name: string;
  } | null>(null);

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

  const handleSyncListing = async (directoryId: string, directoryName: string, directoryType?: string) => {
    setSyncingListingId(directoryId);

    try {
      const { success, error, message } = await syncListing(locationId, directoryId);

      if (error) {
        toast({
          title: "Errore",
          description: error,
          variant: "destructive",
        });
        return;
      }

      if (success) {
        // Ricarica i sync per mostrare lo stato aggiornato
        await loadSyncs();

        // Mostra messaggio diverso in base al tipo
        if (directoryType === "manual") {
          toast({
            title: "Richiesta inviata",
            description: message || `Richiesta di aggiornamento per ${directoryName} inviata al team Concierge`,
          });
        } else {
          toast({
            title: "Sincronizzazione completata",
            description: message || `Listing ${directoryName} sincronizzato`,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la sincronizzazione",
        variant: "destructive",
      });
    } finally {
      setSyncingListingId(null);
    }
  };

  const handleOpenCredentialsDialog = (directoryId: string, directoryName: string) => {
    setSelectedDirectory({ id: directoryId, name: directoryName });
    setCredentialsDialogOpen(true);
  };

  const handleCredentialsSubmitted = async () => {
    // Ricarica i sync dopo l'invio delle credenziali
    await loadSyncs();
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
                {syncs.map((sync) => {
                  const isManual = sync.directory.type === "manual";
                  const isAutomated = sync.directory.type === "automated";
                  const isProcessing = sync.submission_status === "processing";
                  const needsAction = sync.submission_status === "action_needed";
                  const isFailed = sync.submission_status === "failed";
                  const hasSynced = sync.submission_status === "synced";

                  return (
                    <div
                      key={sync.id}
                      className={`flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors ${
                        needsAction ? "border-red-300 bg-red-50/50" : ""
                      }`}
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
                          <div className="flex items-center gap-2 mb-1">
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

                            {/* Badge Tier */}
                            {isAutomated && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Zap className="h-3 w-3" />
                                Auto
                              </Badge>
                            )}
                            {isManual && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <UserCheck className="h-3 w-3" />
                                Concierge
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {isManual && sync.last_manual_check
                              ? `Ultimo check manuale: ${new Date(sync.last_manual_check).toLocaleString("it-IT")}`
                              : `Ultimo check: ${new Date(sync.last_check_at).toLocaleString("it-IT")}`
                            }
                          </div>

                          {/* Badge submission_status per manual */}
                          {isManual && (
                            <div className="mt-1 flex items-center gap-2">
                              {isProcessing && (
                                <Badge variant="secondary" className="text-xs gap-1">
                                  <RefreshCw className="h-3 w-3" />
                                  In Lavorazione (Staff Localmente)
                                </Badge>
                              )}
                              {needsAction && (
                                <Badge variant="destructive" className="text-xs gap-1">
                                  <Lock className="h-3 w-3" />
                                  Credenziali Mancanti
                                </Badge>
                              )}
                              {isFailed && (
                                <Badge variant="outline" className="text-xs gap-1 border-gray-400 text-gray-600">
                                  <XCircle className="h-3 w-3" />
                                  Impossibile aggiornare
                                </Badge>
                              )}
                              {hasSynced && (
                                <Badge variant="default" className="text-xs gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Aggiornato
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Admin Note (messaggio dall'admin al cliente) */}
                          {sync.admin_note && (
                            <div className="mt-2 rounded-md bg-amber-50 border border-amber-200 p-2 flex gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <div className="text-xs text-amber-900">
                                <strong>Nota dello staff:</strong> {sync.admin_note}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Badge Stato */}
                        {getStatusBadge(sync.status)}
                      </div>

                      {/* Azioni */}
                      <div className="flex items-center gap-2 ml-4">
                        {/* Stato action_needed: mostra bottone per inserire credenziali */}
                        {isManual && needsAction ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenCredentialsDialog(sync.directory_id, sync.directory.name)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            <Lock className="mr-1 h-3 w-3" />
                            Inserisci Dati Accesso
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncListing(sync.directory_id, sync.directory.name, sync.directory.type)}
                            disabled={syncingListingId === sync.directory_id || isProcessing || isFailed}
                          >
                            {syncingListingId === sync.directory_id ? (
                              <>
                                <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                                {isManual ? "Invio..." : "Sincronizzazione..."}
                              </>
                            ) : (
                              <>
                                {isManual ? (
                                  <>
                                    <UserCheck className="mr-1 h-3 w-3" />
                                    {isProcessing ? "In attesa Staff" : isFailed ? "Non disponibile" : "Richiedi Aggiornamento"}
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-1 h-3 w-3" />
                                    Sincronizza Ora
                                  </>
                                )}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
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

      {/* Dialog per inserimento credenziali */}
      {selectedDirectory && (
        <SubmitCredentialsDialog
          open={credentialsDialogOpen}
          onOpenChange={setCredentialsDialogOpen}
          locationId={locationId}
          directoryId={selectedDirectory.id}
          directoryName={selectedDirectory.name}
          onSuccess={handleCredentialsSubmitted}
        />
      )}
    </div>
  );
}
