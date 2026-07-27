import type { ModulesConfig } from "../hooks/useModules";
import type { SiteContent } from "../hooks/useContent";

// Contrat commun à tous les templates : ils reçoivent les données déjà chargées par l'orchestrateur
// (PublicSite.tsx) et ne s'occupent que de la mise en page — voir docs/02-architecture-modules.md.
export type TemplateProps = {
  clientSiteId: string;
  modules: ModulesConfig | null;
  content: SiteContent | null;
  paletteId: string | null;
};
