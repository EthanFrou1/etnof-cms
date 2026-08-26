import { lazy, Suspense, type ReactNode } from "react";
import { API_BASE_URL } from "../config";
import { t, type Locale } from "@modules/multilingue/frontend/translations";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { resolvePalette } from "./registry";
import SiteFooter from "./SiteFooter";
import SiteChrome from "./charis/SiteChrome";
import ProductGrid from "./charis/ProductGrid";
import StorySection from "./charis/StorySection";
import type { TemplateProps } from "./types";

const ContactSection = lazy(() => import("@modules/contact/frontend/ContactSection"));
const MapsSection = lazy(() => import("@modules/maps/frontend/MapsSection"));
const BlogSection = lazy(() => import("@modules/blog/frontend/BlogSection"));
const RdvSection = lazy(() => import("@modules/rdv/frontend/RdvSection"));
const NewsletterSection = lazy(() => import("@modules/newsletter/frontend/NewsletterSection"));
const AvisGoogleSection = lazy(() => import("@modules/avis-google/frontend/AvisGoogleSection"));
const GallerySection = lazy(() => import("@modules/galerie/frontend/GallerySection"));
const SocialSection = lazy(() => import("@modules/reseaux-sociaux/frontend/SocialSection"));

// Noir glacé fixe (ne varie pas avec la palette, même convention qu'Hestia/Helios) — Charis vise un
// rendu épuré/éditorial (mode/vêtements), pas de police externe chargée pour rester sobre.
const ink = "#111111";

