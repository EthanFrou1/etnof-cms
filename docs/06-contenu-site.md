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

Toujours pas couvert : `tagline`, `hours`. À ajouter si un futur module ou un vrai client en a besoin, en étendant `SiteContent` plutôt qu'en recréant un mécanisme parallèle.

## Impact sur la Phase 3 de la roadmap

La Phase 3 a bien été élargie comme prévu ici : en plus de cocher/décocher les modules, l'admin de chaque tenant (`/admin/{clientSiteId}`) permet d'éditer les champs de contenu de base (nom, description, offres). Voir le statut détaillé et le passage en multi-tenant dans `05-roadmap-poc.md`.
