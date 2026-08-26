import { lazy, Suspense } from "react";
import { useTemplate } from "../hooks/useTemplate";
import { API_BASE_URL } from "../config";

// Version riche (chips de filtre par collection) exclusive à Charis ; version partagée simple
// (pas de filtre, voir docs/10-templates.md) pour Hestia/Helios.
const CharisCataloguePage = lazy(() => import("../templates/charis/CataloguePage"));
const SimpleCataloguePage = lazy(() => import("@modules/catalogue/frontend/CataloguePage"));

type CataloguePageProps = {
  clientSiteId: string;
};

// Aiguilleur monté par la route /t/{clientSiteId}/boutique (App.tsx) — même principe que
// PublicSite.tsx : choisit le rendu selon le template actif du tenant.
export default function CataloguePage({ clientSiteId }: CataloguePageProps) {
  const { templateId } = useTemplate(clientSiteId);

  if (!templateId) return null;

  return (
    <Suspense fallback={null}>
      {templateId === "charis" ? (
        <CharisCataloguePage clientSiteId={clientSiteId} apiBaseUrl={API_BASE_URL} />
      ) : (
        <SimpleCataloguePage clientSiteId={clientSiteId} apiBaseUrl={API_BASE_URL} />
      )}
    </Suspense>
  );
}
