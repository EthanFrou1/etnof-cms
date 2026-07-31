import { useState } from "react";
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : import direct du
// dictionnaire i18n du module Multilingue — voir modules/multilingue/frontend/translations.ts.
import { t, type Locale } from "@modules/multilingue/frontend/translations";
// Autre écart assumé : contrairement à CatalogueSection.tsx (rendu par un template, palette reçue
// en prop), cette page est montée seule par une route dédiée (App.tsx, même principe que
// BlogPostPage.tsx) — rien ne lui fournit la palette du tenant, elle doit la résoudre elle-même via
// les hooks déjà utilisés par les templates plutôt que dupliquer cette logique.
import { useTemplate } from "../../../frontend/src/hooks/useTemplate";
import { useModules } from "../../../frontend/src/hooks/useModules";
import { TEMPLATES } from "../../../frontend/src/templates/registry";
import { CartProvider, useCart } from "./CartContext";

// Même logique que BlogPostPage.tsx : cette page est montée seule (route dédiée dans App.tsx, pas
// nichée dans un template), donc pas de state partagé possible avec le sélecteur de langue de la
// page d'accueil — on relit juste le choix déjà persisté pour ce tenant.
function readStoredLocale(clientSiteId: string): Locale {
  const stored = localStorage.getItem(`etnof-locale-${clientSiteId}`);
  return stored === "en" || stored === "es" ? stored : "fr";
}

const formatPrice = (value: number) =>
  value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// Page panier volontairement identique pour tous les templates (pas de nav/police propre à
// Hestia/Helios, voir docs/10-templates.md) — seules les 2 couleurs de la palette active (accent +
// fond) sont reprises, le reste utilise les tokens partagés etnof-web (comme BlogPostPage.tsx).
function CartPageContent({
  clientSiteId,
  apiBaseUrl,
  accent,
  stripeEnabled,
  locale,
}: {
  clientSiteId: string;
  apiBaseUrl: string;
  accent: string;
  stripeEnabled: boolean;
  locale: Locale;
}) {
  const { items, updateQuantity, removeItem, total } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Redirige vers Stripe Checkout (page hébergée par Stripe) — le panier n'est vidé qu'au retour en
  // cas de succès (voir CatalogueSection.tsx), pas ici : si le client annule sur la page Stripe, il
  // retrouve son panier intact. Aucune commande n'est créée à cette étape, seulement à la
  // confirmation du paiement par webhook (voir modules/stripe/backend/StripeModule.cs).
  const handleCheckout = async () => {
    setStatus("sending");
    setError(null);

    const res = await fetch(`${apiBaseUrl}/api/t/${clientSiteId}/stripe/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        customerEmail,
        customerPhone,
        customerAddress,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        returnBaseUrl: `${window.location.origin}/t/${clientSiteId}`,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? t(locale, "catalogue.checkoutFailed"));
      setStatus("error");
      return;
    }

    const data = (await res.json()) as { url: string };
    window.location.href = data.url;
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <a href={`/t/${clientSiteId}`} className="self-start text-sm font-medium text-gray-text hover:text-navy">
        {t(locale, "blog.backToSite")}
      </a>

      <h1 className="text-3xl font-black text-navy">{t(locale, "catalogue.cartTitle")}</h1>

      {items.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-gray-text shadow-card">{t(locale, "catalogue.cartEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-6 rounded-card bg-white p-8 shadow-card">
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-2 rounded-button border border-border-subtle p-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-navy">{item.name}</span>
                  <span className="text-xs text-gray-text">
                    {formatPrice(item.price)} {t(locale, "catalogue.perUnit")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="h-7 w-7 rounded-button border border-border-subtle text-sm"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= item.maxStock}
                    className="h-7 w-7 rounded-button border border-border-subtle text-sm disabled:opacity-40"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="text-xs text-red-500 hover:text-red-600"
                  >
                    {t(locale, "catalogue.remove")}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-baseline justify-between border-t border-border-subtle pt-4">
            <span className="font-semibold text-navy">{t(locale, "catalogue.total")}</span>
            <span className="text-xl font-bold text-navy">{formatPrice(total)}</span>
          </div>

          {stripeEnabled ? (
            <div className="flex flex-col gap-2">
              <input
                className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                placeholder={t(locale, "catalogue.namePlaceholder")}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <input
                className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                placeholder={t(locale, "catalogue.emailPlaceholder")}
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
              <input
                className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                placeholder={t(locale, "catalogue.phonePlaceholder")}
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              <input
                className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                placeholder={t(locale, "catalogue.addressPlaceholder")}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
              {status === "error" && error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={status === "sending" || !customerName || !customerEmail}
                className="rounded-button px-4 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: accent }}
              >
                {status === "sending" ? t(locale, "catalogue.redirecting") : t(locale, "catalogue.payByCard")}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-text">{t(locale, "catalogue.paymentUnavailable")}</p>
          )}
        </div>
      )}
    </div>
  );
}

type CartPageProps = {
  clientSiteId: string;
  apiBaseUrl: string;
};

export default function CartPage({ clientSiteId, apiBaseUrl }: CartPageProps) {
  const { templateId, paletteId } = useTemplate(clientSiteId);
  const modules = useModules(clientSiteId);
  const locale = readStoredLocale(clientSiteId);

  const template = TEMPLATES.find((tpl) => tpl.id === templateId);
  const palette = template?.palettes.find((p) => p.id === paletteId) ?? template?.palettes[0];
  const background = palette?.background ?? "#F8FAFC";
  const accent = palette?.accent ?? "#2563EB";

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8" style={{ backgroundColor: background }}>
      <CartProvider clientSiteId={clientSiteId}>
        <CartPageContent
          clientSiteId={clientSiteId}
          apiBaseUrl={apiBaseUrl}
          accent={accent}
          stripeEnabled={Boolean(modules?.stripe?.enabled)}
          locale={locale}
        />
      </CartProvider>
    </div>
  );
}
