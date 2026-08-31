import { useEffect, useState } from "react";
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md), même principe que
// CartPage.tsx : import direct du dictionnaire i18n du module Multilingue.
import { t, type Locale } from "@modules/multilingue/frontend/translations";
// Même écart que CartPage.tsx : page montée seule par une route dédiée (App.tsx), pas nichée dans un
// template — elle résout elle-même le tenant actif via les hooks déjà utilisés par les templates.
import { useTemplate, type TemplateId } from "../../../frontend/src/hooks/useTemplate";
import { useModules } from "../../../frontend/src/hooks/useModules";
import { useContent } from "../../../frontend/src/hooks/useContent";
import { resolvePalette } from "../../../frontend/src/templates/registry";
import SiteFooter from "../../../frontend/src/templates/SiteFooter";
import { storageKey } from "./CartContext";

// Dupliqué de CartPage.tsx plutôt que factorisé (voir commentaire de ce fichier) : ce socle favorise
// déjà la duplication entre pages/modules isolés plutôt que des abstractions transverses.
const TEMPLATE_INK: Record<TemplateId, string> = { hestia: "#211A16", helios: "#1A1512", charis: "#111111" };
const TEMPLATE_FOOTER_DARK: Record<TemplateId, boolean> = { hestia: true, helios: false, charis: true };

function readStoredLocale(clientSiteId: string): Locale {
  const stored = localStorage.getItem(`etnof-locale-${clientSiteId}`);
  return stored === "en" || stored === "es" ? stored : "fr";
}

const formatPrice = (value: number) =>
  value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

type Result =
  | { kind: "loading" }
  | { kind: "success"; amount: number | null }
  | { kind: "cancelled" }
  | { kind: "direct" };

function CheckIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CancelIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" className="h-8 w-8">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

// Remplace l'ancienne bannière affichée sur la home au retour de Stripe (CheckoutReturnBanner,
// dupliquée dans CatalogueSection.tsx et charis/ProductGrid.tsx, retirée des deux — voir
// docs/05-roadmap-poc.md) : demandé par Ethan, une vraie page dédiée plutôt qu'un simple bandeau
// perdu au milieu du catalogue. CartPage.tsx pointe désormais returnBaseUrl ici plutôt que sur la home.
function CheckoutResultContent({
  clientSiteId,
  apiBaseUrl,
  accent,
  locale,
}: {
  clientSiteId: string;
  apiBaseUrl: string;
  accent: string;
  locale: Locale;
}) {
  const [result, setResult] = useState<Result>({ kind: "loading" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");

    if (checkout === "success") {
      // Le panier n'est vidé qu'ici, jamais sur annulation : si le client annule sur Stripe, il doit
      // retrouver son panier intact en revenant (voir CartPage.tsx, même logique qu'avant ce
      // changement).
      localStorage.removeItem(storageKey(clientSiteId));
      const sessionId = params.get("session_id");

      if (sessionId) {
        fetch(`${apiBaseUrl}/api/t/${clientSiteId}/stripe/session/${sessionId}`)
          .then((res) => (res.ok ? (res.json() as Promise<{ status: string; amountTotal: number }>) : null))
          .then((data) =>
            setResult({ kind: "success", amount: data && data.status === "paid" ? data.amountTotal : null })
          )
          .catch(() => setResult({ kind: "success", amount: null }));
      } else {
        setResult({ kind: "success", amount: null });
      }
    } else if (checkout === "cancel") {
      setResult({ kind: "cancelled" });
    } else {
      setResult({ kind: "direct" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Visite directe de cette page (pas de retour Stripe) : rien à afficher, retour à l'accueil.
  useEffect(() => {
    if (result.kind === "direct") {
      window.location.href = `/t/${clientSiteId}`;
    }
  }, [result.kind, clientSiteId]);

  if (result.kind === "loading" || result.kind === "direct") {
    return <div className="mx-auto flex max-w-2xl flex-col gap-8" />;
  }

  const isSuccess = result.kind === "success";

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-12 text-center">
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: isSuccess ? `${accent}18` : "rgba(0,0,0,0.06)" }}
      >
        {isSuccess ? <CheckIcon color={accent} /> : <CancelIcon color="#6B7280" />}
      </span>

      <h1 className="text-2xl font-black text-navy">
        {isSuccess
          ? result.amount !== null
            ? t(locale, "catalogue.paymentReceived", { price: formatPrice(result.amount) })
            : t(locale, "catalogue.orderRecorded")
          : t(locale, "catalogue.paymentCancelled")}
      </h1>

      {isSuccess && <p className="text-sm text-gray-text">{t(locale, "catalogue.orderConfirmationEmailNote")}</p>}
      {isSuccess && <p className="text-sm text-gray-text">{t(locale, "catalogue.checkoutTrustNote")}</p>}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <a
          href={isSuccess ? `/t/${clientSiteId}/boutique` : `/t/${clientSiteId}/panier`}
          className="rounded-button px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: accent }}
        >
          {isSuccess ? t(locale, "catalogue.viewShop") : t(locale, "catalogue.backToCart")}
        </a>
        <a href={`/t/${clientSiteId}`} className="text-sm font-medium text-gray-text hover:text-navy">
          {t(locale, "blog.backToSite")}
        </a>
      </div>
    </div>
  );
}

type CheckoutResultPageProps = {
  clientSiteId: string;
  apiBaseUrl: string;
};

export default function CheckoutResultPage({ clientSiteId, apiBaseUrl }: CheckoutResultPageProps) {
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

  const footer = footerDark ? (
    <SiteFooter clientSiteId={clientSiteId} content={content} palette={palette} modules={modules} locale={locale} dark />
  ) : (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
      <SiteFooter clientSiteId={clientSiteId} content={content} palette={palette} modules={modules} locale={locale} />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: background }}>
      <div className="flex-1 px-4 py-6 pb-16 sm:px-8 sm:pb-20">
        {content?.siteName && (
          <a href={`/t/${clientSiteId}`} className="mx-auto flex max-w-2xl items-center gap-2">
            {logoUrl && (
              <img src={`${apiBaseUrl}${logoUrl}`} alt={content.siteName} className="h-8 w-8 rounded-full object-cover" />
            )}
            <span className="text-sm font-semibold text-navy">{content.siteName}</span>
          </a>
        )}
        <CheckoutResultContent clientSiteId={clientSiteId} apiBaseUrl={apiBaseUrl} accent={accent} locale={locale} />
      </div>
      {footer}
    </div>
  );
}
