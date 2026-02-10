"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, RefreshCw, Unlink } from "lucide-react";
import {
  checkBingConnectionStatus,
  connectBingAccountAction,
  syncBingLocationAction,
  unlinkBingLocationAction,
  getBingLocationData,
} from "@/app/actions/bing";

interface BingConnectionCardProps {
  locationId: string;
  locationName: string;
  locationCity?: string;
  onUpdate?: () => void;
}

export function BingConnectionCard({
  locationId,
  locationName,
  locationCity,
  onUpdate,
}: BingConnectionCardProps) {
  const { toast } = useToast();
  const [isAccountConnected, setIsAccountConnected] = useState(false);
  const [isLocationLinked, setIsLocationLinked] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [locationData, setLocationData] = useState<{
    bingPlaceId?: string | null;
    syncStatus?: string | null;
    lastSync?: string | null;
    listingUrl?: string | null;
  }>({});

  useEffect(() => {
    loadData();
  }, [locationId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Verifica la connessione dell'account
      const connectionStatus = await checkBingConnectionStatus();
      setIsAccountConnected(connectionStatus.connected);

      // Carica i dati della location
      const locData = await getBingLocationData(locationId);
      setLocationData(locData);
      setIsLocationLinked(!!locData.bingPlaceId);
    } catch (error) {
      console.error("Errore caricamento dati Bing:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const result = await connectBingAccountAction();

      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      if (result.authUrl) {
        window.location.href = result.authUrl;
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile avviare il collegamento con Bing",
        variant: "destructive",
      });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncBingLocationAction(locationId);

      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sincronizzazione completata",
        description: result.message || "Location sincronizzata con Bing Places",
      });

      await loadData();
      onUpdate?.();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile sincronizzare la location",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm("Sei sicuro di voler scollegare questa sede da Bing Places?")) {
      return;
    }

    setIsUnlinking(true);
    try {
      const result = await unlinkBingLocationAction(locationId);

      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sede scollegata",
        description: "La sede è stata scollegata da Bing Places",
      });

      await loadData();
      onUpdate?.();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile scollegare la sede",
        variant: "destructive",
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Microsoft Bing Places
              {isLocationLinked && (
                <>
                  {locationData.syncStatus === "pending_upload" ? (
                    <Badge variant="outline" className="gap-1 border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400">
                      <AlertCircle className="h-3 w-3" />
                      In attesa
                    </Badge>
                  ) : (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Collegato
                    </Badge>
                  )}
                </>
              )}
            </CardTitle>
            <CardDescription>
              {!isAccountConnected
                ? "Collega il tuo account Microsoft Bing per iniziare"
                : isLocationLinked
                ? locationData.syncStatus === "pending_upload"
                  ? "Questa sede sarà pubblicata su Bing Places entro 24-48 ore"
                  : "Questa sede è pubblicata su Bing Places"
                : "Pubblica questa sede su Bing Places"}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            {!isAccountConnected ? (
              <Button onClick={handleConnect} size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Collega Account
              </Button>
            ) : isLocationLinked ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="gap-2"
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sincronizza
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlink}
                  disabled={isUnlinking}
                  className="gap-2"
                >
                  {isUnlinking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4" />
                  )}
                  Scollega
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                size="sm"
                className="gap-2"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Pubblicazione...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4" />
                    Pubblica su Bing
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isAccountConnected ? (
          <>
            {/* Alert per account non collegato */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Collega il tuo account Microsoft Bing per pubblicare le tue
                sedi su Bing Places e raggiungere più clienti tramite Bing Search
                e Microsoft Maps.
              </AlertDescription>
            </Alert>

            {/* Benefici */}
            <div className="space-y-2 text-sm">
              <p className="font-medium">Cosa puoi fare con Bing Places:</p>
              <ul className="space-y-1 ml-5 list-disc text-muted-foreground">
                <li>Pubblicare le tue sedi su Bing Search e Microsoft Maps</li>
                <li>Sincronizzare informazioni (nome, indirizzo, telefono)</li>
                <li>Aumentare la visibilità online delle tue location</li>
                <li>Gestire orari di apertura e categorie</li>
                <li>Monitorare le performance su Bing</li>
              </ul>
            </div>
          </>
        ) : isLocationLinked ? (
          <>
            {/* Informazioni sulla sede collegata */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {locationData.bingPlaceId && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Bing Place ID:
                    </span>
                    <p className="mt-1 font-mono text-xs">
                      {locationData.bingPlaceId}
                    </p>
                  </div>
                )}
                {locationData.syncStatus && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Stato:
                    </span>
                    <p className="mt-1">
                      {locationData.syncStatus === "pending_upload"
                        ? "In attesa di pubblicazione (24-48h)"
                        : locationData.syncStatus}
                    </p>
                  </div>
                )}
                {locationData.lastSync && (
                  <div>
                    <span className="font-medium text-muted-foreground">
                      Ultima sincronizzazione:
                    </span>
                    <p className="mt-1">
                      {new Date(locationData.lastSync).toLocaleDateString(
                        "it-IT",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Alert successo o pending */}
            {locationData.syncStatus === "pending_upload" ? (
              <Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  La tua sede è in coda per la pubblicazione su Bing Places.
                  I dati saranno elaborati e pubblicati entro 24-48 ore.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  La sede è pubblicata su Bing Places. Puoi sincronizzare i dati
                  per aggiornare le informazioni.
                </AlertDescription>
              </Alert>
            )}

            {/* Link a Bing Maps */}
            {locationData.listingUrl && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <a
                    href={locationData.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apri su Bing Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Alert per sede non pubblicata */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Questa sede non è ancora pubblicata su Bing Places. Clicca su
                "Pubblica su Bing" per rendere visibile la tua attività su Bing
                Search e Microsoft Maps.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
}
