// Une image par module, générée par IA et déposée par Ethan dans frontend/public/module-icons/
// (voir docs/11-images-modules.md). Tant qu'un fichier n'existe pas, la card retombe sur un
// dégradé de marque avec l'initiale du module — jamais d'image cassée. Source unique partagée
// entre l'admin d'un tenant (ModulesSection.tsx) et les pages agence (PricingSection.tsx,
// SitesSection.tsx) qui affichent aussi des cards de modules.
export const MODULE_IMAGES: Record<string, string> = {
  contact: "/module-icons/contact.png",
  maps: "/module-icons/maps.png",
  blog: "/module-icons/blog.png",
  catalogue: "/module-icons/catalogue.png",
  horaires: "/module-icons/horaires.png",
  rdv: "/module-icons/rdv.png",
  newsletter: "/module-icons/newsletter.png",
  "avis-google": "/module-icons/avis-google.png",
  whatsapp: "/module-icons/whatsapp.png",
  stripe: "/module-icons/stripe.png",
  multilingue: "/module-icons/multilingue.png",
  "reseaux-sociaux": "/module-icons/reseaux-sociaux.png",
  galerie: "/module-icons/galerie.png",
  analytics: "/module-icons/analytics.png",
  pages: "/module-icons/pages.png",
  offres: "/module-icons/offres.png",
  "compte-client": "/module-icons/compte-client.png",
};
