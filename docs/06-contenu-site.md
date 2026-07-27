# 06 — Contenu du site (données client)

## Pourquoi ce fichier existe

Le système de modules (voir `02-architecture-modules.md`) répond à la question "quelles fonctionnalités sont actives ?". Ce fichier répond à une question différente : "d'où viennent les textes, prix, offres du client ?"

Ne pas mélanger les deux : un module peut être activé sans avoir de contenu propre (ex : Maps n'a besoin que d'une adresse), et le contenu de base du site (nom, description, offres) existe même si aucun module optionnel n'est activé.

## Règle de séparation (mise à jour après le passage en multi-tenant)

Avant le passage en multi-tenant (2026-07-26), la config des modules vivait dans un fichier `site.config.json` séparé de la base de données. Ce n'est plus le cas : **modules ET contenu vivent maintenant tous les deux en base**, chacun scopé par `ClientSiteId` (voir `02-architecture-modules.md`). La distinction qui reste pertinente n'est plus "fichier vs base" mais "qui modifie quoi" :

| | Modules (`ClientSite.ModulesConfigJson`) | Contenu client (offres, description, prix...) |
|---|---|---|
| Qui le modifie | Ethan, à la création du compte client (`/admin/dashboard`), ou le client ensuite via son admin | Le client, via son admin (`/admin/{clientSiteId}`) |
| Où c'est stocké | Colonne `ModulesConfigJson` sur `ClientSite` | Tables `SiteContent`/`Offer`, scopées par `ClientSiteId` |

## Structure du contenu (exemple)

```json
{
  "siteName": "Boulangerie Dupont",
  "tagline": "Le pain traditionnel, tous les jours",
  "description": "Boulangerie artisanale à Perpignan depuis 1998...",
  "offers": [
    { "title": "Pain de campagne", "price": "3,50 €", "description": "..." }
  ],
  "contact": { "phone": "...", "email": "...", "address": "..." },
  "hours": { "lundi": "7h-19h" }
}
```

## Où ça vit (mis à jour après la Phase 3)

> **Ce doc proposait initialement un fichier `content.json` sans base de données pour le POC** (BDD prévue "post-POC"). Décision finalement prise pendant la Phase 3, à la demande d'Ethan (voir `05-roadmap-poc.md`) : le contenu est stocké en base **dès le POC**, pas dans un fichier. Le tableau "build-time vs runtime" ci-dessus reste vrai, seul le calendrier a changé — la BDD est arrivée dès la Phase 3 plutôt qu'en post-POC.

Implémenté : entités EF Core `SiteContent` (une ligne par tenant, nom + description) et `Offer` (liste liée), table PostgreSQL, exposées par `GET /api/t/{clientSiteId}/content` (public) et `PUT /api/t/{clientSiteId}/admin/content` (protégé par mot de passe). Le hook `useContent(clientSiteId)` (`frontend/src/hooks/useContent.ts`) lit cet endpoint — même pattern que `useModules()`, comme prévu. Le socle du site (`PublicSite.tsx`) lit ses textes depuis ce hook au lieu de les avoir en dur dans le JSX.

**Mise à jour du 2026-07-26** : `SiteContent` a gagné `EstablishmentName`/`EstablishmentType`/`Address`/`Phone` — la partie `contact` de l'exemple JSON ci-dessus est donc en grande partie couverte, sur une page dédiée "Établissement" (`/admin/{clientSiteId}/establishment`, `EstablishmentSection.tsx`) plutôt que sur la page "Contenu" — distinction volontaire : "Contenu" reste le texte marketing (nom, description, offres), "Établissement" les faits (adresse, téléphone, type, photos via `EstablishmentImage`). Cette page propose aussi une recherche Google Places (nom → adresse/téléphone/type auto-remplis, voir `backend/GooglePlacesEndpoints.cs`) et un mini-CRM visuel (panneau photo + résumé façon fiche établissement).

L'adresse n'appartient plus au module Maps (qui la lisait auparavant dans sa propre config) — Maps lit maintenant `content.address`, voir `docs/02-architecture-modules.md`.

**Mise à jour du 2026-07-27** : `SiteContent` gagne `Email` et `OpeningHours` (page Établissement, onglets — voir plus bas). La colonne `OpeningHoursJson` stocke une liste JSON de 7 chaînes (lundi → dimanche), même convention que `ClientSite.ModulesConfigJson` : colonne texte brute, reformée en liste déjà parsée à la frontière API (`ContentEndpoints.ToResponse`) plutôt qu'une collection mappée par EF Core. `tagline` reste non couvert.

