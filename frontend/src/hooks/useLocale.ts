import { useState } from "react";

// "fr" est toujours la langue de base (jamais stockée comme traduction, voir module Multilingue
// côté backend) — "en"/"es" ne s'appliquent que si le module est actif pour ce tenant, mais la
// persistance ici ne dépend pas de ce state : un visiteur qui a choisi "en" sur un tenant qui
// désactive ensuite Multilingue retombera simplement sur le français (le backend ignore le
// paramètre `locale` si le module n'est pas actif, voir ContentEndpoints.cs).
export type Locale = "fr" | "en" | "es";

export const LOCALE_LABELS: Record<Locale, string> = { fr: "FR", en: "EN", es: "ES" };

function storageKey(clientSiteId: string) {
  return `etnof-locale-${clientSiteId}`;
}

// Pas de Context/routing : persisté en localStorage par tenant, relu indépendamment par chaque
// page (PublicSite, BlogPostPage) qui n'ont pas de state partagé entre elles (navigation par <a>
// classique, pas de routeur SPA — voir App.tsx).
export function useLocale(clientSiteId: string) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem(storageKey(clientSiteId));
    return stored === "en" || stored === "es" ? stored : "fr";
  });

  const setLocale = (value: Locale) => {
    localStorage.setItem(storageKey(clientSiteId), value);
    setLocaleState(value);
  };

  return { locale, setLocale };
}

export function readStoredLocale(clientSiteId: string): Locale {
  const stored = localStorage.getItem(storageKey(clientSiteId));
  return stored === "en" || stored === "es" ? stored : "fr";
}
