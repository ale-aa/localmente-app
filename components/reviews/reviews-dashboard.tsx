"use client";

import { useState } from "react";
import { ReviewCard } from "./review-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, Sparkles, RefreshCw } from "lucide-react";
import { seedReviews } from "@/app/actions/reviews";
import { syncReviewsFromGoogle } from "@/app/actions/reviews-sync";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface ReviewsDashboardProps {
  locationId: string;
  initialReviews: any[];
}

export function ReviewsDashboard({ locationId, initialReviews }: ReviewsDashboardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "pending" | "negative">("all");
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSeedReviews = async () => {
    setIsSeeding(true);
    try {
      const result = await seedReviews(locationId);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: "Recensioni generate!",
        description: `${result.count} recensioni di test sono state create.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la generazione delle recensioni",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSyncReviews = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await syncReviewsFromGoogle(locationId);

      if (error) {
        toast({
          title: "Errore durante la sincronizzazione",
          description: error,
          variant: "destructive",
        });
        return;
      }

      if (data) {
        if (data.success) {
          toast({
            title: "Sincronizzazione completata!",
            description: `${data.synced} nuove recensioni sincronizzate, ${data.updated} recensioni aggiornate.`,
          });
          router.refresh();
        } else {
          toast({
            title: "Sincronizzazione completata con errori",
            description: `${data.synced + data.updated} recensioni sincronizzate, ma ${data.errors} errori riscontrati.`,
            variant: "destructive",
          });
          if (data.errorMessages && data.errorMessages.length > 0) {
            console.error("[Sync] Errori:", data.errorMessages);
          }
          router.refresh();
        }
      }
    } catch (error: any) {
      toast({
        title: "Errore imprevisto",
        description: error.message || "Errore durante la sincronizzazione delle recensioni",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredReviews = initialReviews.filter((review) => {
    if (filter === "pending") return review.status === "pending";
    if (filter === "negative") return review.star_rating <= 2;
    return true;
  });

  const stats = {
    total: initialReviews.length,
    pending: initialReviews.filter((r) => r.status === "pending").length,
    negative: initialReviews.filter((r) => r.star_rating <= 2).length,
  };

  return (
    <div className="space-y-6">
      {/* Header con filtri */}
      <div className="flex items-center justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">
              Tutte ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Da Rispondere ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="negative">
              Negative ({stats.negative})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSyncReviews}
            disabled={isSyncing}
            variant="default"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Sincronizzazione..." : "Sincronizza Recensioni"}
          </Button>

          {initialReviews.length === 0 && (
            <Button
              onClick={handleSeedReviews}
              disabled={isSeeding || isSyncing}
              variant="outline"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isSeeding ? "Generazione..." : "Genera Recensioni Test"}
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar durante la sincronizzazione */}
      {isSyncing && (
        <div className="space-y-2">
          <Progress value={undefined} className="h-2" />
          <p className="text-xs text-center text-muted-foreground">
            Sincronizzazione recensioni da Google Business Profile in corso...
          </p>
        </div>
      )}

      {/* Lista recensioni */}
      {filteredReviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">
              {filter === "all" && "Nessuna recensione"}
              {filter === "pending" && "Nessuna recensione da rispondere"}
              {filter === "negative" && "Nessuna recensione negativa"}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {filter === "all" && "Genera alcune recensioni di test per iniziare"}
              {filter === "pending" && "Tutte le recensioni hanno già una risposta"}
              {filter === "negative" && "Non ci sono recensioni negative al momento"}
            </p>
            {filter === "all" && initialReviews.length === 0 && (
              <Button
                onClick={handleSeedReviews}
                disabled={isSeeding}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isSeeding ? "Generazione..." : "Genera Recensioni Test"}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
