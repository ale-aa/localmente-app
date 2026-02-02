"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Users, Plus, Trash2, Loader2, Mail, Phone } from "lucide-react";
import { getClients, deleteClient, type ClientWithLocations } from "@/app/actions/clients";
import { CreateClientDialog } from "@/components/clients/create-client-dialog";

export default function ClientsPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientWithLocations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientWithLocations | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carica i clienti
  const loadClients = async () => {
    setIsLoading(true);
    try {
      const result = await getClients();
      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
      } else {
        setClients(result.clients || []);
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile caricare i clienti",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Gestione eliminazione cliente
  const handleDelete = async () => {
    if (!selectedClient) return;

    setIsDeleting(true);
    try {
      const result = await deleteClient(selectedClient.id);

      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Cliente eliminato",
          description: "Il cliente è stato eliminato con successo",
        });
        await loadClients();
        setDeleteDialogOpen(false);
        setSelectedClient(null);
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il cliente",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Apri dialog di eliminazione
  const openDeleteDialog = (client: ClientWithLocations) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  // Callback dopo creazione cliente
  const handleClientCreated = () => {
    setCreateDialogOpen(false);
    loadClients();
  };

  // Helper per ottenere le iniziali
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Helper per badge status
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      inactive: "secondary",
      archived: "destructive",
    };

    const labels: Record<string, string> = {
      active: "Attivo",
      inactive: "Inattivo",
      archived: "Archiviato",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col">
      <DashboardHeader
        title="Clienti"
        description="Gestisci l'anagrafica dei tuoi clienti"
        action={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Cliente
          </Button>
        }
      />

      <div className="flex-1 p-6">
        {isLoading ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Caricamento clienti...
              </p>
            </CardContent>
          </Card>
        ) : clients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Nessun cliente ancora</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Inizia aggiungendo il primo cliente alla tua agenzia
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Aggiungi Primo Cliente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead className="text-center">N. Sedi</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(client.first_name, client.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {client.first_name} {client.last_name}
                          </div>
                          {client.city && (
                            <div className="text-xs text-muted-foreground">
                              {client.city}
                              {client.province && `, ${client.province}`}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.email ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <a
                            href={`mailto:${client.email}`}
                            className="hover:underline"
                          >
                            {client.email}
                          </a>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.phone || client.mobile ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <a
                            href={`tel:${client.phone || client.mobile}`}
                            className="hover:underline"
                          >
                            {client.phone || client.mobile}
                          </a>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{client.locations_count}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(client.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteDialog(client)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Dialog creazione cliente */}
      <CreateClientDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onClientCreated={handleClientCreated}
      />

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il cliente{" "}
              <strong>
                {selectedClient?.first_name} {selectedClient?.last_name}
              </strong>
              ? Questa azione non può essere annullata.
              {selectedClient && selectedClient.locations_count > 0 && (
                <div className="mt-2 rounded bg-destructive/10 p-2 text-sm text-destructive">
                  Attenzione: Questo cliente ha {selectedClient.locations_count}{" "}
                  sede/i collegata/e.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                "Elimina"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
