"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Store, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserTypeSelectorProps {
  onSelect: (type: "agency" | "business") => void;
  selectedType?: "agency" | "business";
}

/**
 * Componente per la selezione del tipo di utente durante l'onboarding
 *
 * Permette all'utente di scegliere tra:
 * - Agency: Gestisce più clienti (vede la tab Clienti)
 * - Business: Gestisce solo la propria attività (non vede la tab Clienti)
 *
 * @example
 * ```tsx
 * <UserTypeSelector
 *   selectedType={userType}
 *   onSelect={(type) => setUserType(type)}
 * />
 * ```
 */
export function UserTypeSelector({ onSelect, selectedType }: UserTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<"agency" | "business" | null>(null);

  const options = [
    {
      type: "agency" as const,
      icon: Building2,
      title: "Sono un'Agenzia",
      description: "Gestisco più clienti e le loro sedi",
      features: [
        "Gestione multi-cliente",
        "Dashboard aggregata",
        "Report per cliente",
        "Team members",
      ],
    },
    {
      type: "business" as const,
      icon: Store,
      title: "Sono un'Attività Locale",
      description: "Gestisco solo la mia attività",
      features: [
        "Interfaccia semplificata",
        "Focus sulla tua sede",
        "Dashboard dedicata",
        "Setup rapido",
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Scegli il tipo di account</h2>
        <p className="text-muted-foreground">
          Seleziona l'opzione che meglio descrive il tuo business
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedType === option.type;
          const isHovered = hoveredType === option.type;

          return (
            <Card
              key={option.type}
              className={cn(
                "relative cursor-pointer transition-all duration-200 border-2",
                isSelected
                  ? "border-primary shadow-lg scale-105"
                  : "border-border hover:border-primary/50 hover:shadow-md",
                isHovered && !isSelected && "scale-102"
              )}
              onMouseEnter={() => setHoveredType(option.type)}
              onMouseLeave={() => setHoveredType(null)}
              onClick={() => onSelect(option.type)}
            >
              {/* Badge selezionato */}
              {isSelected && (
                <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Check className="h-5 w-5 text-primary-foreground" />
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div
                    className={cn(
                      "h-16 w-16 rounded-full flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-8 w-8" />
                  </div>
                </div>
                <CardTitle className="text-xl">{option.title}</CardTitle>
                <CardDescription>{option.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {option.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4 mt-0.5 flex-shrink-0",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  variant={isSelected ? "default" : "outline"}
                  className="w-full mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(option.type);
                  }}
                >
                  {isSelected ? "Selezionato" : "Seleziona"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedType && (
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Potrai cambiare questa impostazione in qualsiasi momento dalle{" "}
            <span className="font-medium text-foreground">Impostazioni</span>
          </p>
        </div>
      )}
    </div>
  );
}
