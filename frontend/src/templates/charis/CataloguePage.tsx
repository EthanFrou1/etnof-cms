import { lazy, Suspense, useEffect, useState } from "react";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import { CartProvider } from "@modules/catalogue/frontend/CartContext";

const NewsletterSection = lazy(() => import("@modules/newsletter/frontend/NewsletterSection"));
const AvisGoogleSection = lazy(() => import("@modules/avis-google/frontend/AvisGoogleSection"));
// Même écart assumé que ProductPage.tsx : cette page est montée seule par une route dédiée
// (App.tsx, via l'aiguilleur frontend/src/pages/CataloguePage.tsx), pas nichée dans TemplateCharis —
// elle recharge donc elle-même modules/contenu/template plutôt que de les recevoir en props.
import { useTemplate } from "../../hooks/useTemplate";
import { useModules } from "../../hooks/useModules";
import { useContent } from "../../hooks/useContent";
import { useLocale } from "../../hooks/useLocale";
import { resolvePalette } from "../registry";
import SiteFooter from "../SiteFooter";
import SiteChrome from "./SiteChrome";
import ProductCard, { type Product as CardProduct, type ModulePalette } from "./ProductCard";
import CartButton from "./CartButton";

type Product = CardProduct & { collectionId: string | null };
type Collection = { id: string; name: string };

