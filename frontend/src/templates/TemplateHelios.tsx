import { lazy, Suspense } from "react";
import { API_BASE_URL } from "../config";
import { TEMPLATES } from "./registry";
import SiteFooter from "./SiteFooter";
import type { TemplateProps } from "./types";

const ContactSection = lazy(() => import("@modules/contact/frontend/ContactSection"));
const MapsSection = lazy(() => import("@modules/maps/frontend/MapsSection"));
const BlogSection = lazy(() => import("@modules/blog/frontend/BlogSection"));
const CatalogueSection = lazy(() => import("@modules/catalogue/frontend/CatalogueSection"));
const RdvSection = lazy(() => import("@modules/rdv/frontend/RdvSection"));
const NewsletterSection = lazy(() => import("@modules/newsletter/frontend/NewsletterSection"));
const AvisGoogleSection = lazy(() => import("@modules/avis-google/frontend/AvisGoogleSection"));
const WhatsAppButton = lazy(() => import("@modules/whatsapp/frontend/WhatsAppButton"));

// 3 variantes de couleurs (accent + fond + fin de dégradé) propres à ce template — voir registry.ts
// pour le détail (aussi utilisé par le sélecteur de palette dans l'admin, SiteSection.tsx). "ink"
// reste commun aux 3 (structure identique, seule la couleur d'accent change, cf.
// docs/09-charte-graphique.md). Volontairement en dehors de tailwind.config.js : ces tokens
// n'appartiennent qu'à Helios, pas à la charte etnof-web partagée utilisée ailleurs (admin, Hestia).
const HELIOS_PALETTES = TEMPLATES.find((t) => t.id === "helios")!.palettes;
const ink = "#1A1512";

// Motif de rayons de soleil (signature visuelle propre à Helios, dieu du soleil), en fine bande
// décorative sous le hero — parité avec la frise en méandre grec d'Hestia (GreekKeyDivider). Généré
// en local (pas d'asset externe), tuilé horizontalement, recoloré selon la palette active.
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

export default function TemplateHelios({ clientSiteId, modules, content, paletteId }: TemplateProps) {
  const mapsAddress = content?.address;
  const mapsApiKey = modules?.maps?.apiKey;
  const whatsappNumber = modules?.whatsapp?.phoneNumber;
  const whatsappMessage = modules?.whatsapp?.message;
  const siteName = content?.siteName ?? "etnof-cms";
  const palette = HELIOS_PALETTES.find((p) => p.id === paletteId) ?? HELIOS_PALETTES[0];
  const { accent, background, gradientEnd } = palette;
  // Palette passée aux modules (Contact, Maps, Blog, Catalogue) — voir docs/10-templates.md,
  // "Palette appliquée aux modules" : chaque module reçoit accent/background/ink, plus de charte
  // etnof-web codée en dur.
  const modulePalette = { accent, background, ink };
  const [firstOffer, ...restOffers] = content?.offers ?? [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: background }}>
      <nav className="px-4 py-4 sm:px-8" style={{ backgroundColor: ink }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-lg font-extrabold text-white">{siteName}</span>
          <div className="flex items-center gap-6 text-sm font-medium text-white/80">
            {modules?.catalogue?.enabled && (
              <a href="#catalogue" className="hover:text-white">
                Catalogue
              </a>
            )}
            {modules?.blog?.enabled && (
              <a href="#blog" className="hover:text-white">
                Blog
              </a>
            )}
            {modules?.rdv?.enabled && (
              <a href="#rdv" className="hover:text-white">
                Rendez-vous
              </a>
            )}
            {modules?.contact?.enabled && (
              <a href="#contact" className="hover:text-white">
                Contact
              </a>
            )}
            {modules?.newsletter?.enabled && (
              <a href="#newsletter" className="hover:text-white">
                Newsletter
              </a>
            )}
            {modules?.["avis-google"]?.enabled && (
              <a href="#avis-google" className="hover:text-white">
                Avis
              </a>
            )}
          </div>
        </div>
      </nav>

      <header
        className="px-4 pb-16 pt-20 sm:px-8"
        style={{ background: `linear-gradient(135deg, ${accent}, ${gradientEnd ?? accent})` }}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <h1 className="max-w-2xl text-5xl font-black leading-[1.05] text-white sm:text-6xl">
            {siteName}
          </h1>
          {content?.description && (
            <p className="max-w-xl text-lg leading-relaxed text-white/90">{content.description}</p>
          )}
        </div>
      </header>
      <SunRayDivider color={accent} />

      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-4 pb-16 pt-10 sm:px-8">
        {firstOffer && (
          <section className="flex flex-col gap-4">
            <div
              className="-mt-20 rounded-card bg-white p-10 shadow-card"
              style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.12)" }}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: accent }}>
                Offre du moment
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
        )}

        <Suspense fallback={null}>
          <div className="grid gap-8 sm:grid-cols-2">
            {modules?.catalogue?.enabled && (
              <div id="catalogue" className="sm:col-span-2">
                <CatalogueSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} />
              </div>
            )}
            {modules?.blog?.enabled && (
              <div id="blog" className="sm:col-span-2">
                <BlogSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} />
              </div>
            )}
            {modules?.rdv?.enabled && (
              <div id="rdv" className="sm:col-span-2">
                <RdvSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} />
              </div>
            )}
            {modules?.contact?.enabled && (
              <div id="contact">
                <ContactSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} />
              </div>
            )}
            {modules?.newsletter?.enabled && (
              <div id="newsletter">
                <NewsletterSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} />
              </div>
            )}
            {modules?.["avis-google"]?.enabled && (
              <div id="avis-google" className="sm:col-span-2">
                <AvisGoogleSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} palette={modulePalette} />
              </div>
            )}
            {modules?.maps?.enabled && typeof mapsAddress === "string" && (
              <MapsSection
                address={mapsAddress}
                apiKey={typeof mapsApiKey === "string" ? mapsApiKey : ""}
                palette={modulePalette}
              />
            )}
          </div>
        </Suspense>

        <SiteFooter content={content} palette={modulePalette} />
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