// Même ordre que WEEKDAYS dans EstablishmentSection.tsx (index 0 = lundi, cf.
// SiteContent.openingHours). Dupliqué depuis TemplateHestia.tsx (voir docs/02-architecture-modules.md :
// un module reste isolé, chaque template redéclare localement ce petit formatage plutôt que de
// dépendre d'un import transverse) — Charis affiche le nom complet du jour (contrairement à Hestia
// qui utilise l'abrégé "weekday.*"), d'où "weekdayFull.*".
function weekdaysFull(locale: Locale) {
  return ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((key) => t(locale, `weekdayFull.${key}`));
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

// Fondu + léger décalage vers le haut au scroll (même hook que Hestia/Helios, voir
// useRevealOnScroll.ts) — pas appliqué au hero (toujours visible immédiatement).
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

export default function TemplateCharis({ clientSiteId, modules, content, paletteId, customAccent, logoUrl, locale, onChangeLocale }: TemplateProps) {
  const mapsAddress = content?.address;
  const mapsApiKey = modules?.maps?.apiKey;
  const socialConfig = modules?.["reseaux-sociaux"];
  // Le module "horaires" gate explicitement l'affichage public (voir modules/horaires/module.meta.json)
  // — pas seulement l'onglet admin. On exige aussi qu'au moins un jour ait une vraie plage renseignée :
  // les 7 jours existent toujours par défaut ("fermé" vide), ce n'est pas un signal suffisant.
  const hasConfiguredHours = Boolean(
    content?.openingHours?.some((d) => (d.morningOpen && d.morningClose) || (d.afternoonOpen && d.afternoonClose))
  );
  const showHours = Boolean(modules?.horaires?.enabled) && hasConfiguredHours;
  const siteName = content?.siteName ?? "etnof-cms";
  const palette = resolvePalette("charis", paletteId, customAccent);
  const { accent, background } = palette;
  // Palette passée aux modules (Contact, Maps, Blog...) — voir docs/10-templates.md, "Palette
  // appliquée aux modules". Le bloc Catalogue de Charis (ProductGrid) reçoit la même forme, en
  // dehors du module (comportement exclusif à ce template).
  const modulePalette = { accent, background, ink };
  const showMaps = Boolean(modules?.maps?.enabled) && typeof mapsAddress === "string";
  // Les modules partagés (Contact, Maps, Réseaux sociaux, Newsletter, Galerie, Blog, RDV, Avis
  // Google) rendent chacun leur propre libellé de section en text-xs (voir ces fichiers dans
  // modules/*/frontend) — taille commune à Hestia/Helios qu'on ne peut pas changer sans les
  // impacter aussi. Demandé par Ethan : sur Charis, tous les titres de section doivent matcher la
  // taille de "CATALOGUE"/"NOS COLLECTIONS PHARE" (text-xl) — on force donc localement la taille du
  // premier <span> de chaque <section> de module, en pur CSS, sans toucher aux modules eux-mêmes.
  // Le <h2> (Contact/Réseaux sociaux/Newsletter : "Une question ?"/"Suivez-nous"/"Restez informé")
  // est lui aussi codé en dur (text-2xl) — même traitement, ramené à une taille plus discrète.
  const sectionTitleSize = "[&>section>span:first-child]:!text-xl [&>section>h2]:!text-lg";

  // Horaires + Maps affichés en paire, injectés dans ProductGrid juste après les produits mis en
  // avant/le lien "voir le catalogue" et avant les aperçus par collection (demandé par Ethan) — même
  // traitement de titre (petit libellé en majuscules, comme "OÙ NOUS TROUVER" du module Maps) et même
  // style de carte, côte à côte avec un espace entre elles.
  const horairesAndMaps = (showHours || showMaps) && (
    <Suspense fallback={null}>
      <Reveal>
        <div className="grid gap-8 sm:grid-cols-2 sm:items-start">
          {showHours && (
            <div id="horaires" className="flex flex-col gap-4">
              <span className="text-xl font-semibold uppercase tracking-[0.1em]" style={{ color: accent }}>
                {t(locale, "section.hours")}
              </span>
              <div className="flex flex-col gap-2 rounded-card border p-5 shadow-card" style={{ borderColor: `${ink}14` }}>
                {content!.openingHours.map((day, index) => (
                  <div
                    key={index}
                    className="flex items-baseline justify-between gap-4 border-b py-2 last:border-b-0"
                    style={{ borderColor: `${ink}0F` }}
                  >
                    <span className="text-sm font-semibold" style={{ color: ink }}>
                      {weekdaysFull(locale)[index]}
                    </span>
                    <span className="text-sm" style={{ color: `${ink}99` }}>
                      {formatDayHours(day, locale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showMaps && (
            <div id="maps" className={sectionTitleSize}>
              <MapsSection
                address={mapsAddress as string}
                apiKey={typeof mapsApiKey === "string" ? mapsApiKey : ""}
                palette={modulePalette}
                locale={locale}
              />
            </div>
          )}
        </div>
      </Reveal>
    </Suspense>
  );

  return (
    <SiteChrome
      clientSiteId={clientSiteId}
      modules={modules}
      siteName={siteName}
      hasStory={Boolean(content?.storyContent?.trim())}
      locale={locale}
      onChangeLocale={onChangeLocale}
      palette={modulePalette}
      footer={<SiteFooter content={content} palette={modulePalette} modules={modules} locale={locale} dark />}
    >
      <header className="px-4 pb-14 pt-10 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] sm:text-5xl">{siteName}</h1>
            {logoUrl && (
              <img
                src={`${API_BASE_URL}${logoUrl}`}
                alt=""
                className="h-16 w-16 shrink-0 rounded-full bg-white object-contain p-2 shadow-card sm:h-24 sm:w-24"
              />
            )}
          </div>
          {content?.description && (
            <div
              className="max-w-2xl text-lg leading-relaxed [&_a]:underline [&_strong]:font-semibold"
              style={{ color: `${ink}99` }}
              dangerouslySetInnerHTML={{ __html: content.description }}
            />
          )}
          <div className="h-px w-full" style={{ backgroundColor: `${accent}55` }} />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-24 px-4 pb-16 sm:px-8">
        <Reveal>
          <StorySection
            clientSiteId={clientSiteId}
            apiBaseUrl={API_BASE_URL}
            storyContent={content?.storyContent ?? ""}
            palette={modulePalette}
            locale={locale}
          />
        </Reveal>

        {modules?.catalogue?.enabled && (
          <Reveal>
            <section id="boutique" className="flex flex-col gap-6">
              <span className="text-xl font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
                {t(locale, "nav.catalogue")}
              </span>
              <ProductGrid clientSiteId={clientSiteId} palette={modulePalette} locale={locale} afterFeatured={horairesAndMaps} />
            </section>
          </Reveal>
        )}

        <Suspense fallback={null}>
          <Reveal>
            <div className="grid items-start gap-8 sm:grid-cols-2">
              {modules?.galerie?.enabled && (
                <div id="galerie" className={`sm:col-span-2 ${sectionTitleSize}`}>
                  <GallerySection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
                </div>
              )}
              {modules?.["avis-google"]?.enabled && (
                <div id="avis-google" className={`sm:col-span-2 ${sectionTitleSize}`}>
                  <AvisGoogleSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
                </div>
              )}
              {modules?.blog?.enabled && (
                <div id="blog" className={`sm:col-span-2 ${sectionTitleSize}`}>
                  <BlogSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
                </div>
              )}
              {modules?.rdv?.enabled && (
                <div id="rdv" className={`sm:col-span-2 ${sectionTitleSize}`}>
                  <RdvSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
                </div>
              )}
              {modules?.contact?.enabled && (
                <div id="contact" className={sectionTitleSize}>
                  <ContactSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
                </div>
              )}
              {socialConfig?.enabled && (
                <div id="reseaux-sociaux" className={sectionTitleSize}>
                  <SocialSection
                    facebookUrl={typeof socialConfig.facebookUrl === "string" ? socialConfig.facebookUrl : ""}
                    instagramUrl={typeof socialConfig.instagramUrl === "string" ? socialConfig.instagramUrl : ""}
                    palette={modulePalette}
                    locale={locale}
                  />
                </div>
              )}
            </div>
          </Reveal>
        </Suspense>

        {/* Toujours juste avant le footer et pleine largeur (pas dans la grille sm:grid-cols-2
            ci-dessus) — demandé par Ethan : la newsletter doit rester la dernière section de contenu,
            jamais coincée dans une colonne partagée avec les réseaux sociaux. */}
        {modules?.newsletter?.enabled && (
          <Suspense fallback={null}>
            <Reveal>
              <div id="newsletter" className={sectionTitleSize}>
                <NewsletterSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
              </div>
            </Reveal>
          </Suspense>
        )}
      </div>
    </SiteChrome>
  );
}
