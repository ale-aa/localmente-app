"use client";

import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  MapPin,
} from "lucide-react";
import {
  getPendingBingLocations,
  markAllBingLocationsAsCompleted,
} from "@/app/actions/admin-bing";

export default function AdminBingPage() {
  const { toast } = useToast();
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getPendingBingLocations();

      if (result.error) {
        setError(result.error);
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setLocations(result.locations || []);
    } catch (error) {
      console.error("Errore caricamento locations:", error);
      setError("Errore durante il caricamento delle location");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (locations.length === 0) {
      toast({
        title: "Nessuna location",
        description: "Non ci sono location da esportare",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);

    toast({
      title: "Download in corso...",
      description: "Il file CSV verrà scaricato a breve",
    });

    // Apri il link per scaricare il CSV
    window.location.href = "/api/admin/download-bing-csv";

    // Reset stato dopo 2 secondi
    setTimeout(() => {
      setIsDownloading(false);
    }, 2000);
  };

  const handleMarkAsCompleted = async () => {
    if (locations.length === 0) {
      toast({
        title: "Nessuna location",
        description: "Non ci sono location da marcare",
        variant: "destructive",
      });
      return;
    }

    const confirmed = confirm(
      `Sei sicuro di voler marcare ${locations.length} location come completate? Questo le rimuoverà dalla coda di pubblicazione.`
    );

    if (!confirmed) {
      return;
    }

    setIsMarking(true);

    try {
      const result = await markAllBingLocationsAsCompleted();

      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Completato!",
        description: `${result.count} location marcate come 'Active'`,
      });

      // Ricarica la lista
      await loadLocations();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile marcare le location come completate",
        variant: "destructive",
      });
    } finally {
      setIsMarking(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (error && error.includes("Accesso negato")) {
    return (
      <div className="flex flex-col">
        <DashboardHeader
          title="Accesso Negato"
          description="Solo gli Admin possono accedere a questa pagina"
        />

        <div className="flex-1 p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Non hai i permessi necessari per accedere a questa sezione. Contatta un
              amministratore se pensi che questo sia un errore.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <DashboardHeader
        title="Gestione Bing Places"
        description="Esporta e gestisci le location in attesa di pubblicazione su Bing"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Card principale */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-orange-600" />
                  Export CSV per Bing Places
                </CardTitle>
                <CardDescription>
                  {locations.length === 0
                    ? "Nessuna location in attesa di pubblicazione"
                    : `${locations.length} location pronte per l'export`}
                </CardDescription>
              </div>

              <Badge variant="outline" className="text-lg px-4 py-2">
                {locations.length} in coda
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Info Alert */}
            <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <strong>Come funziona:</strong> Scarica il CSV, caricalo su{" "}
                <a
                  href="https://www.bingplaces.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Bing Places Bulk Upload
                </a>
                , poi clicca "Segna come completati" per rimuoverle dalla coda.
              </AlertDescription>
            </Alert>

            {/* Bottoni principali */}
            <div className="flex gap-3">
              <Button
                onClick={handleDownloadCSV}
                disabled={isDownloading || locations.length === 0}
                size="lg"
                className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Download in corso...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    SCARICA CSV BING ({locations.length})
                  </>
                )}
              </Button>

              <Button
                onClick={handleMarkAsCompleted}
                disabled={isMarking || locations.length === 0}
                variant="outline"
                size="lg"
                className="gap-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
              >
                {isMarking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Aggiornamento...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Segna come completati
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabella location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location in attesa
            </CardTitle>
            <CardDescription>
              Elenco completo delle location pronte per la pubblicazione su Bing
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nessuna location in coda</p>
                <p className="text-sm">
                  Quando gli utenti pubblicheranno nuove location su Bing, appariranno qui
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Indirizzo</TableHead>
                      <TableHead>Città</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Data Richiesta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">
                          {location.business_name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {location.address}
                        </TableCell>
                        <TableCell>{location.city}</TableCell>
                        <TableCell className="text-sm">
                          {location.category || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400"
                          >
                            Pending Upload
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {location.last_bing_sync
                            ? formatDate(location.last_bing_sync)
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
