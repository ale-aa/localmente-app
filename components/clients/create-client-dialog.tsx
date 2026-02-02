"use client";

import { useState } from "react";
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
import { createClient } from "@/app/actions/clients";

// Schema di validazione
const clientFormSchema = z.object({
  firstName: z.string().min(2, "Il nome deve contenere almeno 2 caratteri"),
  lastName: z.string().min(2, "Il cognome deve contenere almeno 2 caratteri"),
  email: z
    .string()
    .email("Email non valida")
    .or(z.literal(""))
    .optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  fiscalCode: z.string().optional(),
  vatNumber: z.string().optional(),
  clientType: z.enum(["individual", "company"]).default("individual"),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

interface CreateClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: () => void;
}

export function CreateClientDialog({
  open,
  onOpenChange,
  onClientCreated,
}: CreateClientDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const onSubmit = async (data: ClientFormValues) => {
    setIsSubmitting(true);

    try {
      const result = await createClient(data);

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
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la creazione del cliente",
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
          <DialogTitle>Nuovo Cliente</DialogTitle>
          <DialogDescription>
            Inserisci i dati del nuovo cliente. I campi obbligatori sono contrassegnati con *.
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
                  Creazione...
                </>
              ) : (
                "Crea Cliente"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
