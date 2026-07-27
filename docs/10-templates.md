# 10 — Templates (mises en page du site public)

## Pourquoi

Chaque client doit pouvoir choisir parmi plusieurs mises en page pour son site, sans qu'un développeur écrive du code par client. À ne pas confondre avec les **modules** (`02-architecture-modules.md`, qui activent/désactivent des fonctionnalités) : un template ne change QUE la mise en page, jamais les données ni quelles fonctionnalités sont actives.

## Pourquoi pas un moteur de templating (Mustache, Handlebars...)

Écarté volontairement : ces outils sont faits pour des templates stockés en texte/HTML, rendus côté serveur — un tout autre paradigme que le stack actuel (composants React/TSX + Tailwind, typé). Les templates sont ici de vrais composants React, ce qui garde le typage, réutilise directement le système de design (`docs/09-charte-graphique.md`) et les blocs de modules existants sans changer d'outil.

**Limite connue** : cette approche suppose qu'un développeur écrit chaque nouveau template. Si le besoin évolue vers un éditeur visuel où le client compose librement sa page (glisser-déposer des blocs), ce sera un système différent (blocs stockés en JSON + un renderer générique) — pas construit, pas nécessaire pour l'instant.

## Structure

```
frontend/src/templates/
  types.ts              <- TemplateProps (clientSiteId, modules, content) — contrat commun
  registry.ts            <- liste des templates disponibles (id, label, description), utilisée par les 2 pages admin
  TemplateHestia.tsx     <- navbar pilule, hero centré, sections empilées (id "hestia", ex-"Classique")
  TemplateModerne.tsx    <- bandeau plein cadre en dégradé, offre mise en avant en carte CTA
```

