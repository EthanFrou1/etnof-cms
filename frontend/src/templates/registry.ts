import type { TemplateId } from "../hooks/useTemplate";

// Variante de couleurs d'un template : "accent" (overline, prix, frise/signature) et "background"
// (fond de page) sont les 2 seules valeurs qui changent d'une palette à l'autre — le reste (noir
// glacé pour le texte fort, cartes blanches, typo, radius) reste commun, cf. docs/09-charte-graphique.md
// ("structure identique, personnalisable par une couleur d'accent différente"). "previewImage" est la
// capture utilisée sur la card du sélecteur de template (SiteSection.tsx) — change avec la palette.
// "gradientEnd" est optionnel : seul Helios en a besoin pour son bandeau hero en dégradé
// (linear-gradient(accent, gradientEnd)), signature propre à ce template. Hestia n'en définit pas.
export type PaletteDef = { id: string; label: string; accent: string; background: string; previewImage: string; gradientEnd?: string };

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
    id: "helios",
    label: "Helios",
    description: "Affirmé et dynamique — bandeau plein cadre en dégradé, offre mise en avant en carte CTA. Idéal pour les activités qui misent sur l'énergie et le mouvement.",
    previewImage: "/template-previews/helios-zenith.png",
    palettes: [
      { id: "zenith", label: "Zénith", accent: "#F59E0B", gradientEnd: "#DC2626", background: "#FFFBF0", previewImage: "/template-previews/helios-zenith.png" },
      { id: "aurore", label: "Aurore", accent: "#FB7185", gradientEnd: "#F59E0B", background: "#FFF7F5", previewImage: "/template-previews/helios-aurore.png" },
      { id: "couchant", label: "Couchant", accent: "#7C3AED", gradientEnd: "#F97316", background: "#FBF7FF", previewImage: "/template-previews/helios-couchant.png" },
    ],
  },
];

// Résout la palette effective d'un tenant : soit un des presets ci-dessus (`paletteId` connu), soit
// une couleur d'accent libre choisie via un color picker (`paletteId === "custom"`, voir
// SiteSection.tsx) — dans ce cas le fond reste celui du premier preset du template (jamais
// personnalisable, voir docs/09-charte-graphique.md) et `gradientEnd` reste absent : le dégradé
// signature d'Helios (voir TemplateHelios.tsx) retombe alors sur une couleur pleine plutôt qu'un
// dégradé inventé au hasard à partir d'une seule couleur choisie par le client.
export function resolvePalette(templateId: TemplateId, paletteId: string | null, customAccent?: string | null): PaletteDef {
  const template = TEMPLATES.find((tpl) => tpl.id === templateId);
  const presets = template?.palettes ?? [];
  const fallback = presets[0] ?? { id: "default", label: "", accent: "#2563EB", background: "#F8FAFC", previewImage: "" };

  if (paletteId === "custom" && customAccent) {
    return { id: "custom", label: "Personnalisé", accent: customAccent, background: fallback.background, previewImage: fallback.previewImage };
  }

  return presets.find((p) => p.id === paletteId) ?? fallback;
}
