import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function ClientsPage() {
  return (
    <div className="flex flex-col">
      <DashboardHeader
        title="Clienti"
        description="Gestisci i tuoi clienti"
      />

      <div className="flex-1 p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Sezione in arrivo</h3>
            <p className="text-sm text-muted-foreground">
              Questa funzionalità sarà disponibile presto
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
