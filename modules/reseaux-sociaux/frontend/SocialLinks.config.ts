// Documentation du shape de config uniquement — jamais lu par du code (voir docs/02-architecture-modules.md,
// même convention que WhatsAppButton.config.ts). Les vraies clés vivent dans ModulesConfigJson.
export interface SocialLinksModuleConfig {
  enabled: boolean;
  /** URL complète de la page Facebook — vide = icône masquée. */
  facebookUrl: string;
  /** URL complète du profil Instagram — vide = icône masquée. */
  instagramUrl: string;
}
