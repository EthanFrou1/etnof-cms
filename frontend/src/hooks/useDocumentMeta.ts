import { useEffect } from "react";

type DocumentMetaOptions = {
  title: string;
  description?: string;
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

// Titre d'onglet + meta description/Open Graph pour une page publique de tenant — pas de nettoyage
// au démontage : la navigation entre pages publiques se fait par rechargement complet (pas de
// react-router, voir App.tsx), donc il n'y a jamais d'état précédent à restaurer.
// Limite connue : ceci ne s'exécute qu'après le rendu React (site 100% client), donc les robots qui
// n'exécutent pas de JS (aperçus de lien WhatsApp/Facebook/Instagram) ne verront pas ces balises —
// contrairement à Googlebot, qui exécute le JS pour l'indexation. Un vrai rendu côté serveur des
// balises <head> lèverait cette limite, hors scope pour l'instant (voir docs/07-admin-global.md).
export function useDocumentMeta({ title, description }: DocumentMetaOptions) {
  useEffect(() => {
    document.title = title;
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:type", "website");
    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
    }
  }, [title, description]);
}
