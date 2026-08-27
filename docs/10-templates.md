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
  SiteFooter.tsx          <- footer partagé (infos établissement, horaires), utilisé par les 3 templates
  TemplateHestia.tsx     <- navbar pilule, hero centré, sections empilées (id "hestia", ex-"Classique")
  TemplateHelios.tsx     <- navbar pleine largeur, hero plein cadre en dégradé, offre en carte CTA (id "helios", ex-"Moderne")
  TemplateCharis.tsx     <- navbar minimale, hero épuré, bloc Catalogue à survol (id "charis") — voir section dédiée plus bas
  charis/
    ProductCard.tsx        <- card produit à survol (partagée par le teaser home, la page boutique et — indirectement — la fiche produit)
    CartButton.tsx          <- bouton panier flottant en portail (idem, partagé)
    ProductGrid.tsx          <- teaser Catalogue sur la home (slider "mis en avant" ou repli 8 produits), remplace CatalogueSection pour ce template
    ProductPage.tsx           <- fiche produit dédiée (grande photo + slider), montée par sa propre route (App.tsx), pas nichée dans le template
    CataloguePage.tsx          <- page boutique riche (chips de filtre par collection), montée via l'aiguilleur frontend/src/pages/CataloguePage.tsx
```

`frontend/src/pages/CataloguePage.tsx` (aiguilleur, même principe que `PublicSite.tsx`) et `modules/catalogue/frontend/CataloguePage.tsx` (version simple, sans filtre, partagée par Hestia/Helios) complètent la route publique `/t/{clientSiteId}/boutique` — voir `docs/04-catalogue-modules.md` pour le détail de ce chantier (2026-08-25).

Convention de nommage (à partir du 2026-07-27) : chaque template porte un nom de la mythologie grecque, choisi pour son sens (pas juste un mot joli) — même logique que les grands CMS (Shopify : Dawn, Sense, Craft ; Squarespace : Bedford, Wells ; Ghost : Casper, Alto), qui découplent le nom du template de sa description technique. `Hestia` (déesse du foyer et de l'hospitalité) a été choisi pour l'ex-"Classique" en cohérence avec son ambiance chaleureuse/accueillante ; `Helios` (dieu du soleil) pour l'ex-"Moderne", cohérent avec son ton affirmé/dynamique.

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

## Palette appliquée aux modules, Helios (ex-"Moderne"), footer — 2026-07-28

Les trois chantiers annoncés dans la section précédente ont été réalisés dans cet ordre (différent de l'ordre demandé par Ethan, pour ne redessiner Helios qu'une seule fois avec le mécanisme palette→modules déjà en place) :

### 1. Palette appliquée aux modules

Remise en cause assumée de la règle historique ("un template ne réécrit jamais le style d'un module") : le site public d'un client doit être cohérent avec **sa** palette, pas avec la charte etnof-web — cette dernière reste réservée à l'admin.

- Chaque module (`ContactSection`, `MapsSection`, `BlogSection`, `CatalogueSection` + `CartDrawer`) reçoit désormais une prop `palette: { accent: string; background: string; ink: string }`. `accent`/`background` viennent de la `PaletteDef` active ; `ink` (couleur de texte fort) est une constante propre à chaque template, hors `PaletteDef` (ne varie pas avec la palette, cf. `ink` déjà utilisé dans `TemplateHestia.tsx`).
- **Aucun type partagé importé** entre `frontend/src/templates/` et `/modules/` : chaque module redéclare localement cette forme (`ModulePalette`), pour rester isolé au sens de `docs/02-architecture-modules.md` — même logique que `apiBaseUrl`/`clientSiteId`, déjà redéclarés partout plutôt qu'importés.
- Remplacements mécaniques dans les 5 fichiers : `text-green-accent`/prix/labels overline → `color: palette.accent` ; `bg-brand-gradient` (boutons primaires) → `backgroundColor: palette.accent` (couleur pleine, pas de dégradé) ; `text-navy`/`bg-navy` → `palette.ink` ; `bg-bg-page-start` (fonds décoratifs : placeholder Maps, vignette produit sans photo) → `palette.background`. Restent neutres (non identitaires) : `text-gray-text`, `border-border-subtle`, `text-red-500` (erreurs), les radius/shadow, les cartes `bg-white`.
- `TemplateHestia.tsx`/`TemplateHelios.tsx` construisent `{ accent, background, ink }` une fois et le passent à chaque bloc de module affiché.

### 2. "Moderne" renommé "Helios" (dieu du soleil), 3 palettes, mise en page retravaillée

Nom choisi par Ethan parmi 3 pistes proposées (Helios, Iris, Prométhée) — cohérent avec le ton affirmé/dynamique du template (bandeau plein cadre en dégradé). Même mécanique que pour Hestia :

- Backend : `KnownTemplateIds` (`"moderne"` → `"helios"`), `KnownPalettesByTemplate["helios"] = ["zenith", "aurore", "couchant"]`.
- Frontend : `TemplateModerne.tsx` → `TemplateHelios.tsx`, `useTemplate.ts`, `PublicSite.tsx`, `registry.ts`.
- **3 palettes solaires** : Zénith (défaut, ambre `#F59E0B` → rouge-orangé `#DC2626`, fond `#FFFBF0`), Aurore (corail `#FB7185` → ambre `#F59E0B`, fond `#FFF7F5`), Couchant (violet crépuscule `#7C3AED` → orange `#F97316`, fond `#FBF7FF`). `ink` fixe : `#1A1512`.
- **`PaletteDef` gagne un champ optionnel `gradientEnd`** — sert uniquement à la bannière hero en dégradé d'Helios (signature du template), pas utilisé par les modules (contrat minimal `accent`/`background`/`ink`). Hestia n'en définit pas.
- **Mise en page retravaillée**, pas juste recolorée : navbar pleine largeur fond `ink` (texte blanc, contraste avec la pilule blanche d'Hestia) ; hero plein cadre en dégradé diagonal (`accent` → `gradientEnd`) ; **signature visuelle propre** : motif de rayons de soleil en frise (`SunRayDivider`, même technique SVG en data URI tuilé qu'Hestia) ; carte CTA "Offre du moment" qui chevauche le bas du hero (marge négative + ombre portée), plutôt que collée en dessous comme avant.
- Aucun tenant n'était sur `"moderne"` en base au moment du renommage (le tenant historique était déjà passé sur Hestia lors d'un test d'Ethan en session précédente) — pas de migration de données nécessaire.

### 3. Footer avec infos établissement

