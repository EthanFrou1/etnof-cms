import { lazy, Suspense } from "react";
import { API_BASE_URL } from "../config";
import { TEMPLATES } from "./registry";
import type { TemplateProps } from "./types";

const ContactSection = lazy(() => import("@modules/contact/frontend/ContactSection"));
const MapsSection = lazy(() => import("@modules/maps/frontend/MapsSection"));
const BlogSection = lazy(() => import("@modules/blog/frontend/BlogSection"));
const CatalogueSection = lazy(() => import("@modules/catalogue/frontend/CatalogueSection"));

// 3 variantes de couleurs (accent + fond) propres à ce template — voir registry.ts pour le détail
// (aussi utilisé par le sélecteur de palette dans l'admin, SiteSection.tsx). "ink"/blanc restent
// communs aux 3 (structure identique, seule la couleur d'accent change, cf. docs/09-charte-graphique.md).
// Volontairement en dehors de tailwind.config.js : ces tokens n'appartiennent qu'à Hestia, pas à la
// charte etnof-web partagée utilisée ailleurs (admin, autre template).
const HESTIA_PALETTES = TEMPLATES.find((t) => t.id === "hestia")!.palettes;
const ink = "#211A16";

// Frise en forme de méandre grec (motif de poterie), en fine bande décorative — signature visuelle
// propre à Hestia, recolorée selon la palette active. Générée en local (pas d'asset externe), tuilée
// horizontalement.
function GreekKeyDivider({ color }: { color: string }) {
  const pattern = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10" viewBox="0 0 20 10"><path d="M0 10 V4 H8 V0 H14 V8 H20" fill="none" stroke="${color}" stroke-width="1.6"/></svg>`
  )}`;
  return (
    <div
      aria-hidden="true"
      className="h-[10px] w-full opacity-60"
      style={{ backgroundImage: `url("${pattern}")`, backgroundRepeat: "repeat-x", backgroundSize: "20px 10px" }}
    />
  );
}

export default function TemplateHestia({ clientSiteId, modules, content, paletteId }: TemplateProps) {
  const mapsAddress = content?.address;
  const mapsApiKey = modules?.maps?.apiKey;
  const siteName = content?.siteName ?? "etnof-cms";
  const palette = HESTIA_PALETTES.find((p) => p.id === paletteId) ?? HESTIA_PALETTES[0];
  const { accent, background } = palette;

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8" style={{ backgroundColor: background }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-16">
        <nav
          className="flex items-center justify-between rounded-pill px-6 py-3 shadow-soft"
          style={{ backgroundColor: "#FFFFFF" }}
        >
          <span className="text-lg font-extrabold" style={{ color: ink }}>
            {siteName}
          </span>
          <div className="flex items-center gap-5 text-sm font-medium" style={{ color: `${ink}99` }}>
            {modules?.catalogue?.enabled && (
              <a href="#catalogue" style={{ color: "inherit" }} className="hover:opacity-70">
                Catalogue
              </a>
            )}
            {modules?.blog?.enabled && (
              <a href="#blog" style={{ color: "inherit" }} className="hover:opacity-70">
                Blog
              </a>
            )}
            {modules?.contact?.enabled && (
              <a href="#contact" style={{ color: "inherit" }} className="hover:opacity-70">
                Contact
              </a>
            )}
          </div>
        </nav>

        <header className="flex flex-col items-center gap-5 px-2 text-center">
          <span
            className="text-xs font-semibold uppercase tracking-[0.1em]"
            style={{ color: accent }}
          >
            Bienvenue
          </span>
          <h1 className="text-5xl font-black leading-[1.05] sm:text-6xl" style={{ color: ink }}>
            {siteName}
          </h1>
          {content?.description && (
            <p className="max-w-xl text-lg leading-relaxed" style={{ color: `${ink}B3` }}>
              {content.description}
            </p>
          )}
          <GreekKeyDivider color={accent} />
        </header>

        {content && content.offers.length > 0 && (
          <section className="flex flex-col gap-4">
            <span
              className="text-xs font-semibold uppercase tracking-[0.1em]"
              style={{ color: accent }}
            >
              Offres
            </span>
            <div className="grid gap-4 sm:grid-cols-2">
              {content.offers.map((offer) => (
                <div key={offer.id} className="rounded-card bg-white p-8 shadow-card">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-lg font-bold" style={{ color: ink }}>
                      {offer.title}
                    </span>
                    <span
                      className="whitespace-nowrap rounded-button px-2.5 py-1 text-sm font-semibold text-white"
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
        )}

        <Suspense fallback={null}>
          <div className="flex flex-col gap-16">
            {modules?.catalogue?.enabled && (
              <div id="catalogue">
                <CatalogueSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} />
              </div>
            )}
            {modules?.blog?.enabled && (
              <div id="blog">
                <BlogSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} />
              </div>
            )}
            {modules?.contact?.enabled && (
              <div id="contact">
                <ContactSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} />
              </div>
            )}
            {modules?.maps?.enabled && typeof mapsAddress === "string" && (
              <MapsSection
                address={mapsAddress}
                apiKey={typeof mapsApiKey === "string" ? mapsApiKey : ""}
              />
            )}
          </div>
        </Suspense>

        <footer className="pb-8 text-center">
          <a
            href={`/admin/${clientSiteId}`}
            className="text-xs hover:opacity-80"
            style={{ color: `${ink}66` }}
          >
            Administration
          </a>
        </footer>
      </div>
    </div>
  );
}
