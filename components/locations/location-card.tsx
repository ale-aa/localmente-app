"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteLocation } from "@/app/actions/locations";
import { Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface LocationCardProps {
  location: any;
}

export function LocationCard({ location }: LocationCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteLocation(location.id);

      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sede Eliminata",
        description: result.message || "La sede è stata eliminata con successo",
      });

      setShowDeleteDialog(false);
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="h-full transition-colors hover:bg-accent group relative">
        <Link href={`/dashboard/locations/${location.id}`} className="block">
          <CardHeader>
            <CardTitle className="text-lg pr-10">{location.business_name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {location.address}, {location.city}
              </p>
              {location.category && (
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-1 text-xs font-medium">
                    {location.category}
                  </span>
                </div>
              )}
              {location.phone && (
                <p className="text-xs text-muted-foreground">📞 {location.phone}</p>
              )}
              {location.owner && (
                <p className="text-xs text-muted-foreground">
                  👤 {location.owner.first_name} {location.owner.last_name}
                </p>
              )}
            </div>
          </CardContent>
        </Link>

        {/* Bottone Elimina (visibile solo all'hover) */}
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Dialog di Conferma Eliminazione */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Stai per eliminare definitivamente la sede{" "}
                <span className="font-semibold">{location.business_name}</span>.
              </p>
              <p className="text-destructive font-medium">
                ⚠️ Verranno eliminati anche tutti i dati associati:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Scansioni Rank Tracker</li>
                <li>Risultati delle scansioni</li>
                <li>Storico posizionamenti</li>
              </ul>
              <p className="font-medium">Questa azione non può essere annullata.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina Definitivamente
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
