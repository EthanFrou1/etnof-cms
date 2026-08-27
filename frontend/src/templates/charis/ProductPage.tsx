import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import { CartProvider, useCart } from "@modules/catalogue/frontend/CartContext";
import StockRequestForm from "@modules/catalogue/frontend/StockRequestForm";
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
import { FeaturedSlider, type Product as SliderProduct } from "./ProductGrid";

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
  collectionId: string | null;
};

type Collection = { id: string; name: string };

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

// Seuil en dessous duquel on affiche "Plus que N en stock" — repère informel, pas une donnée
// configurable (voir catalogue.lowStock).
const LOW_STOCK_THRESHOLD = 5;

// Nombre de vignettes affichées avant de replier le reste derrière un "+N" sur la dernière —
// demandé par Ethan : un produit avec beaucoup de photos (pas de limite côté admin) rendait la
// colonne de vignettes disproportionnée par rapport au reste de la page. Même patron qu'Instagram/
// Airbnb : cliquer le "+N" ouvre directement le carrousel plein écran (déjà présent) pour parcourir
// le reste, plutôt que d'étirer la mise en page.
const MAX_THUMBNAILS = 5;

// Nombre d'avis affichés avant de replier le reste derrière "Voir les N avis" — même logique que
// MAX_THUMBNAILS : tous les avis sont déjà chargés en un seul appel, pas besoin de pagination
// serveur, juste éviter d'étirer la page si un produit en accumule beaucoup.
const REVIEWS_PREVIEW_COUNT = 3;

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
  // Zoom plein écran au clic sur la grande photo — même patron que la lightbox de
  // modules/galerie/frontend/GallerySection.tsx (portail, fermeture Échap, flèches prev/next),
  // dupliqué ici plutôt qu'importé : comportement propre à cette page, pas au module Galerie.
  const [zoomed, setZoomed] = useState(false);
  const main = images[active] ?? images[0];

  const showPrevious = () => setActive((i) => (i - 1 + images.length) % images.length);
  const showNext = () => setActive((i) => (i + 1) % images.length);

  useEffect(() => {
    if (!zoomed) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
      if (e.key === "ArrowLeft") showPrevious();
      if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed, images.length]);

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
      <button
        type="button"
        onClick={() => setZoomed(true)}
        aria-label={productName}
        className="aspect-[3/4] w-full cursor-zoom-in overflow-hidden lg:flex-1"
      >
        <img src={`${apiBaseUrl}${main.path}`} alt={productName} className="h-full w-full object-cover" />
      </button>

      {zoomed &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setZoomed(false)}>
            <img
              src={`${apiBaseUrl}${main.path}`}
              alt={productName}
              className="max-h-full max-w-full cursor-zoom-out rounded-button object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    showPrevious();
                  }}
                  aria-label={t(locale, "gallery.previous")}
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white hover:bg-white/20 sm:left-4"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    showNext();
                  }}
                  aria-label={t(locale, "gallery.next")}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white hover:bg-white/20 sm:right-4"
                >
                  ›
                </button>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-pill bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                  {active + 1} / {images.length}
                </span>
              </>
            )}

            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label={t(locale, "gallery.close")}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl leading-none text-white hover:bg-white/20"
            >
              ×
            </button>
          </div>,
          document.body
        )}

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] lg:w-24 lg:flex-none lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0 [&::-webkit-scrollbar]:hidden">
          {images.slice(0, MAX_THUMBNAILS).map((img, index) => {
            const hiddenCount = images.length - MAX_THUMBNAILS;
            const isMoreTile = index === MAX_THUMBNAILS - 1 && hiddenCount > 0;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => {
                  setActive(index);
                  if (isMoreTile) setZoomed(true);
                }}
                aria-label={isMoreTile ? `${productName} — voir les ${images.length} photos` : `${productName} — photo ${index + 1}`}
                className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden transition-opacity duration-150 lg:w-full"
                style={{
                  outline: index === active ? `2px solid ${palette.ink}` : `1px solid ${palette.ink}22`,
                  outlineOffset: "-1px",
                  opacity: index === active ? 1 : 0.75,
                }}
              >
                <img src={`${apiBaseUrl}${img.path}`} alt="" className="h-full w-full object-cover" />
                {isMoreTile && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
                    +{hiddenCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Tableau générique de correspondance des tailles (S à XL, en cm) — pas de données par produit
// côté backend, donc pas propre à un produit précis : sert de repère indicatif, comme sur la
// plupart des sites de mode. Voir catalogue.sizeGuideNote (prévient que c'est indicatif).
const SIZE_GUIDE_ROWS = [
  { label: "XS", chest: "82–85", waist: "63–66", hips: "88–91" },
  { label: "S", chest: "86–89", waist: "67–70", hips: "92–95" },
  { label: "M", chest: "90–93", waist: "71–75", hips: "96–100" },
  { label: "L", chest: "94–98", waist: "76–81", hips: "101–105" },
  { label: "XL", chest: "99–104", waist: "82–88", hips: "106–111" },
];

function SizeGuideModal({ palette, locale, onClose }: { palette: ModulePalette; locale: Locale; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-card bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em]" style={{ color: palette.ink }}>
            {t(locale, "catalogue.sizeGuide")}
          </h2>
          <button type="button" onClick={onClose} aria-label={t(locale, "gallery.close")} className="text-xl leading-none" style={{ color: palette.ink }}>
            ×
          </button>
        </div>
        <table className="w-full border-collapse text-left text-sm" style={{ color: palette.ink }}>
          <thead>
            <tr className="border-b" style={{ borderColor: `${palette.ink}1A` }}>
              <th className="py-2 font-semibold" />
              <th className="py-2 font-semibold">{t(locale, "catalogue.sizeGuideChest")}</th>
              <th className="py-2 font-semibold">{t(locale, "catalogue.sizeGuideWaist")}</th>
              <th className="py-2 font-semibold">{t(locale, "catalogue.sizeGuideHips")}</th>
            </tr>
          </thead>
          <tbody>
            {SIZE_GUIDE_ROWS.map((row) => (
              <tr key={row.label} className="border-b" style={{ borderColor: `${palette.ink}0F` }}>
                <td className="py-2 font-semibold">{row.label}</td>
                <td className="py-2">{row.chest}</td>
                <td className="py-2">{row.waist}</td>
                <td className="py-2">{row.hips}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs" style={{ color: `${palette.ink}80` }}>
          {t(locale, "catalogue.sizeGuideNote")}
        </p>
      </div>
    </div>
  );
}

// `html` : Livraison/Retours viennent du RichTextEditor de l'admin (EstablishmentSection.tsx),
// Paiement sécurisé reste un texte de traduction statique — les deux passent par la même
// interpolation HTML, sans balise elle ne change rien à un texte brut.
function AccordionItem({ title, html, palette }: { title: string; html: string; palette: ModulePalette }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: `${palette.ink}1A` }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-3 text-left text-sm font-semibold"
        style={{ color: palette.ink }}
      >
        {title}
        <span style={{ color: `${palette.ink}80` }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div
          className="pb-3 text-sm leading-relaxed [&_a]:underline [&_p]:m-0"
          style={{ color: `${palette.ink}99` }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}

// Renommé (ex-DeliveryReturns) : regroupe maintenant aussi le paiement sécurisé (Stripe), demandé
// par Ethan avec le même traitement visuel que livraison/retours. Livraison/Retours sont éditables
// par tenant (SiteContent.DeliveryContent/ReturnsContent, voir EstablishmentSection.tsx) — vides
// par défaut (tous les commerces ne font pas de livraison/retours), section correspondante
// simplement absente tant que le champ est vide plutôt qu'un accordéon qui s'ouvre sur du vide
// (même logique que "Notre histoire", voir hasStory). "Paiement sécurisé" reste toujours affiché.
function PurchaseInfo({
  palette,
  locale,
  deliveryContent,
  returnsContent,
}: {
  palette: ModulePalette;
  locale: Locale;
  deliveryContent: string;
  returnsContent: string;
}) {
  return (
    <div className="flex flex-col">
      {deliveryContent.trim() && (
        <AccordionItem title={t(locale, "catalogue.deliveryTitle")} html={deliveryContent} palette={palette} />
      )}
      {returnsContent.trim() && (
        <AccordionItem title={t(locale, "catalogue.returnsTitle")} html={returnsContent} palette={palette} />
      )}
      <AccordionItem title={t(locale, "catalogue.securePaymentTitle")} html={t(locale, "catalogue.securePaymentText")} palette={palette} />
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
  const [showAllReviews, setShowAllReviews] = useState(false);
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

  const average = reviews && reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <div className="flex flex-col gap-4 border-t pt-8" style={{ borderColor: `${palette.ink}1A` }}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em]" style={{ color: palette.ink }}>
          {t(locale, "catalogue.reviews")}
        </h2>
        {reviews && reviews.length > 0 && (
          <span className="flex items-center gap-1.5 text-sm">
            <Stars rating={average} />
            <span style={{ color: `${palette.ink}99` }}>
              {average.toFixed(1)} ({reviews.length} {t(locale, "catalogue.reviewsCount")})
            </span>
          </span>
        )}
      </div>

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
          {(showAllReviews ? reviews : reviews.slice(0, REVIEWS_PREVIEW_COUNT)).map((review) => (
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
          {!showAllReviews && reviews.length > REVIEWS_PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setShowAllReviews(true)}
              className="self-start text-sm font-medium underline underline-offset-2 hover:opacity-70"
              style={{ color: palette.ink }}
            >
              {t(locale, "catalogue.showAllReviews", { count: String(reviews.length) })}
            </button>
          )}
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

// Section "Nos autres produits" en bas de fiche — demandé par Ethan : slider de 3 tuiles visibles
// (même composant que ProductGrid.tsx sur la home/boutique), jusqu'à 5 produits au total si le
// catalogue en a assez. Priorise les produits de la même collection que celui affiché, complète avec
// les autres tant qu'il en manque — jamais le produit courant.
function RelatedProducts({
  clientSiteId,
  apiBaseUrl,
  currentProductId,
  currentCollectionId,
  collectionsById,
  palette,
  locale,
}: {
  clientSiteId: string;
  apiBaseUrl: string;
  currentProductId: string;
  currentCollectionId: string | null;
  collectionsById: Record<string, string>;
  palette: ModulePalette;
  locale: Locale;
}) {
  const [related, setRelated] = useState<SliderProduct[] | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products`)
      .then((res) => (res.ok ? res.json() : []))
      .then((all: SliderProduct[]) => {
        const others = all.filter((p) => p.id !== currentProductId);
        const sameCollection = currentCollectionId ? others.filter((p) => p.collectionId === currentCollectionId) : [];
        const rest = others.filter((p) => !sameCollection.includes(p));
        setRelated([...sameCollection, ...rest].slice(0, 5));
      })
      .catch(() => setRelated([]));
  }, [apiBaseUrl, clientSiteId, currentProductId, currentCollectionId]);

  if (!related || related.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 border-t pt-10" style={{ borderColor: `${palette.ink}1A` }}>
      <span className="text-xl font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
        {t(locale, "catalogue.otherProducts")}
      </span>
      <FeaturedSlider products={related} clientSiteId={clientSiteId} palette={palette} locale={locale} collectionsById={collectionsById} />
    </div>
  );
}

function ProductPageContent({
  clientSiteId,
  productId,
  apiBaseUrl,
  palette,
  locale,
  deliveryContent,
  returnsContent,
}: {
  clientSiteId: string;
  productId: string;
  apiBaseUrl: string;
  palette: ModulePalette;
  locale: Locale;
  deliveryContent: string;
  returnsContent: string;
}) {
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  // Barre d'ajout au panier sticky (mobile uniquement, voir plus bas) : visible dès que le bouton
  // principal sort du viewport, via IntersectionObserver — pas de librairie de scroll-tracking.
  const addToCartRef = useRef<HTMLButtonElement>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  // Chargé ici (plutôt que dans RelatedProducts) et redescendu en prop : sert au fil d'Ariane
  // (nom de la collection) ET au badge collection du slider "Nos autres produits" — évite un fetch
  // dupliqué des collections pour la même page.
  const [collectionsById, setCollectionsById] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products/${productId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setProduct)
      .catch(() => setProduct(null));
  }, [apiBaseUrl, clientSiteId, productId]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/collections`)
      .then((res) => (res.ok ? res.json() : []))
      .then((collections: Collection[]) =>
        setCollectionsById(collections.reduce<Record<string, string>>((acc, c) => ({ ...acc, [c.id]: c.name }), {}))
      )
      .catch(() => setCollectionsById({}));
  }, [apiBaseUrl, clientSiteId]);

  useEffect(() => {
    const el = addToCartRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setShowStickyBar(!entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [product]);

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
  // Rupture "réelle" à signaler au tenant (StockRequestForm) : une taille précise épuisée si le
  // client en a choisi une, sinon (aucune sélection) seulement si le produit est entièrement
  // épuisé — ne pas afficher "prévenez-moi" simplement parce qu'aucune taille n'a encore été
  // cliquée alors que d'autres restent disponibles.
  const showStockRequest = hasSizes ? (selectedSize ? selectedSize.stock <= 0 : !inStock) : !inStock;
  const collectionName = product.collectionId ? collectionsById[product.collectionId] : undefined;
  const lowStock = maxStock > 0 && maxStock <= LOW_STOCK_THRESHOLD;

  const handleAddToCart = () => {
    addItem(product.id, product.name, product.price, maxStock, quantity, product.images[0]?.path, product.description, selectedSize?.label);
    setAdded(true);
    setQuantity(1);
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm" style={{ color: `${palette.ink}80` }}>
        <a href={`/t/${clientSiteId}`} className="hover:opacity-70">
          {t(locale, "breadcrumb.home")}
        </a>
        <span aria-hidden="true">/</span>
        <a href={`/t/${clientSiteId}/boutique`} className="hover:opacity-70">
          {t(locale, "nav.catalogue")}
        </a>
        {collectionName && (
          <>
            <span aria-hidden="true">/</span>
            <a href={`/t/${clientSiteId}/boutique?collection=${product.collectionId}`} className="hover:opacity-70">
              {collectionName}
            </a>
          </>
        )}
        <span aria-hidden="true">/</span>
        <span className="font-medium" style={{ color: palette.ink }}>
          {product.name}
        </span>
      </nav>

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
          {inStock && lowStock && (
            // Couleur fixe (ambre), pas palette.accent : un signal de rareté doit rester
            // reconnaissable quel que soit l'accent choisi par le tenant — demandé par Ethan, le
            // badge passait inaperçu en héritant de la couleur de marque (même traitement que
            // !inStock ci-dessus, qui utilise déjà text-red-500 plutôt que palette.accent).
            <span className="flex w-fit items-center gap-1.5 rounded-pill bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {t(locale, "catalogue.lowStock", { count: String(maxStock) })}
            </span>
          )}

          {hasSizes && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: `${palette.ink}99` }}>
                  {t(locale, "catalogue.size")}
                </span>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(true)}
                  className="text-xs font-medium underline underline-offset-2 hover:opacity-70"
                  style={{ color: palette.ink }}
                >
                  {t(locale, "catalogue.sizeGuide")}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => {
                  const disabled = size.stock <= 0;
                  const selected = selectedSize?.id === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      // Reste cliquable même épuisée (pas de `disabled` natif) — permet au client de
                      // choisir précisément la taille qui l'intéresse pour la demande de réassort
                      // ci-dessous (StockRequestForm), plutôt qu'un bouton totalement inerte.
                      onClick={() => {
                        setSelectedSize(size);
                        setAdded(false);
                        setQuantity(1);
                      }}
                      className={`rounded-button border px-4 py-2 text-sm font-medium transition-colors ${
                        disabled ? "cursor-not-allowed opacity-30" : ""
                      } ${selected ? "text-white" : ""}`}
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

          {inStock && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: `${palette.ink}99` }}>
                {t(locale, "catalogue.quantity")}
              </span>
              <div className="flex w-fit items-center rounded-button border" style={{ borderColor: `${palette.ink}33` }}>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="-"
                  className="flex h-10 w-10 items-center justify-center text-lg disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ color: palette.ink }}
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-medium" style={{ color: palette.ink }}>
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                  disabled={quantity >= maxStock}
                  aria-label="+"
                  className="flex h-10 w-10 items-center justify-center text-lg disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ color: palette.ink }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <button
            ref={addToCartRef}
            type="button"
            disabled={!canAddToCart}
            onClick={handleAddToCart}
            className="w-fit rounded-button px-6 py-3 text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            style={{ backgroundColor: palette.accent }}
          >
            {added ? t(locale, "catalogue.cart") : t(locale, "catalogue.addToCart")}
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

          <PurchaseInfo palette={palette} locale={locale} deliveryContent={deliveryContent} returnsContent={returnsContent} />

          <Reviews clientSiteId={clientSiteId} productId={productId} apiBaseUrl={apiBaseUrl} palette={palette} locale={locale} />
        </div>
      </div>

      {showSizeGuide && <SizeGuideModal palette={palette} locale={locale} onClose={() => setShowSizeGuide(false)} />}

      <RelatedProducts
        clientSiteId={clientSiteId}
        apiBaseUrl={apiBaseUrl}
        currentProductId={product.id}
        currentCollectionId={product.collectionId}
        collectionsById={collectionsById}
        palette={palette}
        locale={locale}
      />

      {/* Barre sticky mobile (sm:hidden) : visible dès que le bouton "Ajouter au panier" principal
          sort du viewport (voir l'IntersectionObserver plus haut) — la fiche est longue (avis,
          produits liés), pas besoin de remonter tout en haut pour acheter. */}
      {showStickyBar &&
        inStock &&
        createPortal(
          <div
            className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t bg-white px-4 py-3 shadow-soft sm:hidden"
            style={{ borderColor: `${palette.ink}1A` }}
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium" style={{ color: palette.ink }}>
                {product.name}
              </span>
              <span className="text-sm font-semibold" style={{ color: palette.accent }}>
                {formatPrice(product.price)}
              </span>
            </div>
            <button
              type="button"
              disabled={!canAddToCart}
              onClick={handleAddToCart}
              className="shrink-0 rounded-button px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: palette.accent }}
            >
              {added ? t(locale, "catalogue.cart") : t(locale, "catalogue.addToCart")}
            </button>
          </div>,
          document.body
        )}
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
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-8">
        <CartProvider clientSiteId={clientSiteId}>
          <ProductPageContent
            clientSiteId={clientSiteId}
            productId={productId}
            apiBaseUrl={apiBaseUrl}
            palette={palette}
            locale={locale}
            deliveryContent={content?.deliveryContent ?? ""}
            returnsContent={content?.returnsContent ?? ""}
          />
          <CartButton clientSiteId={clientSiteId} palette={palette} locale={locale} />
        </CartProvider>
      </div>
    </SiteChrome>
  );
}
