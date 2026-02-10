"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, MapPin, Phone, Globe, Link2, CheckCircle2 } from "lucide-react";
import {
  getGoogleLocationsAvailable,
  linkGoogleLocation,
} from "@/app/actions/google-locations";
import type { GoogleLocation } from "@/lib/google-business";

interface GoogleLocationLinkerProps {
  locationId: string;
  locationName: string;
  locationCity?: string;
  onLinked?: () => void;
}

/**
 * Calcola una similarity score tra due stringhe usando fuzzy matching
 * @returns score da 0 a 100 (100 = match perfetto)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;

  // Levenshtein distance semplificato
  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0) return 0;
  if (len2 === 0) return 0;

  // Check se una stringa contiene l'altra
  if (s1.includes(s2) || s2.includes(s1)) return 80;

  // Check parole in comune
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);

  let commonWords = 0;
  for (const word1 of words1) {
    if (words2.some((w) => w.includes(word1) || word1.includes(w))) {
      commonWords++;
    }
  }

  const score = (commonWords / Math.max(words1.length, words2.length)) * 70;
  return Math.round(score);
}

export function GoogleLocationLinker({
  locationId,
  locationName,
  locationCity,
  onLinked,
}: GoogleLocationLinkerProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [locations, setLocations] = useState<GoogleLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Carica le locations quando il dialog viene aperto
  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen);

    if (newOpen && locations.length === 0) {
      setIsLoading(true);
      try {
        const result = await getGoogleLocationsAvailable();

        if (result.error) {
          toast({
            title: "Errore",
            description: result.error,
            variant: "destructive",
          });
          setOpen(false);
          return;
        }

        setLocations(result.locations || []);

        if (result.locations?.length === 0) {
          toast({
            title: "Nessuna sede trovata",
            description:
              "Non sono state trovate sedi nel tuo account Google Business",
            variant: "destructive",
          });
          setOpen(false);
        }
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare le sedi Google",
          variant: "destructive",
        });
        setOpen(false);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Filtra e ordina le locations in base alla ricerca e similarity
  const filteredAndSortedLocations = useMemo(() => {
    let filtered = locations;

    // Filtra per ricerca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = locations.filter(
        (loc) =>
          loc.locationName.toLowerCase().includes(query) ||
          loc.address?.locality?.toLowerCase().includes(query) ||
          loc.storeCode?.toLowerCase().includes(query)
      );
    }

    // Calcola similarity score e ordina
    const withScores = filtered.map((loc) => {
      const nameScore = calculateSimilarity(locationName, loc.locationName);
      const cityScore =
        locationCity && loc.address?.locality
          ? calculateSimilarity(locationCity, loc.address.locality)
          : 0;
      const totalScore = Math.max(nameScore, cityScore);

      return { location: loc, score: totalScore };
    });

    // Ordina per score decrescente
    withScores.sort((a, b) => b.score - a.score);

    return withScores;
  }, [locations, searchQuery, locationName, locationCity]);

  const handleLink = async (googleLocation: GoogleLocation) => {
    setIsLinking(true);
    try {
      const result = await linkGoogleLocation(
        locationId,
        googleLocation.name,
        googleLocation
      );

      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sede collegata",
        description: `La sede è stata collegata con successo a "${googleLocation.locationName}"`,
      });

      setOpen(false);
      onLinked?.();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile collegare la sede",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Link2 className="h-4 w-4" />
          Collega a Google
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Collega sede a Google Business Profile</DialogTitle>
          <DialogDescription>
            Seleziona la sede corrispondente dal tuo account Google Business
            Profile. Le sedi più simili a "{locationName}" sono evidenziate.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Caricamento sedi Google...
            </span>
          </div>
        ) : (
          <>
            {/* Barra di ricerca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome, città o codice sede..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Lista sedi */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredAndSortedLocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessuna sede trovata
                </div>
              ) : (
                filteredAndSortedLocations.map(({ location, score }) => (
                  <div
                    key={location.name}
                    className={`p-4 rounded-lg border transition-colors ${
                      score >= 70
                        ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                        : score >= 50
                        ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-base">
                            {location.locationName}
                          </h4>
                          {score >= 70 && (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Consigliata
                            </Badge>
                          )}
                          {location.storeCode && (
                            <Badge variant="outline">
                              {location.storeCode}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          {location.address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>
                                {location.address.addressLines?.join(", ")}
                                {location.address.locality &&
                                  `, ${location.address.locality}`}
                                {location.address.administrativeArea &&
                                  ` ${location.address.administrativeArea}`}
                                {location.address.postalCode &&
                                  ` ${location.address.postalCode}`}
                              </span>
                            </div>
                          )}
                          {location.phoneNumbers?.primaryPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 flex-shrink-0" />
                              <span>{location.phoneNumbers.primaryPhone}</span>
                            </div>
                          )}
                          {location.websiteUri && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate">
                                {location.websiteUri}
                              </span>
                            </div>
                          )}
                        </div>

                        {score >= 50 && (
                          <div className="text-xs text-muted-foreground">
                            Similarità: {score}%
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleLink(location)}
                        disabled={isLinking}
                        className="flex-shrink-0"
                      >
                        {isLinking ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Link2 className="h-4 w-4 mr-1" />
                            Collega
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
