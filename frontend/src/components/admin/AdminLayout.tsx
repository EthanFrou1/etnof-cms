import { useEffect, useState, type ReactNode } from "react";
import { API_BASE_URL } from "../../config";
import { useModules } from "../../hooks/useModules";
import {
  IconAppearance,
  IconCustomers,
  IconDashboard,
  IconEstablishment,
  IconExternalLink,
  IconMessages,
  IconModules,
  IconOffers,
  IconOrders,
  IconProducts,
} from "./icons";

export type AdminSection =
  | "dashboard"
  | "site"
  | "offers"
  | "establishment"
  | "modules"
  | "messages"
  | "products"
  | "orders"
  | "customers";

// Produits/Commandes/Clients n'existent que via le module Catalogue (un client n'apparaît que
// s'il a passé commande) — pas de module "customers" séparé, voir docs/04-catalogue-modules.md.
// Exporté : AdminPage.tsx et CustomerDetailPage.tsx s'en servent pour bloquer l'accès direct par URL.
export const CATALOGUE_SECTIONS: AdminSection[] = ["products", "orders", "customers"];

const NAV_ITEMS: { id: AdminSection; label: string; icon: typeof IconDashboard }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: IconDashboard },
  { id: "site", label: "Site internet", icon: IconAppearance },
  { id: "offers", label: "Offres", icon: IconOffers },
  { id: "establishment", label: "Établissement", icon: IconEstablishment },
  { id: "modules", label: "Modules", icon: IconModules },
  { id: "products", label: "Produits", icon: IconProducts },
  { id: "orders", label: "Commandes", icon: IconOrders },
  { id: "customers", label: "Clients", icon: IconCustomers },
  { id: "messages", label: "Messages", icon: IconMessages },
];

function sectionHref(clientSiteId: string, section: AdminSection) {
  return section === "dashboard" ? `/admin/${clientSiteId}` : `/admin/${clientSiteId}/${section}`;
}

type AdminLayoutProps = {
  clientSiteId: string;
  activeSection: AdminSection;
  children: ReactNode;
};

export default function AdminLayout({ clientSiteId, activeSection, children }: AdminLayoutProps) {
  const [siteName, setSiteName] = useState<string | null>(null);
  const modules = useModules(clientSiteId);
  const catalogueActive = Boolean(modules?.catalogue?.enabled);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/content`)
      .then((res) => res.json())
      .then((data: { siteName: string }) => setSiteName(data.siteName))
      .catch(() => {});
  }, [clientSiteId]);

  const visibleItems = NAV_ITEMS.filter((item) => !CATALOGUE_SECTIONS.includes(item.id) || catalogueActive);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col bg-navy px-4 py-6">
        <div className="px-2 pb-6">
          <span className="text-lg font-extrabold text-white">
            Admin<span className="text-green-accent">Pro</span>
          </span>
          <div className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-white/40">
            Établissement
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-white">
            {siteName ?? "…"}
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {visibleItems.map((item) => {
            const isActive = item.id === activeSection;
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={sectionHref(clientSiteId, item.id)}
                className={`flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-green-accent" : ""}`} />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="flex flex-col gap-1 border-t border-white/10 pt-4">
          <a
            href={`/t/${clientSiteId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white"
          >
            <IconExternalLink className="h-5 w-5" />
            Voir le site
          </a>
          <a
            href="/admin/dashboard"
            className="px-3 py-2 text-xs text-white/40 hover:text-white/70"
          >
            Vue globale agence
          </a>
        </div>
      </aside>

      <main className="flex-1 bg-bg-page-start px-8 py-8">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
