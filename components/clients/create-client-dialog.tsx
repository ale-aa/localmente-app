"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { createClient, updateClient, type ClientWithLocations } from "@/app/actions/clients";

// Schema di validazione
const clientFormSchema = z
  .object({
    clientType: z.enum(["individual", "company"]).default("individual"),
    // Per privati
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    // Per aziende
    companyName: z.string().optional(),
    // Comuni
    email: z
      .string()
      .email("Email non valida")
      .or(z.literal(""))
      .optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
    fiscalCode: z.string().optional(),
    vatNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.clientType === "individual") {
        return data.firstName && data.firstName.length >= 2 && data.lastName && data.lastName.length >= 2;
      }
      if (data.clientType === "company") {
        return data.companyName && data.companyName.length >= 2;
      }
      return true;
    },
    {
      message: "Compilare i campi obbligatori",
      path: ["clientType"],
    }
  );

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: () => void;
  client?: ClientWithLocations | null; // Se presente, modalità Edit
}

export function CreateClientDialog({
  open,
  onOpenChange,
  onClientCreated,
  client = null, // Default null = modalità Create
}: CreateClientDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determina se siamo in modalità Edit
  const isEditMode = !!client;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      clientType: "individual",
      firstName: "",
      lastName: "",
      companyName: "",
      email: "",
      phone: "",
      mobile: "",
      fiscalCode: "",
      vatNumber: "",
      address: "",
      city: "",
      province: "",
      postalCode: "",
      notes: "",
    },
  });

  const clientType = watch("clientType");

  // Pre-popola il form quando client cambia (modalità Edit)
  useEffect(() => {
    if (client) {
      const clientTypeValue = client.client_type || "individual";

      setValue("clientType", clientTypeValue);

      if (clientTypeValue === "company") {
        // Per le aziende, il nome dell'azienda è salvato in first_name
        setValue("companyName", client.first_name || "");
      } else {
        // Per i privati
        setValue("firstName", client.first_name || "");
        setValue("lastName", client.last_name || "");
      }

      setValue("email", client.email || "");
      setValue("phone", client.phone || "");
      setValue("mobile", client.mobile || "");
      setValue("fiscalCode", client.fiscal_code || "");
      setValue("vatNumber", client.vat_number || "");
      setValue("address", client.address || "");
      setValue("city", client.city || "");
      setValue("province", client.province || "");
      setValue("postalCode", client.postal_code || "");
      setValue("notes", client.notes || "");
    }
  }, [client, setValue]);

  const onSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);

    try {
      let result;

      if (isEditMode && client) {
        // Modalità Edit: aggiorna cliente esistente
        result = await updateClient(client.id, data);

        if (result.error) {
          toast({
            title: "Errore",
            description: result.error,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Cliente aggiornato",
            description: "Le modifiche sono state salvate con successo",
          });
          reset();
          onClientCreated(); // Ricarica i dati
        }
      } else {
        // Modalità Create: crea nuovo cliente
        result = await createClient(data);

        if (result.error) {
          toast({
            title: "Errore",
            description: result.error,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Cliente creato",
            description: "Il cliente è stato creato con successo",
          });
          reset();
          onClientCreated();
        }
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: isEditMode
          ? "Si è verificato un errore durante l'aggiornamento del cliente"
          : "Si è verificato un errore durante la creazione del cliente",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Modifica Cliente" : "Nuovo Cliente"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Modifica i dati del cliente. I campi obbligatori sono contrassegnati con *."
              : "Inserisci i dati del nuovo cliente. I campi obbligatori sono contrassegnati con *."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Tipo Cliente */}
          <div className="space-y-2">
            <Label htmlFor="clientType">Tipo Cliente *</Label>
            <Select
              value={clientType}
              onValueChange={(value) =>
                setValue("clientType", value as "individual" | "company")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona il tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Privato</SelectItem>
                <SelectItem value="company">Azienda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dati Anagrafici */}
          {clientType === "individual" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  placeholder="Mario"
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Cognome *</Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  placeholder="Rossi"
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="companyName">Ragione Sociale *</Label>
              <Input
                id="companyName"
                {...register("companyName")}
                placeholder="Acme S.r.l."
              />
              {errors.companyName && (
                <p className="text-sm text-destructive">
                  {errors.companyName.message}
                </p>
              )}
            </div>
          )}

          {/* Contatti */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="mario.rossi@email.it"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                id="phone"
                type="tel"
                {...register("phone")}
                placeholder="+39 06 12345678"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mobile">Cellulare</Label>
              <Input
                id="mobile"
                type="tel"
                {...register("mobile")}
                placeholder="+39 333 1234567"
              />
            </div>

            {clientType === "individual" ? (
              <div className="space-y-2">
                <Label htmlFor="fiscalCode">Codice Fiscale</Label>
                <Input
                  id="fiscalCode"
                  {...register("fiscalCode")}
                  placeholder="RSSMRA80A01H501X"
                  maxLength={16}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="vatNumber">Partita IVA</Label>
                <Input
                  id="vatNumber"
                  {...register("vatNumber")}
                  placeholder="12345678901"
                  maxLength={11}
                />
              </div>
            )}
          </div>

          {/* Indirizzo */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Indirizzo (Opzionale)</h3>

            <div className="space-y-2">
              <Label htmlFor="address">Via</Label>
              <Input
                id="address"
                {...register("address")}
                placeholder="Via Roma, 123"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">Città</Label>
                <Input
                  id="city"
                  {...register("city")}
                  placeholder="Milano"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input
                  id="province"
                  {...register("province")}
                  placeholder="MI"
                  maxLength={2}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    setValue("province", value);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">CAP</Label>
                <Input
                  id="postalCode"
                  {...register("postalCode")}
                  placeholder="20100"
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Note aggiuntive sul cliente..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Salvataggio..." : "Creazione..."}
                </>
              ) : (
                isEditMode ? "Salva Modifiche" : "Crea Cliente"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
