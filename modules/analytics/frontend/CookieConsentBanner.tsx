import { useEffect, useState } from "react";
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : import direct du
// dictionnaire i18n du module Multilingue — même précédent que modules/newsletter/frontend/NewsletterSection.tsx.
import { t, type Locale } from "@modules/multilingue/frontend/translations";

type CookieConsentBannerProps = {
  clientSiteId: string;
  measurementId?: string;
  locale?: Locale;
};

type Consent = "accepted" | "refused";

const consentKey = (clientSiteId: string) => `etnof-analytics-consent-${clientSiteId}`;

// Injecte le script GA4 standard (gtag.js) — seulement appelé après consentement, jamais avant (le
// point RGPD entier de ce composant). `data-ga-id` évite un double chargement si le composant est
// remonté (ex. changement de locale) une fois le script déjà en place.
function loadGoogleAnalytics(measurementId: string) {
  if (document.querySelector(`script[data-ga-id="${measurementId}"]`)) return;

  const loader = document.createElement("script");
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  loader.setAttribute("data-ga-id", measurementId);
  document.head.appendChild(loader);

  const inline = document.createElement("script");
  inline.setAttribute("data-ga-id", measurementId);
  inline.textContent =
    "window.dataLayer = window.dataLayer || [];" +
    "function gtag(){dataLayer.push(arguments);}" +
    "gtag('js', new Date());" +
    `gtag('config', '${measurementId}');`;
  document.head.appendChild(inline);
}

// Bandeau RGPD + chargement conditionnel de Google Analytics. Le script (et ses cookies) ne se
// charge jamais avant un clic explicite sur "Accepter" — choix mémorisé en localStorage (par tenant,
// pas par appareil global) pour ne plus jamais reproposer le bandeau une fois tranché.
// Portée V1 assumée : monté seulement sur la page d'accueil du site (PublicSite.tsx), pas sur les
// pages détail blog/panier qui vivent hors de ce composant — voir docs/12-plan-modules-restants.md.
export default function CookieConsentBanner({ clientSiteId, measurementId, locale }: CookieConsentBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!measurementId) return;
    const stored = localStorage.getItem(consentKey(clientSiteId)) as Consent | null;
    if (stored === "accepted") {
      loadGoogleAnalytics(measurementId);
    } else if (stored === null) {
      setVisible(true);
    }
  }, [clientSiteId, measurementId]);

  const handleAccept = () => {
    localStorage.setItem(consentKey(clientSiteId), "accepted" satisfies Consent);
    if (measurementId) loadGoogleAnalytics(measurementId);
    setVisible(false);
  };

  const handleRefuse = () => {
    localStorage.setItem(consentKey(clientSiteId), "refused" satisfies Consent);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 border-t border-border-subtle bg-white p-4 shadow-soft sm:flex-row sm:justify-between sm:px-8">
      <p className="text-sm text-gray-text">{t(locale, "cookies.message")}</p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleRefuse}
          className="rounded-button border border-border-subtle px-4 py-2 text-sm font-medium text-gray-text hover:bg-bg-page-start"
        >
          {t(locale, "cookies.refuse")}
        </button>
        <button
          type="button"
          onClick={handleAccept}
          className="rounded-button bg-brand-gradient px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          {t(locale, "cookies.accept")}
        </button>
      </div>
    </div>
  );
}
