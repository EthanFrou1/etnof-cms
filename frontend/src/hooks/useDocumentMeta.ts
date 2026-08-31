import { useEffect } from "react";

type DocumentMetaOptions = {
  title: string;
  description?: string;
  // Logo du tenant (voir TemplateEndpoints.cs, ClientSite.LogoPath) — absent tant que le client n'en
  // a pas uploadé, l'onglet garde alors le favicon par défaut du socle (voir index.html) plutôt que
  // rien.
  faviconUrl?: string;
  // SEO avancé (2026-08-31) : URL canonique explicite — évite le contenu dupliqué si un même site
  // reste joignable par plusieurs URLs (domaine du client + `/t/{clientSiteId}`). Retombe sur
  // `window.location.href` (sans query string) si omis.
  canonicalUrl?: string;
  // Données structurées JSON-LD (voir frontend/src/utils/structuredData.ts) — un objet ou plusieurs
  // (ex. LocalBusiness + BreadcrumbList). `undefined`/tableau vide = pas de balise, jamais un
  // `<script>` vide.
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertIcon(href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "icon");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

function upsertCanonical(href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
}

// Un seul <script type="application/ld+json"> par page — remplacé en entier à chaque appel plutôt
// que d'en accumuler un par section, plus simple à faire cohabiter entre plusieurs composants qui
// pourraient chacun vouloir poser leurs propres données structurées.
function upsertStructuredData(data: Record<string, unknown> | Record<string, unknown>[]) {
  let tag = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
  if (!tag) {
    tag = document.createElement("script");
    tag.setAttribute("type", "application/ld+json");
    document.head.appendChild(tag);
  }
  tag.textContent = JSON.stringify(data);
}

function removeStructuredData() {
  document.head.querySelector('script[type="application/ld+json"]')?.remove();
}

// Titre d'onglet + meta description/Open Graph pour une page publique de tenant — pas de nettoyage
// au démontage : la navigation entre pages publiques se fait par rechargement complet (pas de
// react-router, voir App.tsx), donc il n'y a jamais d'état précédent à restaurer.
// Limite connue : ceci ne s'exécute qu'après le rendu React (site 100% client), donc les robots qui
// n'exécutent pas de JS (aperçus de lien WhatsApp/Facebook/Instagram) ne verront pas ces balises —
// contrairement à Googlebot, qui exécute le JS pour l'indexation. Un vrai rendu côté serveur des
// balises <head> lèverait cette limite, hors scope pour l'instant (voir docs/07-admin-global.md).
// SiteContent.Description est du HTML riche depuis l'ajout de RichTextEditor sur ce champ (voir
// SiteSection.tsx) — une balise meta ne doit contenir que du texte brut, d'où ce nettoyage avant
// de l'utiliser comme description/og:description.
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useDocumentMeta({ title, description, faviconUrl, canonicalUrl, structuredData }: DocumentMetaOptions) {
  useEffect(() => {
    document.title = title;
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:type", "website");
    const plainDescription = description ? stripHtml(description) : "";
    if (plainDescription) {
      upsertMeta("name", "description", plainDescription);
      upsertMeta("property", "og:description", plainDescription);
    }
    if (faviconUrl) upsertIcon(faviconUrl);
    upsertCanonical(canonicalUrl || window.location.href.split("?")[0]);

    const data = Array.isArray(structuredData) ? structuredData : structuredData ? [structuredData] : [];
    if (data.length > 0) {
      upsertStructuredData(data.length === 1 ? data[0] : data);
    } else {
      removeStructuredData();
    }
  }, [title, description, faviconUrl, canonicalUrl, structuredData]);
}
