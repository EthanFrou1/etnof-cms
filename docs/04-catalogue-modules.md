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
| RDV | Prise de rendez-vous (+290€) | Post-POC |
| Paiement Stripe | Paiement Stripe (+350€) | Post-POC |
| Paiement PayPal | Paiement PayPal (+200€) | Post-POC |
| Newsletter | Newsletter (+190€) | Post-POC |
| Avis Google | Avis Google (+100€) | Post-POC |
| WhatsApp | Bouton WhatsApp (+90€) | Post-POC |
| Chat IA | Chat IA (+390€) | Post-POC |
| FAQ IA | FAQ IA (+290€) | Post-POC |
| SEO avancé | SEO avancé (+390€) | Post-POC (transverse, pas un vrai "module" isolé) |

## Note (mise à jour après le bilan Phase 5)

Ce fichier est la source de vérité pour prioriser les prochains modules après le POC.

La priorité initialement suggérée ("Back-office/CMS léger d'abord") est en grande partie déjà couverte par l'admin construit en Phase 3 (`/admin` : toggle modules + édition contenu/offres, protégé par mot de passe). Reste à durcir avant un vrai client (voir `05-roadmap-poc.md`, bilan Phase 5) plutôt qu'à construire de zéro : mot de passe unique en clair → à remplacer par un vrai compte/hash, `module.meta.json`/`*.config.ts` non exploités par l'admin (noms de modules bruts au lieu de noms lisibles), pas de gestion multi-utilisateurs.

Priorité suggérée pour le premier vrai module métier après le POC : **RDV** ou **Newsletter** (forte demande probable chez tes prospects locaux, et bons candidats pour re-valider le pattern module sur un cas avec plus de logique métier que Blog — récurrence, créneaux, envoi d'email).

## Catalogue produits (ajouté le 2026-07-26)

Demandé par Ethan : catalogue de produits (photos, prix, description) avec gestion de stock, étendu à un panier + une commande (décision confirmée par Ethan plutôt qu'un simple catalogue vitrine). N'existait pas dans la grille tarifaire d'origine — **à Ethan de décider où le positionner tarifairement**, ce fichier ne fait qu'enregistrer ce qui a été construit.

**Ce qui est fait** : produits multi-photos (upload admin, stockage local `backend/wwwroot/uploads/`, servi via fichiers statiques), stock, panier côté client (React Context + `localStorage`), commande qui décrémente le stock en base dans une transaction, page admin "Commandes" pour marquer une commande traitée ou l'annuler (l'annulation restaure le stock).

**Ce qui n'est volontairement pas fait** (voir règle 5 de `CLAUDE.md` — pas de dépendance/service externe sans validation) : pas d'intégration de paiement en ligne réel (Stripe/PayPal). La "commande" est un enregistrement (type retrait/virement/règlement sur place), pas une transaction carte bancaire. Si un vrai paiement est nécessaire, ce sera un module à part (`Paiement Stripe`/`Paiement PayPal`, déjà dans la grille tarifaire, post-POC) qui viendra se brancher sur le flux de commande déjà en place plutôt que de le dupliquer.
