import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, Globe, Tag } from "lucide-react";

interface LocationDetailsTabProps {
  location: any;
}

export function LocationDetailsTab({ location }: LocationDetailsTabProps) {
  return (
    <div className="grid gap-6">
      {/* NAP Data - Source of Truth */}
      <Card>
        <CardHeader>
          <CardTitle>NAP - Source of Truth</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
