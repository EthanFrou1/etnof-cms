import type { TemplateId } from "../hooks/useTemplate";

// Variante de couleurs d'un template : "accent" (overline, prix, frise/signature) et "background"
// (fond de page) sont les 2 seules valeurs qui changent d'une palette à l'autre — le reste (noir
// glacé pour le texte fort, cartes blanches, typo, radius) reste commun, cf. docs/09-charte-graphique.md
// ("structure identique, personnalisable par une couleur d'accent différente"). "previewImage" est la
// capture utilisée sur la card du sélecteur de template (SiteSection.tsx) — change avec la palette.
export type PaletteDef = { id: string; label: string; accent: string; background: string; previewImage: string };

// Liste des templates disponibles — doit rester synchronisée avec TemplateEndpoints.KnownTemplateIds
// ET TemplateEndpoints.KnownPalettesByTemplate (mêmes id de palette) côté backend (backend/TemplateEndpoints.cs).
// "previewImage" : capture par défaut de la card (repli si le template n'a pas de palette, ou avant
// sélection). Fichiers dans frontend/public/template-previews/ — captures générées par Claude Code en
// plaçeholder (Chrome headless), à remplacer par Ethan par de vraies captures du rendu final quand il
// le souhaite (même logique que frontend/public/module-icons/, voir docs/11-images-modules.md).
export const TEMPLATES: { id: TemplateId; label: string; description: string; palettes: PaletteDef[]; previewImage: string }[] = [
  {
    id: "hestia",
    label: "Hestia",
    description: "Chaleureux et accueillant — navbar en pilule, hero centré. Idéal pour commerces de proximité et artisans.",
    previewImage: "/template-previews/hestia-argile.png",
    palettes: [
      { id: "argile", label: "Argile", accent: "#C1652F", background: "#FBF1E4", previewImage: "/template-previews/hestia-argile.png" },
      { id: "olivier", label: "Olivier", accent: "#6E7C3D", background: "#F3F1E4", previewImage: "/template-previews/hestia-olivier.png" },
      { id: "egee", label: "Égée", accent: "#1D5C73", background: "#F1F5F6", previewImage: "/template-previews/hestia-egee.png" },
    ],
  },
  {
    id: "moderne",
    label: "Moderne",
    description: "Bandeau en dégradé pleine largeur, offre mise en avant.",
    previewImage: "/template-previews/moderne.png",
    palettes: [],
  },
];
