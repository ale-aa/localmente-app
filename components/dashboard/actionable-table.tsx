import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, MessageSquare, TrendingDown } from "lucide-react";
import Link from "next/link";

interface ActionableTableProps {
  locations: Array<{
    locationId: string;
    locationName: string;
    city?: string;
    province?: string;
    pendingReviewsCount: number;
    negativeReviewsCount: number;
    avgRank: number | null;
  }>;
}

export function ActionableTable({ locations }: ActionableTableProps) {
  if (locations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Richiedono Attenzione</CardTitle>
          <CardDescription>Sedi con problemi da risolvere</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-green-100 p-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium">Tutto sotto controllo!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Nessuna sede richiede attenzione al momento
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Richiedono Attenzione</CardTitle>
        <CardDescription>Sedi con problemi da risolvere</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {locations.map((location) => {
            const issues = [];
            if (location.negativeReviewsCount > 0) {
              issues.push({
                type: "negative",
                label: `${location.negativeReviewsCount} recensione/i negativa/e`,
                icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
                variant: "destructive" as const,
              });
            }
            if (location.pendingReviewsCount > 0) {
              issues.push({
                type: "pending",
                label: `${location.pendingReviewsCount} da rispondere`,
                icon: <MessageSquare className="h-4 w-4 text-orange-500" />,
                variant: "secondary" as const,
              });
            }
            if (location.avgRank && location.avgRank > 20) {
              issues.push({
                type: "rank",
                label: `Rank medio: #${location.avgRank.toFixed(0)}`,
                icon: <TrendingDown className="h-4 w-4 text-yellow-500" />,
                variant: "outline" as const,
              });
            }

            return (
              <div
                key={location.locationId}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{location.locationName}</p>
                    {location.city && location.province && (
                      <span className="text-xs text-muted-foreground">
                        {location.city}, {location.province}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {issues.map((issue, index) => (
                      <Badge key={index} variant={issue.variant} className="flex items-center gap-1">
                        {issue.icon}
                        {issue.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Link href={`/dashboard/reviews/${location.locationId}`}>
                  <Button size="sm" className="ml-4">
                    Gestisci
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