function CatalogueContent({
  clientSiteId,
  apiBaseUrl,
  palette,
  locale,
}: {
  clientSiteId: string;
  apiBaseUrl: string;
  palette: ModulePalette;
  locale: Locale;
}) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  // null = chip "Tout" (pas de filtre) — demandé par Ethan pour retrouver les chips de filtre par
  // collection annoncées dans le commentaire d'origine mais jamais branchées. Initialisé depuis
  // `?collection=` (lien "Voir plus" d'une collection sur la home, fil d'Ariane d'une fiche produit)
  // pour arriver directement filtré au lieu de la boutique complète.
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("collection")
  );

  // Sélectionner un chip met à jour l'URL (sans recharger la page) — routage maison, cf.
  // CLAUDE.md règle 5 : pas de librairie de routing, juste history.replaceState comme ailleurs
  // dans le projet (window.location.pathname).
  const selectCollection = (collectionId: string | null) => {
    setActiveCollectionId(collectionId);
    const url = new URL(window.location.href);
    if (collectionId) url.searchParams.set("collection", collectionId);
    else url.searchParams.delete("collection");
    window.history.replaceState(null, "", url);
  };

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products`)
      .then((res) => res.json())
      .then(setProducts)
      .catch(() => setProducts([]));
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/collections`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setCollections)
      .catch(() => setCollections([]));
  }, [apiBaseUrl, clientSiteId]);

  if (!products) return null;

  const collectionsById = collections.reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = c.name;
    return acc;
  }, {});

  // Aucun filtre actif : une section par collection (titre + grille), plutôt qu'une seule grille —
  // demandé par Ethan pour se rapprocher du rendu Karminecorp (chaque collection mise en avant avec
  // son propre titre). Les produits sans collection sortent dans une dernière section "Autres
  // produits" seulement s'il existe déjà au moins une collection ; sinon (aucune collection créée) on
  // retombe sur une grille unique sans titre, comme avant. Un filtre actif retombe sur une seule
  // grille (pas de titre : le chip sélectionné l'indique déjà).
  const sections =
    activeCollectionId !== null
      ? [{ title: null, items: products.filter((p) => p.collectionId === activeCollectionId) }]
      : collections.length > 0
        ? [
            ...collections.map((collection) => ({
              title: collection.name,
              items: products.filter((p) => p.collectionId === collection.id),
            })),
            { title: t(locale, "catalogue.otherProducts"), items: products.filter((p) => !p.collectionId) },
          ].filter((section) => section.items.length > 0)
        : [{ title: null, items: products }];

  return (
    <>
      {collections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => selectCollection(null)}
            className="rounded-pill border px-4 py-2 text-sm font-medium transition-colors duration-200"
            style={
              activeCollectionId === null
                ? { backgroundColor: palette.accent, borderColor: palette.accent, color: "#FFFFFF" }
                : { borderColor: `${palette.ink}33`, color: palette.ink }
            }
          >
            {t(locale, "catalogue.allCollections")}
          </button>
          {collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              onClick={() => selectCollection(collection.id)}
              className="rounded-pill border px-4 py-2 text-sm font-medium transition-colors duration-200"
              style={
                activeCollectionId === collection.id
                  ? { backgroundColor: palette.accent, borderColor: palette.accent, color: "#FFFFFF" }
                  : { borderColor: `${palette.ink}33`, color: palette.ink }
              }
            >
              {collection.name}
            </button>
          ))}
        </div>
      )}

      {sections.length === 0 ? (
        <p style={{ color: `${palette.ink}99` }}>{t(locale, "catalogue.emptyCollection")}</p>
      ) : (
        sections.map((section, index) => (
          <section
            key={section.title ?? "all"}
            className={`flex flex-col gap-6 ${index > 0 ? "border-t pt-10" : ""}`}
            style={index > 0 ? { borderColor: `${palette.ink}14` } : undefined}
          >
            {section.title && (
              <h2 className="text-xl font-semibold sm:text-2xl" style={{ color: palette.ink }}>
                {section.title}
              </h2>
            )}
            <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((product) => (
                <ProductCard
                  key={product.id}
                  clientSiteId={clientSiteId}
                  product={product}
                  palette={palette}
                  locale={locale}
                  collectionName={product.collectionId ? collectionsById[product.collectionId] : undefined}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {products.length > 0 && <CartButton clientSiteId={clientSiteId} palette={palette} locale={locale} />}
    </>
  );
}

type CharisCataloguePageProps = {
  clientSiteId: string;
  apiBaseUrl: string;
};

// Page boutique riche de Charis : chips de filtre par collection + grille à survol (ProductCard) —
// voir docs/10-templates.md. Hestia/Helios utilisent la version simple, sans filtre
// (modules/catalogue/frontend/CataloguePage.tsx), choisie par l'aiguilleur
// frontend/src/pages/CataloguePage.tsx.
export default function CharisCataloguePage({ clientSiteId, apiBaseUrl }: CharisCataloguePageProps) {
  const { templateId, paletteId, customAccent } = useTemplate(clientSiteId);
  const { locale, setLocale } = useLocale(clientSiteId);
  const modules = useModules(clientSiteId);
  const content = useContent(clientSiteId, locale);

  const resolved = templateId ? resolvePalette(templateId, paletteId, customAccent) : null;
  const background = resolved?.background ?? "#FFFFFF";
  const palette: ModulePalette = { accent: resolved?.accent ?? "#111111", background, ink: "#111111" };
  const siteName = content?.siteName ?? "etnof-cms";

  return (
    <SiteChrome
      clientSiteId={clientSiteId}
      modules={modules}
      siteName={siteName}
      hasStory={Boolean(content?.storyContent?.trim())}
      locale={locale}
      onChangeLocale={setLocale}
      palette={palette}
      footer={<SiteFooter content={content} palette={palette} modules={modules} locale={locale} dark />}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-8">
        <a href={`/t/${clientSiteId}`} className="self-start text-sm font-medium hover:opacity-70" style={{ color: `${palette.ink}99` }}>
          {t(locale, "blog.backToSite")}
        </a>

        <CartProvider clientSiteId={clientSiteId}>
          <CatalogueContent clientSiteId={clientSiteId} apiBaseUrl={apiBaseUrl} palette={palette} locale={locale} />
        </CartProvider>

        {(modules?.["avis-google"]?.enabled || modules?.newsletter?.enabled) && (
          <Suspense fallback={null}>
            <div className="grid gap-8 border-t pt-8" style={{ borderColor: `${palette.ink}1A` }}>
              {modules?.["avis-google"]?.enabled && (
                <div id="avis-google">
                  <AvisGoogleSection apiBaseUrl={apiBaseUrl} clientSiteId={clientSiteId} palette={palette} locale={locale} />
                </div>
              )}
              {modules?.newsletter?.enabled && (
                <div id="newsletter">
                  <NewsletterSection apiBaseUrl={apiBaseUrl} clientSiteId={clientSiteId} palette={palette} locale={locale} />
                </div>
              )}
            </div>
          </Suspense>
        )}
      </div>
    </SiteChrome>
  );
}
