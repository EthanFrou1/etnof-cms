import { lazy, Suspense } from "react";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
// Même écart assumé que CartPage.tsx : cette page est montée seule par une route dédiée (App.tsx),
// pas nichée dans un template — elle résout sa propre palette via les hooks déjà utilisés par les
// templates plutôt que de dupliquer cette logique.
import { useTemplate } from "../../../frontend/src/hooks/useTemplate";
import { resolvePalette } from "../../../frontend/src/templates/registry";

const CatalogueSection = lazy(() => import("./CatalogueSection"));

function readStoredLocale(clientSiteId: string): Locale {
  const stored = localStorage.getItem(`etnof-locale-${clientSiteId}`);
  return stored === "en" || stored === "es" ? stored : "fr";
}

type CataloguePageProps = {
  clientSiteId: string;
  apiBaseUrl: string;
};

// Page boutique "simple" (pas de filtre par collection) partagée par Hestia et Helios — voir
// docs/10-templates.md. Réutilise CatalogueSection.tsx sans `limit` (tous les produits, comportement
// identique à ce qui était auparavant affiché directement sur la home). Charis a sa propre version
// riche (templates/charis/CataloguePage.tsx, avec chips de filtre), choisie par l'aiguilleur
// frontend/src/pages/CataloguePage.tsx.
export default function CataloguePage({ clientSiteId, apiBaseUrl }: CataloguePageProps) {
  const { templateId, paletteId, customAccent } = useTemplate(clientSiteId);
  const locale = readStoredLocale(clientSiteId);

  const palette = templateId ? resolvePalette(templateId, paletteId, customAccent) : null;
  const background = palette?.background ?? "#F8FAFC";
  const accent = palette?.accent ?? "#2563EB";
  const modulePalette = { accent, background, ink: "#1A1512" };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8" style={{ backgroundColor: background }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <a href={`/t/${clientSiteId}`} className="self-start text-sm font-medium text-gray-text hover:text-navy">
          {t(locale, "blog.backToSite")}
        </a>

        <Suspense fallback={null}>
          <CatalogueSection apiBaseUrl={apiBaseUrl} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}
