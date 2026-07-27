import { useEffect, useState } from "react";
import { CartProvider, useCart } from "./CartContext";
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
};

const formatPrice = (value: number) =>
  value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

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

function CartButton({ apiBaseUrl, clientSiteId, palette }: CatalogueSectionProps) {
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
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export default function CatalogueSection({ apiBaseUrl, clientSiteId, palette }: CatalogueSectionProps) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products`)
      .then((res) => res.json())
      .then(setProducts)
      .catch((err) => console.error("Erreur CatalogueSection :", err));
  }, [apiBaseUrl, clientSiteId]);

  if (products.length === 0) return null;

  return (
    <CartProvider clientSiteId={clientSiteId}>
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
      <CartButton apiBaseUrl={apiBaseUrl} clientSiteId={clientSiteId} palette={palette} />
    </CartProvider>
  );
}
