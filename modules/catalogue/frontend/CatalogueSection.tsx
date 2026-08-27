import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : import direct du
// dictionnaire i18n du module Multilingue plutôt que de dupliquer des chaînes ici — voir
// modules/multilingue/frontend/translations.ts.
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import { CartProvider, useCart } from "./CartContext";
import StockRequestForm from "./StockRequestForm";

type ProductImage = {
  id: string;
  path: string;
};

type ProductSize = { id: string; label: string; stock: number };

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: ProductImage[];
  sizes: ProductSize[];
  averageRating: number | null;
  reviewCount: number;
  highlighted: boolean;
};

type ProductReview = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

// Voir docs/10-templates.md : un module reste isolé, redéclare localement la forme de la palette
// du template actif plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type CatalogueSectionProps = {
  apiBaseUrl: string;
  clientSiteId: string;
  palette: ModulePalette;
  locale?: Locale;
  // Aperçu limité (utilisé sur la home d'Hestia/Helios, voir TemplateHestia.tsx/TemplateHelios.tsx)
  // — au-delà, "Voir tous les produits" renvoie vers /t/{clientSiteId}/boutique (page dédiée, voir
  // docs/10-templates.md). Sans cette prop (page boutique elle-même, CataloguePage.tsx) : tous les
  // produits, pas de lien.
  limit?: number;
};

const formatPrice = (value: number) =>
  value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// Étoiles en lecture seule (note moyenne sur la card, avis déjà postés dans la modale) — voir
