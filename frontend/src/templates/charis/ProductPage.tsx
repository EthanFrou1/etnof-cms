import { useEffect, useState } from "react";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import { CartProvider, useCart } from "@modules/catalogue/frontend/CartContext";
// Cette page est montée seule par une route dédiée (App.tsx), pas nichée dans TemplateCharis — même
// principe que CartPage.tsx (modules/catalogue/frontend/) : rien ne lui fournit la palette du
// tenant, elle la résout elle-même via les hooks déjà utilisés par les templates.
import { useTemplate } from "../../hooks/useTemplate";
import { useModules } from "../../hooks/useModules";
import { useContent } from "../../hooks/useContent";
import { useLocale } from "../../hooks/useLocale";
import { resolvePalette } from "../registry";
import SiteFooter from "../SiteFooter";
import SiteChrome from "./SiteChrome";
import CartButton from "./CartButton";

type ProductImage = { id: string; path: string };
type ProductSize = { id: string; label: string; stock: number };

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: ProductImage[];
  sizes: ProductSize[];
};

type ProductReview = {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type ModulePalette = { accent: string; background: string; ink: string };

const formatPrice = (value: number) =>
  value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// Cœur de la fiche produit Charis : la 1ʳᵉ photo est affichée par défaut, un slider des autres
// photos permet de changer la photo principale — juxtaposé sur desktop (`lg:flex-row-reverse`,
// slider en colonne à gauche de la grande photo), empilé sur mobile (slider en ligne horizontale
// sous la grande photo). Défilement natif (scroll-snap non nécessaire ici, la liste tient déjà à
// l'écran ou scrolle simplement) — même esprit "pas de librairie externe" que PhotoSlider dans
// TemplateHestia.tsx.
function Gallery({
  images,
  productName,
  apiBaseUrl,
  palette,
  locale,
}: {
  images: ProductImage[];
  productName: string;
  apiBaseUrl: string;
  palette: ModulePalette;
  locale: Locale;
}) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];

  if (!main) {
    return (
      <div
        className="flex aspect-[3/4] w-full items-center justify-center"
        style={{ backgroundColor: palette.background, color: `${palette.ink}66` }}
      >
        {t(locale, "catalogue.noPhoto")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      <div className="aspect-[3/4] w-full overflow-hidden lg:flex-1">
        <img src={`${apiBaseUrl}${main.path}`} alt={productName} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] lg:w-24 lg:flex-none lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {images.map((img, index) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`${productName} — photo ${index + 1}`}
              className="aspect-[3/4] w-16 shrink-0 overflow-hidden transition-opacity duration-150 lg:w-full"
              style={{
                outline: index === active ? `2px solid ${palette.ink}` : `1px solid ${palette.ink}22`,
                outlineOffset: "-1px",
                opacity: index === active ? 1 : 0.75,
              }}
            >
              <img src={`${apiBaseUrl}${img.path}`} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="text-amber-400">
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

// Avis + formulaire, repris de ProductReviewModal (modules/catalogue/frontend/CatalogueSection.tsx)
// en inline plutôt qu'importé (comportement exclusif à cette page dédiée, voir docs/10-templates.md).
function Reviews({
  clientSiteId,
  productId,
  apiBaseUrl,
  palette,
  locale,
}: {
  clientSiteId: string;
  productId: string;
  apiBaseUrl: string;
  palette: ModulePalette;
  locale: Locale;
}) {
  const [reviews, setReviews] = useState<ProductReview[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products/${productId}/reviews`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setReviews)
      .catch(() => setReviews([]));
  }, [apiBaseUrl, clientSiteId, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    const res = await fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName, rating, comment }),
    });
    setStatus(res.ok ? "sent" : "error");
  };

  return (
    <div className="flex flex-col gap-4 border-t pt-8" style={{ borderColor: `${palette.ink}1A` }}>
      <h2 className="text-sm font-semibold uppercase tracking-[0.1em]" style={{ color: palette.ink }}>
        {t(locale, "catalogue.reviews")}
      </h2>

      {!reviews ? (
        <p className="text-sm" style={{ color: `${palette.ink}99` }}>
          …
        </p>
      ) : reviews.length === 0 ? (
        <p className="text-sm" style={{ color: `${palette.ink}99` }}>
          {t(locale, "catalogue.noReviews")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <div key={review.id} className="border-b pb-3 last:border-0" style={{ borderColor: `${palette.ink}1A` }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: palette.ink }}>
                  {review.authorName}
                </span>
                <Stars rating={review.rating} />
              </div>
              <p className="mt-1 text-sm" style={{ color: `${palette.ink}99` }}>
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      )}

      {status === "sent" ? (
        <p className="rounded-button p-3 text-sm" style={{ backgroundColor: `${palette.accent}18`, color: palette.ink }}>
          {t(locale, "catalogue.reviewThankYou")}
        </p>
      ) : showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-button p-4" style={{ backgroundColor: `${palette.background}` }}>
          <StarPicker value={rating} onChange={setRating} />
          <input
            className="rounded-button border px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: `${palette.ink}22`, color: palette.ink }}
            placeholder={t(locale, "catalogue.reviewNamePlaceholder")}
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            required
          />
          <textarea
            className="rounded-button border px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: `${palette.ink}22`, color: palette.ink }}
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
          className="self-start rounded-button border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: palette.accent, color: palette.accent }}
        >
          {t(locale, "catalogue.leaveReview")}
        </button>
      )}
    </div>
  );
}

function ProductPageContent({
  clientSiteId,
  productId,
  apiBaseUrl,
  palette,
  locale,
}: {
  clientSiteId: string;
  productId: string;
  apiBaseUrl: string;
  palette: ModulePalette;
  locale: Locale;
}) {
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products/${productId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setProduct)
      .catch(() => setProduct(null));
  }, [apiBaseUrl, clientSiteId, productId]);

  if (product === undefined) return null;

  if (product === null) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <a href={`/t/${clientSiteId}`} className="self-start text-sm font-medium hover:opacity-70" style={{ color: `${palette.ink}99` }}>
          {t(locale, "blog.backToSite")}
        </a>
        <p style={{ color: palette.ink }}>{t(locale, "blog.notFound")}</p>
      </div>
    );
  }

  const hasSizes = product.sizes.length > 0;
  const inStock = hasSizes ? product.sizes.some((s) => s.stock > 0) : product.stock > 0;
  const canAddToCart = hasSizes ? Boolean(selectedSize && selectedSize.stock > 0) : inStock;
  const maxStock = hasSizes ? selectedSize?.stock ?? 0 : product.stock;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <a href={`/t/${clientSiteId}`} className="self-start text-sm font-medium hover:opacity-70" style={{ color: `${palette.ink}99` }}>
        {t(locale, "blog.backToSite")}
      </a>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-start">
        <Gallery images={product.images} productName={product.name} apiBaseUrl={apiBaseUrl} palette={palette} locale={locale} />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold" style={{ color: palette.ink }}>
              {product.name}
            </h1>
            <span className="text-lg font-semibold" style={{ color: palette.accent }}>
              {formatPrice(product.price)}
            </span>
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed" style={{ color: `${palette.ink}99` }}>
              {product.description}
            </p>
          )}

          {!inStock && (
            <span className="w-fit rounded-pill bg-black/5 px-2.5 py-1 text-xs font-semibold text-red-500">
              {t(locale, "catalogue.outOfStock")}
            </span>
          )}

          {hasSizes && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: `${palette.ink}99` }}>
                {t(locale, "catalogue.size")}
              </span>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => {
                  const disabled = size.stock <= 0;
                  const selected = selectedSize?.id === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setSelectedSize(size);
                        setAdded(false);
                      }}
                      className={`rounded-button border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                        selected ? "text-white" : ""
                      }`}
                      style={
                        selected
                          ? { backgroundColor: palette.ink, borderColor: palette.ink }
                          : { borderColor: `${palette.ink}33`, color: palette.ink }
                      }
                    >
                      {size.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!canAddToCart}
            onClick={() => {
              addItem(
                product.id,
                product.name,
                product.price,
                maxStock,
                1,
                product.images[0]?.path,
                product.description,
                selectedSize?.label
              );
              setAdded(true);
            }}
            className="w-fit rounded-button px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            style={{ backgroundColor: palette.accent }}
          >
            {added ? t(locale, "catalogue.cart") : t(locale, "catalogue.addToCart")}
          </button>

          <Reviews clientSiteId={clientSiteId} productId={productId} apiBaseUrl={apiBaseUrl} palette={palette} locale={locale} />
        </div>
      </div>
    </div>
  );
}

type ProductPageProps = {
  clientSiteId: string;
  productId: string;
  apiBaseUrl: string;
};

// Page publique dédiée, exclusive au template Charis (grande photo + slider) — Hestia/Helios
// n'y renvoient jamais, ils gardent la modale de CatalogueSection.tsx. Voir docs/10-templates.md.
export default function ProductPage({ clientSiteId, productId, apiBaseUrl }: ProductPageProps) {
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
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-8">
        <CartProvider clientSiteId={clientSiteId}>
          <ProductPageContent
            clientSiteId={clientSiteId}
            productId={productId}
            apiBaseUrl={apiBaseUrl}
            palette={palette}
            locale={locale}
          />
          <CartButton clientSiteId={clientSiteId} palette={palette} locale={locale} />
        </CartProvider>
      </div>
    </SiteChrome>
  );
}
