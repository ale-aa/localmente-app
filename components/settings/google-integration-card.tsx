"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  getGoogleIntegrationStatus,
  disconnectGoogle,
  type IntegrationStatus,
} from "@/app/actions/integrations";
import { importLocationsFromGoogle } from "@/app/actions/import-locations";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Chrome,
  AlertCircle,
  Download,
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

export function GoogleIntegrationCard() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [status, setStatus] = useState<IntegrationStatus>({
    connected: false,
    email: null,
    accountId: null,
    tokenExpiry: null,
  });

  // Carica lo stato dell'integrazione
  useEffect(() => {
    loadStatus();
  }, []);

  // Gestisci i parametri di ritorno dalla callback OAuth
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "google_connected") {
      toast({
        title: "Connessione riuscita",
        description: "Il tuo account Google Business è stato collegato con successo!",
      });
      // Ricarica lo stato
      loadStatus();
      // Rimuovi il parametro dall'URL
      window.history.replaceState({}, "", "/dashboard/settings");
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        google_oauth_access_denied: "Hai negato l'accesso a Google Business Profile",
        missing_code: "Codice di autorizzazione mancante",
        oauth_config: "Configurazione OAuth non valida",
        missing_tokens: "Token mancanti nella risposta di Google",
        no_agency: "Nessuna agenzia associata al tuo account",
        save_failed: "Errore durante il salvataggio dei token",
        callback_failed: "Errore durante il processo di autenticazione",
        unauthorized: "Devi effettuare il login",
        insufficient_permissions: "Non hai i permessi per connettere integrazioni (solo admin e manager)",
      };

      toast({
        title: "Errore di connessione",
        description: errorMessages[error] || `Errore: ${error}`,
        variant: "destructive",
      });
      // Rimuovi il parametro dall'URL
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, [searchParams, toast]);

  const loadStatus = async () => {
    setIsLoading(true);
    const { data, error } = await getGoogleIntegrationStatus();

    if (error) {
      toast({
        title: "Errore",
        description: error,
        variant: "destructive",
      });
    } else if (data) {
      setStatus(data);
    }

    setIsLoading(false);
  };

  const handleConnect = () => {
    // Redireziona alla route OAuth
    window.location.href = "/api/auth/google";
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);

    try {
      const result = await disconnectGoogle();

      if (result.success) {
        toast({
          title: "Disconnessione riuscita",
          description: "Il tuo account Google Business è stato disconnesso",
        });
        // Ricarica lo stato
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

  const handleImport = async () => {
    setIsImporting(true);

    try {
      const { data, error } = await importLocationsFromGoogle();

      if (error) {
        toast({
          title: "Errore durante l'import",
          description: error,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        const totalLocations = data.imported + data.updated;

        if (data.success) {
          toast({
            title: "Import completato con successo!",
            description: `${data.imported} nuove sedi importate, ${data.updated} sedi aggiornate.`,
          });

          // Redireziona alla pagina locations dopo 2 secondi
          setTimeout(() => {
            router.push("/dashboard/locations");
          }, 2000);
        } else {
          // Ci sono stati errori, ma alcune locations potrebbero essere state importate
          toast({
            title: "Import completato con errori",
            description: `${totalLocations} sedi importate/aggiornate, ma ${data.errors} errori riscontrati. Controlla i dettagli.`,
            variant: "destructive",
          });

          if (data.errorMessages && data.errorMessages.length > 0) {
            console.error("[Import] Errori durante l'import:", data.errorMessages);
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Errore imprevisto",
        description: error.message || "Errore durante l'import delle sedi",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
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
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Chrome className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Google Business Profile
                  {status.connected && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connesso
                    </Badge>
                  )}
                  {!status.connected && (
                    <Badge variant="outline" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Non connesso
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Collega il tuo account Google per gestire le tue sedi Business Profile
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {status.connected ? (
            <div className="space-y-4">
              {/* Informazioni account connesso */}
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium mb-1">Account collegato</div>
                    <div className="text-sm text-muted-foreground">
                      {status.email || "Email non disponibile"}
                    </div>
                    {status.accountId && (
                      <div className="text-xs text-muted-foreground mt-1">
                        ID: {status.accountId}
                      </div>
                    )}
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
              </div>

              {/* Token expiry info */}
              {status.tokenExpiry && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    Token valido fino al:{" "}
                    {new Date(status.tokenExpiry).toLocaleString("it-IT")}
                    <br />
                    <span className="text-xs">
                      (il token verrà rinnovato automaticamente quando necessario)
                    </span>
                  </div>
                </div>
              )}

              {/* Import Button */}
              <div className="pt-2">
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="w-full gap-2"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Importazione in corso...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Importa Sedi da Google Business
                    </>
                  )}
                </Button>
                {isImporting && (
                  <div className="mt-2 space-y-2">
                    <Progress value={undefined} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      Recupero sedi dal tuo account Google...
                    </p>
                  </div>
                )}
              </div>

              {/* Azioni secondarie */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDisconnectDialog(true)}
                  disabled={isDisconnecting || isImporting}
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
                <Button variant="outline" size="sm" onClick={loadStatus} disabled={isImporting}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Ricarica Stato
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Messaggio per utenti non connessi */}
              <div className="text-sm text-muted-foreground">
                Connetti il tuo account Google Business Profile per:
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Importare automaticamente le tue sedi Business Profile
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Sincronizzare dati come orari, foto e informazioni di contatto
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Gestire recensioni e risposte direttamente dalla piattaforma
                </li>
              </ul>

              <Button onClick={handleConnect} className="gap-2">
                <Chrome className="h-4 w-4" />
                Connetti Account Google
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
            <AlertDialogTitle>Disconnettere Google Business Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler disconnettere il tuo account Google Business Profile?
              Non potrai più sincronizzare automaticamente i dati delle tue sedi fino a quando
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
