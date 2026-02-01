import { notFound } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { createClient } from "@/lib/supabase/server";
import { RankTrackerTab } from "@/components/rank-tracker/rank-tracker-tab";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface RankTrackerLocationPageProps {
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

export default async function RankTrackerLocationPage({ params }: RankTrackerLocationPageProps) {
  const { id } = await params;
  const location = await getLocation(id);

  if (!location) {
    notFound();
  }

  return (
    <div className="flex flex-col">
      <DashboardHeader
        title={`Rank Tracker - ${location.business_name}`}
        description={`${location.address}, ${location.city}`}
        action={
          <Link href="/dashboard/rank-tracker">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tutte le Sedi
            </Button>
          </Link>
        }
      />

      <div className="flex-1 p-6">
        <RankTrackerTab locationId={id} location={location} />
      </div>
    </div>
  );
}
