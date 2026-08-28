import { useEffect, useMemo, useRef, useState } from "react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : import direct du
// dictionnaire i18n du module Multilingue — voir modules/multilingue/frontend/translations.ts.
import { t, type Locale } from "@modules/multilingue/frontend/translations";
// Autre écart assumé : contrairement à CatalogueSection.tsx (rendu par un template, palette reçue
// en prop), cette page est montée seule par une route dédiée (App.tsx, même principe que
// BlogPostPage.tsx) — rien ne lui fournit la palette du tenant, elle doit la résoudre elle-même via
// les hooks déjà utilisés par les templates plutôt que dupliquer cette logique.
import { useTemplate, type TemplateId } from "../../../frontend/src/hooks/useTemplate";
import { useModules } from "../../../frontend/src/hooks/useModules";
import { useContent } from "../../../frontend/src/hooks/useContent";
import { resolvePalette } from "../../../frontend/src/templates/registry";
import SiteFooter from "../../../frontend/src/templates/SiteFooter";
// Réutilise le vrai slider à survol de la home Charis (hover image, flèches) au lieu d'en refaire un
// neutre pour cette section — demandé par Ethan ("les mêmes sliders que sur la home"). Exclusif à
// Charis (voir docs/10-templates.md, "comportement survol/slider exclusif à ce template") : Hestia/
// Helios gardent une grille simple, ce mécanisme n'existe pas ailleurs pour eux non plus.
import { FeaturedSlider, type Product as CharisSliderProduct } from "../../../frontend/src/templates/charis/ProductGrid";
// Même écart : réutilise les champs pays/téléphone de l'admin (validation libphonenumber-js, menu
// stylisable) plutôt que de les refaire pour ce seul formulaire public.
import PhoneInput, { COUNTRIES } from "../../../frontend/src/components/admin/PhoneInput";
import Select from "../../../frontend/src/components/admin/Select";
import { CartProvider, useCart } from "./CartContext";

const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c.name, label: c.name }));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "Ink" et style de footer (clair/sombre) propres à chaque template — cette page n'a pas de police ni
// de nav propre (voir plus bas), mais réutilise quand même les couleurs de marque exactes du tenant
// pour le footer et le slider de suggestions, plutôt qu'une couleur neutre inventée pour l'occasion.
// Valeurs copiées des constantes `ink` de TemplateHestia.tsx/TemplateHelios.tsx/ProductPage.tsx (pas
// de fichier partagé pour ça à ce jour).
const TEMPLATE_INK: Record<TemplateId, string> = { hestia: "#211A16", helios: "#1A1512", charis: "#111111" };
const TEMPLATE_FOOTER_DARK: Record<TemplateId, boolean> = { hestia: true, helios: false, charis: true };

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
type AddressDetails = { addressLine1: string; postalCode: string; city: string; country: string };

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
  onSelectDetails,
  locale,
}: {
  id?: string;
  clientSiteId: string;
  apiBaseUrl: string;
  value: string;
  onChange: (address: string) => void;
  onSelectDetails: (details: AddressDetails) => void;
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
                  // Remplissage immédiat avec l'adresse formatée complète (retour perçu instantané),
                  // affiné juste après par les champs structurés une fois /address-details résolu —
                  // la recherche texte ci-dessus ne renvoie jamais rue/code postal/ville séparément.
                  onChange(s.address);
                  setSuggestions([]);

                  fetch(`${apiBaseUrl}/api/t/${clientSiteId}/google-places/address-details?placeId=${encodeURIComponent(s.placeId)}`)
                    .then((res) => (res.ok ? res.json() : null))
                    .then((details: AddressDetails | null) => {
                      if (details) onSelectDetails(details);
                    })
                    .catch(() => {});
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

// Logos de moyens de paiement simplifiés (pas les assets officiels des marques, juste des formes
// reconnaissables) à côté du badge de confiance Stripe — quasi systématique sur les pages de
// paiement des grandes enseignes (Zara, ASOS...), demandé par Ethan après une revue comparative.
function PaymentIcons() {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="flex h-6 w-9 items-center justify-center rounded bg-[#1A1F71] text-[9px] font-bold italic tracking-wide text-white">
        VISA
      </span>
      <span className="relative flex h-6 w-9 items-center justify-center rounded bg-white ring-1 ring-inset ring-border-subtle">
        <span className="absolute left-[9px] h-3.5 w-3.5 rounded-full bg-[#EB001B] opacity-90" />
        <span className="absolute right-[9px] h-3.5 w-3.5 rounded-full bg-[#F79E1B] opacity-90" />
      </span>
      <span className="flex h-6 w-9 items-center justify-center rounded bg-navy text-[9px] font-bold tracking-wide text-white">
        CB
      </span>
    </div>
  );
}

