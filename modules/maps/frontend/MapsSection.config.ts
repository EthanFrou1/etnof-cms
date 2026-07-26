export interface MapsModuleConfig {
  enabled: boolean;
  address: string;
  /** Clé Google Maps Embed API fournie par le client (vide = carte non affichée). */
  apiKey: string;
}
