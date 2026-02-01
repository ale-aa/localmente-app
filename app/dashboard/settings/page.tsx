import { Metadata } from "next";
import { GoogleIntegrationCard } from "@/components/settings/google-integration-card";

export const metadata: Metadata = {
  title: "Impostazioni | Localmente",
  description: "Gestisci le impostazioni e le integrazioni della tua agenzia",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
          <p className="text-muted-foreground">
            Gestisci le impostazioni e le integrazioni della tua agenzia
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Sezione Integrazioni */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Integrazioni</h2>
          <div className="grid gap-4">
            <GoogleIntegrationCard />
          </div>
        </div>

        {/* Altre sezioni future */}
        {/* <div>
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          ...
        </div> */}
      </div>
    </div>
  );
}
