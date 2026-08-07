import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { API_BASE_URL } from "../config";
import { useEstablishmentImages, type EstablishmentImage } from "../hooks/useEstablishmentImages";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import { resolvePalette } from "./registry";
import SiteFooter from "./SiteFooter";
import type { TemplateProps } from "./types";

const ContactSection = lazy(() => import("@modules/contact/frontend/ContactSection"));
const MapsSection = lazy(() => import("@modules/maps/frontend/MapsSection"));
const BlogSection = lazy(() => import("@modules/blog/frontend/BlogSection"));
const CatalogueSection = lazy(() => import("@modules/catalogue/frontend/CatalogueSection"));
const RdvSection = lazy(() => import("@modules/rdv/frontend/RdvSection"));
const NewsletterSection = lazy(() => import("@modules/newsletter/frontend/NewsletterSection"));
const AvisGoogleSection = lazy(() => import("@modules/avis-google/frontend/AvisGoogleSection"));
const GallerySection = lazy(() => import("@modules/galerie/frontend/GallerySection"));
const CustomPagesNav = lazy(() => import("@modules/pages/frontend/CustomPagesNav"));
const WhatsAppButton = lazy(() => import("@modules/whatsapp/frontend/WhatsAppButton"));
const LanguageSwitcher = lazy(() => import("@modules/multilingue/frontend/LanguageSwitcher"));

const ink = "#211A16";
const poppins = "'Poppins', sans-serif";

// Police propre à Hestia (maquette Claude Design) — chargée uniquement quand ce template est monté
// (jamais dans index.html, ça toucherait aussi l'admin et Helios). Retirée au démontage.
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;500&display=swap";

function useHestiaFonts() {
  useEffect(() => {
    let link = document.head.querySelector<HTMLLinkElement>(`link[href="${GOOGLE_FONTS_HREF}"]`);
    const createdHere = !link;
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = GOOGLE_FONTS_HREF;
      document.head.appendChild(link);
    }
    return () => {
      if (createdHere) link?.remove();
    };
  }, []);
}

// Même ordre que WEEKDAYS dans EstablishmentSection.tsx (index 0 = lundi, cf.
// SiteContent.openingHours). Libellés tirés du dictionnaire partagé (module Multilingue) plutôt que
// codés en dur, pour suivre la langue choisie par le visiteur.
function weekdaysShort(locale: Locale) {
  return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((key) => t(locale, `weekday.${key}`));
}

// "09h30" en français (convention locale), "09:30" dans les autres langues.
function formatTime(value: string, locale: Locale) {
  return locale === "fr" ? value.replace(":", "h") : value;
}

function formatDayHours(
  day: { closed: boolean; morningOpen: string; morningClose: string; afternoonOpen: string; afternoonClose: string },
  locale: Locale
) {
  const ranges = [
    day.morningOpen && day.morningClose ? `${formatTime(day.morningOpen, locale)}–${formatTime(day.morningClose, locale)}` : null,
    day.afternoonOpen && day.afternoonClose ? `${formatTime(day.afternoonOpen, locale)}–${formatTime(day.afternoonClose, locale)}` : null,
  ].filter((r): r is string => r !== null);

  if (day.closed || ranges.length === 0) return t(locale, "hours.closed");
  return ranges.join(", ");
}

function Overline({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: accent }}>
      {children}
    </span>
  );
}

// Frise en forme de méandre grec (motif de poterie), signature visuelle propre à Hestia — blocs
// pleins en accent découpés en créneau (clip-path), alternés en miroir, tuilés en rangée. Nombre de
// blocs fixe, chacun en largeur flexible : remplit toujours le conteneur quel que soit le viewport
// (plus simple que recalculer un nombre de blocs par device, inutile en vrai CSS responsive).
const MEANDER_BLOCK_COUNT = 24;
function MeanderDivider({ color }: { color: string }) {
  return (
    <div aria-hidden="true" className="flex h-4 w-[260px] overflow-hidden rounded sm:h-[22px] sm:w-[480px]">
      {Array.from({ length: MEANDER_BLOCK_COUNT }, (_, i) => (
        <div
          key={i}
          className="h-full flex-1"
          style={{
            backgroundColor: color,
            clipPath: "polygon(0 0,100% 0,100% 25%,25% 25%,25% 75%,100% 75%,100% 100%,0 100%)",
            transform: i % 2 ? "scaleX(-1)" : undefined,
          }}
        />
      ))}
    </div>
  );
}

