"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlayCircle, TestTube } from "lucide-react";
import { runBingAPITest, runBingPublishTest } from "@/app/actions/bing-test";

interface BingAPITestCardProps {
  locationId?: string;
}

export function BingAPITestCard({ locationId }: BingAPITestCardProps) {
  const { toast } = useToast();
  const [isTestingAPI, setIsTestingAPI] = useState(false);
  const [isTestingPublish, setIsTestingPublish] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const handleTestAPI = async () => {
    setIsTestingAPI(true);
    setTestResults(null);

    try {
      toast({
        title: "Test API in corso...",
        description: "Sto testando vari endpoint Microsoft/Bing. Controlla i log del server.",
      });

      const result = await runBingAPITest();

      if (result.success) {
        setTestResults(result.data);
        toast({
          title: "Test API completato",
          description: result.data?.summary || "Controlla i dettagli nella card",
        });
      } else {
        toast({
          title: "Errore test API",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile completare il test API",
        variant: "destructive",
      });
    } finally {
      setIsTestingAPI(false);
    }
  };

  const handleTestPublish = async () => {
    if (!locationId) {
      toast({
        title: "Location non specificata",
        description: "Serve un locationId per testare la pubblicazione",
        variant: "destructive",
      });
      return;
    }

    setIsTestingPublish(true);

    try {
      toast({
        title: "Test pubblicazione in corso...",
        description: "Sto tentando di pubblicare una location di test. Controlla i log del server.",
      });

      const result = await runBingPublishTest(locationId);

      if (result.success) {
        toast({
          title: "Test pubblicazione SUCCESSO!",
          description: `Endpoint funzionante: ${result.data?.endpoint || "Sconosciuto"}`,
        });
      } else {
        toast({
          title: "Test pubblicazione fallito",
          description: result.error || "Nessun endpoint ha accettato la pubblicazione",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile completare il test di pubblicazione",
        variant: "destructive",
      });
    } finally {
      setIsTestingPublish(false);
    }
  };

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TestTube className="h-5 w-5 text-orange-600" />
          <CardTitle>Test API Microsoft/Bing</CardTitle>
        </div>
        <CardDescription>
          Testa l'accesso ai vari endpoint Microsoft per verificare i permessi disponibili
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
          <AlertDescription className="text-orange-800 dark:text-orange-200 text-sm">
            Questi test verificano quali API Microsoft sono accessibili con il token OAuth corrente.
            Controlla i log del server per dettagli completi.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleTestAPI}
            disabled={isTestingAPI || isTestingPublish}
            variant="outline"
            className="w-full gap-2"
          >
            {isTestingAPI ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Test in corso...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Test Endpoint API
              </>
            )}
          </Button>

          <Button
            onClick={handleTestPublish}
            disabled={isTestingAPI || isTestingPublish || !locationId}
            variant="outline"
            className="w-full gap-2"
          >
            {isTestingPublish ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Test pubblicazione...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4" />
                Test Pubblicazione Location
              </>
            )}
          </Button>
        </div>

        {testResults && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Risultati Test:</h4>
            <div className="text-sm space-y-2">
              <p className="font-medium">{testResults.summary}</p>
              {testResults.results && (
                <div className="space-y-1">
                  {testResults.results.map((result: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <span>{result.success ? "✅" : "❌"}</span>
                      <span className="text-xs">
                        {result.endpoint} - Status: {result.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p className="font-medium mb-1">Endpoint testati:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Customer Management API</li>
            <li>Campaign Management API</li>
            <li>Content API (Shopping)</li>
            <li>Bing Places API</li>
            <li>Microsoft Graph API</li>
            <li>Business Center API</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
