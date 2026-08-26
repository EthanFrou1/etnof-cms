import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { API_BASE_URL } from "../../config";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import type { ModulesConfig } from "../../hooks/useModules";

const CustomPagesNav = lazy(() => import("@modules/pages/frontend/CustomPagesNav"));
const WhatsAppButton = lazy(() => import("@modules/whatsapp/frontend/WhatsAppButton"));
const LanguageSwitcher = lazy(() => import("@modules/multilingue/frontend/LanguageSwitcher"));

// Noir glacé fixe (ne varie pas avec la palette, même convention qu'Hestia/Helios).
const ink = "#111111";

function MenuIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" className="h-6 w-6">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function CloseIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" className="h-6 w-6">
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}

type SiteChromePalette = { accent: string; background: string; ink: string };

type SiteChromeProps = {
  clientSiteId: string;
  modules: ModulesConfig | null;
  siteName: string;
  // "Notre histoire" (StorySection.tsx) n'est pas un module (champ core SiteContent.StoryContent) —
  // chaque appelant sait déjà si son `content` chargé a ce texte rempli, pas besoin que SiteChrome
  // refasse un fetch juste pour la visibilité du lien de nav.
  hasStory?: boolean;
  locale: Locale;
  onChangeLocale: (locale: Locale) => void;
  palette: SiteChromePalette;
  children: ReactNode;
  // Séparé de `children` (plutôt que dernier élément du flux normal) pour rester collé en bas de
  // l'écran même quand le contenu est plus court que la fenêtre (ex. fiche produit sans avis) — sinon
  // le footer se retrouve au milieu de la page avec du vide en dessous, voir min-h-screen ci-dessous.
  footer: ReactNode;
};

