import type { ModulesConfig } from "../hooks/useModules";
import type { SiteContent } from "../hooks/useContent";
import type { Locale } from "../hooks/useLocale";

// Contrat commun à tous les templates : ils reçoivent les données déjà chargées par l'orchestrateur
// (PublicSite.tsx) et ne s'occupent que de la mise en page — voir docs/02-architecture-modules.md.
export type TemplateProps = {
  clientSiteId: string;
  modules: ModulesConfig | null;
  content: SiteContent | null;
  paletteId: string | null;
  locale: Locale;
  onChangeLocale: (locale: Locale) => void;
};
