"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { connectBingAccountAction, checkBingConnectionStatus } from "@/app/actions/bing";
import { useSearchParams } from "next/navigation";

interface ConnectBingButtonProps {
  onConnectionChange?: (connected: boolean) => void;
}

export function ConnectBingButton({ onConnectionChange }: ConnectBingButtonProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Verifica lo stato della connessione al mount e gestisce i callback OAuth
  useEffect(() => {
    checkConnection();

    // Gestisci i messaggi di successo/errore dal callback OAuth
    const bingConnected = searchParams.get("bing_connected");
    const bingError = searchParams.get("bing_error");

    if (bingConnected === "true") {
      toast({
        title: "Account Bing collegato",
        description: "Il tuo account Microsoft Bing è stato collegato con successo",
      });
      setIsConnected(true);
      onConnectionChange?.(true);

      // Pulisci i query params dall'URL
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (bingError) {
      toast({
        title: "Errore collegamento Bing",
        description: decodeURIComponent(bingError),
        variant: "destructive",
      });

      // Pulisci i query params dall'URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [searchParams]);

  const checkConnection = async () => {
    setIsLoading(true);
    try {
      const result = await checkBingConnectionStatus();
      setIsConnected(result.connected);
      onConnectionChange?.(result.connected);
    } catch (error) {
      console.error("Errore verifica connessione Bing:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const result = await connectBingAccountAction();

      if (result.error) {
        toast({
          title: "Errore",
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      if (result.authUrl) {
        // Redirect alla pagina di autorizzazione Microsoft
        window.location.href = result.authUrl;
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile avviare il collegamento con Bing",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Button disabled size="sm" className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Caricamento...
      </Button>
    );
  }

  if (isConnected) {
    return (
      <Badge variant="default" className="gap-1 px-3 py-1.5">
        <CheckCircle2 className="h-3 w-3" />
        Account Bing Collegato
      </Badge>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      size="sm"
      className="gap-2"
    >
      {isConnecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Connessione...
        </>
      ) : (
        <>
          <ExternalLink className="h-4 w-4" />
          Collega Account Bing
        </>
      )}
    </Button>
  );
}