function PhotoTile({ src, className = "" }: { src: string; className?: string }) {
  return (
    <div className={`aspect-[17/12] overflow-hidden rounded-card border ${className}`} style={{ borderColor: `${ink}1A` }}>
      <img src={src} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

// Au-delà de 3 photos, la grille deviendrait trop haute (plusieurs rangées) — un slider horizontal
// à défilement natif (scroll-snap CSS, pas de librairie externe) garde la section compacte. En
// dessous du seuil, la grille statique reste plus lisible (pas d'interaction nécessaire pour tout voir).
function PhotoSlider({ images }: { images: EstablishmentImage[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByTile = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const tile = track.firstElementChild as HTMLElement | null;
    const step = (tile?.offsetWidth ?? 340) + 20;
    track.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  const arrowStyle = { color: ink, boxShadow: "0 4px 20px rgba(15, 23, 42, 0.06)" };

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image) => (
          <PhotoTile
            key={image.id}
            src={`${API_BASE_URL}${image.path}`}
            className="w-64 shrink-0 snap-start sm:w-[340px]"
          />
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scrollByTile(-1)}
          aria-label="Photo précédente"
          className="flex h-9 w-9 items-center justify-center rounded-pill border bg-white text-lg transition-opacity duration-200 hover:opacity-80"
          style={{ ...arrowStyle, borderColor: `${ink}1A` }}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => scrollByTile(1)}
          aria-label="Photo suivante"
          className="flex h-9 w-9 items-center justify-center rounded-pill border bg-white text-lg transition-opacity duration-200 hover:opacity-80"
          style={{ ...arrowStyle, borderColor: `${ink}1A` }}
        >
          ›
        </button>
      </div>
    </div>
  );
}

// Icônes menu mobile — inline plutôt qu'importées : les templates restent autonomes, pas de fichier
// d'icônes partagé entre Hestia/Helios/l'admin (même convention que translations.ts, voir
// docs/12-plan-modules-restants.md).
function MenuIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" className="h-6 w-6">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function CloseIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" className="h-6 w-6">
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}

// Une "bande" pleine largeur avec son propre fond, conteneur centré à l'intérieur — permet aux
// sections de fond alterné de vraiment déborder d'un bord à l'autre du site (voir docs/10-templates.md).
// `reveal=false` pour le hero (premier Band, toujours visible immédiatement, pas de délai d'entrée
// même subtil sur ce que le visiteur voit en tout premier) — les autres bandes du site (Établissement,
// Horaires, Offres, modules) se révèlent en fondu + léger décalage dès qu'elles entrent dans le
// viewport, voir useRevealOnScroll.ts et docs/10-templates.md.
function Band({ background, children, reveal = true }: { background: string; children: ReactNode; reveal?: boolean }) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  return (
    <div style={{ backgroundColor: background }}>
      <div
        ref={reveal ? ref : undefined}
        className={
          reveal
            ? `mx-auto max-w-7xl px-4 py-14 transition-all duration-700 ease-out sm:px-8 ${
                visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`
            : "mx-auto max-w-7xl px-4 py-14 sm:px-8"
        }
      >
        {children}
      </div>
    </div>
  );
}

