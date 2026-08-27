import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { API_BASE_URL } from "../../config";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import { CartProvider } from "@modules/catalogue/frontend/CartContext";
import ProductCard, { type Product as CardProduct, type ModulePalette } from "./ProductCard";
import CartButton from "./CartButton";

// Exporté pour ProductPage.tsx (section "Nos autres produits") — même forme de produit réutilisée
// pour un slider de produits liés, en dehors du contexte "collection" de ce fichier.
export type Product = CardProduct & { highlighted: boolean; collectionId: string | null };

// Badge circulaire "voir plus" à texte tournant (SVG textPath + rotation CSS lente), affiché à côté
// du slider d'une collection — demandé par Ethan pour habiller le slider plutôt que de le laisser nu
// sur son bord droit. `useId` évite les doublons d'id de <path> quand plusieurs collections en
// affichent chacune un sur la même page.
function CircularCta({ href, label, palette }: { href: string; label: string; palette: ModulePalette }) {
  const pathId = `circular-cta-path-${useId()}`;
  const loopedText = `${label} · ${label} · `;

  return (
    <a
      href={href}
      aria-label={label}
      className="group relative flex h-32 w-32 shrink-0 items-center justify-center self-center"
    >
      {/* Taille du texte pilotée par la taille du conteneur (h-32 w-32) plutôt que par fontSize seul :
          le viewBox reste 0-100, donc agrandir le conteneur agrandit tout le SVG (texte + cercle)
          proportionnellement, sans risquer un chevauchement des lettres le long du tracé. */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full animate-[spin_12s_linear_infinite]">
        <defs>
          <path id={pathId} d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" fill="none" />
        </defs>
        <text fontSize="12" letterSpacing="1" fill={palette.ink}>
          <textPath href={`#${pathId}`} startOffset="0%">
            {loopedText}
          </textPath>
        </text>
      </svg>
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full border text-lg transition-transform duration-200 group-hover:translate-x-0.5"
        style={{ borderColor: `${palette.ink}33`, color: palette.ink, backgroundColor: palette.background }}
      >
        →
      </span>
    </a>
  );
}

// Défilement horizontal natif (scroll-snap CSS, pas de librairie) pour les produits "mis en avant"
// — même patron que PhotoSlider dans TemplateHestia.tsx. Exporté : réutilisé tel quel par
// ProductPage.tsx pour le slider "Nos autres produits" (voir plus bas).
export function FeaturedSlider({
  products,
  clientSiteId,
  palette,
  locale,
  cta,
  collectionsById = {},
}: {
  products: Product[];
  clientSiteId: string;
  palette: ModulePalette;
  locale?: Locale;
  cta?: { label: string; href: string };
  collectionsById?: Record<string, string>;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByTile = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const tile = track.firstElementChild as HTMLElement | null;
    const step = (tile?.offsetWidth ?? 224) + 24;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    // relative + le badge en absolute (plutôt qu'un flex row track+badge) : sinon le badge grignote
    // la largeur du track, et les tuiles (calculées en % de LEUR conteneur direct, voir plus bas)
    // deviennent plus petites que celles des collections affichées en grille simple. Le badge flotte
    // donc à côté du slider sans réduire sa largeur, quitte à déborder dans la marge de la page.
    <div className="relative flex flex-col gap-3">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          // Largeur en fraction du conteneur (pas en px fixe) pour garantir exactement 3 tuiles
          // visibles sur desktop quelle que soit la largeur d'écran : un slider avec assez de place
          // pour tout afficher sans scroll n'a pas besoin des flèches, d'où le calcul plutôt qu'un
          // simple w-72 fixe.
          <div
            key={product.id}
            className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
          >
            <ProductCard
              clientSiteId={clientSiteId}
              product={product}
              palette={palette}
              locale={locale}
              collectionName={product.collectionId ? collectionsById[product.collectionId] : undefined}
            />
          </div>
        ))}
      </div>
      {products.length > 3 && (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollByTile(-1)}
            aria-label="Produit précédent"
            className="flex h-9 w-9 items-center justify-center rounded-full border text-lg transition-opacity duration-200 hover:opacity-70"
            style={{ borderColor: `${palette.ink}22`, color: palette.ink }}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollByTile(1)}
            aria-label="Produit suivant"
            className="flex h-9 w-9 items-center justify-center rounded-full border text-lg transition-opacity duration-200 hover:opacity-70"
            style={{ borderColor: `${palette.ink}22`, color: palette.ink }}
          >
            ›
          </button>
        </div>
      )}
      {cta && (
        // Repli caché en dessous de 2xl : sous ce seuil, le conteneur (max-w-7xl) occupe déjà toute
        // la largeur du viewport et il n'y a pas de marge externe où déborder sans chevaucher autre
        // chose — mieux vaut ne pas montrer le badge que de casser la mise en page.
        <div className="absolute left-full top-0 hidden h-[calc(100%-3rem)] items-center pl-6 2xl:flex">
          <CircularCta href={cta.href} label={cta.label} palette={palette} />
        </div>
      )}
    </div>
  );
}

// Nombre de produits affichés en repli quand aucun n'est "mis en avant" (tenant qui n'a pas encore
// configuré ses mises en avant) — même logique de repli sans configuration que le reste du projet
// (ex. palette par défaut, template par défaut).
const FALLBACK_COUNT = 8;

