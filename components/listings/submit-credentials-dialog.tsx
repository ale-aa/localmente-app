"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { submitListingCredentials, type ListingCredentials } from "@/app/actions/listings";
import { Loader2, Lock, AlertCircle } from "lucide-react";

interface SubmitCredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: string;
  directoryId: string;
  directoryName: string;
  onSuccess?: () => void;
}

export function SubmitCredentialsDialog({
  open,
  onOpenChange,
  locationId,
  directoryId,
  directoryName,
  onSuccess,
}: SubmitCredentialsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<ListingCredentials>({
    username: "",
    password: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Valida che ci sia almeno username o password
    if (!credentials.username && !credentials.password) {
      toast({
        title: "Dati mancanti",
        description: "Inserisci almeno username o password",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { success, error, message } = await submitListingCredentials(
        locationId,
        directoryId,
        credentials
      );

      if (error) {
        toast({
          title: "Errore",
          description: error,
          variant: "destructive",
        });
        return;
      }

      if (success) {
        toast({
          title: "Credenziali inviate",
          description: message || "Le credenziali sono state salvate con successo",
        });

        // Chiudi dialog e reset form
        onOpenChange(false);
        setCredentials({ username: "", password: "", notes: "" });

        // Callback per ricaricare i dati
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'invio delle credenziali",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Inserisci Dati Accesso
          </DialogTitle>
          <DialogDescription>
            Fornisci le credenziali per accedere a <strong>{directoryName}</strong>.
            Il nostro team le userà per aggiornare il tuo listing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Alert Sicurezza */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Privacy garantita:</strong> I tuoi dati sono crittografati e visibili solo
              al nostro team di gestione listing.
            </div>
          </div>

          {/* Username/Email */}
          <div className="space-y-2">
            <Label htmlFor="username">Username o Email</Label>
            <Input
              id="username"
              type="text"
              placeholder="mario@esempio.it"
              value={credentials.username}
              onChange={(e) =>
                setCredentials({ ...credentials, username: e.target.value })
              }
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={credentials.password}
              onChange={(e) =>
                setCredentials({ ...credentials, password: e.target.value })
              }
            />
          </div>

          {/* Note aggiuntive */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note aggiuntive (opzionale)</Label>
            <Textarea
              id="notes"
              placeholder="Es: Il codice 2FA arriva via SMS a Mario, oppure: Usa il profilo aziendale"
              value={credentials.notes}
              onChange={(e) =>
                setCredentials({ ...credentials, notes: e.target.value })
              }
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Aggiungi qualsiasi informazione utile per il nostro team (es. 2FA, accesso
              condiviso, ecc.)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Invia Credenziali
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
