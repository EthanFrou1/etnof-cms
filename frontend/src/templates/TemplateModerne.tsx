import { lazy, Suspense } from "react";
import { API_BASE_URL } from "../config";
import type { TemplateProps } from "./types";

const ContactSection = lazy(() => import("@modules/contact/frontend/ContactSection"));
const MapsSection = lazy(() => import("@modules/maps/frontend/MapsSection"));
const BlogSection = lazy(() => import("@modules/blog/frontend/BlogSection"));
const CatalogueSection = lazy(() => import("@modules/catalogue/frontend/CatalogueSection"));

export default function TemplateModerne({ clientSiteId, modules, content }: TemplateProps) {
  const mapsAddress = content?.address;
  const mapsApiKey = modules?.maps?.apiKey;
  const siteName = content?.siteName ?? "etnof-cms";
  const [firstOffer, ...restOffers] = content?.offers ?? [];

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-navy px-4 py-4 sm:px-8">
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
            {modules?.contact?.enabled && (
              <a href="#contact" className="hover:text-white">
                Contact
              </a>
            )}
          </div>
        </div>
      </nav>

      <header className="bg-brand-gradient px-4 py-20 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <h1 className="max-w-2xl text-5xl font-black leading-[1.05] text-white sm:text-6xl">
            {siteName}
          </h1>
          {content?.description && (
            <p className="max-w-xl text-lg leading-relaxed text-white/90">{content.description}</p>
          )}
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-16 sm:px-8">
        {firstOffer && (
          <section className="flex flex-col gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-green-accent">
              Offre du moment
            </span>
            <div className="rounded-card bg-brand-gradient p-10 shadow-card">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <span className="text-2xl font-extrabold text-white">{firstOffer.title}</span>
                <span className="text-xl font-bold text-white">{firstOffer.price}</span>
              </div>
              {firstOffer.description && (
                <p className="mt-3 max-w-xl leading-relaxed text-white/90">
                  {firstOffer.description}
                </p>
              )}
            </div>

            {restOffers.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-3">
                {restOffers.map((offer) => (
                  <div key={offer.id} className="rounded-card bg-bg-page-start p-6 shadow-card">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-bold text-navy">{offer.title}</span>
                      <span className="whitespace-nowrap text-sm font-semibold text-green-accent">
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
                <CatalogueSection apiBaseUrl={API_BASE_URL} clientSiteId={clientSiteId} />
              </div>
            )}
            {modules?.blog?.enabled && (
              <div id="blog" className="sm:col-span-2">
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

        <footer className="text-center">
          <a href={`/admin/${clientSiteId}`} className="text-xs text-gray-text/60 hover:text-gray-text">
            Administration
          </a>
        </footer>
      </div>
    </div>
  );
}
