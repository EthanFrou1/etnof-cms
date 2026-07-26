import { lazy, Suspense } from "react";
import { API_BASE_URL } from "../config";
import type { TemplateProps } from "./types";

const ContactSection = lazy(() => import("@modules/contact/frontend/ContactSection"));
const MapsSection = lazy(() => import("@modules/maps/frontend/MapsSection"));
const BlogSection = lazy(() => import("@modules/blog/frontend/BlogSection"));
const CatalogueSection = lazy(() => import("@modules/catalogue/frontend/CatalogueSection"));

export default function TemplateClassique({ clientSiteId, modules, content }: TemplateProps) {
  const mapsAddress = content?.address;
  const mapsApiKey = modules?.maps?.apiKey;
  const siteName = content?.siteName ?? "etnof-cms";

  return (
    <div className="min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-16">
        <nav className="flex items-center justify-between rounded-pill bg-white px-6 py-3 shadow-soft">
          <span className="text-lg font-extrabold text-navy">{siteName}</span>
          <div className="flex items-center gap-5 text-sm font-medium text-gray-text">
            {modules?.catalogue?.enabled && (
              <a href="#catalogue" className="hover:text-navy">
                Catalogue
              </a>
            )}
            {modules?.blog?.enabled && (
              <a href="#blog" className="hover:text-navy">
                Blog
              </a>
            )}
            {modules?.contact?.enabled && (
              <a href="#contact" className="hover:text-navy">
                Contact
              </a>
            )}
          </div>
        </nav>

        <header className="flex flex-col items-center gap-5 px-2 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-green-accent">
            Site vitrine
          </span>
          <h1 className="text-5xl font-black leading-[1.05] text-navy sm:text-6xl">{siteName}</h1>
          {content?.description && (
            <p className="max-w-xl text-lg leading-relaxed text-gray-text">{content.description}</p>
          )}
        </header>

        {content && content.offers.length > 0 && (
          <section className="flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-green-accent">
              Offres
            </span>
            <div className="grid gap-4 sm:grid-cols-2">
              {content.offers.map((offer) => (
                <div key={offer.id} className="rounded-card bg-white p-8 shadow-card">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-lg font-bold text-navy">{offer.title}</span>
                    <span className="whitespace-nowrap font-semibold text-green-accent">
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
          <a href={`/admin/${clientSiteId}`} className="text-xs text-gray-text/60 hover:text-gray-text">
            Administration
          </a>
        </footer>
      </div>
    </div>
  );
}
