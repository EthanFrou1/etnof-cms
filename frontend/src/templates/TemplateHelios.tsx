import { lazy, Suspense, useState, type ReactNode } from "react";
import { API_BASE_URL } from "../config";
import { t } from "@modules/multilingue/frontend/translations";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
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

const ink = "#1A1512";

// Longueur (texte brut, balises retirées) à partir de laquelle "Notre histoire" dépasse ~10 lignes
// affichées (voir line-clamp-[10] plus bas) et justifie le bouton "Voir plus" — même seuil
// approximatif que TemplateHestia.tsx et StorySection.tsx (Charis), pas de mesure DOM réelle
// nécessaire pour ce besoin.
const LONG_STORY_THRESHOLD = 800;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Motif de rayons de soleil (signature visuelle propre à Helios, dieu du soleil), en fine bande
// décorative sous le hero — parité avec la frise en méandre grec d'Hestia (GreekKeyDivider). Généré
// en local (pas d'asset externe), tuilé horizontalement, recoloré selon la palette active.
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

function SunRayDivider({ color }: { color: string }) {
  const pattern = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="10" viewBox="0 0 16 10"><path d="M8 10 L2 0 M8 10 L8 0 M8 10 L14 0" fill="none" stroke="${color}" stroke-width="1.4"/></svg>`
  )}`;
  return (
    <div
      aria-hidden="true"
      className="h-[10px] w-full opacity-70"
      style={{ backgroundImage: `url("${pattern}")`, backgroundRepeat: "repeat-x", backgroundSize: "16px 10px" }}
    />
  );
}

// Fondu + léger décalage vers le haut dès qu'un bloc entre dans le viewport (une seule fois, voir
// useRevealOnScroll.ts) — pas utilisé sur le header hero (toujours visible immédiatement), seulement
// sur l'offre du moment et le bloc de modules, seuls autres blocs "pleine largeur" de ce template.
function Reveal({ children }: { children: ReactNode }) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
    >
      {children}
    </div>
  );
}

