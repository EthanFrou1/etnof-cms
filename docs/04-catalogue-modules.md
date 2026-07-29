# 04 — Catalogue des modules

Aligné sur la grille tarifaire etnof-web actuelle. Statut : à date de rédaction de ce document.

| Module | Option tarif correspondante | Statut |
|---|---|---|
| Contact | Formulaire de contact (inclus formule Essentiel) | Implémenté (Phase 2) |
| Maps | Carte Google Maps (offert) | Implémenté (Phase 2) — clé Google Maps API à fournir par le client |
| Blog | Blog (+250€) | Implémenté (Phase 4) |
| Catalogue produits | Absent de la grille tarifaire actuelle — à prioriser par Ethan | Implémenté (2026-07-26). Produits (photos, prix, description, stock) + panier + commande. Pas de paiement en ligne réel (voir note ci-dessous) |
| Horaires | Absent de la grille tarifaire actuelle — gratuit pour l'instant (décision d'Ethan) | Implémenté (2026-07-27). Onglet Horaires dans la page Établissement (récupération auto depuis Google Places, pause méridienne) — gate l'onglet admin, pas les données (stockées dans `SiteContent` comme le reste d'Établissement). Affichage sur le site public pas encore câblé |
| Back-office / CMS léger | Back-office/CMS (+450€) | Largement couvert par l'admin `/admin` du POC (Phase 3) — reste à durcir avant vente (voir bilan Phase 5) |
| Multilingue | Multilingue (+250€) | Post-POC |
| RDV | Prise de rendez-vous (+290€) | Implémenté (2026-07-28). Gabarit hebdomadaire récurrent (durée de créneau globale + plage horaire active par jour, indépendante du module Horaires), créneaux générés à la volée, réservation publique (nom/email/téléphone/note), annulation côté admin qui libère le créneau. Voir `docs/12-plan-modules-restants.md` pour la portée détaillée |
| Paiement Stripe | Paiement Stripe (+350€) | Implémenté (2026-07-29). Compte Stripe propre à chaque client (pas de Stripe Connect) — décision d'Ethan : simple, cohérent avec le pattern déjà utilisé pour Maps/Google Places, et son modèle économique facture le module une fois plutôt qu'une commission par vente. Remplace entièrement le paiement sur place du module Catalogue (retiré) : une commande n'existe désormais que si Stripe confirme le paiement |
| Paiement PayPal | Paiement PayPal (+200€) | Abandonné — Ethan a choisi de ne garder que Stripe comme moyen de paiement (2026-07-29) |
| Newsletter | Newsletter (+190€) | Implémenté (2026-07-28). Formulaire d'inscription email public, liste + export CSV côté admin. Pas d'envoi de campagne (hors scope V1, voir `docs/12-plan-modules-restants.md`) |
| Avis Google | Avis Google (+100€) | Implémenté (2026-07-28). L'admin lie une fiche Google Places puis récupère les avis à la demande (bouton "Actualiser") ; le client choisit ceux affichés publiquement. Jamais de rafraîchissement automatique — le champ "reviews" de l'API Google Places est payant (voir `docs/12-plan-modules-restants.md`) |
| WhatsApp | Bouton WhatsApp (+90€) | Implémenté (2026-07-28). Bouton flottant (vert WhatsApp officiel, reconnaissable) ouvrant `wa.me` avec un message pré-rempli configurable. Aucun backend, purement frontend (même principe que Maps) |
| Chat IA | Chat IA (+390€) | Mis de côté pour l'instant (décision d'Ethan, 2026-07-29) — pas abandonné, juste dépriorisé après Stripe |
| FAQ IA | FAQ IA (+290€) | Mis de côté pour l'instant (décision d'Ethan, 2026-07-29) — pas abandonné, juste dépriorisé après Stripe |
| SEO avancé | SEO avancé (+390€) | Post-POC (transverse, pas un vrai "module" isolé) |

## Note (mise à jour après le bilan Phase 5)

Ce fichier est la source de vérité pour prioriser les prochains modules après le POC.

La priorité initialement suggérée ("Back-office/CMS léger d'abord") est en grande partie déjà couverte par l'admin construit en Phase 3 (`/admin` : toggle modules + édition contenu/offres, protégé par mot de passe). Reste à durcir avant un vrai client (voir `05-roadmap-poc.md`, bilan Phase 5) plutôt qu'à construire de zéro : mot de passe unique en clair → à remplacer par un vrai compte/hash, `module.meta.json`/`*.config.ts` non exploités par l'admin (noms de modules bruts au lieu de noms lisibles), pas de gestion multi-utilisateurs.

Priorité suggérée pour le premier vrai module métier après le POC : **RDV** ou **Newsletter** (forte demande probable chez tes prospects locaux, et bons candidats pour re-valider le pattern module sur un cas avec plus de logique métier que Blog — récurrence, créneaux, envoi d'email).

## Catalogue produits (ajouté le 2026-07-26)

Demandé par Ethan : catalogue de produits (photos, prix, description) avec gestion de stock, étendu à un panier + une commande (décision confirmée par Ethan plutôt qu'un simple catalogue vitrine). N'existait pas dans la grille tarifaire d'origine — **à Ethan de décider où le positionner tarifairement**, ce fichier ne fait qu'enregistrer ce qui a été construit.

**Ce qui est fait** : produits multi-photos (upload admin, stockage local `backend/wwwroot/uploads/`, servi via fichiers statiques), stock, panier côté client (React Context + `localStorage`), commande qui décrémente le stock en base dans une transaction, page admin "Commandes" pour marquer une commande traitée ou l'annuler (l'annulation restaure le stock).

**Mise à jour du 2026-07-29** : le paiement en ligne réel est arrivé avec le module Stripe (voir plus bas), qui se branche sur ce flux de commande plutôt que de le dupliquer, comme anticipé ci-dessous. Le paiement sur place (commande enregistrée sans encaissement) a été retiré à la demande d'Ethan — Stripe est désormais la seule façon de finaliser une commande.
