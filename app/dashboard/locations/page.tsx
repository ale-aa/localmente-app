import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLocations } from "@/app/actions/locations";
import { MapPin, Plus } from "lucide-react";

export default async function LocationsPage() {
  const { locations } = await getLocations();

  return (
    <div className="flex flex-col">
      <DashboardHeader
        title="Sedi & Listings"
        description="Gestisci le sedi dei tuoi clienti"
        action={
          <Link href="/dashboard/locations/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi Sede
            </Button>
          </Link>
        }
      />

      <div className="flex-1 p-6">
        {locations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Nessuna sede ancora</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Inizia aggiungendo la prima sede del tuo cliente
              </p>
              <Link href="/dashboard/locations/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Prima Sede
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((location: any) => (
              <Link key={location.id} href={`/dashboard/locations/${location.id}`}>
                <Card className="h-full transition-colors hover:bg-accent cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">{location.business_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">
                        {location.address}, {location.city}
                      </p>
                      {location.category && (
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium">
                            {location.category}
                          </span>
                        </div>
                      )}
                      {location.phone && (
                        <p className="text-xs text-muted-foreground">
                          📞 {location.phone}
                        </p>
                      )}
                      {location.owner && (
                        <p className="text-xs text-muted-foreground">
                          👤 {location.owner.first_name} {location.owner.last_name}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
