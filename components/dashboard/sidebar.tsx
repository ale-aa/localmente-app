"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  MapPin,
  Star,
  LogOut,
  Building2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions/auth";
import { getUserTypeAction } from "@/app/actions/user";

const allNavigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    visibleFor: ["agency", "business"] as const,
  },
  {
    name: "Clienti",
    href: "/dashboard/clients",
    icon: Users,
    visibleFor: ["agency"] as const, // Solo per agency
  },
  {
    name: "Sedi & Listings",
    href: "/dashboard/locations",
    icon: MapPin,
    visibleFor: ["agency", "business"] as const,
  },
  {
    name: "Rank Tracker",
    href: "/dashboard/rank-tracker",
    icon: TrendingUp,
    visibleFor: ["agency", "business"] as const,
  },
  {
    name: "Recensioni",
    href: "/dashboard/reviews",
    icon: Star,
    visibleFor: ["agency", "business"] as const,
  },
  {
    name: "Impostazioni",
    href: "/dashboard/settings",
    icon: Settings,
    visibleFor: ["agency", "business"] as const,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [userType, setUserType] = useState<"agency" | "business">("agency");
  const [isLoading, setIsLoading] = useState(true);

  // Recupera il user type al mount
  useEffect(() => {
    const fetchUserType = async () => {
      try {
        const type = await getUserTypeAction();
        setUserType(type);
      } catch (error) {
        console.error("Error fetching user type:", error);
        // Default ad agency
        setUserType("agency");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserType();
  }, []);

  // Filtra la navigazione in base al user type
  const navigation = allNavigation.filter((item) =>
    item.visibleFor.includes(userType)
  );

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Building2 className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold">Localmente</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="border-t p-4">
        <form action={logout}>
          <Button variant="ghost" className="w-full justify-start gap-2" type="submit">
            <LogOut className="h-5 w-5" />
            Esci
          </Button>
        </form>
      </div>
    </div>
  );
}
