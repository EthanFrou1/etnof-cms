import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
  imagePath?: string;
  description?: string;
  // Facultatif — voir ProductSize.cs côté backend. Deux tailles du même produit forment deux
  // lignes de panier distinctes (identité d'une ligne = productId + size, voir addItem ci-dessous).
  size?: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (
    productId: string,
    name: string,
    price: number,
    maxStock: number,
    quantity: number,
    imagePath?: string,
    description?: string,
    size?: string
  ) => void;
  updateQuantity: (productId: string, quantity: number, size?: string) => void;
  removeItem: (productId: string, size?: string) => void;
  clear: () => void;
  total: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

// Exporté : CatalogueSection.tsx s'en sert pour vider le panier au retour d'un paiement Stripe
// réussi, sans dépendre du contexte React (la bannière de retour doit pouvoir s'afficher même si
// la liste de produits est vide, donc hors de <CartProvider>).
export function storageKey(clientSiteId: string) {
  return `etnof-cart-${clientSiteId}`;
}

export function CartProvider({ clientSiteId, children }: { clientSiteId: string; children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey(clientSiteId));
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey(clientSiteId), JSON.stringify(items));
  }, [clientSiteId, items]);

  const addItem: CartContextValue["addItem"] = (productId, name, price, maxStock, quantity, imagePath, description, size) => {
    setItems((current) => {
      const existing = current.find((i) => i.productId === productId && i.size === size);
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + quantity, maxStock);
        return current.map((i) => (i === existing ? { ...i, quantity: nextQuantity } : i));
      }
      return [...current, { productId, name, price, maxStock, quantity: Math.min(quantity, maxStock), imagePath, description, size }];
    });
  };

  const updateQuantity: CartContextValue["updateQuantity"] = (productId, quantity, size) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((i) => !(i.productId === productId && i.size === size))
        : current.map((i) => (i.productId === productId && i.size === size ? { ...i, quantity: Math.min(quantity, i.maxStock) } : i))
    );
  };

  const removeItem: CartContextValue["removeItem"] = (productId, size) => {
    setItems((current) => current.filter((i) => !(i.productId === productId && i.size === size)));
  };

  const clear = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clear, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé à l'intérieur de CartProvider");
  return ctx;
}
