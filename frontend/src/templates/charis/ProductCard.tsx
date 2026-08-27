import { useState } from "react";
import { API_BASE_URL } from "../../config";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import { useCart } from "@modules/catalogue/frontend/CartContext";

type ProductImage = { id: string; path: string };
type ProductSize = { id: string; label: string; stock: number };

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: ProductImage[];
  sizes?: ProductSize[];
};

// Voir docs/10-templates.md : un module reste isolé, ce template redéclare localement la forme de
// la palette plutôt que d'importer PaletteDef.
export type ModulePalette = { accent: string; background: string; ink: string };

const formatPrice = (value: number) =>
  value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

function CartIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.6 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}

// Card produit — signature visuelle propre à Charis (voir docs/10-templates.md) : la 1ʳᵉ photo
// (images[0]) s'affiche par défaut, la 2ᵉ (images[1]) prend le relais au survol pour montrer le
// produit sous un autre angle. Comportement exclusif à ce template — Hestia/Helios gardent une
// photo fixe + modale (CatalogueSection.tsx). Cliquer la card (hors bouton panier) ouvre la fiche
// produit dédiée (`ProductPage.tsx`). Réutilisée par le teaser home (`ProductGrid.tsx`) et la page
// boutique (`CataloguePage.tsx`).
export default function ProductCard({
  clientSiteId,
  product,
  palette,
  locale,
  collectionName,
}: {
  clientSiteId: string;
  product: Product;
  palette: ModulePalette;
  locale?: Locale;
  collectionName?: string;
}) {
  const { addItem } = useCart();
  const [hovered, setHovered] = useState(false);
  const hasSizes = Boolean(product.sizes && product.sizes.length > 0);
  const inStock = hasSizes ? product.sizes!.some((s) => s.stock > 0) : product.stock > 0;
  const primary = product.images[0];
  const secondary = product.images[1];
  const shown = hovered && secondary ? secondary : primary;

  return (
    <a
      href={`/t/${clientSiteId}/produits/${product.id}`}
      className="group flex flex-col gap-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative aspect-[3/4] overflow-hidden border"
        style={{ backgroundColor: palette.background, borderColor: `${palette.ink}14` }}
      >
        {shown ? (
          <img
            src={`${API_BASE_URL}${shown.path}`}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: `${palette.ink}66` }}>
            {t(locale, "catalogue.noPhoto")}
          </div>
        )}
        {(collectionName || !inStock) && (
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {collectionName && (
              <span
                className="rounded-pill bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: palette.accent }}
              >
                {collectionName}
              </span>
            )}
            {!inStock && (
              <span className="rounded-pill bg-white/90 px-2.5 py-1 text-[11px] font-semibold" style={{ color: palette.ink }}>
                {t(locale, "catalogue.outOfStock")}
              </span>
            )}
          </div>
        )}
        {!hasSizes && (
          <button
            type="button"
            disabled={!inStock}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addItem(product.id, product.name, product.price, product.stock, 1, primary?.path, product.description);
            }}
            aria-label={t(locale, "catalogue.addToCart")}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white opacity-0 shadow-soft transition-opacity duration-200 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CartIcon color={palette.ink} />
          </button>
        )}
        {hasSizes && (
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-1.5 bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {product.sizes!.map((size) => {
              const disabled = size.stock <= 0;
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={(e) => {
                    // Épuisée : pas de preventDefault/stopPropagation, le clic remonte jusqu'à <a>
                    // et navigue vers la fiche produit — seul endroit avec assez de place pour la
                    // demande de réassort (StockRequestForm), inadapté à ce hover compact.
                    if (disabled) return;
                    e.preventDefault();
                    e.stopPropagation();
                    addItem(product.id, product.name, product.price, size.stock, 1, primary?.path, product.description, size.label);
                  }}
                  className={`rounded-button bg-white px-2.5 py-1 text-xs font-semibold shadow-soft transition-transform hover:scale-105 ${
                    disabled ? "cursor-not-allowed text-gray-400 line-through" : ""
                  }`}
                  style={disabled ? undefined : { color: palette.ink }}
                >
                  {size.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium" style={{ color: palette.ink }}>
            {product.name}
          </span>
          <span className="whitespace-nowrap font-semibold" style={{ color: palette.accent }}>
            {formatPrice(product.price)}
          </span>
        </div>
      </div>
    </a>
  );
}
