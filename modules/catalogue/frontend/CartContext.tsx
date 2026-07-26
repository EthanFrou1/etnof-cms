import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (productId: string, name: string, price: number, maxStock: number, quantity: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
  total: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(clientSiteId: string) {
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

  const addItem: CartContextValue["addItem"] = (productId, name, price, maxStock, quantity) => {
    setItems((current) => {
      const existing = current.find((i) => i.productId === productId);
      if (existing) {
        const nextQuantity = Math.min(existing.quantity + quantity, maxStock);
        return current.map((i) => (i.productId === productId ? { ...i, quantity: nextQuantity } : i));
      }
      return [...current, { productId, name, price, maxStock, quantity: Math.min(quantity, maxStock) }];
    });
  };

  const updateQuantity: CartContextValue["updateQuantity"] = (productId, quantity) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((i) => i.productId !== productId)
        : current.map((i) => (i.productId === productId ? { ...i, quantity: Math.min(quantity, i.maxStock) } : i))
    );
  };

  const removeItem: CartContextValue["removeItem"] = (productId) => {
    setItems((current) => current.filter((i) => i.productId !== productId));
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
