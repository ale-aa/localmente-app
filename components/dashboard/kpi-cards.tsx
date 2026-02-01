import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, AlertCircle, TrendingUp, Share2 } from "lucide-react";

interface KpiCardsProps {
  stats: {
    totalLocations: number;
    pendingReviews: number;
    avgRank: number | null;
    listingSyncScore: number;
  };
}

export function KpiCards({ stats }: KpiCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Sedi Gestite */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sedi Gestite</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalLocations}</div>
          <p className="text-xs text-muted-foreground">
            {stats.totalLocations === 0 && "Aggiungi la prima sede"}
            {stats.totalLocations === 1 && "1 sede attiva"}
            {stats.totalLocations > 1 && `${stats.totalLocations} sedi attive`}
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Recensioni da Gestire */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Da Rispondere</CardTitle>
          <AlertCircle
            className={`h-4 w-4 ${
              stats.pendingReviews > 0 ? "text-red-500" : "text-muted-foreground"
            }`}
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingReviews}</div>
          <p className="text-xs text-muted-foreground">
            {stats.pendingReviews === 0 && "Tutte le recensioni gestite"}
            {stats.pendingReviews === 1 && "1 recensione in attesa"}
            {stats.pendingReviews > 1 && "recensioni in attesa"}
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Rank Medio Globale */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Rank Medio</CardTitle>
          <TrendingUp
            className={`h-4 w-4 ${
              stats.avgRank && stats.avgRank < 10
                ? "text-green-500"
                : "text-muted-foreground"
            }`}
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.avgRank ? `#${stats.avgRank.toFixed(1)}` : "N/D"}
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.avgRank && stats.avgRank < 10 && "Ottimo posizionamento!"}
            {stats.avgRank && stats.avgRank >= 10 && stats.avgRank <= 20 && "Buon posizionamento"}
            {stats.avgRank && stats.avgRank > 20 && "C'è margine di miglioramento"}
            {!stats.avgRank && "Nessuna scansione recente"}
          </p>
        </CardContent>
      </Card>

      {/* Card 4: Listing Sync Score */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Listing Sync</CardTitle>
          <Share2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.listingSyncScore}%</div>
          <p className="text-xs text-muted-foreground">
            {stats.listingSyncScore >= 90 && "Sincronizzazione ottima"}
            {stats.listingSyncScore >= 70 && stats.listingSyncScore < 90 && "Buona sincronizzazione"}
            {stats.listingSyncScore < 70 && stats.listingSyncScore > 0 && "Richiede attenzione"}
            {stats.listingSyncScore === 0 && "Nessun dato disponibile"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
