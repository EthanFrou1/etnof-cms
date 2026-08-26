import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../config";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import { CartProvider, storageKey } from "@modules/catalogue/frontend/CartContext";
import ProductCard, { type Product as CardProduct, type ModulePalette } from "./ProductCard";
import CartButton from "./CartButton";

type Product = CardProduct & { highlighted: boolean; collectionId: string | null };

const formatPrice = (value: number) =>
  value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// Même mécanisme que CheckoutReturnBanner dans modules/catalogue/frontend/CatalogueSection.tsx —
// dupliqué ici (pas importé) : ce bloc Catalogue est exclusif au template Charis (voir
// docs/10-templates.md), qui n'utilise plus CatalogueSection.
function CheckoutReturnBanner({
  clientSiteId,
  palette,
  locale,
}: {
  clientSiteId: string;
  palette: ModulePalette;
  locale?: Locale;
}) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      localStorage.removeItem(storageKey(clientSiteId));
      const sessionId = params.get("session_id");

      if (sessionId) {
        fetch(`${API_BASE_URL}/api/t/${clientSiteId}/stripe/session/${sessionId}`)
          .then((res) => (res.ok ? (res.json() as Promise<{ status: string; amountTotal: number }>) : null))
          .then((data) => {
            setMessage(
              data && data.status === "paid"
                ? t(locale, "catalogue.paymentReceived", { price: formatPrice(data.amountTotal) })
                : t(locale, "catalogue.orderRecorded")
            );
          })
          .catch(() => setMessage(t(locale, "catalogue.orderRecorded")));
      } else {
        setMessage(t(locale, "catalogue.orderRecorded"));
      }
    } else if (checkout === "cancel") {
      setMessage(t(locale, "catalogue.paymentCancelled"));
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    url.searchParams.delete("session_id");
    window.history.replaceState({}, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!message) return null;

  return (
    <p
      className="rounded-card px-5 py-4 text-sm font-semibold"
      style={{ backgroundColor: `${palette.accent}18`, color: palette.ink }}
    >
      {message}
    </p>
  );
}

// Défilement horizontal natif (scroll-snap CSS, pas de librairie) pour les produits "mis en avant"
// — même patron que PhotoSlider dans TemplateHestia.tsx.
function FeaturedSlider({
  products,
  clientSiteId,
  palette,
  locale,
}: {
  products: Product[];
  clientSiteId: string;
  palette: ModulePalette;
  locale?: Locale;
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
    <div className="flex flex-col gap-3">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div key={product.id} className="w-56 shrink-0 snap-start sm:w-72">
            <ProductCard clientSiteId={clientSiteId} product={product} palette={palette} locale={locale} />
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
};

// Teaser Catalogue affiché sur la home de Charis — jamais la liste complète (voir
// docs/10-templates.md, "beaucoup de produits") : slider des produits "mis en avant" si le client en
// a défini, puis un aperçu par collection si le client en a créé (voir CataloguePage.tsx pour le
// rendu complet), et seulement à défaut des deux (aucune mise en avant, aucune collection) repli sur
// les FALLBACK_COUNT premiers produits en grille statique. Toujours suivi d'un lien vers la page
// boutique complète (/t/{clientSiteId}/boutique).
export default function ProductGrid({ clientSiteId, palette, locale }: ProductGridProps) {
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
      <div className="flex flex-col gap-10">
        <CheckoutReturnBanner clientSiteId={clientSiteId} palette={palette} locale={locale} />

        {highlighted.length > SLIDER_THRESHOLD ? (
          <FeaturedSlider products={highlighted} clientSiteId={clientSiteId} palette={palette} locale={locale} />
        ) : (
          highlighted.length > 0 && (
            <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {highlighted.map((product) => (
                <ProductCard key={product.id} clientSiteId={clientSiteId} product={product} palette={palette} locale={locale} />
              ))}
            </div>
          )
        )}

        {products.length > 0 && (
          <a
            href={`/t/${clientSiteId}/boutique`}
            className="self-start text-xs font-semibold uppercase tracking-[0.12em] transition-opacity duration-200 hover:opacity-60"
            style={{ color: palette.ink }}
          >
            {t(locale, "catalogue.viewShop")} →
          </a>
        )}

        {collectionSections.map(({ collection, items }) => (
          <div key={collection.id} className="flex flex-col gap-4">
            <h3 className="text-xl font-semibold sm:text-2xl" style={{ color: palette.ink }}>
              {collection.name}
            </h3>
            {items.length > SLIDER_THRESHOLD ? (
              <FeaturedSlider products={items} clientSiteId={clientSiteId} palette={palette} locale={locale} />
            ) : (
              <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((product) => (
                  <ProductCard key={product.id} clientSiteId={clientSiteId} product={product} palette={palette} locale={locale} />
                ))}
              </div>
            )}
          </div>
        ))}

        {showFallback && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {fallback.map((product) => (
              <ProductCard key={product.id} clientSiteId={clientSiteId} product={product} palette={palette} locale={locale} />
            ))}
          </div>
        )}
      </div>

      {products.length > 0 && <CartButton clientSiteId={clientSiteId} palette={palette} locale={locale} />}
    </CartProvider>
  );
}
