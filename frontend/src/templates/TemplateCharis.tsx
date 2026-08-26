import { lazy, Suspense, type ReactNode } from "react";
import { API_BASE_URL } from "../config";
import { t } from "@modules/multilingue/frontend/translations";
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
  const siteName = content?.siteName ?? "etnof-cms";
  const palette = resolvePalette("charis", paletteId, customAccent);
  const { accent, background } = palette;
  // Palette passée aux modules (Contact, Maps, Blog...) — voir docs/10-templates.md, "Palette
  // appliquée aux modules". Le bloc Catalogue de Charis (ProductGrid) reçoit la même forme, en
  // dehors du module (comportement exclusif à ce template).
  const modulePalette = { accent, background, ink };

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
              className="max-w-2xl text-base leading-relaxed [&_a]:underline [&_strong]:font-semibold"
              style={{ color: `${ink}99` }}
              dangerouslySetInnerHTML={{ __html: content.description }}
            />
          )}
          <div className="h-px w-full" style={{ backgroundColor: `${accent}55` }} />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-4 pb-16 sm:px-8">
        {modules?.catalogue?.enabled && (
          <Reveal>
            <section id="boutique" className="flex flex-col gap-6">
              <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
                {t(locale, "nav.catalogue")}
              </span>
              <ProductGrid clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
            </section>
          </Reveal>
        )}

        <Reveal>
          <StorySection
            clientSiteId={clientSiteId}
            apiBaseUrl={API_BASE_URL}
            storyContent={content?.storyContent ?? ""}
            palette={modulePalette}
            locale={locale}
          />
        </Reveal>

        <Suspense fallback={null}>
          <Reveal>
            <div className="grid items-start gap-8 sm:grid-cols-2">
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
              {(modules?.newsletter?.enabled || socialConfig?.enabled) && (
                <div className="flex flex-col gap-8">
                  {modules?.newsletter?.enabled && (
                    <div id="newsletter">
                      <NewsletterSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} locale={locale} />
                    </div>
                  )}
                  {socialConfig?.enabled && (
                    <div id="reseaux-sociaux">
                      <SocialSection
                        facebookUrl={typeof socialConfig.facebookUrl === "string" ? socialConfig.facebookUrl : ""}
                        instagramUrl={typeof socialConfig.instagramUrl === "string" ? socialConfig.instagramUrl : ""}
                        palette={modulePalette}
                        locale={locale}
                      />
                    </div>
                  )}
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
      </div>
    </SiteChrome>
  );
}
