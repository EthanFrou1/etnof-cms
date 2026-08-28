import { useState } from "react";
import { API_BASE_URL } from "../../config";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import { useCart } from "@modules/catalogue/frontend/CartContext";
import { formatPrice, CartIcon, type Product, type ModulePalette } from "./ProductCard";

// Card utilisée uniquement dans les sliders "produits d'une collection" (FeaturedSlider, voir
// ProductGrid.tsx) — demandé par Ethan, inspiré de karminecorp.fr : une grande photo principale en
// haut (fixe, plus de hover-swap comme ProductCard) puis, en dessous, jusqu'à 2 vignettes
// secondaires toujours visibles (aperçu rapide d'autres angles sans avoir à ouvrir la fiche
// produit). La grille statique (`grid-cols-*` par collection/repli) garde `ProductCard` tel quel —
// ce nouveau format est propre aux sliders, jugé trop haut pour une grille dense de plusieurs lignes.
export default function ProductSlideCard({
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
  // Jusqu'à 2 vignettes secondaires (images[1], images[2]) — jamais plus, même si le produit a plus
  // de photos (le carrousel complet reste réservé à la fiche produit).
  const thumbnails = product.images.slice(1, 3);

  return (
    <a
      href={`/t/${clientSiteId}/produits/${product.id}`}
      className="group flex flex-col gap-2"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="relative aspect-[3/4] overflow-hidden border"
        style={{ backgroundColor: palette.background, borderColor: `${palette.ink}14` }}
      >
        {primary ? (
          <img src={`${API_BASE_URL}${primary.path}`} alt={product.name} className="h-full w-full object-cover" />
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
          <div
            className={`absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-1.5 bg-gradient-to-t from-black/50 to-transparent p-3 transition-opacity duration-200 ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
          >
            {product.sizes!.map((size) => {
              const disabled = size.stock <= 0;
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={(e) => {
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

      {/* Seulement si les 2 vignettes sont disponibles (3 photos ou plus au total) — une vignette
          seule, étirée en pleine largeur pour occuper la rangée, rendait le rendu déséquilibré
          (remonté par Ethan sur un produit à 2 photos) : mieux vaut n'afficher que la photo
          principale dans ce cas plutôt qu'une vignette solitaire trop grande. */}
      {thumbnails.length === 2 && (
        <div className="grid grid-cols-2 gap-2">
          {thumbnails.map((image) => (
            <div
              key={image.id}
              className="aspect-square overflow-hidden border"
              style={{ backgroundColor: palette.background, borderColor: `${palette.ink}14` }}
            >
              <img src={`${API_BASE_URL}${image.path}`} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium" style={{ color: palette.ink }}>
          {product.name}
        </span>
        <span className="whitespace-nowrap font-semibold" style={{ color: palette.accent }}>
          {formatPrice(product.price)}
        </span>
      </div>
    </a>
  );
}
