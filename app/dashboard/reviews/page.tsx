import { DashboardHeader } from "@/components/dashboard/header";
import { getLocations } from "@/app/actions/locations";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

export default async function ReviewsPage() {
  const { locations } = await getLocations();

  return (
    <div className="flex flex-col">
      <DashboardHeader
        title="Recensioni"
        description="Gestisci e rispondi alle recensioni dei tuoi clienti"
      />

      <div className="flex-1 p-6">
        {locations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Nessuna sede ancora</h3>
              <p className="text-sm text-muted-foreground">
                Aggiungi la prima sede per iniziare a gestire le recensioni
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((location: any) => (
              <Link key={location.id} href={`/dashboard/reviews/${location.id}`}>
                <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-lg">{location.business_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {location.city}, {location.province}
                          </p>
                        </div>
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>

                      <div className="pt-2 border-t">
                        <div className="text-sm text-muted-foreground">
                          Clicca per gestire le recensioni
                        </div>
                      </div>
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
