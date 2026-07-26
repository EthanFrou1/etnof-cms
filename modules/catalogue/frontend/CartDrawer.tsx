import { useState } from "react";
import { useCart } from "./CartContext";

const formatPrice = (value: number) =>
  value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

type CartDrawerProps = {
  apiBaseUrl: string;
  clientSiteId: string;
  open: boolean;
  onClose: () => void;
};

export default function CartDrawer({ apiBaseUrl, clientSiteId, open, onClose }: CartDrawerProps) {
  const { items, updateQuantity, removeItem, clear, total } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ orderId: string; total: number } | null>(null);

  if (!open) return null;

  const handleCheckout = async () => {
    setStatus("sending");
    setError(null);

    const res = await fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        customerEmail,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "La commande n'a pas pu être enregistrée.");
      setStatus("error");
      return;
    }

    const data = (await res.json()) as { orderId: string; total: number };
    setConfirmation(data);
    clear();
    setStatus("idle");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-navy/40" onClick={onClose} />
      <div className="relative flex w-full max-w-sm flex-col gap-4 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Panier</h2>
          <button type="button" onClick={onClose} className="text-sm text-gray-text hover:text-navy">
            Fermer
          </button>
        </div>

        {confirmation ? (
          <div className="flex flex-col gap-3">
            <p className="text-green-accent">
              Commande enregistrée — merci ! Total : {formatPrice(confirmation.total)}.
            </p>
            <p className="text-xs text-gray-text">Référence : {confirmation.orderId}</p>
            <button
              type="button"
              onClick={() => {
                setConfirmation(null);
                onClose();
              }}
              className="self-start text-sm font-medium text-brand-mid hover:text-brand-start"
            >
              Fermer
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-gray-text">Le panier est vide.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3 overflow-y-auto">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-2 rounded-button border border-border-subtle p-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-navy">{item.name}</span>
                    <span className="text-xs text-gray-text">{formatPrice(item.price)} / unité</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="h-6 w-6 rounded-button border border-border-subtle text-sm"
                    >
                      −
                    </button>
                    <span className="w-4 text-center text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxStock}
                      className="h-6 w-6 rounded-button border border-border-subtle text-sm disabled:opacity-40"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-baseline justify-between border-t border-border-subtle pt-3">
              <span className="font-semibold text-navy">Total</span>
              <span className="font-bold text-navy">{formatPrice(total)}</span>
            </div>

            <div className="flex flex-col gap-2">
              <input
                className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                placeholder="Nom"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                placeholder="Email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
              {status === "error" && error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={status === "sending" || !customerName || !customerEmail}
                className="rounded-button bg-brand-gradient px-4 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {status === "sending" ? "Envoi…" : "Valider la commande"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
