"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLocation, searchPlaces, getPlaceDetails } from "@/app/actions/locations";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Search } from "lucide-react";

export default function NewLocationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showNewClientForm, setShowNewClientForm] = useState(true);

  // Form state (SEO-focused)
  const [formData, setFormData] = useState({
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

    // Cliente
    newClient: true,
    client: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      clientType: "individual" as "individual" | "company",
    },
  });

  const handleSearchAddress = async () => {
    if (searchQuery.length < 3) return;

    setIsSearching(true);
    try {
      const results = await searchPlaces(searchQuery);
      setSearchResults(results.predictions || []);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la ricerca dell'indirizzo",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = async (placeId: string) => {
    try {
      const details = await getPlaceDetails(placeId);
      if (details?.result) {
        const result = details.result;

        // Estrai i componenti dell'indirizzo
        const addressComponents = result.address_components || [];
        const streetNumber = addressComponents.find((c: any) => c.types.includes("street_number"))?.long_name || "";
        const route = addressComponents.find((c: any) => c.types.includes("route"))?.long_name || "";
        const city = addressComponents.find((c: any) => c.types.includes("locality"))?.long_name || "";
        const province = addressComponents.find((c: any) => c.types.includes("administrative_area_level_2"))?.short_name || "";
        const postalCode = addressComponents.find((c: any) => c.types.includes("postal_code"))?.long_name || "";

        setFormData(prev => ({
          ...prev,
          businessName: result.name || prev.businessName,
          address: route,
          streetNumber,
          city,
          province,
          postalCode,
          latitude: result.geometry?.location?.lat,
          longitude: result.geometry?.location?.lng,
          placeId: result.place_id || "",
          phone: result.formatted_phone_number || prev.phone,
          website: result.website || prev.website,
        }));

        setSearchResults([]);
        setSearchQuery("");

        toast({
          title: "Indirizzo selezionato",
          description: "I dati dell'indirizzo sono stati compilati automaticamente",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il recupero dei dettagli dell'indirizzo",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await createLocation(formData);

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
        title="Aggiungi Nuova Location"
        description="Crea una nuova sede SEO per il tuo cliente"
      />

      <div className="flex-1 p-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-4xl space-y-6">
          {/* Sezione Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Cliente</CardTitle>
              <CardDescription>
                Inserisci i dettagli del proprietario o cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome *</Label>
                  <Input
                    id="firstName"
                    required
                    value={formData.client.firstName}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        client: { ...prev.client, firstName: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Cognome *</Label>
                  <Input
                    id="lastName"
                    required
                    value={formData.client.lastName}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        client: { ...prev.client, lastName: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.client.email}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        client: { ...prev.client, email: e.target.value },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Telefono</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    value={formData.client.phone}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        client: { ...prev.client, phone: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sezione Ricerca Indirizzo */}
          <Card>
            <CardHeader>
              <CardTitle>Cerca Indirizzo</CardTitle>
              <CardDescription>
                Usa Google Places per trovare l'indirizzo esatto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca un indirizzo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchAddress();
                      }
                    }}
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  onClick={handleSearchAddress}
                  disabled={isSearching || searchQuery.length < 3}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Cerca"
                  )}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.place_id}
                      type="button"
                      onClick={() => handleSelectPlace(result.place_id)}
                      className="w-full rounded-lg border p-3 text-left hover:bg-accent"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {result.structured_formatting.main_text}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {result.structured_formatting.secondary_text}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
            <Button type="submit" disabled={isSubmitting}>
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
