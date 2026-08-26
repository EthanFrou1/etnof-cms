import { useEffect, useRef, useState } from "react";
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : import direct du
// dictionnaire i18n du module Multilingue — voir modules/multilingue/frontend/translations.ts.
import { t, type Locale } from "@modules/multilingue/frontend/translations";
// Autre écart assumé : contrairement à CatalogueSection.tsx (rendu par un template, palette reçue
// en prop), cette page est montée seule par une route dédiée (App.tsx, même principe que
// BlogPostPage.tsx) — rien ne lui fournit la palette du tenant, elle doit la résoudre elle-même via
// les hooks déjà utilisés par les templates plutôt que dupliquer cette logique.
import { useTemplate } from "../../../frontend/src/hooks/useTemplate";
import { useModules } from "../../../frontend/src/hooks/useModules";
import { resolvePalette } from "../../../frontend/src/templates/registry";
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

type AddressSuggestion = { placeId: string; name: string; address: string };

const ADDRESS_SEARCH_DEBOUNCE_MS = 400;

// Autocomplete d'adresse pour le champ "Adresse de livraison" — même principe que
// AddressAutocomplete (frontend/src/pages/agency/shared.tsx) mais sans session admin : cette page
// est publique, donc elle appelle la route Google Places dédiée sans auth (voir
// backend/GooglePlacesEndpoints.cs, /api/t/{clientSiteId}/google-places/search, rate-limitée).
function DeliveryAddressAutocomplete({
  id,
  clientSiteId,
  apiBaseUrl,
  value,
  onChange,
  locale,
}: {
  id?: string;
  clientSiteId: string;
  apiBaseUrl: string;
  value: string;
  onChange: (address: string) => void;
  locale: Locale;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const userEdited = useRef(false);
  const latestQueryRef = useRef("");

  useEffect(() => {
    if (!userEdited.current) return;

    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const timeout = setTimeout(async () => {
      latestQueryRef.current = query;
      setSearching(true);

      const res = await fetch(
        `${apiBaseUrl}/api/t/${clientSiteId}/google-places/search?query=${encodeURIComponent(query)}`
      );
      const data = await res.json().catch(() => []);

      if (latestQueryRef.current !== query) return;
      setSearching(false);
      setSuggestions(res.ok ? (data as AddressSuggestion[]) : []);
    }, ADDRESS_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <input
        id={id}
        className="w-full rounded-button border border-border-subtle px-3 py-2 text-sm"
        value={value}
        onChange={(e) => {
          userEdited.current = true;
          onChange(e.target.value);
        }}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setTimeout(() => setInputFocused(false), 150)}
        placeholder={t(locale, "catalogue.addressPlaceholder")}
        autoComplete="off"
      />
      {searching && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-text/60">
          {t(locale, "catalogue.addressSearching")}
        </span>
      )}
      {inputFocused && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 flex flex-col gap-0.5 rounded-button border border-border-subtle bg-white p-1.5 shadow-soft">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="w-full rounded-button px-2 py-1.5 text-left text-sm hover:bg-black/5"
                onMouseDown={(e) => {
                  e.preventDefault();
                  userEdited.current = false;
                  onChange(s.address);
                  setSuggestions([]);
                }}
              >
                <span className="font-medium">{s.name}</span>
                <span className="block text-xs text-gray-text">{s.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // CGV du tenant (SiteContent.CgvContent, champ "core" dédié — voir CgvPage.tsx et
  // EstablishmentSection.tsx, onglet CGV) : obligation légale, pas une page libre optionnelle du
  // module Pages. Tant que ce champ est vide, le paiement reste bloqué (voir isCheckoutBlocked).
  const [cgvContent, setCgvContent] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/content`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { cgvContent: string } | null) => setCgvContent(data?.cgvContent ?? ""))
      .catch(() => setCgvContent(""));
  }, [apiBaseUrl, clientSiteId]);

  const cgvMissing = cgvContent !== null && !cgvContent.trim();

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
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size })),
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

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <a href={`/t/${clientSiteId}`} className="self-start text-sm font-medium text-gray-text hover:text-navy">
          {t(locale, "blog.backToSite")}
        </a>
        <h1 className="text-3xl font-black text-navy">{t(locale, "catalogue.cartTitle")}</h1>
        <div className="flex flex-col items-start gap-4 rounded-card bg-white p-8 shadow-card">
          <p className="text-gray-text">{t(locale, "catalogue.cartEmpty")}</p>
          <a
            href={`/t/${clientSiteId}/boutique`}
            className="rounded-button px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            {t(locale, "catalogue.viewShop")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <a href={`/t/${clientSiteId}`} className="self-start text-sm font-medium text-gray-text hover:text-navy">
        {t(locale, "blog.backToSite")}
      </a>

      <h1 className="text-3xl font-black text-navy">{t(locale, "catalogue.cartTitle")}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="flex flex-col gap-6 rounded-card bg-white p-8 shadow-card">
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={`${item.productId}-${item.size ?? ""}`} className="flex items-center justify-between gap-3 rounded-button border border-border-subtle p-3">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-button bg-black/5">
                    {item.imagePath ? (
                      <img src={`${apiBaseUrl}${item.imagePath}`} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[9px] text-gray-text/50">
                        {t(locale, "catalogue.noPhoto")}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-navy">
                      {item.name}
                      {item.size && <span className="font-normal text-gray-text"> — {item.size}</span>}
                    </span>
                    <span className="text-xs text-gray-text">
                      {formatPrice(item.price)} {t(locale, "catalogue.perUnit")}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1, item.size)}
                    className="h-7 w-7 rounded-button border border-border-subtle text-sm"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1, item.size)}
                    disabled={item.quantity >= item.maxStock}
                    className="h-7 w-7 rounded-button border border-border-subtle text-sm disabled:opacity-40"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId, item.size)}
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

          {stripeEnabled && cgvMissing ? (
            <p className="border-t border-border-subtle pt-4 text-sm text-gray-text">
              {t(locale, "catalogue.paymentUnavailable")}
            </p>
          ) : stripeEnabled ? (
            <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
              <span className="text-sm font-semibold text-navy">{t(locale, "catalogue.yourInfo")}</span>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-text" htmlFor="cart-name">
                  {t(locale, "catalogue.namePlaceholder")}
                </label>
                <input
                  id="cart-name"
                  className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                  placeholder={t(locale, "catalogue.namePlaceholder")}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-text" htmlFor="cart-email">
                  {t(locale, "catalogue.emailPlaceholder")}
                </label>
                <input
                  id="cart-email"
                  className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                  placeholder={t(locale, "catalogue.emailPlaceholder")}
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-text" htmlFor="cart-phone">
                  {t(locale, "catalogue.phonePlaceholder")}
                </label>
                <input
                  id="cart-phone"
                  className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                  placeholder={t(locale, "catalogue.phonePlaceholder")}
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-text" htmlFor="cart-address">
                  {t(locale, "catalogue.addressPlaceholder")}
                </label>
                <DeliveryAddressAutocomplete
                  id="cart-address"
                  clientSiteId={clientSiteId}
                  apiBaseUrl={apiBaseUrl}
                  value={customerAddress}
                  onChange={setCustomerAddress}
                  locale={locale}
                />
              </div>

              <label className="flex items-start gap-2 pt-2 text-xs text-gray-text">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <span>
                  {t(locale, "catalogue.acceptTermsPrefix")}{" "}
                  <a
                    href={`/t/${clientSiteId}/cgv`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-navy"
                  >
                    {t(locale, "catalogue.termsLinkLabel")}
                  </a>
                </span>
              </label>

              {status === "error" && error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={status === "sending" || !customerName || !customerEmail || !termsAccepted}
                className="rounded-button px-4 py-2.5 font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                style={{ backgroundColor: accent }}
              >
                {status === "sending" ? t(locale, "catalogue.redirecting") : t(locale, "catalogue.payByCard")}
              </button>
              <p className="text-center text-xs text-gray-text">{t(locale, "catalogue.checkoutTrustNote")}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-text">{t(locale, "catalogue.paymentUnavailable")}</p>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-card bg-white p-6 shadow-card lg:sticky lg:top-6">
          <span className="text-sm font-semibold text-navy">{t(locale, "catalogue.orderSummary")}</span>
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <div key={`${item.productId}-${item.size ?? ""}`} className="flex gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-button bg-black/5">
                  {item.imagePath ? (
                    <img src={`${apiBaseUrl}${item.imagePath}`} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-text/50">
                      {t(locale, "catalogue.noPhoto")}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold text-navy">
                    {item.name}
                    {item.size && <span className="font-normal text-gray-text"> — {item.size}</span>}
                  </span>
                  {item.description && (
                    <p className="line-clamp-2 text-xs text-gray-text">{item.description}</p>
                  )}
                  <span className="text-xs text-gray-text">
                    {item.quantity} × {formatPrice(item.price)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-baseline justify-between border-t border-border-subtle pt-3">
            <span className="text-sm font-semibold text-navy">{t(locale, "catalogue.total")}</span>
            <span className="text-lg font-bold text-navy">{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

type CartPageProps = {
  clientSiteId: string;
  apiBaseUrl: string;
};

export default function CartPage({ clientSiteId, apiBaseUrl }: CartPageProps) {
  const { templateId, paletteId, customAccent } = useTemplate(clientSiteId);
  const modules = useModules(clientSiteId);
  const locale = readStoredLocale(clientSiteId);

  const palette = templateId ? resolvePalette(templateId, paletteId, customAccent) : null;
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
