import { notFound } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { createClient } from "@/lib/supabase/server";
import { ReviewsDashboard } from "@/components/reviews/reviews-dashboard";
import { getReviews } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ReviewsLocationPageProps {
  params: {
    id: string;
  };
}

async function getLocation(id: string) {
  const supabase = await createClient();

  const { data: location, error } = await supabase
    .from("locations")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !location) {
    return null;
  }

  return location;
}

export default async function ReviewsLocationPage({ params }: ReviewsLocationPageProps) {
  const { id } = await params;
  const location = await getLocation(id);

  if (!location) {
    notFound();
  }

  const { reviews } = await getReviews(id);

  return (
    <div className="flex flex-col">
      <DashboardHeader
        title={`Recensioni - ${location.business_name}`}
        description={`${location.address}, ${location.city}`}
        action={
          <Link href="/dashboard/reviews">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tutte le Sedi
            </Button>
          </Link>
        }
      />

      <div className="flex-1 p-6">
        <ReviewsDashboard locationId={id} initialReviews={reviews} />
      </div>
    </div>
  );
}