**Page Établissement en onglets** (2026-07-27) : `EstablishmentSection.tsx` passe de panneau unique à 3 onglets — "Informations" (nom/type/adresse/téléphone/email + section "Responsable de l'établissement" [`ManagerName`/`ManagerPhone`/`ManagerEmail`, migration `AddEstablishmentManager`, jamais affiché publiquement] + recherche Google Places), "Photos" (upload manuel + import automatique), "Horaires" (voir ci-dessous — gaté par le module "Horaires", `modules/horaires/module.meta.json`, seul module sans dossier `backend`/`frontend` propre puisqu'il ne fait que masquer un onglet déjà core). La recherche Google Places importe désormais aussi les horaires et les 3 premières photos du lieu : `GooglePlacesEndpoints.details` renvoie les références de photo (`photoReferences`, sans effet de bord), et un nouvel endpoint `POST /admin/google-places/import-photos` télécharge et enregistre ces photos comme `EstablishmentImage` (même stockage disque que l'upload manuel) — séparé du `GET /details` pour ne pas donner d'effet de bord à une requête de lecture.

**Correction du 2026-07-27 (même jour)** : un onglet "Description" avait brièvement été ajouté à Établissement, réutilisant `SiteContent.Description` — retiré presque aussitôt (retour d'Ethan) car ça créait un doublon d'édition avec la page "Contenu" pour le même champ. La séparation reste : "Contenu" = seul endroit pour éditer nom du site/description/offres, "Établissement" = faits.

**Horaires structurés** (2026-07-27) : `OpeningHoursJson` stocke maintenant une liste de 7 `DayHoursDto` (`Closed`/`MorningOpen`/`MorningClose`/`AfternoonOpen`/`AfternoonClose`, lundi → dimanche) plutôt que 7 chaînes libres — deux plages par jour pour permettre une pause méridienne, éditées via de vrais `<input type="time">`. Le format stocké dans cette colonne texte a donc changé une deuxième fois sans migration EF Core (seule la désérialisation change, voir commentaire dans `SiteContent.cs`) ; `GooglePlacesEndpoints` lit `opening_hours.periods` (deux occurrences pour un même jour = pause détectée) au lieu de `weekday_text`.

**Offres déplacées sur leur propre page + lien avec un produit** (2026-07-27) : suite à la remarque d'Ethan ("pourquoi les offres sont sur Contenu ?"), la gestion des offres quitte l'ancienne page "Contenu" pour une nouvelle page `/admin/{clientSiteId}/offers` (`OffersSection.tsx`), toujours core — pas de dossier `/modules`, disponible même sans le module Catalogue (une offre reste utilisable en texte libre pour un client de service sans produits). `Offer` gagne `ProductId` (Guid?, migration `AddOfferProductLink`) : quand Catalogue est activé, un menu déroulant "Produit associé" permet de relier une offre à UN produit existant (pas de pack multi-produits, décision d'Ethan), ce qui préremplit titre/prix/description de l'offre — les champs restent ensuite modifiables librement. Même choix que `Order.CustomerId` (modules/catalogue) : pas de navigation EF ni de contrainte FK entre `Offer` (core) et `Product` (module), juste un Guid optionnel toujours `null` pour un tenant sans Catalogue — le frontend fait le rapprochement lui-même en rechargeant la liste des produits.

**Pages "Contenu" et "Apparence" fusionnées en "Site internet"** (2026-07-27, même jour) : une fois les offres parties, "Contenu" ne portait plus que nom du site + description — jugée trop vide par Ethan. Plutôt que d'inventer des champs pour la remplir, elle est fusionnée avec "Apparence" (qui ne portait que le choix de template) en une seule page `/admin/{clientSiteId}/site` (`SiteSection.tsx`, remplace `ContentSection.tsx` et `AppearanceSection.tsx`, tous deux supprimés), avec 2 onglets : "Modèle" (choix de template, contenu de l'ancien Apparence) et "Contenu" (nom du site + description, contenu de l'ancien Contenu). Un seul bouton "Enregistrer" pour la page : `handleSave` envoie en parallèle le `PUT /admin/template` et/ou le `PUT /admin/content` selon lequel des deux onglets a été modifié.

**Photos d'établissement affichées publiquement** (2026-07-28) : `EstablishmentImage` (`GET /api/t/{clientSiteId}/establishment/images`, déjà public) n'était consommé que côté admin (panneau photo de la page Établissement) — Hestia les affiche désormais aussi sur le site public, dans une nouvelle section "Établissement" sous le hero, avec la description du site. Voir `docs/10-templates.md`.

## Impact sur la Phase 3 de la roadmap

La Phase 3 a bien été élargie comme prévu ici : en plus de cocher/décocher les modules, l'admin de chaque tenant (`/admin/{clientSiteId}`) permet d'éditer les champs de contenu de base (nom, description, offres). Voir le statut détaillé et le passage en multi-tenant dans `05-roadmap-poc.md`.
