import { useEffect, useState, type ReactNode } from "react";
import { API_BASE_URL } from "../../config";
import { useModules } from "../../hooks/useModules";
import {
  IconAppearance,
  IconCard,
  IconChevronDown,
  IconClock,
  IconCustomers,
  IconDashboard,
  IconDocument,
  IconEstablishment,
  IconExternalLink,
  IconGlobe,
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
  | "avis-google"
  | "stripe"
  | "blog"
  | "multilingue";

// Produits/Commandes/Clients n'existent que via le module Catalogue (un client n'apparaît que
// s'il a passé commande) — pas de module "customers" séparé, voir docs/04-catalogue-modules.md.
// Exporté : AdminPage.tsx et CustomerDetailPage.tsx s'en servent pour bloquer l'accès direct par URL.
export const CATALOGUE_SECTIONS: AdminSection[] = ["products", "orders", "customers"];

// Même principe que CATALOGUE_SECTIONS, un seul écran ici (voir docs/12-plan-modules-restants.md).
export const RDV_SECTIONS: AdminSection[] = ["rdv"];
export const NEWSLETTER_SECTIONS: AdminSection[] = ["newsletter"];
export const AVIS_GOOGLE_SECTIONS: AdminSection[] = ["avis-google"];
export const STRIPE_SECTIONS: AdminSection[] = ["stripe"];
export const BLOG_SECTIONS: AdminSection[] = ["blog"];
export const MULTILINGUE_SECTIONS: AdminSection[] = ["multilingue"];

type NavLeaf = { kind: "leaf"; id: AdminSection; label: string; icon: typeof IconDashboard };
type NavGroup = { kind: "group"; id: string; label: string; icon: typeof IconDashboard; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

const leaf = (id: AdminSection, label: string, icon: typeof IconDashboard): NavLeaf => ({ kind: "leaf", id, label, icon });

// La sidebar comptait 14 entrées à plat (signalé par Ethan comme trop chargé) — regroupées en deux
// sous-menus repliables ("Site" et "Modules"), chevron qui pivote pour indiquer l'état, tableau de
// bord/messages restent en accès direct. Voir docs/05-roadmap-poc.md.
const NAV_ITEMS: NavEntry[] = [
  leaf("dashboard", "Tableau de bord", IconDashboard),
  leaf("establishment", "Établissement", IconEstablishment),
  {
    kind: "group",
    id: "group-site",
    label: "Site",
    icon: IconAppearance,
    children: [leaf("site", "Site internet", IconAppearance), leaf("offers", "Offres", IconOffers)],
  },
  {
    kind: "group",
    id: "group-modules",
    label: "Modules",
    icon: IconModules,
    children: [
      leaf("modules", "Modules", IconModules),
      leaf("blog", "Blog", IconDocument),
      leaf("products", "Produits", IconProducts),
      leaf("orders", "Commandes", IconOrders),
      leaf("customers", "Clients", IconCustomers),
      leaf("rdv", "Rendez-vous", IconClock),
      leaf("newsletter", "Newsletter", IconMail),
      leaf("avis-google", "Avis Google", IconStar),
      leaf("stripe", "Paiement Stripe", IconCard),
      leaf("multilingue", "Multilingue", IconGlobe),
    ],
  },
  leaf("messages", "Messages", IconMessages),
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
  const stripeActive = Boolean(modules?.stripe?.enabled);
  const blogActive = Boolean(modules?.blog?.enabled);

  const isSectionVisible = (id: AdminSection) =>
    (!CATALOGUE_SECTIONS.includes(id) || catalogueActive) &&
    (!RDV_SECTIONS.includes(id) || rdvActive) &&
    (!NEWSLETTER_SECTIONS.includes(id) || newsletterActive) &&
    (!AVIS_GOOGLE_SECTIONS.includes(id) || avisGoogleActive) &&
    (!STRIPE_SECTIONS.includes(id) || stripeActive) &&
    (!BLOG_SECTIONS.includes(id) || blogActive);

  // Un groupe contenant la section active s'ouvre automatiquement (calculé une seule fois au
  // montage : la navigation entre sections recharge la page — voir sectionHref — donc pas besoin
  // de resynchroniser cet état après coup, un nouveau montage suffit).
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const entry of NAV_ITEMS) {
      if (entry.kind === "group" && entry.children.some((c) => c.id === activeSection)) {
        initial.add(entry.id);
      }
    }
    return initial;
  });

  const toggleGroup = (id: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/content`)
      .then((res) => res.json())
      .then((data: { siteName: string }) => setSiteName(data.siteName))
      .catch(() => {});
  }, [clientSiteId]);

  const visibleEntries = NAV_ITEMS.map((entry) =>
    entry.kind === "leaf" ? entry : { ...entry, children: entry.children.filter((c) => isSectionVisible(c.id)) }
  ).filter((entry) => (entry.kind === "leaf" ? isSectionVisible(entry.id) : entry.children.length > 0));

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
          {visibleEntries.map((entry) => {
            if (entry.kind === "leaf") {
              const isActive = entry.id === activeSection;
              const Icon = entry.icon;
              return (
                <a
                  key={entry.id}
                  href={sectionHref(clientSiteId, entry.id)}
                  className={`flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "text-green-accent" : ""}`} />
                  {entry.label}
                </a>
              );
            }

            const isExpanded = expandedGroups.has(entry.id);
            const groupHasActive = entry.children.some((c) => c.id === activeSection);
            const GroupIcon = entry.icon;

            return (
              <div key={entry.id} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggleGroup(entry.id)}
                  className={`flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-medium transition-colors ${
                    groupHasActive ? "text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <GroupIcon className={`h-5 w-5 ${groupHasActive ? "text-green-accent" : ""}`} />
                  <span className="flex-1 text-left">{entry.label}</span>
                  <IconChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                {isExpanded && (
                  <div className="ml-4 flex flex-col gap-1 border-l border-white/10 py-1 pl-3">
                    {entry.children.map((child) => {
                      const isActive = child.id === activeSection;
                      const ChildIcon = child.icon;
                      return (
                        <a
                          key={child.id}
                          href={sectionHref(clientSiteId, child.id)}
                          className={`flex items-center gap-3 rounded-button px-3 py-2 text-sm font-medium transition-colors ${
                            isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <ChildIcon className={`h-4 w-4 ${isActive ? "text-green-accent" : ""}`} />
                          {child.label}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
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
