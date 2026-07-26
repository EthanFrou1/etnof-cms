import type { TemplateId } from "../hooks/useTemplate";

// Liste des templates disponibles — doit rester synchronisée avec TemplateEndpoints.KnownTemplateIds
// côté backend (backend/TemplateEndpoints.cs).
export const TEMPLATES: { id: TemplateId; label: string; description: string }[] = [
  { id: "classique", label: "Classique", description: "Navbar en pilule, hero centré, sections empilées." },
  { id: "moderne", label: "Moderne", description: "Bandeau en dégradé pleine largeur, offre mise en avant." },
];
