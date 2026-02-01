import { DashboardHeader } from "@/components/dashboard/header";
import { getLocations } from "@/app/actions/locations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, TrendingUp } from "lucide-react";
import Link from "next/link";

export default async function RankTrackerPage() {
  const { locations } = await getLocations();

  return (
    <div className="flex flex-col">
      <DashboardHeader
        title="Rank Tracker"
        description="Monitora il posizionamento geo-grid delle tue sedi"
      />

      <div className="flex-1 p-6">
        {locations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Nessuna sede da tracciare</h3>
              <p className="text-sm text-muted-foreground">
                Aggiungi la prima sede per iniziare a monitorare il posizionamento locale
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((location: any) => (
              <Link key={location.id} href={`/dashboard/rank-tracker/${location.id}`}>
                <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {location.business_name}
                    </CardTitle>
                    <CardDescription>
                      {location.city}, {location.province}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Categoria</span>
                        <span className="font-medium">{location.category || "Non specificata"}</span>
                      </div>
                      {location.latitude && location.longitude && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </div>
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
