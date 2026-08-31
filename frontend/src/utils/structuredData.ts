import type { SiteContent, DayHours } from "../hooks/useContent";
import { stripHtml } from "../hooks/useDocumentMeta";

// Données structurées JSON-LD (schema.org), pour que Google puisse afficher adresse/horaires/prix/
// avis directement dans les résultats de recherche — au-delà de la base (titre/meta/OG) déjà posée
// par useDocumentMeta.ts. Réservé à frontend/src/ (PublicSite.tsx, templates/charis/) : un module
// (modules/*/frontend/) ne peut pas importer ce fichier (voir docs/02-architecture-modules.md, "un
// module reste isolé") et duplique sa propre version minimale si besoin — voir BlogPostPage.tsx.

const SCHEMA_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function openingHoursSpecification(hours: DayHours[]) {
  return hours.flatMap((day, i) => {
    if (day.closed) return [];
    const ranges: [string, string][] = [];
    if (day.morningOpen && day.morningClose) ranges.push([day.morningOpen, day.morningClose]);
    if (day.afternoonOpen && day.afternoonClose) ranges.push([day.afternoonOpen, day.afternoonClose]);
    return ranges.map(([opens, closes]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${SCHEMA_DAYS[i]}`,
      opens,
      closes,
    }));
  });
}

// LocalBusiness — posé sur la page d'accueil publique de chaque tenant (PublicSite.tsx), quel que
// soit le template actif. `null` tant que le contenu n'a pas encore chargé ou qu'aucun nom n'est
// renseigné (rien à décrire).
export function buildLocalBusinessSchema(content: SiteContent | null, siteUrl: string): Record<string, unknown> | null {
  if (!content) return null;
  const name = content.establishmentName || content.siteName;
  if (!name.trim()) return null;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    url: siteUrl,
    ...(content.description.trim() ? { description: stripHtml(content.description) } : {}),
    ...(content.address.trim() ? { address: { "@type": "PostalAddress", streetAddress: content.address } } : {}),
    ...(content.phone.trim() ? { telephone: content.phone } : {}),
    ...(content.email.trim() ? { email: content.email } : {}),
    ...(content.openingHours.length > 0
      ? { openingHoursSpecification: openingHoursSpecification(content.openingHours) }
      : {}),
  };
}

export type ProductSchemaInput = {
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  inStock: boolean;
  ratingValue?: number;
  reviewCount?: number;
};

// Product — posé sur une fiche produit publique (charis/ProductPage.tsx, seul template avec une
// fiche produit dédiée pour l'instant, voir docs/10-templates.md).
export function buildProductSchema(product: ProductSchemaInput, url: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(product.description.trim() ? { description: stripHtml(product.description) } : {}),
    ...(product.imageUrl ? { image: product.imageUrl } : {}),
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: "EUR",
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url,
    },
    ...(product.ratingValue !== undefined && product.reviewCount
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingValue, reviewCount: product.reviewCount } }
      : {}),
  };
}
