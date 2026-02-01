import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import Link from "next/link";

interface RecentActivityProps {
  activities: Array<{
    type: string;
    message: string;
    timestamp: string;
    locationId: string;
  }>;
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attività Recenti</CardTitle>
          <CardDescription>Ultimi eventi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nessuna attività recente
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attività Recenti</CardTitle>
        <CardDescription>Ultimi eventi</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <Link
              key={index}
              href={
                activity.type === "review"
                  ? `/dashboard/reviews/${activity.locationId}`
                  : `/dashboard/rank-tracker/${activity.locationId}`
              }
              className="block"
            >
              <div className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent">
                <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                  {activity.type === "review" ? (
                    <MessageSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Activity className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm leading-relaxed">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                      locale: it,
                    })}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