// StarPicker plus bas pour la variante interactive du formulaire.
function Stars({ rating, size = "text-sm" }: { rating: number; size?: string }) {
  const rounded = Math.round(rating);
  return (
    <span className={`${size} text-amber-400`}>
      {"★".repeat(rounded)}
      <span className="text-black/10">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex gap-1 text-2xl">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          className={n <= value ? "text-amber-400" : "text-black/10 hover:text-amber-300"}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// Modale ouverte au clic sur une card — description complète, avis approuvés, et formulaire pour en
// laisser un (soumis en attente de modération, voir modules/catalogue/backend/ProductReview.cs :
// jamais visible tant que le client ne l'a pas approuvé depuis son admin).
function ProductReviewModal({
  apiBaseUrl,
  clientSiteId,
  product,
  palette,
  locale,
  onClose,
}: {
  apiBaseUrl: string;
  clientSiteId: string;
  product: Product;
  palette: ModulePalette;
  locale?: Locale;
  onClose: () => void;
}) {
  const [reviews, setReviews] = useState<ProductReview[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const thumbnail = product.images[0];

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products/${product.id}/reviews`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setReviews)
      .catch(() => setReviews([]));
  }, [apiBaseUrl, clientSiteId, product.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const res = await fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products/${product.id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName, rating, comment }),
    });
    setStatus(res.ok ? "sent" : "error");
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-card bg-white shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-subtle p-5">
          <span className="font-bold" style={{ color: palette.ink }}>
            {product.name}
          </span>
          <button type="button" onClick={onClose} className="text-xl leading-none text-gray-text hover:text-navy">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-5 flex gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-button" style={{ backgroundColor: palette.background }}>
              {thumbnail && (
                <img src={`${apiBaseUrl}${thumbnail.path}`} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              {product.description && <p className="text-sm leading-relaxed text-gray-text">{product.description}</p>}
              {product.averageRating !== null && (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-text">
                  <Stars rating={product.averageRating} />
                  {product.averageRating.toFixed(1)} ({product.reviewCount} {t(locale, "catalogue.reviewsCount")})
                </div>
              )}
            </div>
          </div>

          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-text">{t(locale, "catalogue.reviews")}</h3>
          {!reviews ? (
            <p className="text-sm text-gray-text">…</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-gray-text">{t(locale, "catalogue.noReviews")}</p>
          ) : (
            <div className="mb-5 flex flex-col gap-3">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-border-subtle pb-3 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-navy">{review.authorName}</span>
                    <Stars rating={review.rating} />
                  </div>
                  <p className="mt-1 text-sm text-gray-text">{review.comment}</p>
                </div>
              ))}
            </div>
          )}

          {status === "sent" ? (
            <p className="rounded-button p-3 text-sm" style={{ backgroundColor: `${palette.accent}18`, color: palette.ink }}>
              {t(locale, "catalogue.reviewThankYou")}
            </p>
          ) : showForm ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-button bg-bg-page-start/60 p-4">
              <StarPicker value={rating} onChange={setRating} />
              <input
                className="rounded-button border border-border-subtle px-3 py-2 text-sm text-navy placeholder:text-gray-text/60 focus:outline-none focus:ring-2 focus:ring-brand-mid/20"
                placeholder={t(locale, "catalogue.reviewNamePlaceholder")}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                required
              />
              <textarea
                className="rounded-button border border-border-subtle px-3 py-2 text-sm text-navy placeholder:text-gray-text/60 focus:outline-none focus:ring-2 focus:ring-brand-mid/20"
                placeholder={t(locale, "catalogue.reviewCommentPlaceholder")}
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
              />
              {status === "error" && <p className="text-sm text-red-500">{t(locale, "catalogue.reviewError")}</p>}
              <button
                type="submit"
                disabled={status === "sending"}
                className="self-start rounded-button px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: palette.accent }}
              >
                {status === "sending" ? t(locale, "catalogue.reviewSending") : t(locale, "catalogue.reviewSubmit")}
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-button border px-4 py-2 text-sm font-semibold hover:bg-bg-page-start"
              style={{ borderColor: palette.accent, color: palette.accent }}
            >
              {t(locale, "catalogue.leaveReview")}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ProductCard({
  apiBaseUrl,
  clientSiteId,
  product,
  palette,
  locale,
}: {
  apiBaseUrl: string;
  clientSiteId: string;
  product: Product;
  palette: ModulePalette;
  locale?: Locale;
}) {
  const { addItem } = useCart();
  const [showModal, setShowModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const hasSizes = product.sizes.length > 0;
  const inStock = hasSizes ? product.sizes.some((s) => s.stock > 0) : product.stock > 0;
  const canAddToCart = hasSizes ? Boolean(selectedSize && selectedSize.stock > 0) : inStock;
  const maxStock = hasSizes ? selectedSize?.stock ?? 0 : product.stock;
  const thumbnail = product.images[0];
  // Voir ProductPage.tsx (Charis) pour la même logique : une taille précise épuisée si choisie,
  // sinon seulement si le produit est entièrement épuisé (pas juste "aucune taille cliquée").
  const showStockRequest = hasSizes ? (selectedSize ? selectedSize.stock <= 0 : !inStock) : !inStock;

  return (
    <>
      <div
        className="flex cursor-pointer flex-col overflow-hidden rounded-card bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-soft"
        onClick={() => setShowModal(true)}
      >
        <div className="aspect-square" style={{ backgroundColor: palette.background }}>
          {thumbnail ? (
            <img
              src={`${apiBaseUrl}${thumbnail.path}`}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-text/40">
              {t(locale, "catalogue.noPhoto")}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-bold" style={{ color: palette.ink }}>
              {product.name}
            </span>
            <span className="whitespace-nowrap font-semibold" style={{ color: palette.accent }}>
              {formatPrice(product.price)}
            </span>
          </div>
          {product.averageRating !== null && (
            <div className="flex items-center gap-1.5 text-xs text-gray-text">
              <Stars rating={product.averageRating} />({product.reviewCount})
            </div>
          )}
          {product.description && (
            <p className="flex-1 text-sm leading-relaxed text-gray-text">{product.description}</p>
          )}
          {!inStock && (
            <span className="w-fit rounded-pill bg-black/5 px-2.5 py-1 text-xs font-semibold text-red-500">
              {t(locale, "catalogue.outOfStock")}
            </span>
          )}
          {hasSizes && (
            <div className="flex flex-wrap gap-1.5">
              {product.sizes.map((size) => {
                const selected = selectedSize?.id === size.id;
                const disabled = size.stock <= 0;
                return (
                  <button
                    key={size.id}
                    type="button"
                    // Pas de `disabled` natif : reste cliquable même épuisée pour permettre une
                    // demande de réassort ciblée (StockRequestForm ci-dessous), voir ProductPage.tsx.
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSize(size);
                    }}
                    className={`rounded-button border px-2.5 py-1 text-xs font-medium transition-colors ${
                      disabled ? "cursor-not-allowed opacity-30" : ""
                    } ${selected ? "border-transparent text-white" : "border-border-subtle text-gray-text hover:border-brand-mid"}`}
                    style={selected ? { backgroundColor: palette.accent } : undefined}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            disabled={!canAddToCart}
            onClick={(e) => {
              e.stopPropagation();
              addItem(product.id, product.name, product.price, maxStock, 1, thumbnail?.path, product.description, selectedSize?.label);
            }}
            className="rounded-button px-3 py-1.5 text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
            style={{ backgroundColor: palette.accent }}
          >
            {t(locale, "catalogue.addToCart")}
          </button>

          {showStockRequest && (
            <StockRequestForm
              apiBaseUrl={apiBaseUrl}
              clientSiteId={clientSiteId}
              productId={product.id}
              productName={product.name}
              sizeLabel={hasSizes ? selectedSize?.label ?? null : null}
              palette={palette}
              locale={locale}
            />
          )}
        </div>
      </div>

      {showModal && (
        <ProductReviewModal
          apiBaseUrl={apiBaseUrl}
          clientSiteId={clientSiteId}
          product={product}
          palette={palette}
          locale={locale}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function CartButton({ clientSiteId, palette, locale }: { clientSiteId: string; palette: ModulePalette; locale?: Locale }) {
  const { itemCount } = useCart();

  return createPortal(
    <a
      href={`/t/${clientSiteId}/panier`}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-pill px-5 py-3 text-sm font-semibold text-white shadow-soft"
      style={{ backgroundColor: palette.ink }}
    >
      {t(locale, "catalogue.cart")} {itemCount > 0 && `(${itemCount})`}
    </a>,
    document.body
  );
}

export default function CatalogueSection({ apiBaseUrl, clientSiteId, palette, locale, limit }: CatalogueSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products`)
      .then((res) => res.json())
      .then(setProducts)
      .catch((err) => console.error("Erreur CatalogueSection :", err));
  }, [apiBaseUrl, clientSiteId]);

  if (products.length === 0) return null;

  // Aperçu (`limit` fourni, voir CatalogueSectionProps) : les produits "mis en avant" passent en
  // premier (tri stable, Array.prototype.sort le garantit) avant de tronquer — sinon ordre du
  // backend inchangé (CreatedAt décroissant).
  const visibleProducts = limit
    ? [...products].sort((a, b) => Number(b.highlighted) - Number(a.highlighted)).slice(0, limit)
    : products;
  const hasMore = Boolean(limit) && products.length > limit!;

  return (
    <CartProvider clientSiteId={clientSiteId}>
      <section className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
          {t(locale, "catalogue.label")}
        </span>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              apiBaseUrl={apiBaseUrl}
              clientSiteId={clientSiteId}
              product={product}
              palette={palette}
              locale={locale}
            />
          ))}
        </div>
        {hasMore && (
          <a
            href={`/t/${clientSiteId}/boutique`}
            className="self-start text-sm font-semibold hover:opacity-80"
            style={{ color: palette.accent }}
          >
            {t(locale, "catalogue.viewAllProducts")} →
          </a>
        )}
      </section>
      <CartButton clientSiteId={clientSiteId} palette={palette} locale={locale} />
    </CartProvider>
  );
}
