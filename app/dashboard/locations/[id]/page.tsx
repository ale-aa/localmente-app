import { notFound } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationDetailsTab } from "@/components/locations/location-details-tab";
import { ListingsHealthCard } from "@/components/listings/listings-health-card";
import { GoogleConnectionCard } from "@/components/google/google-connection-card";
import { BingConnectionCard, BingAPITestCard } from "@/components/bing";

interface LocationPageProps {
  params: {
    id: string;
  };
}

async function getLocation(id: string) {
  const supabase = await createClient();

  const { data: location, error } = await supabase
    .from("locations")
    .select(`
      *,
      owner:clients(first_name, last_name, email, phone)
    `)
    .eq("id", id)
    .single();

  if (error || !location) {
    return null;
  }

  return location;
}

export default async function LocationPage({ params }: LocationPageProps) {
  const { id } = await params;
  const location = await getLocation(id);

  if (!location) {
    notFound();
  }

  return (
    <div className="flex flex-col">
      <DashboardHeader
        title={location.business_name}
        description={`${location.address}, ${location.city}`}
      />

      <div className="flex-1 p-6">
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList>
            <TabsTrigger value="details">Dettagli</TabsTrigger>
            <TabsTrigger value="google">Google Business</TabsTrigger>
            <TabsTrigger value="bing">Bing Places</TabsTrigger>
            <TabsTrigger value="listings">Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <LocationDetailsTab location={location} />
          </TabsContent>

          <TabsContent value="google" className="space-y-6">
            <GoogleConnectionCard
              locationId={id}
              locationName={location.business_name}
              locationCity={location.city}
              googleLocationId={location.google_location_id}
              googleSyncStatus={location.google_sync_status}
              googleMetadata={location.google_metadata}
            />
          </TabsContent>

          <TabsContent value="bing" className="space-y-6">
            <BingConnectionCard
              locationId={id}
              locationName={location.business_name}
              locationCity={location.city}
            />
            <BingAPITestCard locationId={id} />
          </TabsContent>

          <TabsContent value="listings" className="space-y-6">
            <ListingsHealthCard locationId={id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
