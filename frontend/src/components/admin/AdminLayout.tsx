import { useEffect, useState, type ReactNode } from "react";
import { API_BASE_URL } from "../../config";
import { useModules } from "../../hooks/useModules";
import {
  IconAppearance,
  IconClock,
  IconCustomers,
  IconDashboard,
  IconEstablishment,
  IconExternalLink,
  IconMail,
  IconMessages,
  IconModules,
  IconOffers,
  IconOrders,
  IconProducts,
  IconStar,
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
  | "customers"
  | "rdv"
  | "newsletter"
  | "avis-google";

// Produits/Commandes/Clients n'existent que via le module Catalogue (un client n'apparaît que
// s'il a passé commande) — pas de module "customers" séparé, voir docs/04-catalogue-modules.md.
// Exporté : AdminPage.tsx et CustomerDetailPage.tsx s'en servent pour bloquer l'accès direct par URL.
export const CATALOGUE_SECTIONS: AdminSection[] = ["products", "orders", "customers"];

// Même principe que CATALOGUE_SECTIONS, un seul écran ici (voir docs/12-plan-modules-restants.md).
export const RDV_SECTIONS: AdminSection[] = ["rdv"];
export const NEWSLETTER_SECTIONS: AdminSection[] = ["newsletter"];
export const AVIS_GOOGLE_SECTIONS: AdminSection[] = ["avis-google"];

const NAV_ITEMS: { id: AdminSection; label: string; icon: typeof IconDashboard }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: IconDashboard },
  { id: "site", label: "Site internet", icon: IconAppearance },
  { id: "offers", label: "Offres", icon: IconOffers },
  { id: "establishment", label: "Établissement", icon: IconEstablishment },
  { id: "modules", label: "Modules", icon: IconModules },
  { id: "products", label: "Produits", icon: IconProducts },
  { id: "orders", label: "Commandes", icon: IconOrders },
  { id: "customers", label: "Clients", icon: IconCustomers },
  { id: "rdv", label: "Rendez-vous", icon: IconClock },
  { id: "newsletter", label: "Newsletter", icon: IconMail },
  { id: "avis-google", label: "Avis Google", icon: IconStar },
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
  const rdvActive = Boolean(modules?.rdv?.enabled);
  const newsletterActive = Boolean(modules?.newsletter?.enabled);
  const avisGoogleActive = Boolean(modules?.["avis-google"]?.enabled);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/content`)
      .then((res) => res.json())
      .then((data: { siteName: string }) => setSiteName(data.siteName))
      .catch(() => {});
  }, [clientSiteId]);

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      (!CATALOGUE_SECTIONS.includes(item.id) || catalogueActive) &&
      (!RDV_SECTIONS.includes(item.id) || rdvActive) &&
      (!NEWSLETTER_SECTIONS.includes(item.id) || newsletterActive) &&
      (!AVIS_GOOGLE_SECTIONS.includes(item.id) || avisGoogleActive)
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-y-auto bg-navy px-4 py-6">
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