type Collection = { id: string; name: string };

// Capacité d'une ligne de grille à la largeur la plus large (lg:grid-cols-3, voir plus bas) : au-delà,
// une grille statique laisserait un produit orphelin sur une nouvelle ligne (ex. 4 produits sur une
// grille à 3 colonnes) — on bascule alors sur le slider à défilement horizontal pour que tout reste
// accessible sans ligne à moitié vide. En dessous ou à cette capacité, le slider (largeur de tuile
// fixe) rendrait les cards visiblement plus petites que les grilles pleine largeur des
// collections/du repli, d'où la grille tant que tout tient sur une seule ligne.
const SLIDER_THRESHOLD = 3;

type ProductGridProps = {
  clientSiteId: string;
  palette: ModulePalette;
  locale?: Locale;
  // Injecté par TemplateCharis (Horaires + Maps) : demandé par Ethan pour s'intercaler juste après
  // les produits mis en avant/le lien "voir le catalogue" et avant les aperçus par collection —
  // ProductGrid n'a lui-même aucune notion de ces modules (voir docs/02-architecture-modules.md).
  afterFeatured?: ReactNode;
};

// Teaser Catalogue affiché sur la home de Charis — jamais la liste complète (voir
// docs/10-templates.md, "beaucoup de produits") : slider des produits "mis en avant" si le client en
// a défini, puis un aperçu par collection si le client en a créé (voir CataloguePage.tsx pour le
// rendu complet), et seulement à défaut des deux (aucune mise en avant, aucune collection) repli sur
// les FALLBACK_COUNT premiers produits en grille statique. Toujours suivi d'un lien vers la page
// boutique complète (/t/{clientSiteId}/boutique).
export default function ProductGrid({ clientSiteId, palette, locale, afterFeatured }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/catalogue/products`)
      .then((res) => res.json())
      .then(setProducts)
      .catch((err) => console.error("Erreur ProductGrid :", err));
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/catalogue/collections`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setCollections)
      .catch(() => setCollections([]));
  }, [clientSiteId]);

  // Un client peut revenir de Stripe (?checkout=...) alors que la liste de produits n'a pas encore
  // fini de charger, ou est vide — la bannière de confirmation doit s'afficher quoi qu'il arrive.
  const hasCheckoutReturn = new URLSearchParams(window.location.search).has("checkout");

  if (products.length === 0 && !hasCheckoutReturn) return null;

  const highlighted = products.filter((p) => p.highlighted);
  // Utilisé pour le badge collection sur ProductCard (voir plus bas) — construit une fois plutôt que
  // de chercher dans `collections` à chaque carte.
  const collectionsById = collections.reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = c.name;
    return acc;
  }, {});
  const collectionSections = collections
    .map((collection) => ({
      collection,
      items: products.filter((p) => p.collectionId === collection.id),
    }))
    .filter((section) => section.items.length > 0);
  const fallback = products.slice(0, FALLBACK_COUNT);
  const showFallback = highlighted.length === 0 && collectionSections.length === 0;

  return (
    <CartProvider clientSiteId={clientSiteId}>
      <div className="flex flex-col gap-16">
        {highlighted.length > SLIDER_THRESHOLD ? (
          <FeaturedSlider
            products={highlighted}
            clientSiteId={clientSiteId}
            palette={palette}
            locale={locale}
            collectionsById={collectionsById}
          />
        ) : (
          highlighted.length > 0 && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {highlighted.map((product) => (
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
          )
        )}

        {products.length > 0 && (
          <a
            href={`/t/${clientSiteId}/boutique`}
            className="group flex flex-col items-center gap-1.5 self-center text-sm font-semibold uppercase tracking-[0.12em] transition-opacity duration-200 hover:opacity-60"
            style={{ color: palette.ink }}
          >
            <span>{t(locale, "catalogue.viewShop")} →</span>
            <span className="h-px w-10" style={{ backgroundColor: `${palette.ink}55` }} />
          </a>
        )}

        {afterFeatured}

        {collectionSections.length > 0 && (
          <span className="text-xl font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
            {t(locale, "catalogue.featuredCollections")}
          </span>
        )}

        {collectionSections.map(({ collection, items }) => (
          <div key={collection.id} className="flex flex-col gap-4">
            <h3 className="text-base font-semibold sm:text-lg" style={{ color: palette.ink }}>
              {collection.name}
            </h3>
            {items.length > SLIDER_THRESHOLD ? (
              <FeaturedSlider
                products={items}
                clientSiteId={clientSiteId}
                palette={palette}
                locale={locale}
                cta={{ label: t(locale, "catalogue.viewMore"), href: `/t/${clientSiteId}/boutique?collection=${collection.id}` }}
                collectionsById={collectionsById}
              />
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((product) => (
                  <ProductCard
                    key={product.id}
                    clientSiteId={clientSiteId}
                    product={product}
                    palette={palette}
                    locale={locale}
                    collectionName={collection.name}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {showFallback && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {fallback.map((product) => (
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
        )}
      </div>

      {products.length > 0 && <CartButton clientSiteId={clientSiteId} palette={palette} locale={locale} />}
    </CartProvider>
  );
}
