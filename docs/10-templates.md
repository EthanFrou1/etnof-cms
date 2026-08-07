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
  SiteFooter.tsx          <- footer partagé (infos établissement, horaires), utilisé par les 2 templates
  TemplateHestia.tsx     <- navbar pilule, hero centré, sections empilées (id "hestia", ex-"Classique")
  TemplateHelios.tsx     <- navbar pleine largeur, hero plein cadre en dégradé, offre en carte CTA (id "helios", ex-"Moderne")
```

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