export default function TemplateHelios({ clientSiteId, modules, content, paletteId, customAccent, logoUrl, locale, onChangeLocale }: TemplateProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [storyExpanded, setStoryExpanded] = useState(false);
  const mapsAddress = content?.address;
  const mapsApiKey = modules?.maps?.apiKey;
  const whatsappNumber = modules?.whatsapp?.phoneNumber;
  const whatsappMessage = modules?.whatsapp?.message;
  const pagesMenuLabel = modules?.pages?.menuLabel;
  const siteName = content?.siteName ?? "etnof-cms";
  const palette = resolvePalette("helios", paletteId, customAccent);
  const { accent, background, gradientEnd } = palette;
  // Palette passée aux modules (Contact, Maps, Blog, Catalogue) — voir docs/10-templates.md,
  // "Palette appliquée aux modules" : chaque module reçoit accent/background/ink, plus de charte
  // etnof-web codée en dur.
  const modulePalette = { accent, background, ink };
  const [firstOffer, ...restOffers] = modules?.offres?.enabled ? content?.offers ?? [] : [];
  const hasStory = Boolean(content?.storyContent?.trim());

  return (
    <div className="min-h-screen" style={{ backgroundColor: background }}>
      <nav className="relative px-4 py-4 sm:px-8" style={{ backgroundColor: ink }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span className="text-lg font-extrabold text-white">{siteName}</span>
          <div className="hidden items-center gap-6 text-sm font-medium text-white/80 md:flex">
            {hasStory && (
              <a href="#histoire" className="transition-colors duration-200 hover:text-white">
                {t(locale, "nav.story")}
              </a>
            )}
            {modules?.catalogue?.enabled && (
              <a href={`/t/${clientSiteId}/boutique`} className="transition-colors duration-200 hover:text-white">
                {t(locale, "nav.catalogue")}
              </a>
            )}
            {modules?.galerie?.enabled && (
              <a href="#galerie" className="transition-colors duration-200 hover:text-white">
                {t(locale, "nav.galerie")}
              </a>
            )}
            {modules?.["avis-google"]?.enabled && (
              <a href="#avis-google" className="transition-colors duration-200 hover:text-white">
                {t(locale, "nav.avisGoogle")}
              </a>
            )}
            {modules?.blog?.enabled && (
              <a href="#blog" className="transition-colors duration-200 hover:text-white">
                {t(locale, "nav.blog")}
              </a>
            )}
            {modules?.rdv?.enabled && (
              <a href="#rdv" className="transition-colors duration-200 hover:text-white">
                {t(locale, "nav.rdv")}
              </a>
            )}
            {modules?.contact?.enabled && (
              <a href="#contact" className="transition-colors duration-200 hover:text-white">
                {t(locale, "nav.contact")}
              </a>
            )}
            {modules?.newsletter?.enabled && (
              <a href="#newsletter" className="transition-colors duration-200 hover:text-white">
                {t(locale, "nav.newsletter")}
              </a>
            )}
            {modules?.["compte-client"]?.enabled && (
              <a href={`/t/${clientSiteId}/compte`} className="transition-colors duration-200 hover:text-white">
                {t(locale, "account.title")}
              </a>
            )}
            {modules?.pages?.enabled && typeof pagesMenuLabel === "string" && (
              <Suspense fallback={null}>
                <CustomPagesNav apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} label={pagesMenuLabel} ink={ink} variant="desktop" />
              </Suspense>
            )}
            {modules?.multilingue?.enabled && (
              <Suspense fallback={null}>
                <div className="border-l border-white/20 pl-4">
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
            {mobileMenuOpen ? <CloseIcon color="#FFFFFF" /> : <MenuIcon color="#FFFFFF" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            className="mx-auto mt-4 flex max-w-7xl flex-col gap-1 border-t border-white/10 pt-4 text-sm font-medium text-white/80 md:hidden"
          >
            {hasStory && (
              <a href="#histoire" className="rounded-button px-2 py-2 transition-colors duration-200 hover:text-white">
                {t(locale, "nav.story")}
              </a>
            )}
            {modules?.catalogue?.enabled && (
              <a href={`/t/${clientSiteId}/boutique`} className="rounded-button px-2 py-2 transition-colors duration-200 hover:text-white">
                {t(locale, "nav.catalogue")}
              </a>
            )}
            {modules?.galerie?.enabled && (
              <a href="#galerie" className="rounded-button px-2 py-2 transition-colors duration-200 hover:text-white">
                {t(locale, "nav.galerie")}
              </a>
            )}
            {modules?.["avis-google"]?.enabled && (
              <a href="#avis-google" className="rounded-button px-2 py-2 transition-colors duration-200 hover:text-white">
                {t(locale, "nav.avisGoogle")}
              </a>
            )}
            {modules?.blog?.enabled && (
              <a href="#blog" className="rounded-button px-2 py-2 transition-colors duration-200 hover:text-white">
                {t(locale, "nav.blog")}
              </a>
            )}
            {modules?.rdv?.enabled && (
              <a href="#rdv" className="rounded-button px-2 py-2 transition-colors duration-200 hover:text-white">
                {t(locale, "nav.rdv")}
              </a>
            )}
            {modules?.contact?.enabled && (
              <a href="#contact" className="rounded-button px-2 py-2 transition-colors duration-200 hover:text-white">
                {t(locale, "nav.contact")}
              </a>
            )}
            {modules?.newsletter?.enabled && (
              <a href="#newsletter" className="rounded-button px-2 py-2 transition-colors duration-200 hover:text-white">
                {t(locale, "nav.newsletter")}
              </a>
            )}
            {modules?.["compte-client"]?.enabled && (
              <a href={`/t/${clientSiteId}/compte`} className="rounded-button px-2 py-2 transition-colors duration-200 hover:text-white">
                {t(locale, "account.title")}
              </a>
            )}
            {modules?.pages?.enabled && typeof pagesMenuLabel === "string" && (
              <Suspense fallback={null}>
                <CustomPagesNav apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} label={pagesMenuLabel} ink={ink} variant="mobile" />
              </Suspense>
            )}
            {modules?.multilingue?.enabled && (
              <Suspense fallback={null}>
                <div className="border-t border-white/10 px-2 pt-2">
                  <LanguageSwitcher locale={locale} onChange={onChangeLocale} accent={accent} />
                </div>
              </Suspense>
            )}
          </div>
        )}
      </nav>

      <header
        className="px-4 pb-16 pt-20 sm:px-8"
        style={{ background: `linear-gradient(135deg, ${accent}, ${gradientEnd ?? accent})` }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-5">
          <h1 className="max-w-2xl text-5xl font-black leading-[1.05] text-white sm:text-6xl">
            {siteName}
          </h1>
          {content?.description && (
            <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-16">
              <div
                className="max-w-xl text-xl leading-relaxed text-white/90 [&_a]:underline [&_strong]:font-bold"
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
      </header>
      <SunRayDivider color={accent} />

      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 pb-16 pt-10 sm:px-8">
        {firstOffer && (
          <Reveal>
            <section className="flex flex-col gap-4">
              <div
                className="-mt-20 rounded-card bg-white p-10 shadow-card"
                style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: accent }}>
                  {t(locale, "section.offerOfTheMoment")}
                </span>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
                  <span className="text-2xl font-extrabold" style={{ color: ink }}>
                    {firstOffer.title}
                  </span>
                  <span
                    className="whitespace-nowrap rounded-button px-3 py-1.5 text-lg font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {firstOffer.price}
                  </span>
                </div>
                {firstOffer.description && (
                  <p className="mt-3 max-w-xl leading-relaxed" style={{ color: `${ink}99` }}>
                    {firstOffer.description}
                  </p>
                )}
              </div>

              {restOffers.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {restOffers.map((offer) => (
                    <div key={offer.id} className="rounded-card bg-white p-6 shadow-card">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-bold" style={{ color: ink }}>
                          {offer.title}
                        </span>
                        <span className="whitespace-nowrap text-sm font-semibold" style={{ color: accent }}>
                          {offer.price}
                        </span>
                      </div>
                      {offer.description && (
                        <p className="mt-2 text-sm leading-relaxed text-gray-text">
                          {offer.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </Reveal>
        )}

        {hasStory && (
          <Reveal>
            <section id="histoire" className="flex flex-col gap-4 rounded-card bg-white p-10 shadow-card">
              <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: accent }}>
                {t(locale, "nav.story")}
              </span>
              <div
                className={`max-w-2xl text-lg leading-relaxed [&_a]:underline [&_strong]:font-bold ${
                  storyExpanded ? "" : "line-clamp-4"
                }`}
                style={{ color: `${ink}99` }}
                dangerouslySetInnerHTML={{ __html: content!.storyContent }}
              />
              {stripHtml(content!.storyContent).length > LONG_STORY_THRESHOLD && (
                <button
                  type="button"
                  onClick={() => setStoryExpanded((e) => !e)}
                  className="self-start text-sm font-semibold hover:underline"
                  style={{ color: accent }}
                >
                  {storyExpanded ? t(locale, "story.showLess") : t(locale, "story.showMore")}
                </button>
              )}
            </section>
          </Reveal>
        )}

        <Suspense fallback={null}>
          <Reveal>
          <div className="grid gap-8 sm:grid-cols-2">
            {modules?.catalogue?.enabled && (
              <div id="catalogue" className="sm:col-span-2">
                <CatalogueSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} limit={8} />
              </div>
            )}
            {modules?.galerie?.enabled && (
              <div id="galerie" className="sm:col-span-2">
                <GallerySection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
              </div>
            )}
            {modules?.["avis-google"]?.enabled && (
              <div id="avis-google" className="sm:col-span-2">
                <AvisGoogleSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
              </div>
            )}
            {modules?.blog?.enabled && (
              <div id="blog" className="sm:col-span-2">
                <BlogSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
              </div>
            )}
            {modules?.rdv?.enabled && (
              <div id="rdv" className="sm:col-span-2">
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
          </Reveal>
        </Suspense>

        <SiteFooter clientSiteId={clientSiteId} content={content} palette={modulePalette} modules={modules} locale={locale} />
      </div>

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