export default function TemplateHestia({ clientSiteId, modules, content, paletteId, customAccent, logoUrl, locale, onChangeLocale }: TemplateProps) {
  useHestiaFonts();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mapsAddress = content?.address;
  const mapsApiKey = modules?.maps?.apiKey;
  const whatsappNumber = modules?.whatsapp?.phoneNumber;
  const whatsappMessage = modules?.whatsapp?.message;
  const pagesMenuLabel = modules?.pages?.menuLabel;
  const siteName = content?.siteName ?? "etnof-cms";
  const palette = resolvePalette("hestia", paletteId, customAccent);
  const { accent, background } = palette;
  // Palette passée aux modules (Contact, Maps, Blog, Catalogue) — voir docs/10-templates.md,
  // "Palette appliquée aux modules" : chaque module reçoit accent/background/ink, plus de charte
  // etnof-web codée en dur.
  const modulePalette = { accent, background, ink };

  const images = useEstablishmentImages(clientSiteId);
  const hasEstablishmentSection = Boolean(content?.description) || images.length > 0;
  // Le module "horaires" gate explicitement l'affichage public des horaires (voir
  // modules/horaires/module.meta.json) — pas seulement l'onglet admin. On exige aussi qu'au moins
  // un jour ait une vraie plage renseignée : les 7 jours existent toujours par défaut ("fermé" vide),
  // ce n'est pas un signal suffisant pour afficher la section.
  const hasConfiguredHours = Boolean(
    content?.openingHours?.some((d) => (d.morningOpen && d.morningClose) || (d.afternoonOpen && d.afternoonClose))
  );
  const showHours = Boolean(modules?.horaires?.enabled) && hasConfiguredHours;
  const hasOffers = Boolean(content && content.offers.length > 0);

  // Fond alterné : chaque section réellement affichée (dans l'ordre) prend le fond opposé à la
  // précédente. Le hero ouvre toujours en ton "palette.background" (cohérent avec la navbar
  // au-dessus). Le bloc modules garde volontairement le ton "palette.background" quel que soit
  // l'endroit où on en est dans l'alternance : les modules affichent déjà leurs propres cartes
  // blanches, qui perdraient tout contraste sur une bande déjà blanche.
  const white = "#FFFFFF";
  let nextIsWhite = true;
  const toneFor = (show: boolean) => {
    if (!show) return background;
    const tone = nextIsWhite ? white : background;
    nextIsWhite = !nextIsWhite;
    return tone;
  };
  const establishmentBg = toneFor(hasEstablishmentSection);
  const hoursBg = toneFor(showHours);
  const offersBg = toneFor(hasOffers);

  return (
    <div className="min-h-screen" style={{ backgroundColor: background, fontFamily: poppins }}>
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8">
        <nav
          className="relative flex items-center justify-between rounded-pill px-6 py-3 shadow-soft"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <span className="text-lg font-extrabold" style={{ color: ink }}>
            {siteName}
          </span>
          <div className="hidden items-center gap-5 text-sm font-medium md:flex" style={{ color: `${ink}99` }}>
            {modules?.catalogue?.enabled && (
              <a href="#catalogue" style={{ color: "inherit" }} className="transition-opacity duration-200 hover:opacity-70">
                {t(locale, "nav.catalogue")}
              </a>
            )}
            {modules?.galerie?.enabled && (
              <a href="#galerie" style={{ color: "inherit" }} className="transition-opacity duration-200 hover:opacity-70">
                {t(locale, "nav.galerie")}
              </a>
            )}
            {modules?.["avis-google"]?.enabled && (
              <a href="#avis-google" style={{ color: "inherit" }} className="transition-opacity duration-200 hover:opacity-70">
                {t(locale, "nav.avisGoogle")}
              </a>
            )}
            {modules?.blog?.enabled && (
              <a href="#blog" style={{ color: "inherit" }} className="transition-opacity duration-200 hover:opacity-70">
                {t(locale, "nav.blog")}
              </a>
            )}
            {modules?.rdv?.enabled && (
              <a href="#rdv" style={{ color: "inherit" }} className="transition-opacity duration-200 hover:opacity-70">
                {t(locale, "nav.rdv")}
              </a>
            )}
            {modules?.contact?.enabled && (
              <a href="#contact" style={{ color: "inherit" }} className="transition-opacity duration-200 hover:opacity-70">
                {t(locale, "nav.contact")}
              </a>
            )}
            {modules?.newsletter?.enabled && (
              <a href="#newsletter" style={{ color: "inherit" }} className="transition-opacity duration-200 hover:opacity-70">
                {t(locale, "nav.newsletter")}
              </a>
            )}
            {modules?.pages?.enabled && typeof pagesMenuLabel === "string" && (
              <Suspense fallback={null}>
                <CustomPagesNav apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} label={pagesMenuLabel} ink={ink} variant="desktop" />
              </Suspense>
            )}
            {modules?.multilingue?.enabled && (
              <Suspense fallback={null}>
                <div className="border-l pl-4" style={{ borderColor: `${ink}1A` }}>
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

          {mobileMenuOpen && (
            <div
              className="absolute left-0 right-0 top-[calc(100%+8px)] z-10 flex flex-col gap-1 rounded-card p-4 text-sm font-medium shadow-soft md:hidden"
              style={{ backgroundColor: "#FFFFFF", color: `${ink}99` }}
            >
              {modules?.catalogue?.enabled && (
                <a href="#catalogue" style={{ color: "inherit" }} className="rounded-button px-2 py-2 transition-opacity duration-200 hover:opacity-70">
                  {t(locale, "nav.catalogue")}
                </a>
              )}
              {modules?.galerie?.enabled && (
                <a href="#galerie" style={{ color: "inherit" }} className="rounded-button px-2 py-2 transition-opacity duration-200 hover:opacity-70">
                  {t(locale, "nav.galerie")}
                </a>
              )}
              {modules?.["avis-google"]?.enabled && (
                <a href="#avis-google" style={{ color: "inherit" }} className="rounded-button px-2 py-2 transition-opacity duration-200 hover:opacity-70">
                  {t(locale, "nav.avisGoogle")}
                </a>
              )}
              {modules?.blog?.enabled && (
                <a href="#blog" style={{ color: "inherit" }} className="rounded-button px-2 py-2 transition-opacity duration-200 hover:opacity-70">
                  {t(locale, "nav.blog")}
                </a>
              )}
              {modules?.rdv?.enabled && (
                <a href="#rdv" style={{ color: "inherit" }} className="rounded-button px-2 py-2 transition-opacity duration-200 hover:opacity-70">
                  {t(locale, "nav.rdv")}
                </a>
              )}
              {modules?.contact?.enabled && (
                <a href="#contact" style={{ color: "inherit" }} className="rounded-button px-2 py-2 transition-opacity duration-200 hover:opacity-70">
                  {t(locale, "nav.contact")}
                </a>
              )}
              {modules?.newsletter?.enabled && (
                <a href="#newsletter" style={{ color: "inherit" }} className="rounded-button px-2 py-2 transition-opacity duration-200 hover:opacity-70">
                  {t(locale, "nav.newsletter")}
                </a>
              )}
              {modules?.pages?.enabled && typeof pagesMenuLabel === "string" && (
                <Suspense fallback={null}>
                  <CustomPagesNav apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} label={pagesMenuLabel} ink={ink} variant="mobile" />
                </Suspense>
              )}
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
      </div>

      <Band background={background} reveal={false}>
        <header className="flex flex-col items-center gap-5 px-2 text-center">
          <Overline accent={accent}>{t(locale, "hero.welcome")}</Overline>
          <h1 className="text-[40px] font-black leading-[1.04] sm:text-[84px]" style={{ color: ink }}>
            {siteName}
          </h1>
          <MeanderDivider color={accent} />
        </header>
      </Band>

      {hasEstablishmentSection && (
        <Band background={establishmentBg}>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <Overline accent={accent}>{t(locale, "section.establishment")}</Overline>
              {content?.description && (
                <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-16">
                  <div
                    className="max-w-2xl text-xl leading-relaxed [&_a]:underline [&_strong]:font-bold"
                    style={{ color: `${ink}B3` }}
                    dangerouslySetInnerHTML={{ __html: content.description }}
                  />
                  {logoUrl && (
                    <img
                      src={`${API_BASE_URL}${logoUrl}`}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-full bg-white object-contain p-2 shadow-card sm:h-[23rem] sm:w-[23rem]"
                    />
                  )}
                </div>
              )}
            </div>
            {images.length > 3 ? (
              <PhotoSlider images={images} />
            ) : (
              images.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {images.map((image) => (
                    <PhotoTile key={image.id} src={`${API_BASE_URL}${image.path}`} />
                  ))}
                </div>
              )
            )}
          </div>
        </Band>
      )}

      {showHours && (
        <Band background={hoursBg}>
          <div className="flex flex-col gap-4">
            <Overline accent={accent}>{t(locale, "section.hours")}</Overline>
            <div className="grid max-w-xl gap-3 sm:grid-cols-2">
              {content!.openingHours.map((day, index) => (
                <div
                  key={index}
                  className="flex items-baseline justify-between gap-4 rounded-2xl border bg-white px-5 py-3.5"
                  style={{ borderColor: `${ink}1A` }}
                >
                  <span className="text-sm font-bold" style={{ color: ink }}>
                    {weekdaysShort(locale)[index]}
                  </span>
                  <span className="text-sm" style={{ color: `${ink}99` }}>
                    {formatDayHours(day, locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Band>
      )}

      {hasOffers && (
        <Band background={offersBg}>
          <section className="flex flex-col gap-4">
            <Overline accent={accent}>{t(locale, "section.offers")}</Overline>
            <div className="grid gap-4 sm:grid-cols-2">
              {content!.offers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-card border bg-white p-8"
                  style={{ borderColor: `${ink}1A` }}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-lg font-bold" style={{ color: ink }}>
                      {offer.title}
                    </span>
                    <span
                      className="whitespace-nowrap rounded-pill px-3 py-1 text-sm font-semibold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {offer.price}
                    </span>
                  </div>
                  {offer.description && (
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: `${ink}99` }}>
                      {offer.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </Band>
      )}

      <Band background={background}>
        <Suspense fallback={null}>
          <div className="flex flex-col gap-16">
            {modules?.catalogue?.enabled && (
              <div id="catalogue">
                <CatalogueSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
              </div>
            )}
            {modules?.galerie?.enabled && (
              <div id="galerie">
                <GallerySection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
              </div>
            )}
            {modules?.["avis-google"]?.enabled && (
              <div id="avis-google">
                <AvisGoogleSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
              </div>
            )}
            {modules?.blog?.enabled && (
              <div id="blog">
                <BlogSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
              </div>
            )}
            {modules?.rdv?.enabled && (
              <div id="rdv">
                <RdvSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
              </div>
            )}
            {modules?.contact?.enabled && (
              <div id="contact">
                <ContactSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
              </div>
            )}
            {modules?.newsletter?.enabled && (
              <div id="newsletter">
                <NewsletterSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
              </div>
            )}
            {modules?.maps?.enabled && typeof mapsAddress === "string" && (
              <MapsSection
                address={mapsAddress}
                apiKey={typeof mapsApiKey === "string" ? mapsApiKey : ""}
                palette={modulePalette}
                locale={locale}
              />
            )}
          </div>
        </Suspense>
      </Band>

      <SiteFooter content={content} palette={modulePalette} modules={modules} dark />

      {/* Bouton flottant hors du flux de bandes (persistant, pas une section qu'on scrolle) — voir
          modules/whatsapp/frontend/WhatsAppButton.tsx : pas de lien de nav ni d'ancre associée. */}
      {modules?.whatsapp?.enabled && typeof whatsappNumber === "string" && (
        <Suspense fallback={null}>
          <WhatsAppButton phoneNumber={whatsappNumber} message={typeof whatsappMessage === "string" ? whatsappMessage : ""} />
        </Suspense>
      )}
    </div>
  );
}
