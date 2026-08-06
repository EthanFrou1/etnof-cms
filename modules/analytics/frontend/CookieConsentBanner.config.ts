// Documentation du shape de config uniquement — jamais lu par du code (voir docs/02-architecture-modules.md,
// même convention que WhatsAppButton.config.ts).
export interface AnalyticsModuleConfig {
  enabled: boolean;
  /** ID de mesure GA4, ex. "G-XXXXXXXXXX" — vide = bandeau et script jamais chargés. */
  measurementId: string;
}
