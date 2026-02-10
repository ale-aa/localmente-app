"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, Loader2, Unlink, ExternalLink } from "lucide-react";
import { GoogleLocationLinker } from "./google-location-linker";
import { unlinkGoogleLocation } from "@/app/actions/google-locations";

interface GoogleConnectionCardProps {
  locationId: string;
  locationName: string;
  locationCity?: string;
  googleLocationId?: string | null;
  googleSyncStatus?: string | null;
  googleMetadata?: any;
  onUpdate?: () => void;
}

export function GoogleConnectionCard({
  locationId,
  locationName,
  locationCity,
  googleLocationId,
  googleSyncStatus,
  googleMetadata,
  onUpdate,
}: GoogleConnectionCardProps) {
  const { toast } = useToast();
  const [isUnlinking, setIsUnlinking] = useState(false);

  const isLinked = !!googleLocationId;

  const handleUnlink = async () => {
    if (!confirm("Sei sicuro di voler scollegare questa sede da Google Business Profile?")) {
      return;
    }

    setIsUnlinking(true);
    try {
      const result = await unlinkGoogleLocation(locationId);

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
        description: "La sede è stata scollegata da Google Business Profile",
      });

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Google Business Profile
              {isLinked && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Collegato
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isLinked
                ? "Questa sede è collegata al tuo Google Business Profile"
                : "Collega questa sede al tuo account Google per pubblicare i dati"}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            {isLinked ? (
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
            ) : (
              <GoogleLocationLinker
                locationId={locationId}
                locationName={locationName}
                locationCity={locationCity}
                onLinked={onUpdate}
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLinked ? (
          <>
            {/* Informazioni sulla sede collegata */}
            {googleMetadata && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {googleMetadata.locationName && (
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Nome su Google:
                      </span>
                      <p className="mt-1">{googleMetadata.locationName}</p>
                    </div>
                  )}
                  {googleMetadata.storeCode && (
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Store Code:
                      </span>
                      <p className="mt-1">{googleMetadata.storeCode}</p>
                    </div>
                  )}
                  {googleMetadata.address?.locality && (
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Città:
                      </span>
                      <p className="mt-1">{googleMetadata.address.locality}</p>
                    </div>
                  )}
                  {googleMetadata.phoneNumbers?.primaryPhone && (
                    <div>
                      <span className="font-medium text-muted-foreground">
                        Telefono:
                      </span>
                      <p className="mt-1">
                        {googleMetadata.phoneNumbers.primaryPhone}
                      </p>
                    </div>
                  )}
                </div>

                {googleMetadata.linkedAt && (
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Collegato il{" "}
                    {new Date(googleMetadata.linkedAt).toLocaleDateString(
                      "it-IT",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Alert successo */}
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                La sede è collegata. Puoi ora pubblicare i dati su Google
                Business Profile e gestire le informazioni della sede.
              </AlertDescription>
            </Alert>

            {/* Link alla console Google */}
            {googleLocationId && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <a
                    href={`https://business.google.com/locations/${googleLocationId.split("/").pop()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apri su Google
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Alert info per non collegato */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Collega questa sede al tuo Google Business Profile per
                sincronizzare automaticamente i dati (NAP, orari, categorie,
                etc.) e gestire le recensioni.
              </AlertDescription>
            </Alert>

            {/* Checklist benefici */}
            <div className="space-y-2 text-sm">
              <p className="font-medium">Cosa puoi fare dopo il collegamento:</p>
              <ul className="space-y-1 ml-5 list-disc text-muted-foreground">
                <li>Pubblicare automaticamente i dati della sede su Google</li>
                <li>Sincronizzare informazioni (nome, indirizzo, telefono)</li>
                <li>Gestire orari di apertura e categorie</li>
                <li>Rispondere alle recensioni direttamente dalla piattaforma</li>
                <li>Monitorare le performance della sede</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
