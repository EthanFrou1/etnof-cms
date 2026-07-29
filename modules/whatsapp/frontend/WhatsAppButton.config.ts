export interface WhatsAppModuleConfig {
  enabled: boolean;
  /** Numéro au format international, chiffres/espaces/+ libres (nettoyé avant construction du lien wa.me). */
  phoneNumber: string;
  /** Texte pré-rempli dans la conversation ouverte — vide = conversation ouverte sans message. */
  message: string;
}
