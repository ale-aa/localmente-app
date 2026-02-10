"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  checkBingConnectionStatus,
  connectBingAccountAction,
  disconnectBingAccountAction,
} from "@/app/actions/bing";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Icona Microsoft (simile a Chrome per Google)
function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
    </svg>
  );
}

export function BingIntegrationCard() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Carica lo stato dell'integrazione
  useEffect(() => {
    loadStatus();
  }, []);

  // Gestisci i parametri di ritorno dalla callback OAuth
  useEffect(() => {
    const bingConnected = searchParams.get("bing_connected");
    const bingError = searchParams.get("bing_error");

    if (bingConnected === "true") {
      toast({
        title: "Connessione riuscita",
        description: "Il tuo account Microsoft Bing è stato collegato con successo!",
      });
      loadStatus();
      window.history.replaceState({}, "", "/dashboard/settings");
    }

    if (bingError) {
      toast({
        title: "Errore di connessione",
        description: decodeURIComponent(bingError),
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, [searchParams, toast]);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const result = await checkBingConnectionStatus();
      setIsConnected(result.connected);

      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Errore caricamento stato Bing:", error);
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

  const handleDisconnect = async () => {
    setIsDisconnecting(true);

    try {
      const result = await disconnectBingAccountAction();

      if (result.success) {
        toast({
          title: "Disconnessione riuscita",
          description: "Il tuo account Microsoft Bing è stato disconnesso",
        });
        await loadStatus();
      } else {
        toast({
          title: "Errore",
          description: result.error || "Errore durante la disconnessione",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la disconnessione",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
      setShowDisconnectDialog(false);
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
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
                <MicrosoftIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Microsoft Bing Places
                  {isConnected && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connesso
                    </Badge>
                  )}
                  {!isConnected && (
                    <Badge variant="outline" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Non connesso
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Collega il tuo account Microsoft per pubblicare le tue sedi su Bing Places
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="space-y-4">
              {/* Informazioni account connesso */}
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium mb-1">Account collegato</div>
                    <div className="text-sm text-muted-foreground">
                      Account Microsoft Bing collegato con successo
                    </div>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>

              {/* Info sui token */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  I token di autenticazione verranno rinnovati automaticamente quando
                  necessario per mantenere la connessione attiva.
                </div>
              </div>

              {/* Prossimi passi */}
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Account collegato con successo!
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <p>Ora puoi pubblicare le tue sedi su Bing Places:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>Vai alla sezione "Sedi"</li>
                    <li>Seleziona una sede da pubblicare</li>
                    <li>Clicca su "Pubblica su Bing" nella card Microsoft Bing Places</li>
                  </ol>
                </div>
              </div>

              {/* Azioni secondarie */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisconnectDialog(true)}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Disconnessione...
                    </>
                  ) : (
                    "Disconnetti"
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={loadStatus}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Ricarica Stato
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Messaggio per utenti non connessi */}
              <div className="text-sm text-muted-foreground">
                Connetti il tuo account Microsoft Bing per:
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Pubblicare le tue sedi su Bing Search e Microsoft Maps
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Sincronizzare informazioni come nome, indirizzo e telefono
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Aumentare la visibilità online delle tue attività
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Gestire orari di apertura e categorie
                </li>
              </ul>

              <Button onClick={handleConnect} className="gap-2">
                <MicrosoftIcon className="h-4 w-4" />
                Connetti Account Microsoft
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog di conferma disconnessione */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnettere Microsoft Bing?</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler disconnettere il tuo account Microsoft Bing?
              Non potrai più pubblicare o sincronizzare sedi su Bing Places fino a quando
              non riconnetterai l'account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} disabled={isDisconnecting}>
              {isDisconnecting ? "Disconnessione..." : "Disconnetti"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