// Nav + footer communs à toutes les pages Charis (accueil, boutique, fiche produit) — extrait de
// TemplateHestia.tsx pour que /boutique et /produits/{id} (pages standalone montées hors
// TemplateCharis, voir App.tsx) gardent l'identité du site au lieu de n'afficher que leur contenu
// propre. TemplateCharis fournit son bloc "hero" + ses sections de modules en children ; les pages
// standalone fournissent juste leur contenu (fil d'ariane, filtres, grille…).
export default function SiteChrome({
  clientSiteId,
  modules,
  siteName,
  hasStory = false,
  locale,
  onChangeLocale,
  palette,
  children,
  footer,
}: SiteChromeProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { accent, background } = palette;
  const whatsappNumber = modules?.whatsapp?.phoneNumber;
  const whatsappMessage = modules?.whatsapp?.message;
  const pagesMenuLabel = modules?.pages?.menuLabel;

  // Optimiste (true tant que la réponse n'est pas arrivée) : évite de faire clignoter le lien pour
  // le cas courant (contenu déjà présent) — seul le cas rare (module actif mais vide) se corrige
  // après coup. Demandé par Ethan : un lien de nav vers une section vide (aucune photo, aucun
  // article, aucun avis) ne doit pas apparaître.
  const [hasGalerieImages, setHasGalerieImages] = useState(true);
  const [hasBlogPosts, setHasBlogPosts] = useState(true);
  const [hasAvisGoogleReviews, setHasAvisGoogleReviews] = useState(true);

  useEffect(() => {
    if (!modules?.galerie?.enabled) return;
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/galerie/images`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown[]) => setHasGalerieImages(data.length > 0))
      .catch(() => {});
  }, [clientSiteId, modules?.galerie?.enabled]);

  useEffect(() => {
    if (!modules?.blog?.enabled) return;
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/blog`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown[]) => setHasBlogPosts(data.length > 0))
      .catch(() => {});
  }, [clientSiteId, modules?.blog?.enabled]);

  useEffect(() => {
    if (!modules?.["avis-google"]?.enabled) return;
    fetch(`${API_BASE_URL}/api/t/${clientSiteId}/avis-google`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown[]) => setHasAvisGoogleReviews(data.length > 0))
      .catch(() => {});
  }, [clientSiteId, modules?.["avis-google"]?.enabled]);

  const navLinks = (variant: "desktop" | "mobile") => {
    const linkClass =
      variant === "desktop"
        ? "text-xs font-medium uppercase tracking-[0.12em] transition-opacity duration-200 hover:opacity-60"
        : "rounded-button px-2 py-2 text-sm font-medium transition-opacity duration-200 hover:opacity-60";

    return (
      <>
        {modules?.catalogue?.enabled && (
          <a href={`/t/${clientSiteId}/boutique`} style={{ color: "inherit" }} className={linkClass}>
            {t(locale, "nav.catalogue")}
          </a>
        )}
        {hasStory && (
          <a href={`/t/${clientSiteId}#histoire`} style={{ color: "inherit" }} className={linkClass}>
            {t(locale, "nav.story")}
          </a>
        )}
        {modules?.galerie?.enabled && hasGalerieImages && (
          <a href={`/t/${clientSiteId}#galerie`} style={{ color: "inherit" }} className={linkClass}>
            {t(locale, "nav.galerie")}
          </a>
        )}
        {modules?.["avis-google"]?.enabled && hasAvisGoogleReviews && (
          <a href={`/t/${clientSiteId}#avis-google`} style={{ color: "inherit" }} className={linkClass}>
            {t(locale, "nav.avisGoogle")}
          </a>
        )}
        {modules?.blog?.enabled && hasBlogPosts && (
          <a href={`/t/${clientSiteId}#blog`} style={{ color: "inherit" }} className={linkClass}>
            {t(locale, "nav.blog")}
          </a>
        )}
        {modules?.rdv?.enabled && (
          <a href={`/t/${clientSiteId}#rdv`} style={{ color: "inherit" }} className={linkClass}>
            {t(locale, "nav.rdv")}
          </a>
        )}
        {modules?.contact?.enabled && (
          <a href={`/t/${clientSiteId}#contact`} style={{ color: "inherit" }} className={linkClass}>
            {t(locale, "nav.contact")}
          </a>
        )}
        {modules?.newsletter?.enabled && (
          <a href={`/t/${clientSiteId}#newsletter`} style={{ color: "inherit" }} className={linkClass}>
            {t(locale, "nav.newsletter")}
          </a>
        )}
        {modules?.["reseaux-sociaux"]?.enabled && (
          <a href={`/t/${clientSiteId}#reseaux-sociaux`} style={{ color: "inherit" }} className={linkClass}>
            {t(locale, "nav.reseauxSociaux")}
          </a>
        )}
        {modules?.pages?.enabled && typeof pagesMenuLabel === "string" && (
          <Suspense fallback={null}>
            <CustomPagesNav apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} label={pagesMenuLabel} ink={ink} variant={variant} />
          </Suspense>
        )}
      </>
    );
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: background, color: ink }}>
      <nav className="relative border-b px-4 py-5 sm:px-8" style={{ backgroundColor: `${ink}06`, borderColor: `${ink}1A` }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href={`/t/${clientSiteId}`} className="text-base font-semibold uppercase tracking-[0.2em]" style={{ color: "inherit" }}>
            {siteName}
          </a>
          <div className="hidden items-center gap-7 md:flex">
            {navLinks("desktop")}
            {modules?.multilingue?.enabled && (
              <Suspense fallback={null}>
                <div className="border-l pl-6" style={{ borderColor: `${ink}1A` }}>
                  <LanguageSwitcher locale={locale} onChange={onChangeLocale} accent={accent} />
                </div>
              </Suspense>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="md:hidden"
            aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          >
            {mobileMenuOpen ? <CloseIcon color={ink} /> : <MenuIcon color={ink} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="mx-auto mt-4 flex max-w-7xl flex-col gap-1 border-t pt-4 md:hidden" style={{ borderColor: `${ink}1A` }}>
            {navLinks("mobile")}
            {modules?.multilingue?.enabled && (
              <Suspense fallback={null}>
                <div className="border-t px-2 pt-2" style={{ borderColor: `${ink}1A` }}>
                  <LanguageSwitcher locale={locale} onChange={onChangeLocale} accent={accent} />
                </div>
              </Suspense>
            )}
          </div>
        )}
      </nav>

      <div className="flex-1">{children}</div>

      {footer}

      {/* Bouton flottant hors du flux normal (persistant, pas une section qu'on scrolle) — voir
          modules/whatsapp/frontend/WhatsAppButton.tsx : pas de lien de nav ni d'ancre associée. */}
      {modules?.whatsapp?.enabled && typeof whatsappNumber === "string" && (
        <Suspense fallback={null}>
          <WhatsAppButton phoneNumber={whatsappNumber} message={typeof whatsappMessage === "string" ? whatsappMessage : ""} />
        </Suspense>
      )}
    </div>
  );
}
