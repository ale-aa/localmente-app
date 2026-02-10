"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLocation } from "@/app/actions/locations";
import { getClients, type ClientWithLocations } from "@/app/actions/clients";
import { getUserTypeAction } from "@/app/actions/user";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, ExternalLink } from "lucide-react";
import { AddressAutocomplete } from "@/components/address-autocomplete";

export default function NewLocationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clients, setClients] = useState<ClientWithLocations[]>([]);
  const [userType, setUserType] = useState<"agency" | "business">("agency");

  // Form state (SEO-focused)
  const [formData, setFormData] = useState({
    // Cliente (OBBLIGATORIO)
    clientId: "",

    // NAP Data (Source of Truth)
    businessName: "",
    phone: "",
    email: "",
    website: "",

    // Address
    address: "",
    streetNumber: "",
    city: "",
    province: "",
    postalCode: "",

    // Geo Coordinates
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,

    // Metadata
    category: "",
    description: "",
    placeId: "",
  });

  // Carica user type e clienti all'avvio
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingClients(true);
      try {
        // Carica il tipo di utente
        const type = await getUserTypeAction();
        setUserType(type);

        // Solo gli agency users vedono e caricano i clienti
        if (type === "agency") {
          const result = await getClients();
          if (result.error) {
            toast({
              title: "Errore",
              description: "Impossibile caricare la lista clienti",
              variant: "destructive",
            });
          } else {
            setClients(result.clients || []);
          }
        }
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile caricare i dati",
          variant: "destructive",
        });
      } finally {
        setIsLoadingClients(false);
      }
    };

    loadData();
  }, [toast]);

  const handleAddressSelect = (details: {
    businessName?: string;
    address: string;
    streetNumber: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    latitude: number;
    longitude: number;
    placeId: string;
    phone?: string;
    website?: string;
  }) => {
    setFormData(prev => ({
      ...prev,
      businessName: details.businessName || prev.businessName,
      address: details.address,
      streetNumber: details.streetNumber,
      city: details.city,
      province: details.province,
      postalCode: details.postalCode,
      latitude: details.latitude,
      longitude: details.longitude,
      placeId: details.placeId,
      phone: details.phone || prev.phone,
      website: details.website || prev.website,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validazione cliente (solo per agency users)
    if (userType === "agency" && !formData.clientId) {
      toast({
        title: "Cliente obbligatorio",
        description: "Seleziona un cliente per associare questa sede",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createLocation({
        ...formData,
        newClient: false,
      });

      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Successo",
        description: "La sede è stata creata con successo",
      });

      router.push("/dashboard/locations");
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione della sede",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col">
      <DashboardHeader
        title="Aggiungi Nuova Sede"
        description={
          userType === "business"
            ? "Crea una nuova sede per la tua attività"
            : "Crea una nuova sede SEO per il tuo cliente"
        }
      />

      <div className="flex-1 p-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
          {/* Sezione Selezione Cliente (solo per agency users) */}
          {userType === "agency" && (
            <Card>
              <CardHeader>
                <CardTitle>Assegna al Cliente *</CardTitle>
                <CardDescription>
                  Seleziona il cliente proprietario di questa sede
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              {isLoadingClients ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Caricamento clienti...
                  </span>
                </div>
              ) : clients.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <UserPlus className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    Nessun cliente disponibile
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Devi prima creare un cliente prima di aggiungere una sede
                  </p>
                  <Link href="/dashboard/clients">
                    <Button type="button">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Vai a Gestione Clienti
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Cliente *</Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={(value) =>
                        setFormData(prev => ({ ...prev, clientId: value }))
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {client.first_name} {client.last_name}
                              </span>
                              {client.city && (
                                <span className="text-xs text-muted-foreground">
                                  • {client.city}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                ({client.locations_count}{" "}
                                {client.locations_count === 1 ? "sede" : "sedi"})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">
                      Non trovi il cliente?{" "}
                      <Link
                        href="/dashboard/clients"
                        className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Crea un nuovo cliente
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Sezione Ricerca Indirizzo con Google Places */}
          <Card>
            <CardHeader>
              <CardTitle>Cerca Indirizzo</CardTitle>
              <CardDescription>
                Usa Google Places per trovare l'indirizzo esatto e compilare automaticamente i campi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                placeholder="Cerca un indirizzo (es: Pizzeria Da Mario, Milano)..."
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Inizia a digitare per vedere i suggerimenti reali da Google Places
              </p>
            </CardContent>
          </Card>

          {/* Sezione NAP (Name, Address, Phone) - Source of Truth */}
          <Card>
            <CardHeader>
              <CardTitle>Dati NAP - Source of Truth</CardTitle>
              <CardDescription>
                Nome, Indirizzo e Telefono dell'attività (base per sincronizzazione listing)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Business Name & Category */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nome Attività *</Label>
                  <Input
                    id="businessName"
                    required
                    placeholder="Es: Ristorante Da Mario"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    placeholder="Es: restaurant, hotel, store"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Categoria Google Business (opzionale)
                  </p>
                </div>
              </div>

              {/* Address */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address">Via *</Label>
                  <Input
                    id="address"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="streetNumber">Numero Civico</Label>
                  <Input
                    id="streetNumber"
                    value={formData.streetNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, streetNumber: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Città *</Label>
                  <Input
                    id="city"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Provincia *</Label>
                  <Input
                    id="province"
                    required
                    maxLength={2}
                    value={formData.province}
                    onChange={(e) => setFormData(prev => ({ ...prev, province: e.target.value.toUpperCase() }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">CAP</Label>
                  <Input
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                  />
                </div>
              </div>

              {/* Coordinate (hidden ma presenti) */}
              {formData.latitude && formData.longitude && (
                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ Coordinate GPS acquisite: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              {/* Phone, Email, Website */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+39 06 1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="info@attivita.it"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Sito Web</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://www.attivita.it"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  placeholder="Breve descrizione dell'attività..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Azioni */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.clientId || clients.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione...
                </>
              ) : (
                "Crea Sede"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