// Page panier volontairement identique pour tous les templates (pas de nav/police propre à
// Hestia/Helios, voir docs/10-templates.md) pour l'essentiel du contenu (tokens partagés etnof-web,
// comme BlogPostPage.tsx). Deux exceptions assumées, ajoutées à la demande d'Ethan : le footer et la
// section "Vous pourriez aussi aimer" reprennent les couleurs/comportements exacts du template actif
// (voir TEMPLATE_INK/TEMPLATE_FOOTER_DARK et SuggestedProducts plus bas) plutôt qu'un rendu neutre.
function CartPageContent({
  clientSiteId,
  apiBaseUrl,
  templateId,
  palette,
  siteName,
  logoUrl,
  stripeEnabled,
  locale,
}: {
  clientSiteId: string;
  apiBaseUrl: string;
  templateId: TemplateId | null;
  palette: { accent: string; background: string; ink: string };
  siteName: string;
  logoUrl: string | null;
  stripeEnabled: boolean;
  locale: Locale;
}) {
  const { accent } = palette;
  const { items, updateQuantity, removeItem, total } = useCart();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("France");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const emailValid = customerEmail.length === 0 || EMAIL_PATTERN.test(customerEmail);
  const phoneValid = useMemo(
    () => customerPhone.length === 0 || (parsePhoneNumberFromString(customerPhone)?.isValid() ?? false),
    [customerPhone]
  );
  const isCheckoutFormValid =
    firstName.trim() &&
    lastName.trim() &&
    EMAIL_PATTERN.test(customerEmail) &&
    phoneValid &&
    customerPhone.length > 0 &&
    addressLine1.trim() &&
    postalCode.trim() &&
    city.trim() &&
    termsAccepted;

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
        customerName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        customerEmail,
        customerPhone,
        customerAddressLine1: addressLine1,
        customerAddressLine2: addressLine2,
        customerPostalCode: postalCode,
        customerCity: city,
        customerCountry: country,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, size: i.size })),
        returnBaseUrl: `${window.location.origin}/t/${clientSiteId}/commande`,
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

  // Bandeau minimal (pas un vrai menu de navigation, volontairement — voir commentaire de fichier) :
  // rappelle juste l'identité du site (nom/logo) à côté du lien de retour, pour ne pas laisser la
  // page panier complètement déconnectée du reste du site.
  const header = (
    <div className="flex items-center justify-between">
      <a href={`/t/${clientSiteId}`} className="text-sm font-medium text-gray-text hover:text-navy">
        {t(locale, "blog.backToSite")}
      </a>
      {siteName && (
        <a href={`/t/${clientSiteId}`} className="flex items-center gap-2">
          {logoUrl && (
            <img src={`${apiBaseUrl}${logoUrl}`} alt={siteName} className="h-8 w-8 rounded-full object-cover" />
          )}
          <span className="text-sm font-semibold text-navy">{siteName}</span>
        </a>
      )}
    </div>
  );

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        {header}
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
    <div className="mx-auto flex max-w-7xl flex-col gap-12">
      {header}

      <h1 className="text-3xl font-black text-navy">{t(locale, "catalogue.cartTitle")}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        <div className="flex flex-col gap-6 rounded-card bg-white p-8 shadow-card">
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              // flex-col en mobile (image+infos, puis quantité/suppression sur leur propre ligne en
              // dessous) : à 390px, tout tenir sur une seule ligne (comme avant) écrasait le nom du
              // produit contre les boutons +/- et "Retirer" — remonté par Ethan. sm:flex-row revient
              // à une seule ligne dès qu'il y a la place. Vignette agrandie (h-14 → h-20) au passage,
              // le produit n'était pas assez visible.
              <div
                key={`${item.productId}-${item.size ?? ""}`}
                className="flex flex-col gap-3 rounded-button border border-border-subtle p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-button bg-black/5">
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
                <div className="flex items-center justify-between gap-2 sm:justify-end">
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
                  </div>
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

          <div className="flex items-baseline justify-between border-t border-border-subtle pt-4 text-sm text-gray-text">
            <span>{t(locale, "catalogue.shippingLabel")}</span>
            <span className="font-medium text-green-accent">{t(locale, "catalogue.shippingFree")}</span>
          </div>

          <div className="flex items-baseline justify-between">
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

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-text" htmlFor="cart-first-name">
                    {t(locale, "catalogue.firstNamePlaceholder")}
                  </label>
                  <input
                    id="cart-first-name"
                    className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                    placeholder={t(locale, "catalogue.firstNamePlaceholder")}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-text" htmlFor="cart-last-name">
                    {t(locale, "catalogue.lastNamePlaceholder")}
                  </label>
                  <input
                    id="cart-last-name"
                    className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                    placeholder={t(locale, "catalogue.lastNamePlaceholder")}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-text" htmlFor="cart-email">
                  {t(locale, "catalogue.emailPlaceholder")}
                </label>
                <input
                  id="cart-email"
                  className={`rounded-button border px-3 py-2 text-sm ${
                    emailTouched && !emailValid ? "border-red-400" : "border-border-subtle"
                  }`}
                  placeholder={t(locale, "catalogue.emailPlaceholder")}
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                />
                {emailTouched && !emailValid && (
                  <p className="text-xs text-red-500">{t(locale, "catalogue.emailInvalid")}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-text" htmlFor="cart-phone">
                  {t(locale, "catalogue.phonePlaceholder")}
                </label>
                <PhoneInput value={customerPhone} onChange={setCustomerPhone} placeholder={t(locale, "catalogue.phonePlaceholder")} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-text" htmlFor="cart-address">
                  {t(locale, "catalogue.addressPlaceholder")}
                </label>
                <DeliveryAddressAutocomplete
                  id="cart-address"
                  clientSiteId={clientSiteId}
                  apiBaseUrl={apiBaseUrl}
                  value={addressLine1}
                  onChange={setAddressLine1}
                  onSelectDetails={(details) => {
                    if (details.addressLine1) setAddressLine1(details.addressLine1);
                    if (details.postalCode) setPostalCode(details.postalCode);
                    if (details.city) setCity(details.city);
                    if (details.country) setCountry(details.country);
                  }}
                  locale={locale}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-text" htmlFor="cart-address-2">
                  {t(locale, "catalogue.addressLine2Placeholder")}
                </label>
                <input
                  id="cart-address-2"
                  className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                  placeholder={t(locale, "catalogue.addressLine2Placeholder")}
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-text" htmlFor="cart-postal-code">
                    {t(locale, "catalogue.postalCodePlaceholder")}
                  </label>
                  <input
                    id="cart-postal-code"
                    className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                    placeholder={t(locale, "catalogue.postalCodePlaceholder")}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-text" htmlFor="cart-city">
                    {t(locale, "catalogue.cityPlaceholder")}
                  </label>
                  <input
                    id="cart-city"
                    className="rounded-button border border-border-subtle px-3 py-2 text-sm"
                    placeholder={t(locale, "catalogue.cityPlaceholder")}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-text">{t(locale, "catalogue.countryLabel")}</label>
                <Select
                  className="rounded-button border border-border-subtle bg-white px-3 py-2 text-sm"
                  value={country}
                  onChange={setCountry}
                  options={COUNTRY_OPTIONS}
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
                disabled={status === "sending" || !isCheckoutFormValid}
                className="rounded-button px-4 py-2.5 font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                style={{ backgroundColor: accent }}
              >
                {status === "sending" ? t(locale, "catalogue.redirecting") : t(locale, "catalogue.payByCard")}
              </button>
              <PaymentIcons />
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
          <div className="flex items-baseline justify-between border-t border-border-subtle pt-3 text-xs text-gray-text">
            <span>{t(locale, "catalogue.shippingLabel")}</span>
            <span className="font-medium text-green-accent">{t(locale, "catalogue.shippingFree")}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-navy">{t(locale, "catalogue.total")}</span>
            <span className="text-lg font-bold text-navy">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      <SuggestedProducts
        clientSiteId={clientSiteId}
        apiBaseUrl={apiBaseUrl}
        excludeProductIds={items.map((i) => i.productId)}
        templateId={templateId}
        palette={palette}
        locale={locale}
      />
    </div>
  );
}

