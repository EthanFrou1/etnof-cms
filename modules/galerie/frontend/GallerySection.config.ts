// Documentation du shape de config uniquement — jamais lu par du code (voir docs/02-architecture-modules.md).
// Pas de champ configurable pour ce module : les photos elles-mêmes sont la donnée (GalleryImage
// côté backend), pas des clés dans ModulesConfigJson.
export interface GalleryModuleConfig {
  enabled: boolean;
}