Convention de nommage (à partir du 2026-07-27) : chaque template porte un nom de la mythologie grecque, choisi pour son sens (pas juste un mot joli) — même logique que les grands CMS (Shopify : Dawn, Sense, Craft ; Squarespace : Bedford, Wells ; Ghost : Casper, Alto), qui découplent le nom du template de sa description technique. `Hestia` (déesse du foyer et de l'hospitalité) a été choisi pour l'ex-"Classique" en cohérence avec son ambiance chaleureuse/accueillante. `Moderne` reste à renommer (prochaine session).

Un template est un composant "bête" (présentation uniquement) : il reçoit `modules`/`content` déjà chargés par l'orchestrateur (`frontend/src/pages/PublicSite.tsx`), il ne fait pas ses propres appels réseau pour ces données-là. Il importe et affiche les blocs de modules existants (`ContactSection`, `MapsSection`, `BlogSection`) sans les modifier — un template ne réécrit jamais la logique d'un module, seulement leur agencement.

## Comment le choix fonctionne

- Stocké dans `ClientSite.TemplateId` (`"classique"` par défaut), aux côtés de `ModulesConfigJson`.
- Backend : `GET /api/t/{clientSiteId}/template` (public, lu par le site), `PUT /api/t/{clientSiteId}/admin/template` (protégé, le client peut changer sa propre mise en page). Voir `backend/TemplateEndpoints.cs` — `KnownTemplateIds` y liste les valeurs valides, à tenir synchronisé avec `frontend/src/templates/registry.ts`.
- Frontend : `PublicSite.tsx` lit le `templateId` via `useTemplate(clientSiteId)` et choisit quel composant de template rendre. Ethan peut fixer le template par défaut à la création d'un client (`/admin/dashboard`) ; le client peut ensuite le changer depuis son propre admin (`/admin/{clientSiteId}/site`, page "Site internet", onglet "Modèle" — anciennement panneau "Apparence", fusionné avec "Contenu" le 2026-07-27, voir `docs/06-contenu-site.md`).

## Ajouter un nouveau template

1. Créer `frontend/src/templates/TemplateXxx.tsx`, prend `TemplateProps`, réutilise les blocs de modules existants
2. Ajouter l'id dans `backend/TemplateEndpoints.cs` (`KnownTemplateIds`) ET `frontend/src/templates/registry.ts` (`TEMPLATES`) — les deux doivent rester synchronisés
3. Ajouter le cas dans le switch de `frontend/src/pages/PublicSite.tsx`
4. Tester : changer le template d'un tenant existant depuis son admin, vérifier que le rendu change sans toucher aux autres tenants

## Statut (2026-07-26)

2 templates livrés (Classique, Moderne), testés avec 2 tenants distincts (un par template). Sélection fonctionnelle des deux côtés (agence à la création, client depuis son admin).

## Renommage + redesign "Classique" → "Hestia" — 2026-07-27

Premier des deux templates repris (décision d'Ethan : un template à la fois). Détail complet dans `docs/05-roadmap-poc.md`, section datée du 2026-07-27. Résumé :

- Id technique renommé `"classique"` → `"hestia"` partout (backend `TemplateEndpoints.KnownTemplateIds`/`ClientSite.TemplateId`/`AgencyDashboardEndpoints`, frontend `useTemplate.ts`/`registry.ts`/`PublicSite.tsx`), fichier `TemplateClassique.tsx` renommé `TemplateHestia.tsx`. Tenant existant qui avait `TemplateId = 'classique'` (Boulangerie Dupont) mis à jour en base par une simple requête SQL — pas de migration EF Core nécessaire, la colonne ne change pas de forme, seulement sa valeur (même logique que pour `ModulesConfigJson`).
- **Palette propre au template**, volontairement en dehors de `tailwind.config.js` (qui porte les tokens partagés etnof-web utilisés ailleurs — admin, template Moderne) : terre cuite `#C1652F`, ivoire `#FBF1E4`, noir glacé `#211A16`, inspirés de la céramique grecque antique. Définis en constantes locales dans `TemplateHestia.tsx`, appliqués en valeurs Tailwind arbitraires/`style` inline.
- **Signature visuelle propre** : fine frise en méandre grec (motif de poterie) sous le hero, générée en local via un petit SVG en data URI tuilé horizontalement (`GreekKeyDivider`, dans le même fichier) — pas d'asset externe.
- **Limite connue, assumée** : les blocs de modules (`ContactSection`, `MapsSection`, `BlogSection`, `CatalogueSection`) gardent la palette etnof-web partagée (vert/dégradé bleu-vert) — un template ne réécrit jamais la logique/le style interne d'un module, seulement leur agencement (règle déjà posée plus haut dans ce fichier). Si Ethan veut que les modules héritent aussi de l'identité du template, ce sera un chantier à part (passer des tokens de couleur en props aux modules).

Testé : build backend (`dotnet build`) et `tsc -b` frontend propres ; `GET /api/t/{id}/template` renvoie bien `"hestia"` pour Boulangerie Dupont ; rendu vérifié par capture d'écran (Chrome installé sur la machine trouvé et piloté en `--headless=new --screenshot`, contrairement aux sessions précédentes où ni `chromium-cli` ni Playwright n'étaient accessibles) : fond ivoire, overline "BIENVENUE" en terre cuite, titre en noir glacé, frise en méandre visible, navbar pilule blanche.

**Reste à faire** : le template `Moderne` n'a pas encore de nom mythologique ni de palette propre — prochaine étape demandée par Ethan. QA visuelle finale par Ethan dans le navigateur.

## 3 palettes sélectionnables par template — 2026-07-27 (même jour)

Demande d'Ethan, immédiatement après le renommage "Hestia" : chaque template doit proposer plusieurs variantes de couleurs, choisies par le client lui-même depuis son admin — en plus du choix du template. Fonctionnalité permanente (pas juste un choix ponctuel pour trancher le design), sur Hestia uniquement pour l'instant (Moderne n'a pas encore de palette).

- **`ClientSite` gagne `PaletteId`** (migration `AddPaletteId`, défaut `"argile"`). Rétrocompatibilité : la colonne est ajoutée avec un défaut SQL vide, les lignes existantes ont été backfillées à `"argile"` par une requête directe (pas de perte, même logique que les migrations précédentes avec backfill).
- **3 palettes Hestia** définies dans `frontend/src/templates/registry.ts` (`PaletteDef`) et dupliquées côté validation dans `backend/TemplateEndpoints.KnownPalettesByTemplate` (même id, à tenir synchronisé — même contrainte déjà documentée pour `KnownTemplateIds`) :
  - **Argile** (défaut) : terre cuite `#C1652F` / ivoire `#FBF1E4`
  - **Olivier** : olive `#6E7C3D` / crème pâle `#F3F1E4`
  - **Égée** : bleu marbre `#1D5C73` / blanc bleuté `#F1F5F6`

  Seuls "accent" et "background" changent d'une palette à l'autre — noir glacé (texte fort) et cartes blanches restent communs aux 3, cf. la règle déjà posée dans `docs/09-charte-graphique.md` ("structure identique, personnalisable par une couleur d'accent différente").
- **Endpoints** (`backend/TemplateEndpoints.cs`) : `GET /api/t/{id}/template` renvoie désormais `{templateId, paletteId}` ; `PUT /api/t/{id}/admin/template` accepte `{templateId, paletteId?}`, valide que la palette existe pour le template choisi (400 sinon), et **replie automatiquement** sur la première palette connue si le tenant change vers un template dont sa palette actuelle n'existe pas (ex. venait de "moderne", sans palette).
- **Frontend** : `TemplateHestia.tsx` résout `accent`/`background` depuis `paletteId` (repli sur la 1ère palette si absent/inconnu) au lieu de constantes fixes ; la frise en méandre grec se recolore avec l'accent actif. `SiteSection.tsx` (onglet "Modèle") affiche un sélecteur de pastilles sous le choix de template (visible seulement si le template sélectionné a des palettes), avec le même mécanisme de detection de modification ("Enregistrer" désactivé tant que rien n'a changé) déjà en place pour le reste de la page — changer de template réinitialise automatiquement la palette de brouillon si l'ancienne n'existe pas pour le nouveau.

Testé : migration appliquée + backfill vérifié (`SELECT` sur `ClientSites`) ; `dotnet build`/`tsc -b` propres ; cycle `PUT`/`GET` sur les 3 palettes vérifié par curl (dont rejet 400 d'une palette inconnue) ; rendu des 3 palettes confirmé par capture d'écran (Chrome headless) sur le tenant "Boulangerie Dupont", en prenant soin de laisser un vrai délai entre le changement et la capture (une boucle de test trop rapide donnait un rendu decalé d'une étape — artefact du harnais de test, pas un bug de l'app, confirmé en testant chaque palette isolément avec un délai). Tenant restauré sur "argile" (son état d'avant-test) à la fin.

**Reste à faire** : le sélecteur de palette dans l'admin (`/admin/{id}/site`, onglet Modèle) n'a pas été vérifié visuellement dans un navigateur réel (nécessite de passer l'écran de login, non scriptable avec le simple flag `--screenshot` de Chrome headless utilisé ici) — à confirmer par Ethan. Quand "Moderne" sera repris, penser à lui donner aussi 3 palettes pour rester cohérent.

**Confirmé par Ethan dans la foulée** : capture d'écran de sa propre session sur `/admin/11111111-1111-1111-1111-111111111111/site` montrant le radio "Hestia" sélectionné en brouillon et la palette "Olivier" active, bouton "Enregistrer" activé — le sélecteur fonctionne. Ethan a ensuite enregistré ce choix (voir note dans la section suivante).

## Sélecteur de template en cards (façon page Modules) — 2026-07-27 (même jour)

Demande d'Ethan après avoir vu le sélecteur en liste : la page "Modèle" (`/admin/{id}/site`) doit ressembler à la page Modules — des cards avec une image représentative du rendu, et la palette de couleurs choisie par-dessus, sur un côté, en bas. L'image de fond de la card doit changer selon la palette sélectionnée.

- `TemplateTab`/`SiteSection.tsx` : la liste à radios devient une grille de `TemplateCard` (même famille visuelle que `ModuleCard` dans `ModulesSection.tsx` — image `aspect-[16/10]`, dégradé de lisibilité, nom en overlay). Cliquer sur l'image sélectionne le template (remplace le radio). Un badge ✓ (au lieu du badge de statut des modules) indique la card sélectionnée.
- **Palette en overlay bas-droite** : pastilles rondes (moitié fond/moitié accent, comme avant) dans une pilule semi-transparente, affichées uniquement sur la card actuellement sélectionnée — changer de palette n'a de sens que pour le template actif. `e.stopPropagation()` sur ce bloc pour ne pas déclencher la sélection du template au clic sur une pastille.
- **L'image change avec la palette active** : chaque `PaletteDef` (registry.ts) porte désormais `previewImage` ; la card du template sélectionné résout son image via la palette de brouillon en cours (repli sur la 1ʳᵉ palette si aucune ne correspond), les autres cards restent sur leur image par défaut. Testé en direct (clic simulé via CDP sur la pastille "Olivier") : l'image de la card change instantanément, sans rechargement, et active bien le bouton "Enregistrer".
- **Images placeholder** (`frontend/public/template-previews/`) : captures générées par Claude Code (Chrome headless piloté en CDP brut, faute de Playwright — voir note technique ci-dessous) du rendu réel de chaque template/palette. **À remplacer par Ethan** par ses propres captures du résultat final, comme demandé ("une image que je prendrais du résultat du site") — même logique que `frontend/public/module-icons/` (`docs/11-images-modules.md`) : tant qu'un fichier manque ou échoue à charger, repli automatique sur un dégradé (couleurs de la palette pour Hestia, dégradé de marque pour Moderne) avec l'initiale du template, jamais d'image cassée.
- **Note technique — pilotage CDP sans Playwright** : le simple flag `chrome.exe --screenshot` capture la page entière (toute la hauteur scrollable), ce qui écrasait mal une capture 16:10 en card. Un petit script Node (`cdp-shot.mjs`, scratchpad, non versionné) pilote Chrome en DevTools Protocol brut (WebSocket natif de Node 22, sans dépendance) : `Page.captureScreenshot` sans `captureBeyondViewport` ne capture que le viewport visible, bien mieux adapté. Le même mécanisme permet aussi de contourner l'écran de login admin (`sessionStorage.setItem` sur la clé `etnof-admin-password-{clientSiteId}` avant de recharger, cf. `useAdminSession.ts`) et de simuler un vrai clic (`element.click()`) pour tester les interactions sans Playwright.
- **Aléa de session** : en cherchant une capture "Moderne" à utiliser comme placeholder, découverte que le tenant historique n'était plus sur "moderne" mais sur "hestia"/"olivier" — Ethan avait dû l'enregistrer lui-même en testant la version précédente (liste à radios) de ce même sélecteur. Choix respecté tel quel (pas de retour en arrière sur un choix réel d'Ethan) ; la capture Moderne a été prise en basculant temporairement "Boulangerie Dupont" (tenant de test) sur "moderne" le temps de la capture, puis restauré sur "hestia"/"argile".

Testé : `tsc -b` propre ; rendu de la grille de cards vérifié par capture d'écran (CDP, connecté via `sessionStorage`) sur "Boulangerie Dupont" ; interaction palette → image vérifiée en direct par clic simulé.

**Reste à faire** : Ethan remplacera les 4 images placeholder par ses propres captures quand il le souhaite (aucune contrainte de format autre que fonctionner en `object-cover` 16:10).

## Prochaine étape (à partir du 2026-07-28) : améliorer les templates en profondeur

Trois chantiers demandés par Ethan, distincts de la reprise nom/palette déjà faite pour Hestia :

1. **Renommer/redessiner "Moderne"**, avec ses 3 palettes — même exercice que Hestia (nom de la mythologie grecque cohérent avec son ton plus affirmé/dynamique, 2-3 pistes de palette à proposer, mise en page à retravailler). Le mécanisme (backend `KnownPalettesByTemplate`, cards admin) existe déjà, seul `registry.ts` (+ `previewImage` par palette) est à remplir pour "moderne".

2. **Footer avec les infos établissement**, sur les deux templates. Aucun footer réel aujourd'hui (juste un lien "Administration"). `SiteContent` porte déjà `establishmentName`/`address`/`phone`/`email`/`openingHours` mais rien n'est encore lu par les templates publics — un footer est l'endroit naturel pour ça (voir aussi la limite "affichage public non câblé" déjà notée dans `docs/05-roadmap-poc.md` à plusieurs reprises).

3. **La palette du template doit s'appliquer à tout le site, y compris les modules** — remise en cause explicite par Ethan de la règle posée plus haut dans ce fichier ("un template ne réécrit jamais le style d'un module"). Aujourd'hui `ContactSection`/`MapsSection`/`BlogSection`/`CatalogueSection` sont stylés en dur avec la palette etnof-web partagée (`bg-brand-gradient`, `text-green-accent`...), ce qui fait que le site public d'un client mélange sa propre identité (template + palette) avec celle de l'agence. **Principe donné par Ethan** : le site public doit être cohérent en lui-même et n'a aucune raison de ressembler au site etnof-web — cette marque/palette reste réservée à l'admin. Implique un changement d'architecture : les modules devront recevoir la palette active en props (a minima `accent`/`background`, mêmes clés que `PaletteDef` dans `registry.ts`) au lieu de tokens Tailwind globaux, à concevoir avant de coder (forme exacte de la palette côté module, compatibilité avec "Moderne" une fois qu'il aura ses propres palettes).
