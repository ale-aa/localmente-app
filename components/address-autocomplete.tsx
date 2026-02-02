"use client";

import { useEffect, useState } from "react";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddressDetails {
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
}

interface AddressAutocompleteProps {
  onAddressSelect: (details: AddressDetails) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AddressAutocomplete({
  onAddressSelect,
  placeholder = "Cerca un indirizzo...",
  disabled = false,
}: AddressAutocompleteProps) {
  const { toast } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Carica Google Maps API PRIMA di inizializzare usePlacesAutocomplete
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      toast({
        title: "Configurazione mancante",
        description: "La chiave API di Google Maps non è configurata",
        variant: "destructive",
      });
      return;
    }

    // Verifica se lo script è già stato caricato
    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Carica lo script di Google Maps
    const loadGoogleMaps = () => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=it`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        setIsLoaded(true);
      };

      script.onerror = () => {
        console.error("Errore caricamento Google Maps");
        toast({
          title: "Errore",
          description: "Impossibile caricare Google Maps",
          variant: "destructive",
        });
      };

      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, [toast]);

  // Se Google Maps non è ancora caricato, mostra solo il loading
  if (!isLoaded) {
    return (
      <div className="relative">
        <div className="relative">
          <Loader2 className="absolute left-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
          <Input
            disabled
            placeholder="Caricamento Google Maps..."
            className="pl-9"
            autoComplete="off"
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Caricamento Google Maps in corso...
        </p>
      </div>
    );
  }

  // Solo quando Google Maps è caricato, renderizza il componente con l'autocomplete
  return <AddressAutocompleteReady
    onAddressSelect={onAddressSelect}
    placeholder={placeholder}
    disabled={disabled}
  />;
}

// Componente separato che usa usePlacesAutocomplete solo quando Google Maps è già caricato
function AddressAutocompleteReady({
  onAddressSelect,
  placeholder,
  disabled,
}: AddressAutocompleteProps) {
  const { toast } = useToast();
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: "it" },
      language: "it",
    },
    debounce: 300,
  });

  const handleSelect = async (description: string, placeId: string) => {
    setValue(description, false);
    clearSuggestions();
    setIsLoadingDetails(true);

    try {
      // Ottieni geocode e coordinate
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);

      // Estrai i componenti dell'indirizzo
      const addressComponents = results[0].address_components;

      const streetNumber =
        addressComponents.find((c) => c.types.includes("street_number"))
          ?.long_name || "";
      const route =
        addressComponents.find((c) => c.types.includes("route"))?.long_name ||
        "";
      const city =
        addressComponents.find((c) => c.types.includes("locality"))
          ?.long_name || "";
      const province =
        addressComponents.find((c) =>
          c.types.includes("administrative_area_level_2")
        )?.short_name || "";
      const postalCode =
        addressComponents.find((c) => c.types.includes("postal_code"))
          ?.long_name || "";
      const country =
        addressComponents.find((c) => c.types.includes("country"))
          ?.long_name || "";

      // Ottieni dettagli aggiuntivi usando Places API
      const service = new google.maps.places.PlacesService(
        document.createElement("div")
      );

      service.getDetails(
        {
          placeId,
          fields: [
            "name",
            "formatted_phone_number",
            "website",
            "business_status",
          ],
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            const details: AddressDetails = {
              businessName: place.name,
              address: route,
              streetNumber,
              city,
              province,
              postalCode,
              country,
              latitude: lat,
              longitude: lng,
              placeId,
              phone: place.formatted_phone_number,
              website: place.website,
            };

            onAddressSelect(details);

            toast({
              title: "Indirizzo selezionato",
              description:
                "I dati dell'indirizzo sono stati compilati automaticamente",
            });
          } else {
            // Se non riesce a ottenere i dettagli, invia comunque i dati base
            const details: AddressDetails = {
              address: route,
              streetNumber,
              city,
              province,
              postalCode,
              country,
              latitude: lat,
              longitude: lng,
              placeId,
            };

            onAddressSelect(details);

            toast({
              title: "Indirizzo selezionato",
              description:
                "I dati dell'indirizzo sono stati compilati automaticamente",
            });
          }

          setIsLoadingDetails(false);
        }
      );
    } catch (error) {
      console.error("Errore durante la selezione dell'indirizzo:", error);
      toast({
        title: "Errore",
        description:
          "Si è verificato un errore durante il recupero dei dettagli dell'indirizzo",
        variant: "destructive",
      });
      setIsLoadingDetails(false);
    }
  };

  const isInputDisabled = !ready || disabled || isLoadingDetails;

  return (
    <div className="relative">
      <div className="relative">
        {isLoadingDetails ? (
          <Loader2 className="absolute left-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isInputDisabled}
          placeholder={
            isLoadingDetails
              ? "Recupero dettagli..."
              : placeholder
          }
          className="pl-9"
          autoComplete="off"
        />
      </div>

      {/* Dropdown dei suggerimenti */}
      {status === "OK" && data.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-80 overflow-y-auto p-1">
            {data.map((suggestion) => {
              const {
                place_id,
                structured_formatting: { main_text, secondary_text },
              } = suggestion;

              return (
                <button
                  key={place_id}
                  type="button"
                  onClick={() =>
                    handleSelect(suggestion.description, place_id)
                  }
                  className="flex w-full items-start gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium">{main_text}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {secondary_text}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
