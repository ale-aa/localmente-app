"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createAgency, generateSlug } from "@/app/actions/onboarding";
import { getUserProfile } from "@/app/actions/auth";
import { Building2, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const { toast } = useToast();

  // Controlla se l'utente ha già un'agenzia
  useEffect(() => {
    async function checkProfile() {
      const profile = await getUserProfile();

      if (profile?.agency_id) {
        // L'utente ha già un'agenzia, redirect alla dashboard
        router.push("/dashboard");
      } else {
        setIsCheckingProfile(false);
      }
    }

    checkProfile();
  }, [router]);

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (name.length > 2) {
      setIsGeneratingSlug(true);
      const newSlug = await generateSlug(name);
      setSlug(newSlug);
      setIsGeneratingSlug(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createAgency(formData);

    if (result?.error) {
      const errorMessage = typeof result.error === 'string'
        ? result.error
        : result.error.general || "Errore durante la creazione dell'agenzia";

      setError(errorMessage);
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
    // Se non c'è errore, il redirect avverrà automaticamente
  };

  // Mostra loading mentre controlla il profilo
  if (isCheckingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifica in corso...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Crea la tua agenzia</CardTitle>
            <CardDescription>
              Configura i dettagli della tua agenzia per iniziare
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Nome Agenzia *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Es: Agenzia Immobiliare Roma Centro"
                  required
                  onChange={handleNameChange}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="slug">
                  URL Personalizzato *
                  {isGeneratingSlug && (
                    <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
                  )}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    app.localmentesrl.it/
                  </span>
                  <Input
                    id="slug"
                    name="slug"
                    type="text"
                    placeholder="agenzia-roma"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Solo lettere minuscole, numeri e trattini
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatNumber">Partita IVA</Label>
                <Input
                  id="vatNumber"
                  name="vatNumber"
                  type="text"
                  placeholder="IT12345678901"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+39 06 1234567"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email Agenzia</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="info@tuaagenzia.it"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Indirizzo</Label>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  placeholder="Via del Corso, 123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Città</Label>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  placeholder="Roma"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  name="province"
                  type="text"
                  placeholder="RM"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">CAP</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  type="text"
                  placeholder="00100"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione in corso...
                </>
              ) : (
                "Crea Agenzia e Inizia"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
