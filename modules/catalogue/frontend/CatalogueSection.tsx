import { useEffect, useState } from "react";
import { CartProvider, storageKey, useCart } from "./CartContext";
import CartDrawer from "./CartDrawer";

type ProductImage = {
  id: string;
  path: string;
};

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: ProductImage[];
};

// Voir docs/10-templates.md : un module reste isolé, redéclare localement la forme de la palette
// du template actif plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type CatalogueSectionProps = {
  apiBaseUrl: string;
  clientSiteId: string;
  palette: ModulePalette;
  stripeEnabled: boolean;
};

const formatPrice = (value: number) =>
  value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// Affiche le résultat du paiement au retour de Stripe Checkout (?checkout=success|cancel dans
// l'URL). Rendu en dehors de <CartProvider> et avant le "return null si aucun produit" plus bas :
// un client peut revenir de Stripe après avoir acheté le dernier exemplaire d'un produit qui reste
// affiché (juste en rupture de stock), mais on ne veut pas dépendre de cette hypothèse pour afficher
// la confirmation — d'où la lecture directe du localStorage plutôt que du contexte React du panier.
function CheckoutReturnBanner({ apiBaseUrl, clientSiteId, palette }: { apiBaseUrl: string; clientSiteId: string; palette: ModulePalette }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      localStorage.removeItem(storageKey(clientSiteId));
      const sessionId = params.get("session_id");

      if (sessionId) {
        fetch(`${apiBaseUrl}/api/t/${clientSiteId}/stripe/session/${sessionId}`)
          .then((res) => (res.ok ? (res.json() as Promise<{ status: string; amountTotal: number }>) : null))
          .then((data) => {
            setMessage(
              data && data.status === "paid"
                ? `Paiement reçu — merci pour votre commande de ${formatPrice(data.amountTotal)} !`
                : "Commande enregistrée — merci !"
            );
          })
          .catch(() => setMessage("Commande enregistrée — merci !"));
      } else {
        setMessage("Commande enregistrée — merci !");
      }
    } else if (checkout === "cancel") {
      setMessage("Paiement annulé — votre panier a été conservé.");
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

function ProductCard({ apiBaseUrl, product, palette }: { apiBaseUrl: string; product: Product; palette: ModulePalette }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const inStock = product.stock > 0;
  const thumbnail = product.images[0];

  return (
    <div className="flex flex-col overflow-hidden rounded-card bg-white shadow-card">
      <div className="aspect-square" style={{ backgroundColor: palette.background }}>
        {thumbnail ? (
          <img
            src={`${apiBaseUrl}${thumbnail.path}`}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-text/40">
            Pas de photo
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
        {product.description && (
          <p className="flex-1 text-sm leading-relaxed text-gray-text">{product.description}</p>
        )}
        <span
          className={`w-fit rounded-pill px-2.5 py-1 text-xs font-semibold ${inStock ? "" : "bg-black/5 text-red-500"}`}
          style={inStock ? { backgroundColor: `${palette.accent}24`, color: palette.accent } : undefined}
        >
          {inStock ? `En stock (${product.stock})` : "Rupture de stock"}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={product.stock}
            value={quantity}
            disabled={!inStock}
            onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, Number(e.target.value) || 1)))}
            className="w-16 rounded-button border border-border-subtle px-2 py-1.5 text-sm disabled:opacity-40"
          />
          <button
            type="button"
            disabled={!inStock}
            onClick={() => addItem(product.id, product.name, product.price, product.stock, quantity)}
            className="flex-1 rounded-button px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: palette.accent }}
          >
            Ajouter au panier
          </button>
        </div>
      </div>
    </div>
  );
}

function CartButton({ apiBaseUrl, clientSiteId, palette, stripeEnabled }: CatalogueSectionProps) {
  const { itemCount } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-pill px-5 py-3 text-sm font-semibold text-white shadow-soft"
        style={{ backgroundColor: palette.ink }}
      >
        Panier {itemCount > 0 && `(${itemCount})`}
      </button>
      <CartDrawer
        apiBaseUrl={apiBaseUrl}
        clientSiteId={clientSiteId}
        palette={palette}
        stripeEnabled={stripeEnabled}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export default function CatalogueSection({ apiBaseUrl, clientSiteId, palette, stripeEnabled }: CatalogueSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products`)
      .then((res) => res.json())
      .then(setProducts)
      .catch((err) => console.error("Erreur CatalogueSection :", err));
  }, [apiBaseUrl, clientSiteId]);

  // Un client peut revenir de Stripe (?checkout=...) alors que la liste de produits n'a pas encore
  // fini de charger, ou est vide — la bannière de confirmation doit s'afficher quoi qu'il arrive.
  const hasCheckoutReturn = new URLSearchParams(window.location.search).has("checkout");

  if (products.length === 0 && !hasCheckoutReturn) return null;

  return (
    <CartProvider clientSiteId={clientSiteId}>
      <CheckoutReturnBanner apiBaseUrl={apiBaseUrl} clientSiteId={clientSiteId} palette={palette} />

      {products.length === 0 ? null : (
      <section className="flex flex-col gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
          Catalogue
        </span>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} apiBaseUrl={apiBaseUrl} product={product} palette={palette} />
          ))}
        </div>
      </section>
      )}
      {products.length > 0 && (
        <CartButton apiBaseUrl={apiBaseUrl} clientSiteId={clientSiteId} palette={palette} stripeEnabled={stripeEnabled} />
      )}
    </CartProvider>
  );
}