// "Vous pourriez aussi aimer" sous le récapitulatif — demandé par Ethan après une revue comparative
// (Amazon, ASOS...) : contrairement à un nav/footer complet, ça ne fait pas sortir du tunnel d'achat
// (ajout direct au panier), donc pas le même risque d'abandon. Sur Charis, réutilise le vrai
// `FeaturedSlider` de la home (survol qui change de photo, flèches) — demandé par Ethan pour que
// cette section ne soit pas une resucée neutre ; ce mécanisme reste exclusif à Charis ailleurs dans
// le projet (voir docs/10-templates.md), donc Hestia/Helios gardent une grille simple, cohérent avec
// le fait qu'ils n'ont ce comportement nulle part sur leur propre home. Un produit à tailles renvoie
// vers sa fiche (route déjà partagée, voir App.tsx) plutôt que de dupliquer un sélecteur de taille.
function SuggestedProducts({
  clientSiteId,
  apiBaseUrl,
  excludeProductIds,
  templateId,
  palette,
  locale,
}: {
  clientSiteId: string;
  apiBaseUrl: string;
  excludeProductIds: string[];
  templateId: TemplateId | null;
  palette: { accent: string; background: string; ink: string };
  locale: Locale;
}) {
  const { addItem } = useCart();
  const [products, setProducts] = useState<CharisSliderProduct[] | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/catalogue/products`)
      .then((res) => (res.ok ? res.json() : []))
      .then((all: CharisSliderProduct[]) => setProducts(all.filter((p) => !excludeProductIds.includes(p.id)).slice(0, 6)))
      .catch(() => setProducts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, clientSiteId]);

  if (!products || products.length === 0) return null;

  if (templateId === "charis") {
    return (
      <div className="flex flex-col gap-4 rounded-card bg-white p-6 shadow-card">
        <span className="text-sm font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
          {t(locale, "catalogue.youMayAlsoLike")}
        </span>
        <FeaturedSlider products={products} clientSiteId={clientSiteId} palette={palette} locale={locale} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-card bg-white p-6 shadow-card">
      <span className="text-sm font-semibold text-navy">{t(locale, "catalogue.youMayAlsoLike")}</span>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.slice(0, 4).map((product) => {
          const hasSizes = Boolean(product.sizes && product.sizes.length > 0);
          const inStock = hasSizes ? product.sizes!.some((s) => s.stock > 0) : product.stock > 0;
          const thumbnail = product.images[0];
          const productHref = `/t/${clientSiteId}/produits/${product.id}`;

          return (
            <div key={product.id} className="flex flex-col gap-2">
              <a href={productHref} className="block aspect-square overflow-hidden rounded-button bg-black/5">
                {thumbnail ? (
                  <img src={`${apiBaseUrl}${thumbnail.path}`} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[9px] text-gray-text/50">
                    {t(locale, "catalogue.noPhoto")}
                  </div>
                )}
              </a>
              <div className="flex flex-col gap-0.5">
                <span className="line-clamp-1 text-xs font-semibold text-navy">{product.name}</span>
                <span className="text-xs text-gray-text">{formatPrice(product.price)}</span>
              </div>
              {hasSizes ? (
                <a
                  href={productHref}
                  className="rounded-button border border-border-subtle px-2 py-1.5 text-center text-xs font-semibold text-navy hover:bg-bg-page-start"
                >
                  {t(locale, "catalogue.viewProduct")}
                </a>
              ) : (
                <button
                  type="button"
                  disabled={!inStock}
                  onClick={() => addItem(product.id, product.name, product.price, product.stock, 1, thumbnail?.path)}
                  className="rounded-button px-2 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: palette.accent }}
                >
                  {inStock ? t(locale, "catalogue.addToCart") : t(locale, "catalogue.outOfStock")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type CartPageProps = {
  clientSiteId: string;
  apiBaseUrl: string;
};

export default function CartPage({ clientSiteId, apiBaseUrl }: CartPageProps) {
  const { templateId, paletteId, customAccent, logoUrl } = useTemplate(clientSiteId);
  const modules = useModules(clientSiteId);
  const content = useContent(clientSiteId);
  const locale = readStoredLocale(clientSiteId);

  const resolvedPalette = templateId ? resolvePalette(templateId, paletteId, customAccent) : null;
  const background = resolvedPalette?.background ?? "#F8FAFC";
  const accent = resolvedPalette?.accent ?? "#2563EB";
  const ink = templateId ? TEMPLATE_INK[templateId] : "#1E293B";
  const footerDark = templateId ? TEMPLATE_FOOTER_DARK[templateId] : false;
  const palette = { accent, background, ink };

  // Footer partagé (SiteFooter.tsx, déjà réutilisé par les 3 templates) — demandé par Ethan, la page
  // panier n'en avait aucun jusqu'ici. Placement hors du conteneur `max-w-7xl` du contenu pour la
  // variante sombre (Hestia/Charis), qui doit occuper toute la largeur de l'écran comme sur la home ;
  // ré-enveloppé dans un `max-w-7xl` pour la variante claire (Helios), qui elle n'a pas de fond
  // propre et s'attend à hériter du conteneur appelant (même convention que TemplateHelios.tsx).
  const footer = footerDark ? (
    <SiteFooter content={content} palette={palette} modules={modules} locale={locale} dark />
  ) : (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
      <SiteFooter content={content} palette={palette} modules={modules} locale={locale} />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: background }}>
      <div className="flex-1 px-4 py-6 pb-16 sm:px-8 sm:pb-20">
        <CartProvider clientSiteId={clientSiteId}>
          <CartPageContent
            clientSiteId={clientSiteId}
            apiBaseUrl={apiBaseUrl}
            templateId={templateId}
            palette={palette}
            siteName={content?.siteName ?? ""}
            logoUrl={logoUrl}
            stripeEnabled={Boolean(modules?.stripe?.enabled)}
            locale={locale}
          />
        </CartProvider>
      </div>
      {footer}
    </div>
  );
}
