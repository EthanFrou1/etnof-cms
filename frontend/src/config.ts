export const API_BASE_URL = "http://localhost:5052";

// Destinataire du lien mailto "Activer pour {price}" sur les cards de modules non autorisés
// (ModulesSection.tsx) — demande d'activation envoyée directement à l'agence.
export const AGENCY_CONTACT_EMAIL = "etnofweb@gmail.com";

// Lien de crédit "Site réalisé par etnof-web" en bas du footer public (SiteFooter.tsx) — demandé
// par Ethan, distinct de la décision de ne pas reprendre le logo/wordmark etnof-web dans la navbar
// des sites générés (voir docs/05-roadmap-poc.md, 2026-08-07) : une simple mention en pied de page
// est une pratique courante d'agence, pas la même chose qu'imposer la marque de l'agence au client.
export const AGENCY_WEBSITE_URL = "https://website-etnof-web.vercel.app/";
