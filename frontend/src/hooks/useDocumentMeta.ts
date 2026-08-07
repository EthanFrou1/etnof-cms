import { useEffect } from "react";

type DocumentMetaOptions = {
  title: string;
  description?: string;
  // Logo du tenant (voir TemplateEndpoints.cs, ClientSite.LogoPath) — absent tant que le client n'en
  // a pas uploadé, l'onglet garde alors le favicon par défaut du navigateur.
  faviconUrl?: string;
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
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useDocumentMeta({ title, description, faviconUrl }: DocumentMetaOptions) {
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
  }, [title, description, faviconUrl]);
}