Nouveau composant partagé `frontend/src/templates/SiteFooter.tsx` (structure commune aux deux templates, couleurs via la même prop `palette` que les modules), remplace le lien "Administration" isolé qui faisait office de footer. Affiche `establishmentName`/`address`/`phone`/`email` et un résumé jour par jour des `openingHours` (mêmes libellés que `WEEKDAYS` dans `EstablishmentSection.tsx`, dupliqués localement) — tout est optionnel, n'affiche que ce qui est renseigné. Garde le lien "Administration" en bas.

**Testé** : `dotnet build`/`tsc -b` propres ; cycle `PUT`/`GET` `/api/t/{id}/admin/template` avec `helios` + ses 3 palettes (dont rejet 400 d'une palette invalide) ; rendu vérifié par capture d'écran (Chrome headless CDP, contournement de l'écran de login admin par injection `sessionStorage`) — hero dégradé + frise + carte CTA chevauchante sur Helios (3 palettes), modules (Contact, Catalogue) recolorés sans plus aucune couleur etnof-web sur Hestia **et** Helios, footer avec établissement + horaires jour par jour affiché sur les deux templates, sélecteur admin (`/admin/{id}/site`) affichant la card "Helios" avec ses 3 pastilles (repli gradient + initiale "H" en l'absence d'image, comme prévu). Les deux tenants de test restaurés à leur état d'avant-test (Boulangerie Dupont → Hestia/Argile, tenant historique → Hestia/Olivier) à la fin de session.

**Images de preview Helios** (`helios-zenith.png`, `helios-aurore.png`, `helios-couchant.png` dans `frontend/public/template-previews/`) générées après coup (même session) : captures du rendu réel (Chrome headless `--screenshot`, 1368×897 comme les previews Hestia existantes) sur le tenant "Boulangerie Dupont", basculé temporairement sur chacune des 3 palettes Helios puis restauré sur Hestia/Argile. `moderne.png` (obsolète, plus référencé par `registry.ts`) supprimé. **À remplacer par Ethan** par ses propres captures du résultat final quand il le souhaite, même logique que les autres previews (`docs/11-images-modules.md`).

## Contenu Hestia : sections Établissement/Horaires, mise en page en bandes alternées — 2026-07-28 (même jour)

Après avoir aligné le style, Ethan attaque le **contenu** affiché sur le site public, un template à la fois — Hestia en premier (`docs/05-roadmap-poc.md` pour le détail complet, section datée du 2026-07-28).

- **Mise en page en bandes** : Hestia n'est plus une colonne centrée (`max-w-3xl`) de cartes blanches flottantes sur un fond uni — chaque section est désormais une **bande pleine largeur** avec son propre fond (`Band`, composant interne à `TemplateHestia.tsx`), contenant un conteneur centré `max-w-5xl` (élargi depuis `max-w-3xl`, aligné sur Helios). Le fond alterne entre `palette.background` et blanc, calculé dynamiquement selon les sections réellement affichées (pas de créneaux fixes — une section masquée ne casse pas le rythme). Le hero et le bloc modules gardent volontairement `palette.background` fixe (pas dans l'alternance) : les modules affichent déjà leurs propres cartes blanches, qui perdraient tout contraste sur une bande blanche.
- **Section "Établissement"** (nouvelle, juste sous le hero) : la description du site (`content.description`, auparavant affichée dans le hero) + une grille de photos (`useEstablishmentImages.ts`, nouveau hook, lit `GET /api/t/{clientSiteId}/establishment/images` — déjà public, déjà utilisé côté admin, jamais consommé côté site public jusqu'ici). Masquée si ni description ni photo.
- **Section "Horaires"** (nouvelle) : résumé jour par jour (logique déplacée depuis `SiteFooter.tsx`), visible seulement si le module `horaires` est actif pour le tenant (`modules?.horaires?.enabled` — ce module gate explicitement l'affichage public d'après son `module.meta.json`, pas seulement l'onglet admin) **et** qu'au moins un jour a une vraie plage renseignée (les 7 jours existent toujours par défaut à l'état "fermé", ce n'est pas un signal suffisant).
- **Footer** (`SiteFooter.tsx`) : perd le bloc horaires (partait sur un oubli de la session précédente — il n'était pas gardé par le module `horaires`, incohérent avec le système d'autorisation à deux niveaux). Ne garde plus que nom/adresse/téléphone/email + lien Administration.
- **Cartes sur bande blanche** : les cartes d'offres, normalement `bg-white shadow-card`, perdent tout contraste sur une bande déjà blanche — sur ce cas précis, elles passent à une bordure légère (`border-border-subtle`) au lieu de l'ombre. Les photos et les cartes de modules n'ont pas ce problème (photo = contenu visuel propre, modules restent sur une bande `palette.background` fixe).
- **Helios non touché** dans ce chantier (demande explicite d'Ethan de traiter un template à la fois) — mais partage `SiteFooter.tsx`, donc perd aussi l'affichage des horaires en footer (pas de section dédiée sur Helios pour l'instant).

Testé : `tsc -b` propre ; rendu vérifié par capture d'écran sur le tenant historique (3 photos réelles, horaires configurés, Catalogue + Contact actifs — bandes alternées visibles, section Établissement et Horaires bien positionnées, carte d'offre avec bordure sur bande blanche) et sur "Boulangerie Dupont" (ni photo, ni horaires, ni offre — sections absentes proprement, juste Hero → Contact → Footer) ; vérification que le footer partagé fonctionne toujours sans horaires sur Helios.

**Deux ajustements demandés par Ethan juste après, même session** :
- **Lien "Administration" retiré** du footer partagé (`SiteFooter.tsx`) — le site public ne renvoie plus vers `/admin`. La prop `clientSiteId`, devenue inutile pour ce composant, a été retirée (`SiteFooter` ne prend plus que `content`/`palette`).
- **Slider photos au-delà de 3** : la grille de la section Établissement (`grid-cols-2 sm:grid-cols-3`) reste telle quelle jusqu'à 3 photos ; au-delà, `PhotoSlider` (nouveau, dans `TemplateHestia.tsx`) prend le relais — défilement horizontal en scroll-snap CSS natif (pas de librairie externe), boutons précédent/suivant en couleur d'accent (`track.scrollBy`, largeur d'une vignette + gap). `PhotoTile` factorise le rendu d'une vignette (grille et slider partagent le même style de cadre).

Testé : `tsc -b` propre ; footer sans lien Administration vérifié par capture d'écran ; slider testé en uploadant temporairement une 4e photo de test sur le tenant historique (CDP, clic simulé sur le bouton "suivant" → défilement confirmé), photo de test supprimée après coup (le tenant reste à ses 3 vraies photos).

## Maquette Claude Design portée sur Hestia — 2026-07-28 (même jour)

Ethan a fait faire une maquette du rendu d'Hestia via **Claude Design** (`claude.ai/design`, projet "Hestia – Starter-kit vitrine", fichier `Hestia.dc.html`), lue avec l'outil `DesignSync` (`get_project`/`list_files`/`get_file` — pas d'écriture, lecture seule pour ce chantier). Reprend la même structure déjà codée (mêmes sections, mêmes données) mais affine le visuel. Portée dans le vrai code (React/Tailwind/palette), pas de dépendance au format `.dc.html` de l'outil.

**Deux points tranchés avec Ethan avant de coder** (via `AskUserQuestion`) :
- **Google Fonts** (Poppins 400–900 + JetBrains Mono 400/500) ajoutées — première police externe réellement chargée dans le projet (`tailwind.config.js` référençait déjà "InterVariable" mais elle n'était chargée nulle part, donc c'était en réalité toujours la police système). Chargée dynamiquement par un `useEffect` dans `TemplateHestia.tsx` (`<link>` ajouté à `document.head` au montage, retiré au démontage) — **jamais** dans `index.html`, pour ne pas la charger sur l'admin ni sur Helios. `fontFamily: Poppins` posé en style inline sur le wrapper racine d'Hestia : cascade naturellement vers les blocs de modules (Contact/Catalogue/Blog/Maps) sans avoir à les toucher pour la police elle-même.
- **Cartes Blog** : gardent seulement titre + date (`BlogPostSummary` n'a pas de champ extrait/photo) — pas d'extension du modèle de données Blog dans ce chantier.

**Non porté volontairement** (artefacts de l'outil de maquette, pas des choix de design) : le cadre "device switcher" et le fond autour du site (chrome de prévisualisation de Claude Design) ; le bouton hamburger mobile (aucun menu réel défini dans la maquette elle-même — juste une icône statique) ; les rayures diagonales en placeholder d'image et leurs étiquettes texte (remplacent de vraies photos absentes dans l'outil — on a déjà de vraies photos et un vrai embed Google Maps fonctionnel).

**Changements dans `TemplateHestia.tsx`** :
- `GreekKeyDivider` (filet SVG) remplacé par `MeanderDivider` : blocs pleins en accent découpés en créneau (`clip-path`), alternés en miroir, 24 blocs en largeur flexible (remplit toujours le conteneur, plus simple que le recalcul par device de la maquette).
- Titre du hero agrandi (`text-[40px] sm:text-[84px]`).
- Galerie : vignettes agrandies, flèches du slider passées de "fond accent plein" à "fond blanc + bordure + `shadow-soft`".
- Horaires : chaque jour devient une carte blanche (au lieu d'une simple ligne de texte).
- Offres : cartes toujours à bordure légère (fin de la logique conditionnelle bordure/ombre selon le fond de bande — simplifie le code au passage) ; badge de prix en pilule complète.
- Overlines propres à Hestia (Bienvenue/Établissement/Horaires/Offres) : `tracking-[0.1em]` → `tracking-[0.22em]`. Les overlines internes aux modules (Contact/Catalogue/Blog/Maps) ne sont **pas** touchées, pour ne pas propager un choix typographique Hestia à Helios.
- Footer : nouvelle variante fond sombre (`SiteFooter` gagne une prop optionnelle `dark`, défaut `false`) — Hestia passe `dark` (fond `palette.ink`, texte clair, pleine largeur, gère désormais sa propre largeur au lieu d'être enveloppé par le gabarit), Helios ne passe rien (comportement inchangé).

**Retouches partagées avec Helios** (fichiers de modules, additives/cosmétiques, déjà pilotées par `palette` donc cohérentes sur les deux templates) : `ContactSection.tsx` (label visible au-dessus de chaque champ, en plus du placeholder) ; `CatalogueSection.tsx` (statut de stock : texte simple → badge pilule à fond teinté, garde la vraie logique de comptage) ; `MapsSection.tsx` (libellé "Maps" → "Où nous trouver", + ajout d'un même libellé au-dessus de la carte quand elle est fonctionnelle — il n'y en avait aucun avant) ; `BlogSection.tsx` (carte avec date en police mono au-dessus du titre, au lieu du titre seul).

Testé : `tsc -b` propre ; rendu vérifié par capture d'écran sur le tenant historique (police Poppins visible, nouvelle frise, cartes Horaires/Offres restylées, footer sombre) et "Boulangerie Dupont" (contenu minimal, rien de cassé) ; slider revérifié après le redimensionnement des vignettes (upload/suppression d'une photo de test, comme précédemment) ; Helios revérifié sur "Boulangerie Dupont" (bascule temporaire) — footer toujours clair (pas de fond sombre forcé), formulaire de contact et police système inchangés (Google Fonts non chargées hors Hestia).

## Couleur d'accent personnalisée (4e option, en plus des 3 palettes) — 2026-08-06

Suite du brainstorm de fonctionnalités manquantes (`docs/07-admin-global.md`), catégorie "UI/UX site public" : jusqu'ici le client choisissait parmi 3 palettes pré-conçues par template, sans couleur libre. Question posée à Ethan avant de coder (color picker libre / plus de palettes pré-conçues / laisser de côté) : il a choisi le color picker libre, en acceptant le risque qu'une couleur choisie au hasard jure avec le fond.

- **`ClientSite.PaletteId` gagne la valeur sentinelle `"custom"`** (pas dans `KnownPalettesByTemplate`, traitée à part) + nouveau champ `ClientSite.CustomAccent` (`string?`, hex, migration `AddClientSiteCustomAccent`). `TemplateEndpoints.cs` valide le format via une regex hex (`^#[0-9a-fA-F]{6}$`) plutôt que via la liste de palettes connues quand `PaletteId == "custom"`.
- **Le fond reste toujours celui du template**, jamais personnalisable : `frontend/src/templates/registry.ts` gagne `resolvePalette(templateId, paletteId, customAccent)`, nouveau point d'entrée partagé qui retombe sur `background`/`previewImage` du 1er preset du template quand `paletteId === "custom"`. Adopté par les 3 endroits qui résolvaient la palette chacun à leur façon (`TemplateHestia.tsx`, `TemplateHelios.tsx`, `CartPage.tsx`) — la seule vraie factorisation de logique de palette depuis l'introduction des palettes (jusqu'ici dupliquée volontairement, voir plus haut dans ce fichier), justifiée ici parce que ces 3 endroits doivent désormais tous gérer le même cas particulier "custom" de la même façon.
- **`gradientEnd` reste absent en mode custom** : le bandeau hero en dégradé d'Helios retombe sur une couleur pleine (`gradientEnd ?? accent`, déjà le comportement de repli existant) plutôt que d'inventer un dégradé à partir d'une seule couleur choisie par le client.
- **Admin** (`SiteSection.tsx`, onglet Modèle) : 4e pastille "+" à côté des 3 palettes dans l'overlay de la card du template sélectionné ; devient un `<input type="color">` natif une fois l'option activée. Un seul handler (`onCustomAccentChange`) gère les deux cas (choisir "custom" pour la première fois, ou changer la couleur une fois déjà en mode custom) — évite deux props séparées pour un geste que l'utilisateur perçoit comme une seule action.
- Changer de template en mode "custom" ne réinitialise pas le choix (contrairement à un preset devenu invalide pour le nouveau template) : la couleur est indépendante du template, seul le fond change automatiquement via `resolvePalette`.

Testé : `tsc -b` propre côté frontend, `dotnet build` propre côté backend, migration appliquée et vérifiée en base (`ALTER TABLE "ClientSites" ADD "CustomAccent" text`), `GET /api/t/{id}/template` confirmé renvoyer `customAccent` (curl). Pas de vérification visuelle du color picker dans un navigateur réel (pas d'outil de capture d'écran disponible dans cet environnement) — à confirmer par Ethan.

## Micro-animations sur le site public — 2026-08-06 (même jour)

Dernier point de la catégorie "UI/UX site public" du brainstorm — aucune décision produit ici (juste du polish CSS), donc pas de question posée à Ethan avant de coder, contrairement au point précédent.

- **Apparition au scroll** : nouveau hook partagé `frontend/src/hooks/useRevealOnScroll.ts` (`IntersectionObserver` natif, aucune dépendance ajoutée — écarté explicitement une lib comme framer-motion, voir CLAUDE.md règle 5). Fondu + léger décalage vertical (`translate-y-6 → 0`, `opacity-0 → 100`, `duration-700`), déclenché une seule fois par bloc (observer déconnecté après la première intersection, pas de réanimation au scroll retour). Respecte `prefers-reduced-motion`.
  - Hestia : intégré directement dans `Band` (le wrapper de bande de fond déjà utilisé par toutes les sections) via une prop `reveal` (défaut `true`) — le hero (1er `Band`) passe `reveal={false}` pour rester visible immédiatement, sans délai même subtil sur ce que le visiteur voit en premier.
  - Helios (pas de `Band`, structure différente) : nouveau composant local `Reveal` appliqué à l'offre du moment et au bloc de modules — mêmes deux exceptions que Hestia (hero non concerné).
- **Retour visuel des boutons/cards** : `active:scale-95` (produits) / `active:scale-[0.98]` (paiement panier) + `transition-all duration-150` sur les CTA principaux (`CatalogueSection.tsx` "Ajouter au panier", `CartPage.tsx` "Payer par carte") ; cards produit gagnent un léger soulèvement au survol (`hover:-translate-y-1`, déjà le pattern utilisé côté admin pour les cards de template/module).
- **Liens de nav** : les liens d'ancrage (`hover:opacity-70/80` sur Hestia, `hover:text-white` sur Helios) changeaient de couleur instantanément (aucune transition définie avant ce chantier) — ajout de `transition-opacity`/`transition-colors duration-200` partout où ces classes existaient déjà, remplacement mécanique, pas de nouveau style.

Testé : `tsc -b` propre. Pas de vérification visuelle dans un navigateur réel (même limite que le point précédent) — à confirmer par Ethan, en particulier que l'apparition au scroll ne "saute" pas au premier chargement sur les sections déjà visibles au-dessus de la ligne de flottaison (le seuil `threshold: 0.15` de l'observer devrait les déclencher quasi instantanément plutôt que de les laisser invisibles, mais reste à vérifier à l'œil).

## Publication volontaire (contenu + template + logo), sélecteur de palette retiré, logo par tenant — 2026-08-07

Trois chantiers de la même session, tous liés au bouton "Rafraîchir le site" (`/admin/{id}/site`) :

- **Publication volontaire** : `ClientSite` gagne `PublishedTemplateId`/`PublishedPaletteId`/`PublishedCustomAccent`/`PublishedLogoPath`/`PublishedAt` (migrations `AddContentPublishSnapshot`, `AddClientSiteLogo`), copiés depuis les colonnes live par `POST /api/t/{id}/admin/publish` (`backend/PublishEndpoints.cs`). Le site public lit désormais `/template/published` (au lieu de `/template`, toujours utilisé tel quel par l'admin) — repli sur le live tant qu'aucune publication n'a eu lieu, pour ne rien casser sur les tenants existants. Détail complet dans `docs/05-roadmap-poc.md`, section datée du 2026-08-07.
- **Sélecteur de palette retiré de l'UI** (demande d'Ethan, "sert à rien pour le moment") : `TemplateCard` (`SiteSection.tsx`) n'affiche plus l'overlay de pastilles/color picker — chaque template garde sa 1ʳᵉ palette. `PaletteId`/`CustomAccent` restent en base et dans `TemplateEndpoints.cs` tels quels (retrait réversible, pas une suppression de fonctionnalité côté données).
- **Logo par tenant** (`ClientSite.LogoPath`) : upload/suppression depuis `/admin/{id}/establishment` (onglet Informations), même pattern que le logo agence (`CompanyProfileEndpoints.cs`). Utilisé comme favicon (`useDocumentMeta.ts`, nouveau paramètre `faviconUrl`) et affiché en cercle (`rounded-full`, 23rem sur `sm:` et plus) à droite de la description Établissement/hero, dans les deux templates — absent, seul le texte s'affiche (désormais `text-xl` au lieu de `text-lg`).

Testé : `dotnet build`/`tsc -b` propres, migrations appliquées. Pas de vérification visuelle automatisée dans cet environnement (mêmes limites d'outillage que les sessions précédentes) — vérifié par Ethan au fil de la session via captures d'écran manuelles, ajustements de position/taille du logo repris en direct sur ses retours.

## Nouveau template "Charis" — vitrine mode/vêtements avec survol produit + fiche produit à slider — 2026-08-25

Demande d'Ethan : un template dédié aux commerces de vente de vêtements en ligne, inspiré du rendu moderne de sites comme karminecorp.fr — sur la grille produits, la photo change au survol de la card pour montrer le produit sous un autre angle ; sur une fiche produit dédiée, une grande photo à côté d'un slider des autres photos (desktop), photo au-dessus + slider en dessous (mobile). Trois décisions tranchées avec Ethan avant de coder (`AskUserQuestion`) :

- **Comportement exclusif à ce template** (pas un enrichissement du module Catalogue partagé par tous les templates) — Hestia et Helios ne changent pas, gardent la card à photo fixe + modale de `CatalogueSection.tsx`.
- **Vraie page produit publique dédiée** (nouvelle route), pas un agrandissement de la modale existante.
- **Nom** : `Charis`, une des Charites (Grâces), déesses du charme et de l'élégance dans l'apparence — cohérent avec la convention mythologique déjà posée (Hestia = foyer/accueil, Helios = soleil/dynamisme).

### Ce qui a été construit

- **`TemplateCharis.tsx`** : même contrat que Hestia/Helios (`TemplateProps`), mêmes blocs de modules communs (Contact, Maps, Blog, RDV, Newsletter, Avis Google, Galerie, Pages, WhatsApp, Multilingue, footer) rendus à l'identique. Identité visuelle propre, épurée/éditoriale (navbar minimale en petites capitales, hero sobre avec un simple filet en couleur d'accent comme signature, pas de police externe chargée). 3 palettes ajoutées dans `registry.ts` et `backend/TemplateEndpoints.cs` (`KnownTemplateIds`/`KnownPalettesByTemplate`) : Noir (`#111111`/blanc), Sable (`#8A7458`/crème), Bordeaux (`#6E1423`/blanc cassé). Pas de vraie capture de preview pour l'instant (repli automatique sur le dégradé + initiale déjà en place pour tout template sans image, voir `docs/11-images-modules.md`) — à remplacer par Ethan plus tard, même logique que les autres templates.
- **`charis/ProductGrid.tsx`** (nouveau, remplace `CatalogueSection` pour le bloc Catalogue de ce seul template) : fetch direct de `GET /api/t/{clientSiteId}/catalogue/products` (même endpoint), `CartProvider` + bouton panier flottant (en portail vers `document.body`, comme `CatalogueSection.tsx` — un `position: fixed` niché dans un bloc animé par `Reveal` se positionnerait sinon par rapport à l'ancêtre transformé), bannière de retour Stripe (`?checkout=...`) — ces deux derniers dupliqués depuis `CatalogueSection.tsx` plutôt qu'importés, puisque ce bloc n'utilise plus ce composant du module. **Card produit à survol** : `images[0]` affichée par défaut, `onMouseEnter` bascule sur `images[1]` si elle existe (sinon rien ne change), retour à `images[0]` au `onMouseLeave`. Image en `aspect-[3/4]` (portrait, plus proche d'une photo produit vêtement que le `aspect-square` de `CatalogueSection`). Bouton "Ajouter au panier" en icône (apparaît au survol, `stopPropagation` pour ne pas déclencher la navigation) ; cliquer la card ouvre la fiche produit.
- **`charis/ProductPage.tsx`** (nouveau) : page publique autonome, montée par une nouvelle route `/t/{clientSiteId}/produits/{productId}` (`App.tsx`, juste au-dessus de la route `/panier` existante) — même patron que `CartPage.tsx` : résout sa propre palette via `useTemplate` + `resolvePalette`, pas de props venant d'un template parent. Consomme `GET /api/t/{clientSiteId}/catalogue/products/{id}` (endpoint déjà existant côté backend, jamais consommé publiquement jusqu'ici — renvoie déjà les photos triées par `SortOrder`) et les avis (`GET`/`POST .../reviews`, déjà publics). **Galerie responsive en un seul composant** (`Gallery`) : `lg:flex-row-reverse` place le slider de vignettes en colonne à gauche de la grande photo sur desktop (clic sur une vignette change la photo principale), la même structure en `flex-col` (ordre naturel) empile automatiquement la grande photo au-dessus et le slider en ligne horizontale en dessous sur mobile — pas de logique conditionnelle par device, juste CSS responsive. Pas de nouvelle librairie (défilement natif). Avis (liste + formulaire) repris de `ProductReviewModal` (`CatalogueSection.tsx`) en inline, dupliqué plutôt qu'importé pour la même raison que `ProductGrid.tsx`.
- **Wording back-office** (`frontend/src/pages/ProductDetailPage.tsx`, section "Photos" de la fiche produit admin) : texte d'aide ajouté expliquant l'ordre des photos (1ʳᵉ = affichée par défaut sur la boutique, 2ᵉ = affichée au survol de la card produit sur les templates qui le prennent en charge, suivantes = slider de la fiche produit) + badges "Photo principale"/"Photo au survol" sous les 2 premières vignettes de la grille existante. Pas de réorganisation par glisser-déposer (hors demande d'Ethan) — l'ordre reste celui de l'upload (`SortOrder` déjà en place côté backend).

### Aucun changement backend au-delà de l'enregistrement du template

Le multi-photos (`ProductImage.SortOrder`), le panier (`CartContext.tsx`), les avis produits et l'endpoint `GET /catalogue/products/{id}` existaient déjà et n'ont pas été modifiés — seul `TemplateEndpoints.KnownTemplateIds`/`KnownPalettesByTemplate` a gagné l'entrée `"charis"`.

Testé : `dotnet build` et `tsc -b` propres. Pas de vérification visuelle dans un navigateur réel dans cet environnement (pas d'outil de capture d'écran disponible) — **à confirmer par Ethan** : bascule d'un tenant de test sur "Charis" depuis son admin, survol d'une card produit (bascule bien sur la 2ᵉ photo), clic → fiche produit (grande photo + slider en desktop, empilement photo/slider en réduisant la fenêtre), ajout au panier depuis la grille ET la fiche produit, contenu du panier (`/panier`) et paiement Stripe inchangés, Hestia/Helios non affectés sur ce même tenant (toujours photo fixe + modale), wording/badges Photos visibles dans `/admin/{id}/products/{id}`.

## Page boutique dédiée + collections + produits "mis en avant" — 2026-08-25 (même jour)

Suite du chantier Charis : Ethan a soulevé le problème d'échelle "beaucoup de produits" (détail complet, décisions et modèle de données dans `docs/04-catalogue-modules.md`). Côté templates, ce qui change :

- **La home n'affiche plus jamais tous les produits.** `CatalogueSection.tsx` (Hestia/Helios) gagne une prop `limit` : au-delà, tri "mis en avant d'abord" puis troncature, avec un lien "Voir tous les produits" vers `/t/{clientSiteId}/boutique`. Charis a son propre teaser exclusif (`charis/ProductGrid.tsx`, repris) : slider horizontal des produits mis en avant s'il y en a, sinon repli sur les 8 premiers en grille statique, toujours suivi d'un lien "Voir la boutique".
- **Nouvelle route publique `/t/{clientSiteId}/boutique`**, commune aux 3 templates mais avec un rendu différent selon le template actif — un aiguilleur (`frontend/src/pages/CataloguePage.tsx`) lit `templateId` via `useTemplate` (même principe que `PublicSite.tsx`) et choisit :
  - **Charis** : `charis/CataloguePage.tsx`, chips de filtre par collection (masquées si aucune collection n'existe) + grille à survol (`ProductCard`).
  - **Hestia/Helios** : `modules/catalogue/frontend/CataloguePage.tsx`, simple page autonome (même patron que `CartPage.tsx`) qui réaffiche `CatalogueSection.tsx` sans `limit` — aucun filtre, décision explicite d'Ethan pour cette itération.
- **Nav "Catalogue"/"Boutique"** des 3 templates : pointait vers une ancre sur la home (`#catalogue`/`#boutique`), pointe désormais directement vers `/t/{clientSiteId}/boutique`.
- **Refactor Charis** : `ProductCard`/`CartButton` extraits de `ProductGrid.tsx` dans leurs propres fichiers pour être réutilisés par la nouvelle page boutique — `ProductPage.tsx` (fiche produit) gagne au passage le bouton panier flottant qui lui manquait.

Testé : `dotnet build`/`tsc -b` propres. Smoke-test backend par `curl` sur le tenant historique (`11111111-1111-1111-1111-111111111111`, mot de passe `admin123` — voir `PROCHAINE-SESSION.md`) : création d'une collection, rattachement à un produit + `highlighted:true`, vérification que `GET /catalogue/products` et `GET /catalogue/collections` (publics) renvoient bien ces données, suppression de la collection puis vérification que le produit repasse à `collectionId: null` sans erreur. Données de démo restaurées après test (stock/prix/nom/collection/mis en avant), **sauf la description du produit "Bougie parfumee"**, écrasée par erreur pendant le test (payload de test envoyé avec une description vide sans avoir relu la valeur existante avant) — vide actuellement, contenu d'origine non récupérable. **À Ethan de la re-remplir si besoin.**

Pas de vérification visuelle dans un navigateur réel (pas d'outil de capture d'écran dans cet environnement) — **à confirmer par Ethan** : slider "mis en avant"/repli sur la home Charis, chips de filtre sur `/boutique` (Charis), lien "Voir tous les produits" sur Hestia/Helios au-delà de 8 produits, wording/badges de collection dans l'admin.

## Charis : header/footer partagés, contenu de la home étoffé — 2026-08-26

Session de test en conditions réelles par Ethan sur un tenant Charis ("Atelier Lumen", boutique de vêtements), avec de nombreux allers-retours visuels. Le point de départ : `charis/CataloguePage.tsx` et `charis/ProductPage.tsx` (pages standalone, montées seules par une route dédiée — voir plus haut) n'affichaient que leur contenu propre, sans nav ni footer, coupées de l'identité du site.

**Nav + footer partagés (`charis/SiteChrome.tsx`, nouveau)** : extrait de ce qui était jusqu'ici dupliqué en tête/pied de `TemplateCharis.tsx` (nav en petites capitales, sélecteur de langue, menu mobile, bouton WhatsApp flottant) — `TemplateCharis.tsx` fournit son bloc "hero" + ses sections de modules en `children`, `CataloguePage.tsx`/`ProductPage.tsx` fournissent juste leur contenu propre (fil d'Ariane, grille, fiche produit). Les 3 récupèrent chacun `modules`/`content`/`locale` eux-mêmes (`useModules`/`useContent`/`useLocale`) — ils ne les recevaient pas en props avant. Détails retenus après plusieurs retours d'Ethan :

- **Footer en mode sombre** (`SiteFooter` gagne le même prop `dark` que Hestia) au lieu de se fondre dans le fond de page — nécessite de sortir `<SiteFooter>` du conteneur `max-w-*` de chaque page (sinon le noir reste coincé dans la colonne centrale au lieu de s'étendre pleine largeur).
- **Nav légèrement teintée** (`${ink}06` + bordure basse) pour se détacher du fond de page — jusqu'ici nav/hero/contenu partageaient exactement la même couleur de fond.
- **Palette "Noir" corrigée** (`registry.ts`) : son fond était `#FFFFFF`, identique au blanc des cards de modules (Contact/Newsletter/Réseaux sociaux) → aucun contraste ("blanc sur blanc"). Passé à `#F6F6F4`, un gris quasi imperceptible mais suffisant. Les palettes Sable/Bordeaux n'avaient jamais ce problème (fond déjà légèrement teinté).
- **Footer "collé en bas" même sur une page courte** (ex. fiche produit sans avis) : conteneur racine passé en `flex flex-col min-h-screen`, contenu principal dans un `flex-1`, footer en dehors — sinon le footer flottait au milieu de l'écran avec du vide en dessous quand le contenu ne remplissait pas la fenêtre.
- **Liens de nav conditionnés au contenu réel**, pas seulement au module actif : Galerie/Blog/Avis Google ne s'affichent dans le menu que s'il y a au moins une photo/un article/un avis (fetch léger dans `SiteChrome.tsx`, optimiste — true tant que la réponse n'est pas arrivée, pour ne pas faire clignoter le lien dans le cas courant où il y a déjà du contenu). RDV/Contact/Newsletter/Réseaux sociaux restent toujours visibles une fois actifs (ce sont des formulaires, jamais "vides").

**Nouvelle section "Réseaux sociaux" sur la home** (`modules/reseaux-sociaux/frontend/SocialSection.tsx`) : jusqu'ici les icônes Facebook/Instagram n'apparaissaient que dans le footer, sans mise en avant propre comme les autres modules — même gabarit de card que Contact/Newsletter (surtitre + titre "Suivez-nous" + icônes). Le footer garde en plus un label "Suivez-nous" au-dessus de ses propres icônes (`SiteFooter.tsx`, `locale` maintenant threadé jusque-là pour la traduction).

**Nouvelle section "Notre histoire"** (`charis/StorySection.tsx`) : demande d'Ethan pour rassurer le client sur l'activité, pas juste vendre. Nouveau champ core `SiteContent.StoryContent` (voir `docs/03-modele-donnees.md`) plutôt qu'un détournement de `Description` (qui reste le court texte du hero) — édité au même endroit (`SiteSection.tsx`, onglet Contenu, sous Description). Affiché avec la 1ʳᵉ photo d'**Établissement > Photos** si elle existe (endpoint déjà public, jusque-là utilisé seulement dans l'aperçu admin) — section absente tant que le texte est vide. Lien "Notre histoire" dans le menu, même logique de visibilité conditionnelle que Galerie/Blog (masqué si le texte est vide).

**Home remplie par les collections, cards agrandies** (voir aussi `docs/04-catalogue-modules.md`, section système de collections/tailles) : la home affichait au mieux 2 produits "mis en avant" et rien d'autre — juge trop vide par Ethan. La grille de cards est passée de 4 à 3 colonnes maximum (cards plus grandes, "pièce principale du site") et affiche désormais un aperçu par collection en plus des mises en avant. Le lien "Voir la boutique" (renommé "Voir le catalogue" en toute fin de session) est passé d'un petit texte en bas de page à un lien stylé comme les liens du menu (majuscules, flèche), positionné juste sous les mises en avant plutôt qu'en haut ou en bas de toute la section.

Testé : `dotnet build`/`tsc -b` propres à chaque étape. Vérifié dans le navigateur par Ethan lui-même à chaque itération (contrairement aux chantiers Charis précédents, faits sans capture d'écran) — plusieurs allers-retours corrigés en direct (taille des cards incohérente entre slider et grille, grand vide sous Newsletter causé par l'étirement de ligne de la grille CSS, seuil de bascule grille/slider mal calé laissant un produit orphelin). **Reste ouvert** : pas de section équivalente "Notre histoire"/nav conditionnée sur Hestia/Helios (non demandé, Charis seulement pour l'instant).

## Charis : home/boutique/fiche produit/panier retravaillés en continu avec Ethan — 2026-08-26 (suite, même jour)

Longue session de retouches, chacune déclenchée par un retour d'Ethan sur capture d'écran (même méthode que la session précédente) — home, boutique, fiche produit et panier tour à tour. Résumé par page, détail des fichiers dans le code :

### Home (`TemplateCharis.tsx`, `charis/ProductGrid.tsx`)

- **"Notre histoire" remontée avant le Catalogue** (ordre initial : Catalogue puis Histoire) — nav réordonné pareil.
- **Tailles de police revues plusieurs fois** : titre "Notre histoire" et texte agrandis une première fois, puis tous les titres de section (Catalogue, Notre histoire, Collections, Horaires, Contact, Réseaux sociaux, Newsletter) harmonisés à `text-xl` (1.25rem) — certains venaient de modules partagés avec Hestia/Helios (`text-xs` codé en dur) : plutôt que de modifier ces modules, un override CSS ciblé (`sectionTitleSize`, sélecteur `[&>section>span:first-child]`) est appliqué localement depuis `TemplateCharis.tsx`, sans toucher aux fichiers des modules.
- **Slider "mis en avant"/collections corrigé** : les tuiles avaient une largeur fixe en px, donc avec peu de produits elles tenaient toutes dans le conteneur et les flèches ne servaient à rien — passées en largeur `calc()` en fraction du conteneur pour garantir 3 tuiles visibles quelle que soit la largeur d'écran.
- **Badge circulaire "Voir plus"** (texte tournant en boucle, SVG `textPath` + rotation CSS) à côté des sliders de collection — d'abord posé en flex-sibling du slider (ce qui réduisait la largeur du track et rendait les cartes plus petites que la grille simple), corrigé en position `absolute` hors flux pour ne pas consommer de largeur ; masqué en dessous du breakpoint `2xl` faute de marge externe pour déborder proprement.
- **Nouveau titre "NOS COLLECTIONS PHARE"** avant la liste des collections ; bouton "Voir le catalogue" centré avec un trait sous le texte.
- **Newsletter sortie de la grille partagée** (partageait une colonne avec Réseaux sociaux) et déplacée toujours juste avant le footer, en pleine largeur.
- **Nouvelle section Horaires** (jours en entier — nouvelles clés `weekdayFull.*`, distinctes des `weekday.*` abrégés d'Hestia) : positionnée et repositionnée trois fois selon les retours d'Ethan — d'abord dans la grille de modules, puis mise en paire avec Maps (sous-grille dédiée pour qu'ils se répondent visuellement, même style de carte), puis finalement injectée **dans** `ProductGrid` (prop `afterFeatured`) entre les produits mis en avant/le bouton "voir le catalogue" et les aperçus par collection — Horaires/Maps n'ont donc plus d'existence en dehors du bloc Catalogue.
- **Espacements augmentés** : `gap-16` → `gap-24` entre grandes sections, `gap-10` → `gap-16` à l'intérieur du bloc Catalogue.

### Boutique (`charis/CataloguePage.tsx`)

- **Largeur alignée** : `max-w-6xl` → `max-w-7xl`, comme la home et Hestia/Helios (qui utilisaient déjà `max-w-7xl` — la page boutique était donc l'anomalie, pas seulement par rapport à Charis).
- **Chips de filtre par collection réintroduites** — le commentaire du fichier les décrivait déjà mais elles n'avaient jamais été branchées ("Tout" + une par collection, filtre une grille unique quand une collection précise est sélectionnée).
- **Trait de séparation** entre les sections de collection quand "Tout" est sélectionné.

### Fiche produit (`charis/ProductPage.tsx`)

Chantier le plus dense de la session, empilé retour après retour :

- **Fil d'Ariane** (Accueil / Catalogue / Collection / Produit) — remplace le lien "← Retour au site", collections chargées une seule fois et redescendues en prop (aussi utilisées par le slider "Nos autres produits", évite un fetch dupliqué).
- **Zoom plein écran** au clic sur la grande photo — même patron que la lightbox du module Galerie (portail, flèches clavier, Échap, compteur), dupliqué plutôt qu'importé (comportement propre à cette page). Compteur repassé de `bg-white/10` (illisible sur photo claire) à `bg-black/70`.
- **Vignettes plafonnées à 5** : au-delà, la 5ᵉ porte un badge `+N` qui ouvre directement le carrousel plein écran — un produit avec beaucoup de photos (pas de limite admin) étirait la colonne de vignettes bien au-delà du reste de la page.
- **Sélecteur de quantité**, borné au stock de la taille sélectionnée.
- **Guide des tailles** (modale, tableau générique XS→XL en cm — pas de donnée par produit côté backend, volontairement générique).
- **Accordéon Livraison/Retours/Paiement sécurisé** (texte statique, mention Stripe) — `PurchaseInfo` (ex-`DeliveryReturns`).
- **Badge "Plus que N en stock"** (seuil 5) : d'abord en `palette.accent` (invisible, se fondait dans le reste de la page), corrigé en couleur ambre fixe + point — un signal de rareté doit rester reconnaissable indépendamment de la couleur de marque du tenant. **Décision** : pas affiché sur les cards (grille/slider) — le stock y est agrégé par produit alors qu'il est réel par taille (afficherait "plus que 2" alors que seule une taille est basse), et l'esthétique éditoriale de Charis se prête mal à la messagerie d'urgence systématique (réservée en pratique à la fast-fashion).
- **Section "Nos autres produits"** : réutilise `FeaturedSlider` (exporté depuis `ProductGrid.tsx`), jusqu'à 5 produits, priorise la même collection.
- **Barre sticky mobile** "Ajouter au panier" (`sm:hidden`, apparaît via `IntersectionObserver` quand le bouton principal sort du viewport) — a nécessité de remonter le bouton panier flottant (`CartButton.tsx`, `bottom-6` → `bottom-24` en dessous de `sm`) pour ne pas se superposer.
- **Avis clients** : résumé note moyenne + nombre total ajouté en tête (absent avant), liste plafonnée à 3 avec "Voir les N avis" pour dérouler le reste.
- **Badge collection sur les images produit** (`ProductCard.tsx`) : déplacé du texte sous le nom vers une pastille sur la photo (coin haut-gauche, empilée avec "Rupture de stock" si les deux s'appliquent) — câblé partout où `ProductCard` est utilisé (home, boutique, produits liés).

### Panier (`modules/catalogue/frontend/CartPage.tsx`, partagé par les 3 templates)

- **Largeur alignée** : `max-w-5xl`/`max-w-2xl` → `max-w-7xl`, même anomalie que la boutique (les 3 templates utilisent déjà `max-w-7xl` pour leur contenu principal).
- **État panier vide** : bouton "Voir le catalogue" ajouté (avant, juste un texte sans action).
- **Miniature produit** ajoutée à chaque ligne du panier principal (seul le récapitulatif à droite en avait une).
- **Rappel de confiance** sous "Payer par carte" (paiement sécurisé Stripe + délai de livraison estimé).

### Admin — Collections réordonnables

Demandé pour que l'ordre choisi en back-office se reflète sur le site : nouvel endpoint `PUT /api/t/{clientSiteId}/admin/catalogue/collections/reorder` (`CatalogueAdminEndpoints.cs`, même patron que le réordonnancement des photos produit — réécrit `SortOrder` d'après la position dans le tableau reçu). Pas de migration : `Collection.SortOrder` existait déjà. `CollectionsSection.tsx` (admin) gagne le glisser-déposer natif (même patron que les photos produit sur la fiche produit). Le site public triait déjà par `SortOrder` — rien à changer côté affichage.

### Traductions

Nombreuses clés ajoutées dans les 3 langues (fr/en/es) : `weekdayFull.*`, `catalogue.featuredCollections`, `catalogue.viewMore`, `catalogue.quantity`, `catalogue.sizeGuide*`, `catalogue.deliveryTitle/Text`, `catalogue.returnsTitle/Text`, `catalogue.securePaymentTitle/Text`, `catalogue.lowStock`, `catalogue.showAllReviews`, `catalogue.checkoutTrustNote`, `breadcrumb.home`.

Testé : `tsc --noEmit` propre après chaque changement (relancé une bonne dizaine de fois au fil de la session) ; `dotnet build` vérifié sans erreur de compilation pour l'endpoint de réordonnancement des collections (la copie finale de l'exécutable a échoué faute de pouvoir écraser le binaire d'un `dotnet run` déjà démarré — pas une erreur de code, juste un verrou de fichier). Comme la session précédente, chaque retouche a été vérifiée par Ethan lui-même dans le navigateur, capture d'écran à l'appui, ce qui a permis plusieurs allers-retours rapides (taille des cartes de slider, position d'Horaires/Maps déplacée trois fois, contraste du badge stock faible). **Reste ouvert** : le contenu Livraison/Retours reste générique (texte statique identique pour tous les tenants) — candidat à devenir un champ éditable par établissement (même logique que les CGV) si le besoin se confirme. **Filtrage par collection sur l'URL de la boutique, levé le 2026-08-27, voir plus bas.**

## Boutique Charis : filtrage par collection via l'URL — 2026-08-27

Suite immédiate de la session précédente : le badge "Voir plus" d'une collection sur la home et le fil d'Ariane d'une fiche produit renvoyaient vers la boutique complète (`/t/{clientSiteId}/boutique`) plutôt que vers la collection précise, alors que les chips de filtre existaient déjà côté boutique.

- **`charis/CataloguePage.tsx`** : `activeCollectionId` s'initialise désormais depuis `?collection={id}` dans l'URL (`new URLSearchParams(window.location.search)`) au lieu de toujours démarrer sur "Tout". Sélectionner un chip met à jour l'URL via `history.replaceState` (pas de rechargement, pas de librairie de routing — même routage maison que le reste du projet) pour que le lien reste partageable/copiable une fois filtré.
- **`charis/ProductGrid.tsx`** (teaser home) : le lien `cta` du slider par collection pointe maintenant vers `/t/{clientSiteId}/boutique?collection={collection.id}` au lieu de la boutique complète.
- **`charis/ProductPage.tsx`** (fiche produit) : le nom de collection dans le fil d'Ariane, jusqu'ici du texte simple, devient un lien vers `/t/{clientSiteId}/boutique?collection={product.collectionId}`.
- Un identifiant de collection invalide/inexistant dans l'URL (lien copié après suppression de la collection, faute de frappe) retombe silencieusement sur une section vide — même comportement qu'un chip qui ne matche aucun produit, pas de garde spécifique ajoutée.

Testé : `tsc -b` propre. Pas de vérification visuelle dans cet environnement — **à confirmer par Ethan** : cliquer "Voir plus" sous une collection sur la home arrive directement filtré sur `/boutique`, le nom de collection dans le fil d'Ariane d'une fiche produit fait de même, et l'URL copiée depuis un chip sélectionné rouvre bien la boutique déjà filtrée.

## Fiche produit Charis : Livraison/Retours éditables par établissement — 2026-08-27 (même jour)

Dernier point de la liste "reste ouvert" : le texte de l'accordéon Livraison/Retours (`PurchaseInfo`, `charis/ProductPage.tsx`) était un texte de traduction statique, identique pour tous les tenants. Détail complet (décision, migration, backfill) dans `docs/05-roadmap-poc.md`, section datée du 2026-08-27. Côté template : `AccordionItem` rend désormais du HTML (`dangerouslySetInnerHTML`, même pattern que Description/CGV) au lieu de texte brut, pour supporter le contenu du `RichTextEditor` — "Paiement sécurisé" continue de passer par `t(locale, "catalogue.securePaymentText")` (texte statique), seuls Livraison/Retours viennent de `SiteContent`.
