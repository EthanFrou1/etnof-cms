import { useState, type ReactNode } from "react";
import { clearSession } from "../../hooks/useAdminSession";
import {
  IconAppearance,
  IconCard,
  IconChevronDown,
  IconClose,
  IconCustomers,
  IconDashboard,
  IconDocument,
  IconEstablishment,
  IconInvoice,
  IconMenu,
  IconOffers,
  IconProducts,
} from "./icons";

export type AgencySection =
  | "dashboard"
  | "tarifs"
  | "sites"
  | "entreprise"
  | "clients"
  | "formules"
  | "devis"
  | "factures"
  | "paiement";

type NavLeaf = { kind: "leaf"; id: AgencySection; label: string; icon: typeof IconDashboard };
type NavGroup = { kind: "group"; id: string; label: string; icon: typeof IconDashboard; children: NavLeaf[] };
type NavEntry = NavLeaf | NavGroup;

const leaf = (id: AgencySection, label: string, icon: typeof IconDashboard): NavLeaf => ({ kind: "leaf", id, label, icon });

// Même pattern que AdminLayout.tsx (sidebar + groupe repliable) mais côté agence : plus de
// tenant/modules à charger ici, la nav est statique.
const NAV_ITEMS: NavEntry[] = [
  leaf("dashboard", "Tableau de bord", IconDashboard),
  leaf("tarifs", "Tarifs des modules", IconOffers),
  leaf("sites", "Sites clients", IconAppearance),
  {
    kind: "group",
    id: "group-facturation",
    label: "Facturation",
    icon: IconInvoice,
    children: [
      leaf("entreprise", "Entreprise", IconEstablishment),
      leaf("clients", "Clients", IconCustomers),
      leaf("formules", "Formules", IconProducts),
      leaf("devis", "Devis", IconDocument),
      leaf("factures", "Factures", IconInvoice),
      leaf("paiement", "Paiement", IconCard),
    ],
  },
];

function sectionHref(section: AgencySection) {
  return section === "dashboard" ? "/admin/dashboard" : `/admin/dashboard/${section}`;
}

type AgencyLayoutProps = {
  activeSection: AgencySection;
  children: ReactNode;
};

export default function AgencyLayout({ activeSection, children }: AgencyLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className={`${mobileMenuOpen ? "hidden" : "flex"} sticky top-0 z-30 items-center justify-between bg-navy px-4 py-3 lg:hidden`}>
        <span className="text-lg font-extrabold text-white">
          Admin<span className="text-green-accent">Pro</span>
        </span>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-button p-2 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Ouvrir le menu"
        >
          <IconMenu className="h-6 w-6" />
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`${mobileMenuOpen ? "flex" : "hidden"} fixed left-0 top-0 z-40 h-screen w-64 flex-col overflow-y-auto bg-navy px-4 py-6 lg:sticky lg:z-auto lg:flex lg:shrink-0`}
      >
        <div className="flex items-center justify-between px-2 pb-6 lg:block">
          <div>
            <span className="text-lg font-extrabold text-white">
              Admin<span className="text-green-accent">Pro</span>
            </span>
            <div className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-white/40">Espace</div>
            <div className="mt-1 truncate text-sm font-semibold text-white">Agence</div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-button p-2 text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((entry) => {
            if (entry.kind === "leaf") {
              const isActive = entry.id === activeSection;
              const Icon = entry.icon;
              return (
                <a
                  key={entry.id}
                  href={sectionHref(entry.id)}
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
                          href={sectionHref(child.id)}
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
            href="/admin/dashboard"
            className="px-3 py-2 text-xs text-white/40 hover:text-white/70"
          >
            etnof-web
          </a>
          <button
            type="button"
            onClick={() => {
              clearSession("agency");
              window.location.href = "/admin/dashboard";
            }}
            className="px-3 py-2 text-left text-xs text-white/40 hover:text-white/70"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-bg-page-start px-8 py-8">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
