import { useEffect, useState } from "react";
// Écart assumé à "un module reste isolé" (docs/02-architecture-modules.md) : import direct du
// dictionnaire i18n du module Multilingue plutôt que de dupliquer des chaînes ici — voir
// modules/multilingue/frontend/translations.ts.
import { t, type Locale } from "@modules/multilingue/frontend/translations";

// Couleurs du template actif — voir docs/10-templates.md : un module reste isolé (ne dépend
// d'aucun import de frontend/src ou d'un autre module), donc redéclare localement cette forme
// plutôt que d'importer PaletteDef.
type ModulePalette = { accent: string; background: string; ink: string };

type AvisGoogleSectionProps = {
  apiBaseUrl: string;
  clientSiteId: string;
  palette: ModulePalette;
  locale?: Locale;
};

type Review = {
  id: string;
  authorName: string;
  profilePhotoUrl: string | null;
  rating: number;
  text: string;
  relativeTimeDescription: string;
};

type AvisGoogleResponse = {
  averageRating: number | null;
  userRatingsTotal: number | null;
  reviews: Review[];
};

function Stars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  const rounded = Math.round(rating);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 20 20"
          className={size}
          fill={n <= rounded ? "#FBBF24" : "#E5E7EB"}
        >
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

export default function AvisGoogleSection({ apiBaseUrl, clientSiteId, palette, locale }: AvisGoogleSectionProps) {
  const [data, setData] = useState<AvisGoogleResponse | null>(null);

  useEffect(() => {
    const query = locale && locale !== "fr" ? `?locale=${locale}` : "";
    fetch(`${apiBaseUrl}/api/t/${clientSiteId}/avis-google${query}`)
      .then((res) => res.json())
      .then(setData)
      .catch(() => {});
  }, [apiBaseUrl, clientSiteId, locale]);

  // Rien tant qu'aucun avis n'a été sélectionné par le client dans son back-office — mieux qu'une
  // section vide muette (même principe que BlogSection sans article publié).
  if (!data || data.reviews.length === 0) return null;

  return (
    <section
      className="rounded-card bg-white p-8 shadow-card"
      style={{ "--module-accent": palette.accent } as React.CSSProperties}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: palette.accent }}>
        {t(locale, "avisGoogle.label")}
      </span>
      <div className="mb-5 mt-1 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-extrabold" style={{ color: palette.ink }}>
          {t(locale, "avisGoogle.title")}
        </h2>
        {data.averageRating !== null && (
          <div className="flex items-center gap-2">
            <Stars rating={data.averageRating} size="h-5 w-5" />
            <span className="text-sm font-semibold" style={{ color: palette.ink }}>
              {data.averageRating.toFixed(1)}
            </span>
            {data.userRatingsTotal !== null && (
              <span className="text-sm text-gray-text">
                ({data.userRatingsTotal} {t(locale, "avisGoogle.reviewsCount")})
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.reviews.map((review) => (
          <div key={review.id} className="flex flex-col gap-2 rounded-button border border-border-subtle p-4">
            <div className="flex items-center gap-2">
              {review.profilePhotoUrl ? (
                <img src={review.profilePhotoUrl} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-text">
                  {review.authorName.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" style={{ color: palette.ink }}>
                  {review.authorName}
                </p>
                <p className="text-xs text-gray-text">{review.relativeTimeDescription}</p>
              </div>
            </div>
            <Stars rating={review.rating} />
            <p className="text-sm text-gray-text">{review.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
