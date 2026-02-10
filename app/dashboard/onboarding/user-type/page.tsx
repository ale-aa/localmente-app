"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserTypeSelector } from "@/components/onboarding/user-type-selector";
import { Button } from "@/components/ui/button";
import { updateUserTypeAction } from "@/app/actions/user";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight } from "lucide-react";

/**
 * Pagina di onboarding per la selezione del tipo di utente
 *
 * Questa pagina viene mostrata durante la registrazione o quando
 * un utente non ha ancora scelto il suo user_type.
 *
 * TODO: Integrare questa pagina nel flow di onboarding/registrazione
 *
 * PLACEHOLDER: Questa è una pagina di esempio. Per integrarla:
 * 1. Aggiungerla al flow di registrazione dopo la creazione dell'account
 * 2. Redirect automatico se user_type non è impostato
 * 3. Collegare con il processo di setup dell'agenzia/workspace
 */
export default function OnboardingUserTypePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<"agency" | "business" | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!selectedType) {
      toast({
        title: "Selezione obbligatoria",
        description: "Seleziona un tipo di account per continuare",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateUserTypeAction(selectedType);

      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Account configurato",
        description: `Il tuo account ${
          selectedType === "agency" ? "agenzia" : "business"
        } è stato configurato con successo`,
      });

      // Redirect alla dashboard
      router.push("/dashboard");
      router.refresh(); // Force refresh per ricaricare i dati con il nuovo user_type
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la configurazione",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-4xl space-y-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Localmente</h1>
          <p className="text-muted-foreground">Local SEO Management Platform</p>
        </div>

        {/* Selector */}
        <UserTypeSelector selectedType={selectedType} onSelect={setSelectedType} />

        {/* Action Button */}
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            disabled={!selectedType || isSubmitting}
            onClick={handleContinue}
            className="min-w-[200px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Configurazione...
              </>
            ) : (
              <>
                Continua
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Questo è un passaggio importante per personalizzare la tua esperienza.
            <br />
            Potrai sempre modificare questa scelta dalle impostazioni.
          </p>
        </div>
      </div>
    </div>
  );
}
