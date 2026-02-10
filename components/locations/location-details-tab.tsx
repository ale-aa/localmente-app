"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Mail, Globe, Tag, Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { updateGoogleLocation } from "@/app/actions/google-integration";

interface LocationDetailsTabProps {
  location: any;
}

export function LocationDetailsTab({ location }: LocationDetailsTabProps) {
  const { toast } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublishToGoogle = async () => {
    setIsPublishing(true);

    try {
      const result = await updateGoogleLocation(location.id);

      if (result.success) {
        toast({
          title: "Pubblicato su Google",
          description: result.message || "Location aggiornata con successo su Google Business Profile",
        });

        // Ricarica la pagina per mostrare il nuovo stato
        window.location.reload();
      } else {
        toast({
          title: "Errore pubblicazione",
          description: result.error || "Impossibile pubblicare su Google",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la pubblicazione su Google",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Helper per badge stato sincronizzazione
  const getSyncStatusBadge = () => {
    if (!location.google_sync_status) return null;

    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; icon: any; label: string }> = {
      synced: { variant: "default", icon: CheckCircle2, label: "Sincronizzato con Google" },
      pending: { variant: "secondary", icon: Loader2, label: "In attesa..." },
      action_needed: { variant: "destructive", icon: AlertTriangle, label: "Richiede attenzione" },
    };

    const config = variants[location.google_sync_status] || null;
    if (!config) return null;

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.icon === Loader2 ? "animate-spin" : ""}`} />
        {config.label}
      </Badge>
    );
  };

  // Verifica se può pubblicare su Google
  const canPublishToGoogle = location.google_location_name && location.google_sync_status !== "pending";

  return (
    <div className="grid gap-6">
      {/* NAP Data - Source of Truth */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle>NAP - Source of Truth</CardTitle>
              {location.google_last_sync && (
                <p className="text-xs text-muted-foreground">
                  Ultimo aggiornamento Google: {new Date(location.google_last_sync).toLocaleString("it-IT")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {getSyncStatusBadge()}
              {canPublishToGoogle && (
                <Button
                  onClick={handlePublishToGoogle}
                  disabled={isPublishing}
                  size="sm"
                  className="gap-2"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Pubblicazione...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Pubblica su Google
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Alert se presente */}
          {location.google_last_error && location.google_sync_status === "action_needed" && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <strong className="text-destructive">Errore sincronizzazione Google:</strong>
                <p className="text-muted-foreground mt-1">{location.google_last_error}</p>
              </div>
            </div>
          )}

          {/* Info alert se non collegato a Google */}
          {!location.google_location_name && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex gap-2">
              <Globe className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <strong>Non collegato a Google Business Profile</strong>
                <p className="mt-1">
                  Per pubblicare automaticamente su Google, importa prima questa location da Google Business Profile.
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Nome Attività (N)</div>
              <div className="mt-1 font-semibold">{location.business_name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Status</div>
              <div className="mt-1">
                <Badge variant={location.is_active ? "default" : "secondary"}>
                  {location.is_active ? "Attiva" : "Non Attiva"}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              Indirizzo (A)
            </div>
            <div className="mt-1">
              {location.address}
              {location.street_number && `, ${location.street_number}`}
              <br />
              {location.city}, {location.province}
              {location.postal_code && ` ${location.postal_code}`}
            </div>
          </div>

          {location.phone && (
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                <Phone className="h-4 w-4" />
                Telefono (P)
              </div>
              <div className="mt-1">{location.phone}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact & Online Presence */}
      <Card>
        <CardHeader>
          <CardTitle>Contatti & Web</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {location.email && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
                <div className="mt-1">{location.email}</div>
              </div>
            )}
            {location.website && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                  <Globe className="h-4 w-4" />
                  Sito Web
                </div>
                <div className="mt-1">
                  <a
                    href={location.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {location.website}
                  </a>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SEO Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {location.category && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                  <Tag className="h-4 w-4" />
                  Categoria Google Business
                </div>
                <div className="mt-1">
                  <Badge variant="outline">{location.category}</Badge>
                </div>
              </div>
            )}
            {location.place_id && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Google Place ID</div>
                <div className="mt-1 font-mono text-xs">{location.place_id}</div>
              </div>
            )}
          </div>

          {(location.latitude && location.longitude) && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Latitudine</div>
                <div className="mt-1 font-mono text-sm">{location.latitude}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Longitudine</div>
                <div className="mt-1 font-mono text-sm">{location.longitude}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {location.description && (
        <Card>
          <CardHeader>
            <CardTitle>Descrizione</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{location.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Client/Owner Info */}
      {location.owner && (
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Nome</div>
                <div className="mt-1">
                  {location.owner.first_name} {location.owner.last_name}
                </div>
              </div>
              {location.owner.email && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Email</div>
                  <div className="mt-1">{location.owner.email}</div>
                </div>
              )}
              {location.owner.phone && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Telefono</div>
                  <div className="mt-1">{location.owner.phone}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
