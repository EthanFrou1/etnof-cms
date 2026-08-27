# 05 — Roadmap du POC

Règle : ne pas commencer une phase tant que la checklist de la précédente n'est pas entièrement cochée. Si Claude Code veut avancer plus vite, le recadrer en pointant ce fichier.

## Phase 0 — Setup du socle

- [x] Créer la structure du monorepo (`/backend`, `/frontend`, `/modules`, `/docs`)
- [x] Docker Compose avec PostgreSQL local
- [x] Projet ASP.NET Core minimal qui démarre et répond sur une route de health check (`/api/health`)
- [x] Projet Vite + React + TypeScript + Tailwind qui démarre et affiche une page vide

**Test gate** : `docker compose up`, l'API répond sur `/api/health`, le front se lance et affiche une page blanche stylée Tailwind (ex : un titre centré). Rien d'autre.

**Statut (2026-07-26)** : validé par Ethan (Postgres via `docker compose up -d`, backend sur `/api/health`, frontend Tailwind). `npm` étant cassé sur la machine (installation Node globale corrompue, sans rapport avec le projet), le frontend utilise `pnpm` — voir `DEMARRAGE.md`.

## Phase 1 — Moteur de toggle (sans UI, sans vrai module)

- [x] Créer `site.config.json` d'exemple avec 2 modules fictifs (`enabled: true` / `enabled: false`)
- [x] Backend : `ModuleRegistry` qui lit le fichier au démarrage et logue quels modules sont actifs
- [x] Frontend : hook `useModules()` qui récupère la config via un endpoint `/api/config/modules` et logue dans la console

**Test gate** : changer `enabled: true` en `false` dans le JSON, relancer, vérifier dans les logs backend ET dans la console frontend que le changement est bien pris en compte. Pas encore de vrai module affiché.

**Statut (2026-07-26)** : `site.config.json` (racine) avec `moduleDemoA`/`moduleDemoB`. Backend : `ModuleRegistry` (`backend/ModuleRegistry.cs`) lit le fichier au démarrage et logue chaque module ; endpoint `GET /api/config/modules` exposé avec CORS pour `http://localhost:5173`. Frontend : hook `useModules()` (`frontend/src/hooks/useModules.ts`), appelé depuis `App.tsx`, fetch + `console.log`. Testé par Claude Code : toggle `moduleDemoA` à `false`, redémarrage backend → log et endpoint reflètent bien le changement (revert à `true` après test). Confirmé par Ethan : console navigateur affiche bien `Modules actifs : {moduleDemoA: {enabled: true}, moduleDemoB: {enabled: false}}`. **Phase 1 entièrement validée.**

## Phase 2 — Premier vrai module de bout en bout : Contact + Maps

- [x] Implémenter le module Contact complet (backend : entité + endpoint POST + sauvegarde en base ; frontend : formulaire + envoi)
- [x] Implémenter le module Maps (frontend uniquement, lit l'adresse depuis la config)
- [x] Les deux modules respectent le pattern de dossier défini dans `02-architecture-modules.md`

**Test gate** :
- Modules activés → le formulaire de contact apparaît, l'envoi crée bien une ligne en base (vérifiable via une requête SQL simple), la carte Maps s'affiche avec la bonne adresse
- Modules désactivés dans la config → le formulaire ET la carte disparaissent complètement du site, et l'endpoint `/api/contact` renvoie 404

**Statut (2026-07-26)** :
- Backend : `modules/contact/backend/` (`ContactMessage.cs`, `ContactModule.cs`), `module.meta.json`. EF Core + Npgsql ajoutés (versions 8.0.10, compatibles net8.0), `AppDbContext` dans `backend/` référence l'entité du module. Migration `InitialCreate` créée et appliquée (table `ContactMessages`). Le fichier `.cs` des modules est inclus dans `Backend.csproj` via `<Compile Include="..\modules\*\backend\*.cs">` puisqu'il vit hors de l'arborescence du projet backend.
- Route `POST /api/contact` mappée uniquement si `ModuleRegistry.IsEnabled("contact")` → 404 natif si désactivé (pas un simple filtre).
- `ModuleRegistry`/`SiteConfig` généralisés pour porter des champs de config arbitraires par module (`JsonElement`), nécessaire pour l'adresse et la clé API de Maps.
- Frontend : `modules/contact/frontend/ContactSection.tsx` (formulaire) et `modules/maps/frontend/MapsSection.tsx`. **Décision produit** : pas d'embed Google Maps sans clé — le module Maps affiche un placeholder tant que le client n'a pas renseigné sa propre clé Google Maps Embed API dans `site.config.json` (`modules.maps.apiKey`).
- Alias `@modules` configuré dans `vite.config.ts` et `tsconfig.json` pour importer les composants situés hors de `/frontend`, avec `resolve.alias` explicite sur `react`/`react-dom` pour garantir une instance unique de React (sinon risque d'erreurs de hooks).
- **Point technique important** : la résolution de modules Node/TS remonte l'arborescence depuis `/modules` (hors de `/frontend`) et peut tomber sur un autre `node_modules` plus haut dans l'arborescence (ex. celui, cassé, de `C:\Users\ethan\`). Fix : jonction `node_modules` à la racine du repo pointant vers `frontend/node_modules`, recréée automatiquement par `frontend/scripts/link-repo-node-modules.mjs` (hook `postinstall`, déclenché par `pnpm install`).
- Testé par Claude Code : build backend + frontend (`tsc -b`) propres ; `POST /api/contact` → `201` + ligne visible en base (`SELECT` vérifié) ; modules désactivés → `POST /api/contact` → `404` confirmé.
- **Bug trouvé par Ethan et corrigé** : `tailwind.config.js` ne scannait que `frontend/src`, donc les classes utilisées uniquement dans `/modules` (bordures, fonds des cartes Contact/Maps) n'étaient pas générées → formulaire visible mais sans style. Ajout de `../modules/**/*.{js,ts,jsx,tsx}` au `content` de Tailwind. Reconfirmé après coup : les classes (`border-slate-600`, `bg-slate-800`, `rounded`, etc.) sont bien présentes dans le CSS généré.
- Formulaire et bloc Maps confirmés visuellement par Ethan (apparition correcte à l'état activé). **Phase 2 entièrement validée.**

## Phase 3 — Interface d'administration minimale (modules + contenu)

- [x] Une page simple (protégée par un mot de passe basique, pas besoin d'auth complexe pour le POC) qui liste les modules et permet de cocher/décocher leur activation
- [x] Cette page écrit dans `site.config.json` (ou en base si tu préfères, à trancher à ce moment-là)
- [x] La même page (ou une page voisine) permet d'éditer les champs de contenu de base (nom du site, description, offres) — voir `docs/06-contenu-site.md`
- [x] Le contenu édité est sauvegardé en base de données (PostgreSQL), pas dans un fichier — contrairement aux modules

**Test gate** : cocher/décocher un module depuis l'interface, recharger le site, constater le changement sans avoir touché à un fichier à la main. Modifier une offre depuis l'admin, recharger le site public, constater que la nouvelle donnée s'affiche (lue depuis la base).

**Statut (2026-07-26)** :
- **Écart avec `docs/06-contenu-site.md` assumé** : ce doc décrivait un `content.json` sans base de données pour le POC ("post-POC" pour la BDD). La roadmap (éditée par Ethan) demandait explicitement du stockage en base pour cette phase — c'est cette version qui a été suivie. Entités `SiteContent`/`Offer` (`backend/SiteContent.cs`), migration `AddSiteContent`, seed d'une ligne par défaut au démarrage si la table est vide.
- **Changement d'architecture nécessaire sur le toggle de modules** : en Phase 1/2, `ModuleRegistry` lisait `site.config.json` une seule fois au démarrage (mis en cache). Pour qu'un toggle depuis l'admin soit visible sans redémarrer le backend, `ModuleRegistry` relit maintenant le fichier à chaque appel (`GetConfig()`/`IsEnabled()`), et `ContactModule` reste mappé en permanence mais vérifie `IsEnabled` à chaque requête pour décider du 404 — au lieu de ne pas mapper la route du tout. Résultat identique côté client (toujours 404 si désactivé), mécanisme différent.
- Auth admin minimale : mot de passe unique dans `appsettings.json` (`Admin:Password`), vérifié via un header `X-Admin-Password` sur chaque requête `/api/admin/*` (pas de session, pas de JWT — assumé volontairement basique pour le POC, voir commentaire dans `backend/AdminAuth.cs`).
- Endpoints : `POST /api/admin/login`, `GET/PUT /api/admin/modules[/{name}]`, `GET /api/content` (public), `PUT /api/admin/content`.
- Frontend : page `/admin` (`frontend/src/pages/AdminPage.tsx`, routage minimal par `window.location.pathname`, pas de librairie de routing ajoutée) avec login, liste de checkboxes modules, formulaire contenu + offres (ajout/suppression/édition). Site public (`frontend/src/pages/PublicSite.tsx`) affiche désormais `siteName`/`description`/`offres` via le nouveau hook `useContent()`, en plus des modules Contact/Maps.
- Bug rencontré et corrigé en cours de route : `db.Offers.RemoveRange(...)` puis réassignation de `content.Offers` à une nouvelle liste faisait qu'EF Core traitait les nouvelles offres (Id généré côté client) comme "existantes" (UPDATE au lieu d'INSERT) → `DbUpdateConcurrencyException`. Fix : `db.Offers.AddRange(newOffers)` explicite avant réassignation.
- Testé par Claude Code : toggle live d'un module (désactivation → 404 immédiat sans redémarrage → réactivation → 200 à nouveau) ; édition du contenu (siteName/description/offre) → vérifié en relisant `/api/content` ; route `/admin` servie correctement par le fallback SPA de Vite ; `tsc -b` propre.
- **Reste à vérifier par Ethan dans le navigateur** (voir `DEMARRAGE.md`, section Phase 3) : login sur `/admin`, toggle visuel d'un module avec rechargement du site public, édition du contenu avec affichage mis à jour côté public.
- **Bug bloquant trouvé par Ethan et corrigé** : le toggle échouait avec `500 UnauthorizedAccessException` sur l'écriture de `site.config.json`. Cause : permissions NTFS du dossier repo n'autorisant l'écriture qu'aux comptes Administrateurs/Système ; en session non-élevée, Windows (UAC) filtre l'appartenance au groupe Administrateurs même pour un compte admin, d'où l'échec pour Ethan alors que ça fonctionnait dans l'environnement d'exécution de Claude Code. Fix : `icacls` pour accorder explicitement `Modify` à `pc_de_ethan\ethan` sur le dossier du repo. **Phase 3 entièrement validée par Ethan après ce correctif.**

## Phase 4 — Preuve d'extensibilité : ajouter le module Blog

- [x] Suivre STRICTEMENT le pattern "ajouter un nouveau module" décrit dans `02-architecture-modules.md`, sans dérogation
- [x] Chronométrer le temps pris pour l'ajouter

**Test gate** : le module Blog fonctionne (liste des articles + page détail), et surtout : le temps pris est significativement plus court que d'écrire ce module à la main dans un projet classique. Si ce n'est pas le cas, c'est un signal que le pattern de modules doit être revu avant de continuer.

**Statut (2026-07-26)** :
- **Temps pris : ~4 minutes** (16:58 → 17:02) pour le code + toute la vérification (build, migration, tests curl liste/détail/toggle/brouillon caché, test frontend). Nettement plus rapide que Contact (Phase 2), qui avait nécessité plus d'aller-retours (CORS, alias Vite/`@modules`, bug React dupliqué, bug Tailwind) — ces fondations sont maintenant en place et profitent à tout nouveau module.
- Suivi du pattern à la lettre : dossier `/modules/blog` copié sur la structure de `/modules/contact` (`backend/`, `frontend/`, `module.meta.json`), entité EF Core (`BlogPost` : Id, Title, Slug, Content, PublishedAt nullable — conforme à `docs/03-modele-donnees.md`), migration `AddBlogPost`, module ajouté **désactivé par défaut** dans `site.config.json`, entrée mise à jour dans `docs/04-catalogue-modules.md`.
- `GET /api/blog` (liste, articles publiés uniquement) et `GET /api/blog/{slug}` (détail), même mécanisme de toggle dynamique que Contact (route toujours mappée, 404 si module désactivé).
- Seed de démonstration : un article publié + un brouillon (`PublishedAt: null`), pour vérifier explicitement que les brouillons n'apparaissent jamais publiquement.
- Frontend : `BlogSection.tsx` (liste, masquée si aucun article publié) intégrée à `PublicSite.tsx`, `BlogPostPage.tsx` (détail) routée via `/blog/:slug` dans `App.tsx` (routage maison, toujours pas de librairie ajoutée).
- Testé par Claude Code : module désactivé → `GET /api/blog` → 404 ; activé → liste retourne uniquement l'article publié ; détail du brouillon → 404 ; route `/blog/premier-article` servie côté frontend (fallback SPA Vite) ; `tsc -b` propre.
- **Reste à vérifier par Ethan dans le navigateur** : activer le module Blog depuis `/admin`, consulter la liste et cliquer sur un article pour voir la page de détail.

## Phase 5 — Bilan du POC

- [x] Revue de code générale : le pattern modules tient-il la route pour un vrai projet client ?
- [x] Décision : passe-t-on à un vrai premier projet client avec ce socle, ou ajuste-t-on l'architecture avant ? — **Décision d'Ethan (2026-07-26) : le POC s'arrête ici, on passe en développement réel du projet.** Priorité immédiate : corriger les points de sécurité listés ci-dessus, puis travailler l'UI/UX (le site actuel n'a que le strict Tailwind du POC, pas de design). Le régime "une phase à la fois, roadmap figée" de `CLAUDE.md` ne s'applique donc plus tel quel à partir d'ici — à adapter pour le développement réel.
- [x] Mise à jour de `04-catalogue-modules.md` : quels modules ajouter en priorité pour le premier vrai client

**Revue de code (2026-07-26)**

Ce qui tient la route :
- Le pattern module est prouvé : Blog (Phase 4) a pris ~4 minutes une fois les fondations posées par Contact/Maps (Phase 2), contre plusieurs heures d'allers-retours pour ces derniers (CORS, alias Vite `@modules`, résolution React dupliquée, Tailwind `content`). Un 3ᵉ module bénéficierait des mêmes fondations sans coût supplémentaire.
- Toggle dynamique (backend 404 + disparition frontend, sans redémarrage) fonctionne de bout en bout et a été testé à chaque phase.
- Séparation modules (fichier, décision de dev) vs contenu (base de données, éditable par le client) est claire et documentée (`02-architecture-modules.md`, `06-contenu-site.md`, mis à jour pour refléter les décisions réellement prises).

Ce qui doit être durci avant un vrai client (pas bloquant pour commencer, mais à traiter) :
1. **Auth admin** : mot de passe unique en clair dans `appsettings.json`, pas de hash, pas de session, pas de rate-limiting. Acceptable en local, pas pour un client réel exposé sur Internet.
2. **Secrets versionnés** : `backend/appsettings.json` (mot de passe DB + mot de passe admin) n'est pas gitignored — à sortir vers des variables d'environnement/user-secrets avant tout déploiement.
3. **CORS** codé en dur sur `http://localhost:5173` — à rendre configurable par déploiement.
4. **`module.meta.json` / `*.config.ts`** : créés pour chaque module (pattern suivi à la lettre) mais jamais lus par le code — l'admin affiche les clés brutes (`contact`) plutôt qu'un nom lisible (`Contact`). À câbler réellement ou à cesser de générer par défaut (voir note ajoutée dans `02-architecture-modules.md`).
5. **`site.config.json` éditable en live ET versionné avec Git** : un redéploiement depuis Git écraserait les toggles faits par un client en prod. Pas un problème en local/POC, mais à trancher avant un vrai déploiement continu (exclure le fichier du déploiement auto, ou migrer aussi les modules en base comme le contenu).
6. **Pas de processus pour démarrer un nouveau projet client** à partir de ce socle (cloner, réinitialiser `site.config.json`/secrets/DB) — seulement décrit en principe dans `00-vision.md`.
7. Aucun test automatisé — attendu pour un POC (rester simple, cf. règle 7 de `CLAUDE.md`), mais à prévoir pour un vrai projet.

## Après le POC — développement réel (2026-07-26)

Le régime "une phase à la fois" ci-dessus concernait le POC ; ce qui suit est un journal du développement réel, pas une checklist à cocher dans l'ordre.

- **Durcissement sécurité** : les 5 points listés dans le bilan Phase 5 sont traités (secrets sortis du fichier versionné, mot de passe admin hashé PBKDF2, CORS configurable, `site.config.json` gitignoré + fichier exemple, `module.meta.json` câblé dans l'admin). Détails dans `DEMARRAGE.md`, section "Durcissement sécurité".
- **UI/UX** : charte graphique etnof-web (`docs/09-charte-graphique.md`) appliquée à l'ensemble du site public et de l'admin (Tailwind : couleurs, rayons, ombres, police Inter auto-hébergée). Le logo/wordmark "etnof-web" n'est volontairement pas repris sur les sites générés (c'est la marque de l'agence, pas celle du client) — la navbar affiche le nom du site du client.
- **Vue globale agence** (`/admin/dashboard`) : catalogue des sites clients (nom, type, statut, modules actifs, URL) saisi manuellement par Ethan, avec stats agrégées et graphiques. Voir `docs/07-admin-global.md` pour la décision (implémenté dans ce repo plutôt qu'en outil séparé, contrairement à ce qui était envisagé).

## Passage en multi-tenant (2026-07-26)

Revirement majeur, demandé explicitement par Ethan : abandon du principe "un déploiement = un client" (`00-vision.md`, `08-hebergement-domaines.md` mis à jour en conséquence) au profit d'une **plateforme multi-tenant unique**. Plan détaillé exécuté : `C:\Users\ethan\.claude\plans\compiled-hopping-frost.md`.

Ce qui a changé :
- **Modèle de données** : `ClientSite` (créé pour la vue globale agence) devient le vrai enregistrement de tenant — ajout de `PasswordHash` (PBKDF2) et `ModulesConfigJson` (remplace `site.config.json`, retiré du repo). `SiteContent`, `ContactMessage`, `BlogPost` gagnent un `ClientSiteId`.
- **Migration `AddMultiTenant`** : un tenant historique (Id fixe `11111111-1111-1111-1111-111111111111`) est créé automatiquement avec l'état exact de l'ancien `site.config.json` et l'ancien mot de passe admin (`admin123`) ; tout le contenu/les messages/les articles déjà en base lui sont rattachés (`AddColumn` avec `defaultValue`, pas de perte de données).
- **`ModuleRegistry`** passe de singleton (lisait un fichier une fois) à service *scoped* (lit `ClientSite.ModulesConfigJson` en base, par tenant, à chaque appel).
- **Routes** : tout ce qui était global devient `/api/t/{clientSiteId}/...` (content, config/modules, contact, blog, admin/login, admin/modules, admin/content). Restent globaux : `/api/health` et `/api/admin/*` (agence, vue globale).
- **Auth** : nouvel `TenantAdminAuth` — accepte le mot de passe propre du tenant OU le mot de passe agence d'Ethan (clé passe-partout pour le support). `AdminAuth` (agence seule) inchangé.
- **Frontend** : `/t/{clientSiteId}` (site public), `/t/{clientSiteId}/blog/{slug}`, `/admin/{clientSiteId}` (admin du tenant), `/admin/dashboard` (agence, inchangé dans son principe). `/` redirige vers `/admin/dashboard`. Tous les hooks et composants de module reçoivent `clientSiteId`.
- **Vue globale agence** : créer un client y crée maintenant un vrai compte (mot de passe requis), avec liens directs vers son site et son admin. Éditer un client fusionne sa config modules (n'écrase pas les champs déjà réglés comme l'adresse Maps) plutôt que de la régénérer entièrement.

Testé : isolation complète entre deux tenants (contenu, messages de contact, articles de blog, toggle de module) — un mauvais mot de passe est refusé (401), un module désactivé chez un tenant reste actif chez l'autre. `tsc -b` et build backend propres.

**Hors scope de ce passage** (voir `00-vision.md`) : domaine personnalisé par client, achat de domaine (nécessiterait une API de registrar tierce et payante — à valider explicitement le moment venu), facturation/forfaits formels.

## Templates (mises en page du site public) — 2026-07-26

Ajout demandé par Ethan : chaque client doit pouvoir choisir la mise en page de son site. Voir `docs/10-templates.md` pour le détail complet (structure, pourquoi pas Mustache/Handlebars, comment ajouter un template).

Résumé : `ClientSite.TemplateId` (nouvelle colonne, migration `AddTemplateId`), 2 templates livrés (`classique` = design d'origine, `moderne` = bandeau plein cadre en dégradé + carte CTA), choisi par Ethan à la création du client et modifiable ensuite par le client lui-même depuis son admin. Testé avec 2 tenants sur des templates différents.

## Admin client restructuré en pages (sidebar) — 2026-07-26

Demandé par Ethan (référence : un de ses autres projets, sidebar sombre + pages dédiées). L'admin d'un tenant (`/admin/{clientSiteId}`) passe d'une seule page à panneaux empilés à un vrai shell multi-pages :

- `frontend/src/components/admin/AdminLayout.tsx` — sidebar sombre (navigation avec icônes, nom du site, lien vers le site public et la vue globale agence) + zone de contenu
- `frontend/src/components/admin/AdminLoginScreen.tsx` — écran de login plein écran (au lieu d'une carte au milieu d'une page par ailleurs vide)
- 5 pages sous `frontend/src/pages/admin/` : Tableau de bord (nouveau — stats + résumé), Contenu, Modules, Apparence (reprennent les panneaux existants, juste éclatés en pages), Messages (nouveau — liste des messages de contact reçus, jusqu'ici enregistrés en base mais jamais affichés nulle part)
- Backend : nouvel endpoint `GET /api/t/{clientSiteId}/admin/messages` (`modules/contact/backend/ContactModule.cs`)
- Routing : `/admin/{clientSiteId}/{section}` avec `section` ∈ `dashboard|content|modules|appearance|messages` (`dashboard` = route sans suffixe)

La vue globale agence (`/admin/dashboard`) n'a pas changé — cette restructuration ne concerne que l'admin que voient les clients.

## Module Catalogue produits (panier + commande) — 2026-07-26

Nouveau module demandé par Ethan : produits (photos multiples, prix, description, stock), étendu à un panier et une commande (décision confirmée par Ethan). Détail complet : `docs/04-catalogue-modules.md` (section "Catalogue produits") et `docs/03-modele-donnees.md` (entités `Product`, `ProductImage`, `Order`, `OrderItem`).

Points techniques notables :
- **Premier upload de fichiers du socle** : photos stockées sur disque (`backend/wwwroot/uploads/{clientSiteId}/{productId}/`, servies via `app.UseStaticFiles()`), pas de service cloud (règle 5 de `CLAUDE.md`). Dossier gitignored avec `.gitkeep`.
- **Bug rencontré et corrigé** : endpoint d'upload (`IFormFile`) renvoyait une `500 InvalidOperationException` — ASP.NET Core 8 exige un middleware antiforgery par défaut dès qu'un endpoint lit un `IFormFile`, même sans formulaire HTML/cookies. Fix : `.DisableAntiforgery()` sur cette route (API pure, auth par en-tête `X-Admin-Password`).
- **Bug rencontré et corrigé** : sérialisation JSON de `Product.Images` partait en cycle infini (`ProductImage.Product` <-> `Product.Images` refixés par EF Core au sein d'une même requête `Include`). Fix : `[JsonIgnore]` sur `ProductImage.Product`.
- **Modules ajoutés après le passage multi-tenant ne sont pas automatiquement visibles dans l'admin d'un tenant existant** (`ModulesConfigJson` ne contient pas encore la clé) : `GET /api/t/{id}/admin/modules` faisait l'union stricte des clés déjà présentes, jamais de tous les modules connus du socle. Fix : `TenantAdminEndpoints` fait maintenant l'union avec `ModuleMetaRegistry.GetAll()` (nouvelle méthode), un module manquant apparaît désactivé par défaut au lieu d'être invisible. Ce fix bénéficie à tout futur module ajouté après coup, pas seulement à Catalogue.
- Pas de paiement en ligne réel : la commande décrémente le stock à la validation mais n'encaisse rien (voir note dans `docs/04-catalogue-modules.md`).

Testé (Claude Code, via curl + inspection base) sur le tenant historique (`11111111-1111-1111-1111-111111111111`) : module désactivé par défaut → 404 public ; activation depuis l'admin → liste vide (200) ; création produit + upload de 2 photos → apparaissent côté public avec le bon stock ; commande de 2 unités → stock 3→1, total calculé correct ; tentative de commande de 5 (stock restant 1) → 400 sans décrémentation ; annulation de la commande depuis l'admin → stock restauré à 3 ; second tenant (`Boulangerie Dupont`) → module toujours désactivé chez lui, `ModulesConfigJson` non pollué (isolation confirmée). Build backend (`dotnet build`) et frontend (`tsc -b`) propres.

**Reste à vérifier par Ethan dans le navigateur** : activer "Catalogue" depuis `/admin/{clientSiteId}/modules`, ajouter un produit avec photos et stock depuis `/admin/{clientSiteId}/products`, l'acheter depuis le site public (bouton panier flottant), vérifier la commande dans `/admin/{clientSiteId}/orders`. Le tenant historique a actuellement un produit de démo ("Bougie parfumee", stock 3, 2 photos de test) et une commande annulée laissés par les tests — à supprimer ou garder comme données d'exemple, au choix d'Ethan.

## Autorisation des modules à deux niveaux — 2026-07-26

Suite immédiate du module Catalogue : Ethan a fait remarquer qu'un client pouvait jusqu'ici activer lui-même n'importe quel module depuis son admin (`TenantAdminAuth` accepte le mot de passe du tenant), y compris un module qu'Ethan ne lui avait jamais donné. Demande : Ethan seul décide quels modules un client a le droit d'utiliser ("autorisation") ; le client choisit ensuite, parmi ceux-là, lesquels afficher ("activation") — sa décision à lui prime pour ce qu'il autorise, mais ne peut jamais dépasser ce qu'Ethan a autorisé.

Chaque module dans `ClientSite.ModulesConfigJson` porte maintenant `authorized` (agence seule, via `ModuleRegistry.SetAuthorizedAsync`) et `enabled` (client, via `SetEnabledAsync`, qui refuse désormais si le module n'est pas autorisé) — actif publiquement = les deux à `true`. Pas de migration EF Core (JSON reste une string) ; rétrocompatibilité gérée en code : un module déjà présent sans `authorized` explicite est considéré autorisé (voir `docs/02-architecture-modules.md`).

Bug corrigé au passage : le formulaire "Modules" du dashboard agence (`AgencyDashboardPage.tsx`) avait une liste `KNOWN_MODULES` codée en dur qui n'a jamais inclus "catalogue" — impossible d'autoriser ce module depuis le dashboard. Remplacé par un nouvel endpoint `GET /api/admin/modules` (agence) qui lit `ModuleMetaRegistry.GetAll()` : tout futur module y apparaîtra automatiquement.

Testé (curl + manipulation SQL directe pour simuler l'action du dashboard agence, faute de connaître le mot de passe agence réel d'Ethan) sur le tenant historique : révocation de l'autorisation Catalogue → 404 public immédiat, tentative du client de le réactiver depuis son admin → 403 explicite ; ré-autorisation → actif immédiatement sans action du client ; le client garde la main pour activer/désactiver un module déjà autorisé. Isolation confirmée sur le second tenant (Boulangerie Dupont, catalogue jamais configuré → `authorized:false` par défaut). Build backend et frontend (`tsc -b`) propres.

**Reste à vérifier par Ethan dans le navigateur** : depuis `/admin/dashboard`, éditer un client et décocher/recocher des modules dans "Modules autorisés" ; vérifier que l'admin du client (`/admin/{clientSiteId}/modules`) grise bien les modules non autorisés avec le message d'explication.

## UI admin Produits/Commandes + CRM Clients — 2026-07-26

Suite de retours UI d'Ethan sur l'admin catalogue, puis demande d'un CRM :
- **Largeur des pages admin** : `AdminLayout.tsx` limitait tout le contenu à `max-w-4xl` — retiré, les pages admin prennent maintenant toute la largeur disponible.
- **Page Produits** (`ProductsSection.tsx`) redessinée : en-tête avec compteur + bouton "Ajouter un produit" ouvrant une modal (formulaire + upload multi-photos avec aperçus avant validation, message de succès/erreur) ; les produits existants s'affichent en grille de cards au lieu d'une liste empilée.
- **Page Commandes** (`OrdersSection.tsx`) redessinée en tableau : tri sur Date/Client/Total (défaut : date de création décroissante), filtre par statut + recherche client, pagination de 10, ligne cliquable pour déplier le détail des articles. Tout côté frontend (pas de changement backend, la liste complète est déjà récupérée en un seul appel).
- **CRM Clients** : nouvelle entité `Customer` (`modules/catalogue/backend/Customer.cs` — Name/Email/Phone/Address/Notes), `Order` gagne `CustomerId` (FK). Migration `AddCustomers` avec **backfill de données** (pattern déjà utilisé dans `AddMultiTenant`, voir `migrationBuilder.Sql(...)`) : un `Customer` rétroactif par couple `(ClientSiteId, CustomerEmail)` déjà présent dans les commandes existantes, avant de rendre `CustomerId` obligatoire — aucune commande de test perdue. Le checkout (`CatalogueModule.cs`) fait maintenant un find-or-create par email (insensible à la casse) au lieu de dupliquer un client à chaque commande. Nouvelles pages `CustomersSection.tsx` (liste + stats calculées : nb commandes, total dépensé hors annulées, dernière commande + bouton d'ajout manuel) et `CustomerDetailPage.tsx` (fiche éditable + historique de commandes, route `/admin/{clientSiteId}/customers/{customerId}` — sort du switch `section` habituel, gère son propre auth/layout comme `AdminPage.tsx`).

Décision de conception : pas de navigation EF `Order.Customer` (le même cycle de sérialisation JSON que `ProductImage.Product`, déjà rencontré et corrigé plus haut, se reproduirait) — les endpoints qui ont besoin des deux font deux requêtes séparées.

Testé (curl + inspection base) sur le tenant historique : backfill vérifié (la commande de test "Marie Dupont" pointe vers un `Customer` rétroactif au bon nom/email) ; checkout avec un email déjà connu → pas de doublon, `orderCount` incrémenté ; checkout avec un nouvel email → nouveau `Customer` ; édition téléphone/notes → persisté ; création manuelle d'un client sans commande → apparaît avec 0 commande ; isolation confirmée (aucun client côté `Boulangerie Dupont`). Build backend et `tsc -b` propres ; routes `/admin/{id}/customers` et `/admin/{id}/customers/{customerId}` servies (200).

**Limite connue** : pas de capture d'écran possible dans cet environnement (ni `chromium-cli` ni Playwright/`npx` disponibles ici — lié à l'installation npm cassée sur la machine d'Ethan, voir `DEMARRAGE.md`). Les rendus UI (largeur des pages, cards produits, tableau commandes, pages clients) sont vérifiés uniquement par `tsc -b` propre + réponses HTTP des routes, **pas visuellement** — à confirmer par Ethan dans le navigateur avant de considérer ces pages définitivement validées.

## Clients = sous-partie du module Catalogue + cards Modules avec tarifs — 2026-07-26

Suite de retours après capture d'écran de la page Produits :

- **Clients rattaché au module Catalogue** (pas de module "customers" séparé, décision explicite d'Ethan plutôt qu'implémenter le mécanisme de dépendance entre modules, toujours juste documenté) : Produits/Commandes/Clients disparaissent de la sidebar admin (`AdminLayout.tsx`) si le module Catalogue n'est pas actif pour le tenant, et l'accès direct par URL à ces pages est bloqué (`AdminPage.tsx`, `CustomerDetailPage.tsx`) avec un message plutôt qu'un rendu silencieux.
- **Page Modules du tenant** (`ModulesSection.tsx`) refaite en cards (au lieu d'une liste à cases à cocher) : image 16:10 par module (voir `docs/11-images-modules.md` pour le prompt IA, images déposées par Ethan dans `frontend/public/module-icons/`), nom en overlay, badge "?" qui affiche la description au survol de toute la card, toggle stylisé animé pour les modules autorisés.
- **Modules non autorisés désormais visibles** (au lieu d'être filtrés) pour montrer au client ce qui existe en plus : image en niveaux de gris, ruban diagonal "Non disponible", et un prix + bouton "Activer pour {prix}" (lien `mailto:` pré-rempli vers l'agence, adresse dans `frontend/src/config.ts` — `AGENCY_CONTACT_EMAIL`) si un prix a été renseigné, sinon juste "Contacte l'agence pour l'activer" comme avant.
- **Nouvelle entité `ModulePrice`** (`backend/ModulePrice.cs`, clé primaire = nom du module, pas par tenant — un prix vaut pour tout le socle) + migration `AddModulePrices`. Prix en texte libre (pas un decimal) pour coller au style de `docs/04-catalogue-modules.md` ("250€", "Offert"...). Édité depuis un nouveau panneau "Tarifs des modules" sur `/admin/dashboard` (`GET/PUT /api/admin/modules/{name}/price`, auth agence).

Testé (curl, avec le mot de passe agence — qui s'avère être le même `admin123` que le tenant historique, les deux hash sont identiques depuis la migration `AddMultiTenant`) : prix posé sur Catalogue → apparaît bien dans `GET /admin/modules` (agence) et dans `GET /api/t/{id}/admin/modules` (tenant) même quand le module n'est pas autorisé pour ce tenant (vérifié sur `Boulangerie Dupont`, catalogue non autorisé chez elle) ; upsert du prix (modifier une valeur déjà posée) fonctionne. Build backend et `tsc -b` propres, routes admin re-testées (200).

## Redesign card Modules (toggle + survol) + page Établissement avec recherche Google Places — 2026-07-26

Suite de retours sur les cards Modules, puis question d'Ethan sur pourquoi l'adresse vivait dans la config du module Maps :

- **Card Modules** : le toggle prend la place du badge "?" (coin haut-droit de l'image) ; le wording d'aide recouvre maintenant toute l'image au survol de la card (plus de bulle déclenchée par un badge dédié) ; la ligne "Afficher sur le site" a disparu du pied de card (le toggle suffit).
- **Nouvelle page "Établissement"** (`EstablishmentSection.tsx`, `/admin/{clientSiteId}/establishment`) : infos factuelles du commerce (nom, type, adresse, téléphone), distincte de "Contenu" (texte marketing). Champ "Rechercher sur Google" à côté du nom → propose des fiches Google, sélectionner remplit adresse/téléphone/type automatiquement.
- **Adresse déplacée hors du module Maps** : `SiteContent` gagne `EstablishmentName`/`EstablishmentType`/`Address`/`Phone` (migration `AddEstablishmentInfo`, avec **backfill** de l'adresse déjà présente dans `ModulesConfigJson.maps.address` — aucune régression pour le tenant historique, testé). `MODULE_FIELDS.maps` ne garde que `apiKey` ; `TemplateClassique.tsx`/`TemplateModerne.tsx` lisent `content.address` au lieu de `modules.maps.address`.
- **Intégration Google Places (pas Business Profile)** : décision prise avec Ethan après un aller-retour sur l'API Business Profile (celle-ci nécessite OAuth + une demande d'accès manuelle à Google, potentiellement longue/incertaine — voir échange précédent) — Places API suffit largement au besoin (recherche par nom → adresse/téléphone/type) et est en libre-service. Nouveau fichier `backend/GooglePlacesEndpoints.cs`, proxy serveur (`GET /admin/google-places/search` et `/details`, auth tenant) : la clé Google (`GooglePlaces:ApiKey`, `appsettings.Development.json`, gitignored) ne quitte jamais le backend, contrairement à la clé Maps Embed qui elle est par tenant et exposée côté client par design.
- **Bug rencontré et corrigé** : le endpoint de recherche renvoyait `ObjectDisposedException` — la requête LINQ sur les résultats (`Select(...)`) est paresseuse et ne s'exécutait qu'au moment de la sérialisation JSON, après que le `JsonDocument` (`using`) soit déjà disposed. Fix : `.ToList()` pour forcer l'évaluation avant la fin du `using`.
- **Piège Google rencontré en cours de route** : la première clé fournie par Ethan avait une restriction "referer" (sites web), qui ne fonctionne que pour des appels navigateur — un backend serveur-à-serveur se fait rejeter (`REQUEST_DENIED`). Résolu avec une clé dédiée, restriction d'application "Aucune" + restriction d'API repliée sur "Places API" uniquement (clé jamais exposée au client, donc pas de risque à la laisser sans restriction de provenance).

Testé (curl) : recherche "Tour Eiffel" → résultat correct ; détails du lieu → adresse/type récupérés ; sauvegarde des champs établissement via `PUT /admin/content` → persistée et relue correctement. **Incident mineur pendant les tests** : un appel de test a temporairement écrasé la description/l'offre de démo du tenant historique (l'endpoint remplace tout l'objet `SiteContent`) — repéré immédiatement et restauré à l'identique dans la foulée, aucune perte. Build backend et `tsc -b` propres, routes `/admin/{id}/establishment` et `/admin/{id}/modules` re-testées (200).

**Reste à faire par Ethan** : la demande d'accès Google Business Profile API reste en cours de son côté si l'intégration OAuth complète (au-delà de la simple recherche Places) est souhaitée un jour — non bloquant, la page Établissement fonctionne pleinement avec Places API seule.

---

## Page Établissement en onglets + import photos/horaires Google + email — 2026-07-27

Suite de retours d'Ethan sur la page Établissement (recherche Google Places déjà en place depuis la Phase précédente) :

- **Boutons "Enregistrer" déplacés dans le header** des pages Établissement/Contenu/Apparence (au lieu du bas de page ou, pour Apparence, d'une sauvegarde automatique au clic) — même architecture que la page Modules (titre à gauche, bouton à droite). Apparence gagne un état brouillon (le choix de template n'est plus appliqué avant un clic explicite sur Enregistrer).
- **`SiteContent` gagne `Email` et `OpeningHours`** (migration `AddEstablishmentEmailAndHours`) — `OpeningHours` stocké en JSON brut (`OpeningHoursJson`), reformé en liste à la frontière API, même principe que `ModulesConfigJson`.
- **Page Établissement passée en 3 onglets** (premier usage de ce pattern dans l'admin, jusqu'ici uniquement des pages pleines) : Informations (nom/type/adresse/téléphone/email + recherche Google), Photos (upload manuel + import Google), Horaires (7 champs, un par jour).
- **Import automatique depuis Google Places** : `GooglePlacesEndpoints.details` demande désormais aussi `opening_hours` et `photos` (+ `&language=fr` sur recherche et détails, pour des horaires en français). Les horaires (`weekday_text`) sont renvoyés directement et préremplissent l'onglet Horaires. Les photos ne sont pas téléchargées par ce `GET` (pas d'effet de bord sur une lecture) — seulement leurs `photoReferences` ; un nouvel endpoint `POST /admin/google-places/import-photos` télécharge les 3 premières et les enregistre comme `EstablishmentImage` (même stockage disque que l'upload manuel dans `EstablishmentEndpoints.cs`), avec un compteur de `SortOrder` géré en mémoire dans la boucle (sinon les 3 photos importées dans la même requête se verraient toutes attribuer le même rang, aucune n'étant encore en base pendant la boucle).
- **Bug pré-existant trouvé et corrigé au passage** : la page "Contenu" (`ContentSection.tsx`) n'envoyait que `siteName`/`description`/`offers` sur l'endpoint partagé `PUT /admin/content`, qui remplace tout l'objet `SiteContent` — un enregistrement depuis cette page aurait donc mis `null` sur les champs Établissement (adresse, téléphone, etc.), provoquant une `DbUpdateException` (colonnes `NOT NULL`) et un 500 (confirmé par un test direct). Corrigé en faisant écho, comme le fait déjà `EstablishmentSection.tsx` dans l'autre sens, aux champs Établissement chargés au montage.

Testé (via CDP/Chrome headless piloté par script Node, faute de `chromium-cli`/Playwright disponibles ici — voir limite déjà notée plus haut dans ce fichier) sur le tenant historique : recherche "Tour Eiffel" → sélection → adresse/type remplis, horaires des 7 jours remplis en français, 3 photos réelles importées et visibles dans l'onglet Photos + aperçu ; sauvegarde réussie (200, pas d'erreur) ; contenu relu conforme. Bug `ContentSection` reproduit par un appel direct sans les champs Établissement (500 confirmé) puis re-testé après fix (200). Données de test (photos importées, nom/adresse/horaires "Tour Eiffel") supprimées et tenant historique restauré à son état antérieur après vérification. `tsc` frontend et `dotnet build` backend propres.

**Reste à faire par Ethan** : vérifier dans le navigateur (recherche réelle sur son propre établissement, upload manuel de photo, édition des horaires). **Hors scope pour l'instant** (non demandé explicitement) : affichage de l'email/des horaires/des photos sur le site public (`TemplateClassique.tsx`/`TemplateModerne.tsx` ne les lisent pas encore) — à faire quand Ethan le demandera.

---

## Boutons "Enregistrer" avec détection de modification + refonte Horaires + module Horaires — 2026-07-27

Trois suites de retours d'Ethan traitées dans la même session :

**1. Boutons "Enregistrer" désactivés tant qu'aucune modification n'est en attente** (opacité réduite, non cliquables), actifs dès qu'un champ diffère de la dernière version chargée/sauvegardée — étendu à toutes les pages qui avaient un bouton "Enregistrer" statique : Établissement, Contenu (comparaison au `content` chargé), fiche client `CustomerDetailPage.tsx` (comparaison au `customer` chargé), et côté vue globale agence (`AgencyDashboardPage.tsx`) le panneau tarifs modules (comparaison ligne par ligne) et le formulaire client en mode édition (comparaison à un `originalForm` capturé à l'ouverture de l'édition ; le bouton "Ajouter" en création reste toujours actif, gated par les `required` HTML natifs comme avant).

**2. Refonte de la page Établissement** :
- Onglets réordonnés (Informations en premier, puis Description/Photos/Horaires) et titres de section ajoutés dans l'onglet Informations ("Établissement" / "Responsable de l'établissement").
- Panneau d'aperçu à droite élargi (320px → 420px, padding et typographie augmentés).
- **Nouvelle section "Responsable de l'établissement"** : `SiteContent` gagne `ManagerName`/`ManagerPhone`/`ManagerEmail` (migration `AddEstablishmentManager`) — contact interne, jamais affiché sur le site public (à la différence de `Email` qui lui alimente le site).
- **Horaires passés d'un texte libre par jour à un format structuré** : `DayHoursDto` (`Closed`, `MorningOpen`, `MorningClose`, `AfternoonOpen`, `AfternoonClose`) sérialisé dans la même colonne `OpeningHoursJson` (aucune migration nécessaire — le format stocké dans une colonne texte peut changer librement, voir commentaire dans `SiteContent.cs`). Les inputs de l'onglet Horaires sont maintenant de vrais `<input type="time">`, avec une plage "Matin" et une plage "Après-midi" par jour pour permettre une pause méridienne (laisser l'après-midi vide si le commerce ne fait pas de coupure).
- **Import Google mis à jour en conséquence** : `GooglePlacesEndpoints` lit désormais `opening_hours.periods` (au lieu de `weekday_text`, du texte non structuré) et reconstruit les 7 `DayHoursDto` — un jour avec deux occurrences dans `periods` (ouverture matin + ouverture après-midi) devient une pause méridienne détectée automatiquement. Testé avec de vraies fiches Google : boulangerie sans pause (créneau continu 7 jours), salon de coiffure avec pause le vendredi (09:30–13:00 / 14:30–20:00) et fermé le dimanche — les deux cas restitués correctement dans l'UI.
- `ContentEndpoints.ToResponse` reste défensif (`try/catch` autour du parsing JSON) pour absorber sans planter à la fois l'ancien format (liste de chaînes) et la colonne vide des lignes créées avant la première migration Horaires.

**3. Nouveau module "Horaires"** (`/modules/horaires/module.meta.json`, pas de dossier `backend/`/`frontend/` — aucune entité ni route propre à créer, seul un gate sur une fonctionnalité déjà core d'Établissement) : décision prise avec Ethan (deux questions posées) — le module **gate aussi l'admin** (l'onglet Horaires disparaît de la page Établissement si non autorisé/activé, même logique que Catalogue → Produits/Commandes/Clients) et **reste gratuit** (pas de prix affiché, "Contacte l'agence pour l'activer" par défaut comme Contact). Aucun code backend supplémentaire nécessaire : `ModuleRegistry`/`ModuleMetaRegistry` sont déjà entièrement génériques par nom de module. Côté frontend, `EstablishmentSection.tsx` appelle `useModules(clientSiteId)` et filtre l'onglet Horaires sur `modules?.horaires?.enabled` (avec repli automatique sur l'onglet Informations si le module est désactivé pendant que l'onglet est ouvert).

Testé (CDP/Chrome headless + appels API directs, mêmes limites d'outillage que la session précédente) : onglet Horaires absent tant que le module n'est pas autorisé ; autorisation via `PUT /api/admin/client-sites/{id}` (modules incluant `"horaires"`) → onglet réapparaît immédiatement ; révocation → disparaît à nouveau ; card "Horaires" visible sur `/admin/{id}/modules` (fallback lettre "H", pas encore d'icône dédiée — voir `docs/11-images-modules.md` si Ethan veut en générer une) ; dirty-check vérifié sur Établissement (bouton grisé → actif après frappe, sans rien persister tant que non cliqué) et sur le formulaire client agence. Build backend et `tsc` frontend propres. Module laissé **autorisé** pour le tenant historique à la fin de la session, pour qu'Ethan puisse l'essayer directement.

**Hors scope, comme précédemment** : affichage des horaires/photos/email sur le site public.

## Page Modules : tri, filtre par statut, prix toujours en €, CTA centré — 2026-07-27

Suite de retours d'Ethan sur la page `/admin/{clientSiteId}/modules`, juste après l'ajout du module Horaires (deux itérations dans la même session : un premier filtre par catégorie proposé puis remplacé par un filtre par statut à la demande d'Ethan) :

- **Icône du module Horaires déposée** : `frontend/public/module-icons/horaires.png` (générée par Ethan avec le prompt ajouté à `docs/11-images-modules.md` — horloge stylisée + page de calendrier, même gabarit que les autres), référencée dans `MODULE_IMAGES` (`ModulesSection.tsx`).
- **Prix toujours affiché en euros** : les valeurs existantes étaient saisies de façon incohérente ("300", "450 EUR", "125", "100"). Plutôt qu'une migration, le prix reste un texte libre en base mais n'est plus jamais affiché tel quel : `formatPriceEur()` (`ModulesSection.tsx`) n'en garde que les chiffres et ajoute systématiquement "€". Côté saisie (`AgencyDashboardPage.tsx`, `ModulePricingPanel`), l'input n'accepte plus que des chiffres (`onlyDigits()`, suffixe "€" visuel non éditable) — la valeur historique de Catalogue ("450 EUR") normalisée à "450" via l'API pendant la session.
- **Tri des cards** : actif (autorisé + activé) → disponible (autorisé, pas encore activé) → indisponible (pas autorisé), via `statusRank()`.
- **Filtre par statut** (et non par catégorie — premier essai revenu en arrière à la demande d'Ethan, `ModuleMeta.Category` entièrement retiré du backend et des `module.meta.json` puisque plus rien ne le consommait) : pastilles "Tous / Activé / Désactivé / Disponible", basées sur le même `statusRank()` que le tri.
- **Bouton "Activer pour {prix} €" déplacé au centre de la card** (au lieu d'un pied de card séparé). **Bug corrigé au passage** : le calque de description au survol (`opacity-0 group-hover:opacity-100`) et ce nouveau bouton, tous deux centrés en plein milieu de l'image, se chevauchaient sur les modules non autorisés (texte illisible autour du bouton). Fix : la description passe en texte statique au-dessus du bouton pour ces cards (plus au survol), le survol restant réservé aux cards de modules autorisés qui elles n'ont pas de bouton concurrent.

Testé (CDP/Chrome headless) : filtre "Disponible" isole bien Maps (seul module non autorisé) ; tri confirmé (les 4 modules actifs avant Maps) ; icône Horaires (horloge + calendrier) affichée correctement ; description + bouton lisibles côte à côte sans chevauchement sur la card Maps. Build backend et `tsc` frontend propres.

---

## Retrait du doublon Description + page "Offres" séparée avec lien produit — 2026-07-27

Suite à la remarque d'Ethan sur les recoupements entre pages (Contenu / Établissement / Produits) :

- **Doublon corrigé** : l'onglet "Description" ajouté à Établissement plus tôt dans la session (réutilisant `SiteContent.Description`) est retiré — il créait un deuxième endroit pour éditer le même champ que "Contenu". Établissement repasse à 3 onglets (Informations, Photos, Horaires).
- **Offres déplacées sur une page dédiée** (`/admin/{clientSiteId}/offers`, `OffersSection.tsx`, nouvelle entrée de nav toujours visible — pas gatée par un module) : Ethan ne voyait pas pourquoi les offres vivaient sur "Contenu", qui garde désormais seulement nom du site + description. Décision prise avec Ethan (deux questions posées) : les offres restent utilisables **sans** le module Catalogue (texte libre, pour un client de service sans produits), et une offre peut se lier à **un seul** produit existant (pas de pack multi-produits).
- **`Offer` gagne `ProductId`** (`Guid?`, migration `AddOfferProductLink`, pas de navigation EF ni de contrainte FK — même choix que `Order.CustomerId` dans `modules/catalogue/backend/Order.cs`, pour ne pas faire dépendre ce fichier core d'un module optionnel). Quand Catalogue est activé pour le tenant, `OffersSection.tsx` charge la liste de ses produits (`GET /admin/catalogue/products`) et affiche un menu déroulant "Produit associé" par offre : le choisir préremplit titre/prix/description depuis le produit (`${price.toFixed(2)} €`), les champs restant ensuite modifiables librement. Sans Catalogue, le menu n'apparaît pas du tout et `productId` reste toujours `null`.
- **Bug évité de justesse** : `EstablishmentSection.tsx` et `ContentSection.tsx` renvoient toujours la liste complète des offres au PUT partagé (`/admin/content`) pour ne pas les écraser — il fallait penser à y ajouter `productId` dans l'écho, sinon sauvegarder depuis ces deux pages aurait silencieusement effacé tous les liens produit.

Testé (CDP/Chrome headless + API) : page Contenu simplifiée (2 champs) ; page Offres affiche le menu "Produit associé" (Catalogue actif sur le tenant historique) ; sélection de "Bougie parfumee" → titre/prix ("12.50 €")/description préremplis ; sauvegarde → `productId` bien persisté en base ; offre de démo restaurée à son état d'origine (`productId: null`) après vérification. Build backend et `tsc` frontend propres.

**Hors scope, comme précédemment** : affichage des offres/horaires/photos/email sur le site public (templates non mis à jour).

---

## Fusion Contenu + Apparence en "Site internet" — 2026-07-27 (même jour)

Ethan a fait remarquer que "Contenu" (réduite à nom du site + description après le départ des offres) faisait trop vide. Plutôt que d'y ajouter des champs inventés, décision : la fusionner avec "Apparence" (qui ne portait que le choix de template) en une seule page avec onglets.

- Nouvelle page `/admin/{clientSiteId}/site` (`SiteSection.tsx`) avec 2 onglets : "Modèle" (template, ex-Apparence) et "Contenu" (nom du site + description, ex-Contenu). `ContentSection.tsx` et `AppearanceSection.tsx` supprimés.
- Nav renommée "Site internet" (était deux entrées séparées "Contenu" et "Apparence"), `AdminSection` : `"content"`/`"appearance"` remplacés par `"site"` (URL `/admin/{id}/site`, changement volontaire — pas de contrainte de rétrocompatibilité d'URL sur ce projet en cours de développement).
- Un seul bouton "Enregistrer" pour les deux onglets : `isDirty` est vrai si le template OU le contenu a changé ; `handleSave` déclenche les deux `PUT` (`/admin/template` et/ou `/admin/content`) en parallèle selon ce qui est réellement modifié, plutôt que de dupliquer le bouton par onglet.

Testé (CDP/Chrome headless) : nav affiche bien "Site internet" à la place des deux anciennes entrées ; onglet Modèle charge le template actuel (Moderne) ; onglet Contenu charge nom/description ; bascule entre onglets sans perte de state. Build backend inchangé (aucun changement backend, uniquement frontend), `tsc` propre.

---

## Reprise du design des templates : "Classique" renommé "Hestia" — 2026-07-27

Premier chantier de la reprise de design des templates demandée par Ethan (`docs/10-templates.md`, section "Prochaine étape"), un template à la fois. Recherche de convention de nommage menée avant de coder : les gros CMS (Shopify, Squarespace, Ghost, WordPress marketplace) nomment leurs thèmes avec un mot court et évocateur, découplé de la description technique du layout — jamais littéralement "layout centré" ou "bandeau large". Décision d'Ethan : partir sur des noms de la mythologie grecque plutôt que des noms de lieux/mots inventés à l'anglo-saxonne.

- **Template "Classique" renommé "Hestia"** (déesse du foyer et de l'hospitalité — cohérent avec l'ambiance chaleureuse/accueillante de ce template : navbar pilule, hero centré). Choisi par Ethan parmi 3 propositions (Hestia, Déméter, Gaïa), chacune accompagnée d'une piste de palette pour visualiser l'ambiance avant de trancher.
- **Id technique renommé partout** : `"classique"` → `"hestia"` (backend `TemplateEndpoints.KnownTemplateIds`, `ClientSite.TemplateId` (valeur par défaut), `AgencyDashboardEndpoints` ; frontend `useTemplate.ts` (type `TemplateId`), `templates/registry.ts`, `PublicSite.tsx`, commentaire dans `ModulesSection.tsx`). Fichier `TemplateClassique.tsx` renommé `TemplateHestia.tsx`, composant renommé pareil.
- **Tenant existant migré** : "Boulangerie Dupont" avait `TemplateId = 'classique'` en base — mis à jour en `'hestia'` par une requête SQL directe (`UPDATE "ClientSites" SET "TemplateId" = 'hestia' WHERE "TemplateId" = 'classique'`), pas de migration EF Core nécessaire (la colonne ne change pas de forme, même logique que les updates de contenu JSON déjà faits dans les sessions précédentes). Le tenant historique était déjà sur `"moderne"`, non affecté.
- **Palette propre au template**, volontairement définie en dehors de `tailwind.config.js` (qui porte les tokens etnof-web partagés, utilisés par l'admin et par le template Moderne — pas question de les écraser globalement) : terre cuite `#C1652F`, ivoire `#FBF1E4`, noir glacé `#211A16`, inspirés de la céramique grecque antique (amphores à figures noires sur fond d'argile). Constantes locales dans `TemplateHestia.tsx`, appliquées en valeurs Tailwind arbitraires/`style` inline plutôt qu'en tokens globaux.
- **Signature visuelle propre** : fine frise en méandre grec (motif de poterie) sous le hero — petit composant `GreekKeyDivider` dans le même fichier, un unique SVG généré en local encodé en data URI et tuilé horizontalement en `background-repeat`, pas d'asset externe téléchargé.
- **Limite assumée** : les blocs de modules (`ContactSection`, `MapsSection`, `BlogSection`, `CatalogueSection`) gardent la palette etnof-web partagée (vert accent, dégradé bleu-vert du bouton) — cohérent avec la règle déjà posée dans `docs/10-templates.md` ("un template ne réécrit jamais la logique d'un module, seulement leur agencement"). Si Ethan veut que les modules héritent aussi de l'identité de chaque template, ce sera un chantier à part (passer des tokens de couleur en props).
- **Bonus outillage découvert en cours de session** : contrairement aux sessions précédentes (notes répétées sur l'absence de `chromium-cli`/Playwright), un vrai Chrome installé (`C:\Program Files\Google\Chrome\Application\chrome.exe`) a été trouvé sur la machine et piloté en `--headless=new --screenshot=...` pour vérifier le rendu visuellement sans script CDP custom.
- **Petit aléa en cours de route** : le premier `dotnet build` a échoué (fichier `Backend.exe` verrouillé par un processus resté actif depuis une session précédente, PID retrouvé via `Get-Process`) — confirmé avec Ethan avant de le terminer (`Stop-Process`), puis build repassé propre.

Testé : `dotnet build` et `tsc -b` propres ; `GET /api/t/{id}/template` renvoie `"hestia"` pour Boulangerie Dupont ; capture d'écran du rendu public confirmant fond ivoire, overline "BIENVENUE" en terre cuite, titre en noir glacé, frise en méandre sous le hero, navbar pilule blanche.

**Reste à faire** : renommer/redessiner "Moderne" (prochaine étape, pas encore commencée) ; QA visuelle par Ethan dans le navigateur pour "Hestia".

---

## 3 palettes sélectionnables par le client, par template — 2026-07-27 (même jour)

Suite immédiate du renommage Hestia : Ethan a demandé que chaque template propose plusieurs variantes de couleurs (3 par template), choisies par le client lui-même depuis son admin — une fonctionnalité permanente, pas juste un choix de design à trancher une fois. Détail complet (implémentation, palettes exactes, tests) dans `docs/10-templates.md`, section "3 palettes sélectionnables par template". Résumé :

- `ClientSite.PaletteId` (migration `AddPaletteId`, backfill `"argile"` sur les tenants existants) ; 3 palettes Hestia (Argile/Olivier/Égée) dans `registry.ts`, dupliquées côté validation backend (`TemplateEndpoints.KnownPalettesByTemplate`).
- `GET/PUT /api/t/{id}/template` étendus pour porter `paletteId`, avec repli automatique sur la première palette connue si le tenant change de template et que sa palette actuelle n'y existe pas.
- `TemplateHestia.tsx` résout accent/fond depuis la palette active (structure/typo commune, seuls 2 tokens changent — cf. `docs/09-charte-graphique.md`) ; `SiteSection.tsx` gagne un sélecteur de pastilles sous le choix de template, avec le même dirty-check que le reste de la page.
- **Anecdote de session** : les premiers tests visuels (boucle PUT+screenshot trop rapide) donnaient un rendu systématiquement décalé d'une palette — panique de courte durée avant de confirmer, en isolant chaque changement avec un vrai délai, que c'était un artefact du harnais de capture d'écran (Chrome headless) et non un bug de l'app.

Testé : migration + backfill vérifiés en base ; `dotnet build`/`tsc -b` propres ; cycle PUT/GET des 3 palettes vérifié par curl (dont le rejet 400 d'une palette invalide) ; rendu des 3 palettes confirmé par capture d'écran sur "Boulangerie Dupont", tenant restauré sur "argile" après tests.

**Reste à faire** : sélecteur de palette dans l'admin pas vérifié visuellement (écran de login non scriptable avec le `--screenshot` headless utilisé ici) — à confirmer par Ethan. Donner aussi 3 palettes à "Moderne" quand il sera repris.

**Confirmé par Ethan** dans la foulée (capture d'écran de sa propre session) : le sélecteur fonctionne — puis suite de session ci-dessous.

## Sélecteur de template en cards, façon page Modules — 2026-07-27 (même jour)

Après avoir vu le sélecteur (liste à radios + pastilles), Ethan a demandé la même présentation que la page Modules : des cards avec une image représentative, la palette de couleurs en overlay sur un côté en bas, et l'image de fond qui change selon la palette active. Détail complet, y compris la découverte que le tenant historique était passé sur Hestia/Olivier (Ethan a enregistré son propre test), dans `docs/10-templates.md`, section "Sélecteur de template en cards". Résumé :

- `SiteSection.tsx` : liste à radios remplacée par une grille de `TemplateCard` (même famille que `ModuleCard`), palette en overlay bas-droite affichée seulement sur la card sélectionnée, image de la card résolue depuis la palette de brouillon en cours.
- 4 images placeholder ajoutées (`frontend/public/template-previews/`), générées par Claude Code via Chrome headless piloté en CDP brut (script Node maison, faute de Playwright disponible sur cette machine) — à remplacer par Ethan par ses propres captures, même logique que les icônes de module.
- Ce même pilotage CDP a aussi permis de contourner l'écran de login admin pour la première fois cette session (injection dans `sessionStorage`, clé lue par `useAdminSession.ts`) et de simuler un clic réel pour vérifier l'interaction bout en bout.

Testé : `tsc -b` propre ; grille de cards vérifiée par capture d'écran ; changement de palette → image mise à jour en direct vérifié par clic simulé (sans reload). Tenant "Boulangerie Dupont" restauré sur Hestia/Argile après tests ; tenant historique laissé tel quel (Hestia/Olivier, choix réel d'Ethan).

## Bug corrigé : débordement horizontal sur l'onglet Horaires (Établissement) — 2026-07-27 (même jour)

Signalé par Ethan avec capture d'écran : sur `/admin/{id}/establishment`, onglet Horaires, la page entière défilait horizontalement (sidebar comprise) au lieu de rester dans la largeur de l'écran.

Cause : chaque ligne de jour utilisait une grid à colonnes fixes (`grid-cols-[110px_90px_1fr_1fr]`) contenant des `<input type="time">` — leur largeur intrinsèque (non compressible par le navigateur) dépasse la piste `1fr` disponible dès que la fenêtre n'est pas très large, et une piste de grid ne se réduit jamais sous la taille intrinsèque de son contenu sans `min-width: 0` explicite. Le débordement remontait alors jusqu'au document entier.

Fix (`EstablishmentSection.tsx`) : la ligne de chaque jour passe de `grid` à `flex flex-wrap` — les blocs Matin/Après-midi passent à la ligne suivante plutôt que de forcer la largeur de la page ; `min-w-0` ajouté sur la colonne de gauche de la grid `1fr_420px` (filet de sécurité pour toute la page, pas seulement Horaires) ; largeur des inputs `time` fixée explicitement (`w-[110px]`) plutôt que laissée à la taille intrinsèque du navigateur.

Testé (CDP, plusieurs largeurs de fenêtre 1280px/1600px, mesure directe de `document.documentElement.scrollWidth` vs `clientWidth`) : plus aucun débordement horizontal, la ligne du jour passe naturellement à la ligne quand l'espace manque au lieu de déborder. `tsc -b` propre.

## Page produit dédiée, façon fiche client — 2026-07-27 (même jour)

Demandé par Ethan : la card produit de `/admin/{id}/products` affichait une rangée de miniatures avec suppression individuelle en plus de la grande photo — trop chargé. Décision : la liste garde juste la photo principale, nom/prix/description/stock ; cliquer sur une card ouvre une fiche produit dédiée (`/admin/{clientSiteId}/products/{productId}`, nouveau `ProductDetailPage.tsx`) où se gèrent nom/description/prix/stock/photos, avec un aperçu à droite — même construction que `EstablishmentSection.tsx` (`grid gap-6 lg:grid-cols-[1fr_420px]`, `aside` avec photo de couverture + infos) plutôt que celle de `CustomerDetailPage.tsx` (qui n'a pas d'aperçu latéral).

- **Nouveau** `frontend/src/pages/ProductDetailPage.tsx` : header avec bouton "Enregistrer" + dirty-check (même mécanisme que les autres pages), section Informations (nom/description/prix/stock), section Photos (upload/suppression, déplacée depuis la liste), `ProductPreview` en aside (photo de couverture, nom/prix, description, stock, miniatures des photos suivantes). Gate module Catalogue identique à `CustomerDetailPage.tsx` (page bloquée avec message si le module n'est pas actif, accès direct par URL).
- **Routing** (`App.tsx`) : `/admin/{clientSiteId}/products/{productId}` ajouté avant le switch générique de section, même principe que la route `customers/{customerId}` déjà existante.
- **Backend** : nouvel endpoint `GET /admin/catalogue/products/{id}` (produit unique + photos), symétrique à celui des clients. **Bug trouvé et corrigé au passage** : l'endpoint `PUT /admin/catalogue/products/{id}` existant ne chargeait pas la navigation `Images` (pas de `.Include`) — sa réponse renvoyait toujours `"images": []`, ce qui aurait fait disparaître les photos affichées côté admin après le tout premier enregistrement depuis la nouvelle fiche produit (qui remplace son state avec la réponse du PUT). Corrigé en ajoutant le même `.Include(p => p.Images.OrderBy(...))` que le GET.
- **`ProductsSection.tsx` allégé** : suppression de la rangée de miniatures + upload/suppression inline (`handleUploadImage`/`handleDeleteImage` retirés) ; la card devient cliquable (`window.location.href` vers la fiche détail) avec `e.stopPropagation()` sur "Supprimer le produit" pour ne pas déclencher la navigation.

Testé (CDP : login par injection `sessionStorage`, clic simulé sur "Enregistrer" avec surveillance réseau) : liste épurée conforme à la maquette voulue ; fiche produit accessible par clic, aperçu correct ; édition du stock → clic Enregistrer → requête `PUT` → `200` → persisté en base (vérifié par requête directe) ; upload/suppression de photo inchangés fonctionnellement. `tsc -b` et `dotnet build` propres. Donnée de démo (stock du produit "Bougie parfumee") restaurée à `1` après tests.

## Modal de confirmation réutilisable pour les suppressions — 2026-07-27 (même jour)

Demandé par Ethan : le clic sur "Supprimer le produit" supprimait immédiatement, sans confirmation — même chose pour tous les autres boutons "Supprimer" du projet (établissement, offres, clients, dashboard agence : aucun n'avait de confirmation jusqu'ici, vérifié en cherchant tous les `handleDelete`/"Supprimer" du repo). Demande explicite : un composant unique, réutilisable partout.

- **Nouveau** `frontend/src/components/admin/ConfirmModal.tsx` : modal générique (titre, message optionnel, libellés de boutons personnalisables, `onConfirm`/`onCancel`), même habillage visuel que les modals existantes (`AddProductModal`, overlay `bg-navy/40`, `rounded-card`/`shadow-soft`).
- **Branché sur "Supprimer le produit"** (`ProductsSection.tsx`) : un état `productToDelete` remplace l'appel direct à `handleDelete`, la modal affiche le nom du produit ciblé dans le titre.
- **Pas encore branché ailleurs** (établissement, offres, clients, dashboard agence) — seul le bouton demandé par Ethan a été traité pour l'instant ; le composant est prêt à être réutilisé sur les autres quand il le demandera.

**Incident découvert en testant** : le produit de démo "Bougie parfumee" (présent depuis la session Catalogue du 2026-07-26) avait disparu de la base avant même ce chantier — très probablement supprimé par un clic accidentel d'Ethan sur l'ancien bouton sans confirmation. Photo et données non récupérables (fichier supprimé du disque par l'endpoint `DELETE`). C'est très probablement ce qui a motivé cette demande de confirmation. Un produit temporaire a été créé/supprimé pour tester le flux Annuler/Supprimer (aucune trace laissée).

Testé (CDP) : ouverture de la modal au clic sur "Supprimer le produit" (nom du produit affiché dans le titre) ; "Annuler" → produit toujours présent ; "Supprimer" → produit bien supprimé. `tsc -b` propre.

**Reste à faire, à la demande d'Ethan si besoin** : brancher `ConfirmModal` sur les autres boutons "Supprimer" du projet.

3 produits de démo recréés ensuite à la demande d'Ethan (thème bougies artisanales, cohérent avec l'original) : "Bougie parfumee" (12,50€, stock 3), "Bougie parfumee lavande" (12,50€, stock 5), "Coffret decouverte (3 bougies)" (32€, stock 2) — chacun avec une photo (carré de couleur uni généré via PowerShell/System.Drawing, placeholder à remplacer par de vraies photos si besoin).

## Tableau de bord retravaillé — 2026-07-27 (même jour)

Dernière page pas encore reprise cette session (`DashboardSection.tsx`, resté au style d'origine du POC). Demande d'Ethan : garder les 4 tuiles de stats existantes (`StatTile`), réfléchir à ce qui est réellement utile en arrivant sur l'admin. Proposition faite avec 3 options (derniers messages, commandes à traiter, alerte stock faible) — les 3 retenues par Ethan, l'idée commune étant de remplacer les compteurs secs par du contenu actionnable.

- **Derniers messages** : aperçu des 3 plus récents (nom, extrait tronqué, date), lien "Voir tout" vers Messages. Toujours affiché (indépendant du module Catalogue).
- **Commandes à traiter** (si Catalogue actif) : commandes au statut `pending` uniquement (jusqu'à 3), client + montant + date, lien vers Commandes. Message rassurant explicite si aucune en attente plutôt qu'une liste vide muette.
- **Stock faible** (si Catalogue actif) : produits avec stock ≤ 3 (`LOW_STOCK_THRESHOLD`), triés du plus critique au moins critique, carte orange distincte pour se démarquer visuellement des cards neutres. **Décision volontaire** : la section entière disparaît s'il n'y a aucun produit en stock faible plutôt que d'afficher un encart "tout va bien" — une alerte vide n'a pas d'intérêt et ajoute du bruit. Chaque ligne pointe directement vers la fiche produit (`/admin/{id}/products/{productId}`, la nouvelle page créée plus tôt dans la session).
- Layout : Messages + Commandes côte à côte (`lg:grid-cols-2`) quand Catalogue est actif ; Messages seul en pleine largeur sinon (pas de colonne vide à côté). La card "Mon site" existante redescend en bas de page (elle reste utile mais moins urgente que du contenu actionnable).

Testé (CDP) : rendu complet avec Catalogue actif (tenant historique — alerte stock faible sur 2 produits, 2 commandes en attente avec noms clients réels, messages affichés) ; rendu avec Catalogue inactif (Boulangerie Dupont — sections Catalogue absentes proprement, Messages en pleine largeur, pas d'espace vide). `tsc -b` propre.

## Palette appliquée aux modules, "Moderne" renommé "Helios", footer établissement — 2026-07-28

Suite de la reprise de design des templates (voir `docs/10-templates.md` pour le détail complet, section datée du 2026-07-28). Trois chantiers demandés par Ethan pour continuer le travail engagé sur Hestia, traités dans un ordre différent de celui demandé (palette→modules d'abord, pour ne redessiner Helios qu'une fois avec le mécanisme déjà en place) :

- **Palette appliquée aux modules** : remise en cause assumée de la règle "un template ne restyle jamais un module" — `ContactSection`, `MapsSection`, `BlogSection`, `CatalogueSection` (+ `CartDrawer`) recevaient jusqu'ici la charte etnof-web en dur (vert, dégradé bleu-vert, navy), ce qui faisait ressembler le site public d'un client au site de l'agence. Chaque module reçoit désormais une prop `palette: { accent, background, ink }`, redéclarée localement dans chaque fichier (pas de type partagé importé, pour garder les modules isolés).
- **"Moderne" → "Helios"** (dieu du soleil, nom choisi par Ethan parmi 3 pistes proposées) : même mécanique de renommage que Hestia (backend `KnownTemplateIds`/`KnownPalettesByTemplate`, frontend `useTemplate.ts`/`registry.ts`/`PublicSite.tsx`, fichier `TemplateModerne.tsx` → `TemplateHelios.tsx`). 3 palettes solaires (Zénith défaut, Aurore, Couchant). Mise en page retravaillée, pas juste recolorée : navbar pleine largeur sombre, hero en dégradé diagonal, frise "rayons de soleil" (signature visuelle, parité avec la frise en méandre grec d'Hestia), carte CTA "Offre du moment" qui chevauche désormais le bas du hero. Aucun tenant n'était sur `"moderne"` en base, pas de migration de données nécessaire.
- **Footer établissement** : nouveau composant partagé `SiteFooter.tsx` (nom, adresse, téléphone, email, horaires jour par jour), remplace le lien "Administration" isolé sur les deux templates.

Testé : `dotnet build`/`tsc -b` propres (le process `Backend.exe` du précédent lancement verrouillait le premier build — même aléa que documenté le 2026-07-27, backend relancé après coup) ; cycle `PUT`/`GET` `/api/t/{id}/admin/template` avec `helios` + ses 3 palettes (dont rejet 400 d'une palette invalide) ; rendu vérifié par capture d'écran (Chrome headless piloté en CDP, script réécrit en scratchpad car non versionné, avec contournement de l'écran de login admin par injection `sessionStorage`) — hero dégradé + frise + carte CTA chevauchante sur les 3 palettes Helios, modules recolorés (plus aucune couleur etnof-web visible) sur Hestia **et** Helios, footer avec établissement + horaires affiché sur les deux templates, card "Helios" avec ses 3 pastilles visible dans le sélecteur admin. Les deux tenants de test (Boulangerie Dupont, tenant historique) restaurés à leur état d'avant-test à la fin de session.

Images de preview Helios (`helios-zenith.png`, `helios-aurore.png`, `helios-couchant.png`) générées dans la foulée par capture d'écran du rendu réel (`moderne.png`, obsolète, supprimé) — à remplacer par Ethan par ses propres captures, comme pour Hestia.

## Contenu de Hestia : sections Établissement/Horaires, mise en page en bandes alternées — 2026-07-28 (même jour)

Après avoir repris le style des templates, Ethan attaque le **contenu** affiché publiquement, un template à la fois — Hestia d'abord. Détail complet dans `docs/10-templates.md`, section datée du même jour. Trois demandes :

- Une section **Horaires** dédiée, à la place des horaires dans le footer (ajoutés la session précédente sans être gardés par le module `horaires` — incohérence corrigée au passage : le module `horaires` gate explicitement l'affichage public d'après son `module.meta.json`, pas seulement l'onglet admin).
- Une section **Photos + description de l'établissement**, juste sous le hero — nouveau hook `useEstablishmentImages.ts` consommant un endpoint déjà public mais jusque-là seulement utilisé côté admin.
- Un **fond alterné** d'une section à l'autre, et **plus de largeur** partout (`max-w-3xl` → `max-w-5xl`, aligné sur Helios).

Réalisé en restructurant Hestia en **bandes pleine largeur** (composant interne `Band`), chaque section visible alternant `palette.background`/blanc — calculé dynamiquement selon ce qui s'affiche réellement (pas de créneaux fixes). Le hero et le bloc modules restent volontairement sur `palette.background` fixe (les modules ont déjà leurs propres cartes blanches, sans contraste possible sur une bande blanche). Sur les cas où une carte se retrouve sur une bande déjà blanche (offres), l'ombre est remplacée par une bordure légère pour rester visible.

Testé : `tsc -b` propre ; rendu vérifié par capture d'écran sur le tenant historique (photos réelles, horaires configurés — bandes alternées, section Établissement et Horaires bien en place, carte d'offre bordée sur bande blanche) et sur "Boulangerie Dupont" (aucune de ces sections n'a de contenu — toutes masquées proprement) ; footer partagé avec Helios vérifié sans horaires (Helios non retouché ce chantier, comme demandé).

**Aléa de session, sans gravité** : entre deux tours de conversation, le tenant historique s'est retrouvé sur la palette Argile au lieu d'Olivier — très probablement Ethan testant lui-même le sélecteur (recommandé en fin de session précédente), pas une régression du code. Choix laissé tel quel, pas de retour en arrière dessus (même principe déjà appliqué à plusieurs reprises dans ce fichier quand Ethan teste en direct).

**Deux ajustements demandés juste après, même session** : lien "Administration" retiré du footer partagé (site public ne renvoie plus vers `/admin`) ; slider horizontal (scroll-snap CSS natif, sans librairie) pour la section Photos au-delà de 3 images, grille statique conservée en dessous de ce seuil. Détail dans `docs/10-templates.md`.

## Maquette Claude Design portée sur Hestia — 2026-07-28 (même jour)

Ethan a fait faire une maquette d'Hestia via Claude Design (`claude.ai/design`) et a demandé de la porter dans le vrai code — lue via l'outil `DesignSync` (lecture seule, pas d'écriture dans le projet de maquette). Détail complet dans `docs/10-templates.md`. Deux points tranchés avant de coder (`AskUserQuestion`) : ajout de Google Fonts (Poppins + JetBrains Mono, première police externe réellement chargée dans le projet, scopée à Hestia via injection dynamique — jamais dans `index.html`) ; cartes Blog allégées (titre + date seulement, pas d'extension du modèle de données).

Principaux changements : nouvelle frise en blocs pleins (`MeanderDivider`, remplace le filet SVG) ; titre du hero agrandi ; galerie/horaires/offres restylées (cartes à bordure, flèches de slider blanches) ; footer Hestia en fond sombre (`SiteFooter` gagne une prop `dark`, Helios inchangé) ; petites retouches partagées avec Helios sur les modules (labels de formulaire, badge de stock en pilule, libellé Maps, cartes Blog avec date).

Testé : `tsc -b` propre ; rendu vérifié sur les deux tenants et re-vérifié sur Helios (aucune régression, pas de fond sombre ni de police Poppins forcés en dehors d'Hestia).

---

## Module Avis Google — 2026-07-28 (même jour)

Suite de `docs/12-plan-modules-restants.md` : troisième module de la catégorie A après RDV et Newsletter. Avant de coder, vérification explicite du coût réel de l'API Google Places pour le champ `reviews` (règle 5 de `CLAUDE.md`) — SKU payant "Enterprise + Atmosphere" (~25-40$/1000 appels après un quota gratuit de 1000/mois), contrairement au reste de l'intégration Google Places du projet (Horaires/Établissement) qui n'utilise que des champs gratuits. Décision prise avec Ethan (deux questions posées) : le module part quand même, mais avec récupération **manuelle** depuis le back-office (jamais automatique) pour garder le volume d'appels quasi nul, et le client choisit ensuite quels avis afficher parmi ceux récupérés.

- `modules/avis-google/` : entités `GoogleReviewSettings` (fiche Google liée + instantané de note globale, une ligne par tenant) et `GoogleReview` (miroir en lecture seule de chaque avis, upsert par `GoogleTime` — l'horodatage Google sert de clé naturelle pour préserver le choix `Selected` du client d'une actualisation à l'autre). Endpoints admin isolés dans `AvisGoogleAdminEndpoints.cs` (recherche réutilise l'endpoint gratuit existant de `GooglePlacesEndpoints.cs`, mais l'appel `reviews` a son propre fichier pour ne jamais faire payer les autres appelants du endpoint `/details` partagé) : lier une fiche, actualiser à la demande, lister les avis, choisir ceux affichés (toggle instantané, pas de dirty-check). Endpoint public gaté par le module, ne renvoie que les avis sélectionnés.
- Admin : nouvelle page `/admin/{clientSiteId}/avis-google` (recherche Google façon Établissement, carte de résumé avec note/nombre d'avis, liste des avis avec toggle "Affiché"/"Masqué"). Widget public (note moyenne + avis sélectionnés, masqué si aucun avis choisi) branché sur Hestia et Helios.
- **Aléa de test découvert en cours de route** : la Tour Eiffel (premier lieu testé) renvoie une note/un total d'avis mais **aucun avis individuel**, sur la légacy comme sur la New Places API — vérifié que ce n'est ni un bug du code ni un problème de clé/quota (la Statue de la Liberté, testée dans la foulée avec la même clé et le même code, renvoie ses avis normalement). Cause probable : restriction Google spécifique à ce lieu (contenu très exposé/signalé), pas un problème du projet.

Testé (curl direct sur l'API Google pour isoler la cause de l'aléa ci-dessus, puis CDP/Chrome headless pour l'UI) sur le tenant historique : liaison à une fiche réelle (Statue de la Liberté) → note/nombre d'avis + 5 avis récupérés avec photos/texte réels ; sélection de 2 avis → widget public les affiche (et eux seuls), avec note moyenne et étoiles ; actualisation → les 5 avis conservent leur état `Selected` (upsert par `GoogleTime` confirmé) ; second tenant (Boulangerie Dupont, module jamais autorisé) → 404 public et page admin bloquée avec message, nav sans l'entrée "Avis Google" (isolation confirmée). Build backend (`dotnet build`) et frontend (`tsc -b` + `vite build`) propres. Données de test (fiche liée + avis) supprimées après vérification ; module laissé **autorisé et activé** pour le tenant historique, pour qu'Ethan puisse lier sa propre fiche directement.

Icône du module déposée dans la foulée (`frontend/public/module-icons/avis-google.png`, générée par Ethan avec le prompt de `docs/11-images-modules.md`), référencée dans `MODULE_IMAGES` (`ModulesSection.tsx`).

**Reste à faire par Ethan** : lier son propre établissement depuis `/admin/{clientSiteId}/avis-google` et choisir les avis à afficher ; tarif (100€) à renseigner dans le panneau "Tarifs des modules" de `/admin/dashboard`.

---

## Module WhatsApp — 2026-07-28 (même jour)

Quatrième module de la catégorie A (`docs/12-plan-modules-restants.md`), après RDV, Newsletter et Avis Google. Pas de dépendance externe payante ici (un lien `wa.me` est libre-service), donc pas de blocage règle 5 — mais deux choix de conception soumis à Ethan avant de coder (`AskUserQuestion`) : couleur du bouton flottant, et message pré-rempli fixe ou configurable.

- **Couleur** : vert WhatsApp officiel (`#25D366`) + icône reconnaissable, plutôt que la palette du template — décision assumée à contre-courant du principe "un module hérite de la palette du tenant" posé lors de la refonte Hestia/Helios (`docs/10-templates.md`) : un CTA WhatsApp doit rester identifiable au premier coup d'œil, contrairement à Contact/Maps/Blog/Catalogue qui n'ont pas d'identité de marque universelle à préserver.
- **Message pré-rempli configurable** : nouveau champ `message` (en plus de `phoneNumber`) dans `ModulesConfigJson.whatsapp`, exposé via `MODULE_FIELDS` (`ModulesSection.tsx`) — même mécanisme générique que `maps.apiKey`, aucun code backend supplémentaire nécessaire.
- **Module 100% frontend** (`modules/whatsapp/`, un seul fichier `WhatsAppButton.tsx` + `.config.ts`) : comme Maps, `ModuleRegistry`/`ModuleMetaRegistry`/l'endpoint générique `PUT /admin/modules/{name}/config` couvrent déjà tout, `Program.cs` n'a rien à mapper. Le numéro est nettoyé (chiffres uniquement) avant de construire le lien `wa.me/{numero}?text=...`.
- **Bouton flottant hors du flux de contenu** (pas une section qu'on scrolle, pas de lien de nav/ancre) : positionné `fixed bottom-6 left-6`, symétrique au bouton "Panier" du module Catalogue (`fixed bottom-6 right-6`) pour ne jamais se chevaucher quand les deux modules sont actifs en même temps.

Testé (curl pour la config/l'isolation, CDP/Chrome headless pour le rendu) sur le tenant historique : bouton visible et fixe au scroll sur Hestia et sur Helios (bascule temporaire de template pour vérifier, restauré à Hestia/Olivier après coup) ; lien `wa.me` recalculé manuellement à partir de la config et comparé au comportement attendu du composant (numéro nettoyé, message encodé) ; second tenant (Boulangerie Dupont, module jamais autorisé) → absent de `GET /config/modules`, donc bouton non rendu. Build backend inchangé (aucun fichier backend ajouté), `tsc -b` et `vite build` propres (chunk `WhatsAppButton` bien scindé).

**Reste à faire par Ethan** : renseigner le numéro WhatsApp et le message depuis `/admin/{clientSiteId}/modules` (card WhatsApp) ; tarif (90€) à renseigner dans le panneau "Tarifs des modules" de `/admin/dashboard` ; générer l'icône du module (prompt prêt dans `docs/11-images-modules.md`), la card retombe sur le fallback lettre "W" en attendant.

---

## Module Paiement Stripe, retrait du paiement sur place, abandon de PayPal — 2026-07-29

Suite de `docs/12-plan-modules-restants.md` : Ethan a tranché sur les paiements en ligne restants — PayPal abandonné (pas construit), Chat IA et FAQ IA mis de côté pour l'instant (pas abandonnés, juste dépriorisés), seul Stripe est retenu. Avant de coder, modèle d'intégration discuté et validé avec Ethan (`AskUserQuestion`) : **compte Stripe propre à chaque client** plutôt que Stripe Connect (marketplace) — chaque tenant crée son propre compte sur stripe.com, fournit sa propre clé secrète + son propre secret de webhook, l'argent va directement sur son compte, jamais sur un compte agence. Écarté Connect (commission automatique possible mais approbation "plateforme" + onboarding/KYC des clients à gérer) car le modèle économique d'Ethan facture le module une fois, pas une commission par vente — Connect aurait résolu un problème qu'il n'a pas (règle 7 de `CLAUDE.md`).

Puis demande explicite d'Ethan : retirer le paiement sur place du module Catalogue, ne garder que Stripe comme moyen de finaliser une commande.

- **`modules/stripe/`** (package NuGet `Stripe.net` ajouté) : `POST /stripe/checkout` valide le panier/stock (lecture seule, pas de décrément) et crée une session Stripe Checkout hébergée (pas de Stripe.js côté client — le backend renvoie juste l'URL de la session, le frontend redirige `window.location.href`) ; `POST /stripe/webhook` vérifie la signature Stripe puis crée réellement la commande (`checkout.session.completed`) ; `GET /stripe/session/{id}` sert à afficher une confirmation sur la page de retour sans dépendre du webhook (qui peut arriver après la redirection du navigateur).
- **Aucune commande n'est créée avant confirmation du paiement** : le panier est reporté dans les métadonnées de la session Stripe (JSON des lignes), pas dans une ligne `Order` en base — décision volontaire pour ne jamais décrémenter de stock sur un paiement abandonné (contrairement à l'ancien flux "paiement sur place" qui décrémentait immédiatement). `Order` gagne `StripeSessionId` (migration `AddStripeModule`), nullable, qui sert de clé d'idempotence : Stripe peut renvoyer le même événement de webhook plusieurs fois.
- **Limite assumée** : si le stock s'épuise entre la création de la session et la confirmation du paiement (ex. deux clients sur le dernier exemplaire), la commande est quand même créée (le client a payé, impossible d'annuler silencieusement) et le stock est simplement ramené à 0 plutôt que rendu négatif — cas de survente à traiter manuellement par le client, jugé rare pour un site vitrine local (voir `docs/12-plan-modules-restants.md`).
- **Secrets isolés dans une table dédiée** (`StripeSettings`, une ligne par tenant) plutôt que dans `ClientSite.ModulesConfigJson` comme les autres champs de config module (ex. `maps.apiKey`) : ce JSON est renvoyé tel quel par l'endpoint **public** `/api/t/{clientSiteId}/config/modules` (lu par `useModules()` sur le site public par n'importe quel visiteur) — une clé secrète Stripe ou un secret de webhook n'ont rien à y faire. Nouveaux endpoints admin isolés (`StripeAdminEndpoints.cs`, authentifiés `TenantAdminAuth`, jamais publics) pour lire/écrire ces deux valeurs.
- **Retrait du paiement sur place** : l'ancien `POST /catalogue/checkout` (créait une commande immédiatement, sans encaissement réel) supprimé de `CatalogueModule.cs`. `CartDrawer.tsx` ne crée plus de commande directement — il appelle `/stripe/checkout` et redirige vers Stripe ; le panier n'est vidé qu'au retour en cas de succès (pas au moment du clic), pour qu'un client annulant sur la page Stripe retrouve son panier intact. Si le module Stripe n'est pas actif pour le tenant, le formulaire de checkout est remplacé par un message ("paiement en ligne pas encore disponible") plutôt que masqué — le panier reste consultable.
- **Retour sur le site public** (`CatalogueSection.tsx`) : nouveau composant `CheckoutReturnBanner`, lit `?checkout=success|cancel` dans l'URL au montage, affiche une confirmation (avec le montant réellement payé, récupéré via `/stripe/session/{id}`) ou un message d'annulation, puis nettoie l'URL (`history.replaceState`) pour ne pas re-déclencher le message à un rechargement.
- **Nouvelle page admin** `/admin/{clientSiteId}/stripe` (`StripeSection.tsx`, nav "Paiement Stripe") : deux champs (clé secrète, secret de webhook), plus l'URL du webhook à créer côté Stripe affichée en clair pour copier-coller. Gatée comme les autres modules (invisible si non autorisé/activé).
- **Aléa d'environnement, sans rapport avec le code** : le port 5432 était occupé par le conteneur Postgres d'un autre projet d'Ethan (`premierclic-db-1`) plutôt que celui d'etnof-cms (`etnof-postgres`, arrêté) — confirmé avec Ethan avant d'arrêter l'autre conteneur pour appliquer la migration.

**Bug trouvé et corrigé pendant les tests** : `EventUtility.ConstructEvent` de Stripe.net rejette par défaut un événement dont le champ `api_version` ne correspond pas exactement à celui figé dans le SDK (`throwOnApiVersionMismatch: true` implicite) — repéré via un `NullReferenceException` sur un événement de test sans ce champ, mais le risque est réel avec de vrais comptes Stripe : rien ne garantit que la version d'API de chaque tenant coïncide avec celle du SDK utilisé ici. Fix : `throwOnApiVersionMismatch: false` explicite — seule la signature (secret du tenant) doit faire foi, jamais un écart de version.

Testé : `dotnet build` et `tsc -b` propres ; migration `AddStripeModule` appliquée (colonne `Orders.StripeSessionId` + table `StripeSettings`). Signature de webhook vérifiée en simulant un vrai appel Stripe (HMAC-SHA256 calculé à la main dans un script Node, même algorithme que `Stripe-Signature`) plutôt qu'avec un vrai compte Stripe (aucune clé réelle disponible dans cet environnement) : signature invalide → 400, signature valide → 200 + commande créée + stock décrémenté (32€, produit "Coffret decouverte") ; rejouer le même `session.id` → 200 sans deuxième commande (idempotence confirmée). Isolation vérifiée entre les deux tenants : `Boulangerie Dupont` (Stripe jamais autorisé) → 404 sur `/stripe/checkout` et `/admin/stripe/settings` accessible mais vide ; tenant historique sans clé secrète configurée → 400 explicite ("paiement non configuré"), jamais un 500 ; avec une fausse clé → 502 avec le message d'erreur Stripe. Rendu vérifié par capture d'écran (Chrome headless piloté en CDP, script réécrit en scratchpad car non versionné) : page admin `/admin/{id}/stripe` correcte, panier public affichant bien "Payer par carte" une fois le module activé. Données de test (commande, client, config Stripe factice) supprimées après vérification ; module Stripe laissé **autorisé et activé** pour le tenant historique (sans clé configurée), pour qu'Ethan puisse y coller directement ses propres identifiants.

**Reste à faire par Ethan** : créer un vrai compte Stripe (mode test pour commencer), configurer la clé secrète + le webhook depuis `/admin/{clientSiteId}/stripe`, tester un paiement réel de bout en bout. Le [Stripe CLI](https://stripe.com/docs/stripe-cli) (`stripe listen --forward-to ...`) est le moyen recommandé pour tester le webhook en local sans exposer publiquement la machine. Tarif (350€) à renseigner dans `/admin/dashboard`.

---

## Bug corrigé : page admin Avis Google bloquée sur "Chargement…", et reconnaissance automatique de la fiche liée depuis Établissement — 2026-07-29 (même jour)

Signalé par Ethan avec capture d'écran : `/admin/{clientSiteId}/avis-google` restait bloquée sur "Chargement…" pour tout tenant n'ayant jamais lié de fiche (aucune ligne `GoogleReviewSettings`).

**Cause** : `Results.Ok(null)`/`Results.Json(null)` (endpoint `GET /admin/avis-google/settings`) écrivent un corps de réponse **vide** plutôt que le JSON littéral `"null"` — comportement des typed results d'ASP.NET Core, indépendant de l'helper utilisé. Le frontend (`AvisGoogleSection.tsx`) appelle `res.json()` sans filet ; parser un corps vide lève une exception silencieuse (pas de `.catch()`), donc `loaded` ne passe jamais à `true`. Fix : `Results.Text("null", "application/json")` force l'écriture du littéral.

**Demande complémentaire d'Ethan dans la foulée** : s'il a déjà lié sa fiche Google depuis la page **Établissement** (recherche gratuite, `EstablishmentSection.tsx`), la page Avis Google devrait le reconnaître directement (résumé + bouton "Actualiser") plutôt que de redemander une recherche. Problème identifié avant de coder : la recherche d'Établissement ne conservait jusqu'ici **aucun identifiant de fiche** en base (juste des champs texte préremplis) — le lien Avis Google (son propre `PlaceId`) est un mécanisme volontairement indépendant, justement pour ne jamais déclencher l'appel payant "reviews" ailleurs que sur un clic explicite. Décision validée avec Ethan (`AskUserQuestion`) : mémoriser le `PlaceId`/nom au niveau de l'établissement (partagé entre modules), sans jamais que ce partage ne déclenche l'appel payant tout seul.

- `SiteContent` gagne `GooglePlaceId`/`GooglePlaceName` (migration `AddSiteContentGooglePlace`), remplis par `EstablishmentSection.tsx` au choix d'une fiche dans sa recherche (persistés seulement au clic "Enregistrer", comme les autres champs de la page — même dirty-check). Les deux autres appelants du `PUT /admin/content` partagé (`SiteSection.tsx`, `OffersSection.tsx`) mis à jour pour échoer ces deux champs, sinon un enregistrement depuis ces pages les aurait silencieusement effacés (piège déjà rencontré plusieurs fois sur cet endpoint, voir plus haut dans ce fichier).
- `AvisGoogleAdminEndpoints.GET /settings` : si aucune ligne `GoogleReviewSettings` n'existe, retombe sur `SiteContent.GooglePlaceId/GooglePlaceName` et renvoie un objet **virtuel** (note/nombre d'avis/date à `null`, jamais persisté) — la page affiche directement la vue "configuré" (résumé + boutons), sans aucun appel payant.
- `POST /refresh` : si appelé sans ligne existante, la crée à la volée à partir de `SiteContent.GooglePlaceId` (même logique que `/link`) puis fetch — c'est ce clic explicite, jamais un chargement de page, qui déclenche pour la première fois l'appel payant.

Testé : migration appliquée ; `dotnet build`/`tsc -b` propres. `GET /settings` sur le tenant historique (sans ligne réelle, `SiteContent.GooglePlaceId` posé en base pour le test) → objet virtuel renvoyé, aucune ligne `GoogleReviewSettings` créée par la seule lecture (confirmé par requête directe) ; `POST /refresh` → ligne réelle créée + 5 avis récupérés (test avec la Statue de la Liberté, déjà utilisée pour valider ce module le 2026-07-28) ; rendu vérifié par capture d'écran (résumé note/avis + liste avec toggle Affiché/Masqué, boutons "Changer d'établissement"/"Actualiser les avis" en header). Données de test supprimées et `SiteContent.GooglePlaceId` du tenant historique remis à vide après vérification.

---

## Un module actif mais pas configuré ne s'affiche plus sur le site public — 2026-07-29 (même jour)

Signalé par Ethan avec deux captures d'écran : le module RDV, activé mais sans aucun jour actif dans le planning hebdomadaire, affichait quand même sa section "Réserver un créneau" sur le site public (avec "Aucun créneau disponible pour le moment.") — alors qu'il n'y a jamais eu de configuration réelle. Même souci de principe pour Maps (déjà partiellement traité : un encart "clé manquante" s'affichait à la place de la carte). Demande : un module actif mais dont les données requises ne sont pas remplies ne doit rien afficher du tout côté public, pas un encart vide ou une invite à configurer (ce message n'a de sens que côté admin).

- **Maps** (`MapsSection.tsx`) : retourne `null` au lieu de l'encart "aucune clé renseignée" quand `apiKey` est vide.
- **RDV** : distinction ajoutée entre "jamais configuré" (aucun jour actif dans `RdvSchedule.WeekdayRulesJson`) et "configuré mais temporairement complet" (tous les créneaux du planning sont déjà réservés) — ces deux cas n'ont pas la même valeur informative pour un visiteur. `GET /rdv/slots` renvoie maintenant `{ configured, slots }` au lieu d'un simple tableau ; `RdvSection.tsx` ne rend plus rien si `configured` est `false`, mais garde "Aucun créneau disponible pour le moment" si le planning est réel mais complet.
- **Déjà correct sans changement** (vérifié à cette occasion) : Blog/Catalogue se masquent déjà s'il n'y a aucun article/produit ; Avis Google se masque déjà si aucun avis n'est sélectionné ; Horaires ne s'affiche déjà que si au moins un jour a des horaires renseignés ; WhatsApp se masque déjà si le numéro est vide (`WhatsAppButton.tsx` avait déjà ce garde-fou).

Testé : `dotnet build`/`tsc -b` propres ; `GET /rdv/slots` sur le tenant historique (planning jamais configuré, capture d'écran d'Ethan) → `{"configured":false,"slots":[]}` ; rendu du site public vérifié (recherche du texte "Réserver un créneau" dans la page → absent).

---

## Admin Blog (créer/éditer/publier/supprimer un article) — 2026-07-29 (même jour)

Ethan a remarqué qu'un article ("Premier article") s'affichait sur le site public sans se souvenir de l'avoir créé — en creusant, le module Blog (Phase 4 du POC) n'avait jamais eu d'interface d'administration : seul l'affichage public (liste + détail, lecture seule) avait été construit, l'article visible était un reliquat du seed de démonstration inséré directement en base pendant les tests de la Phase 4. Décision (deux options proposées, `AskUserQuestion`) : construire cette admin plutôt que laisser le module tel quel.

- **Backend** : `BlogPost` gagne `CreatedAt` (migration `AddBlogPostCreatedAt`, backfill depuis `PublishedAt` sinon l'instant présent pour les articles déjà en base). Nouveau `modules/blog/backend/BlogAdminEndpoints.cs` : liste (triée par `CreatedAt`), lecture d'un article, création (brouillon vide "Nouvel article" avec slug auto-généré, pas de formulaire de création séparé), modification (titre/slug/contenu/publié), suppression. Génération de slug maison (accents retirés, minuscule, tirets, désambiguïsation par suffixe numérique en cas de collision) — pas de dépendance ajoutée. Republier un article déjà publié une fois ne rajeunit pas sa date d'origine ; repasser en brouillon efface `PublishedAt` (cohérent avec l'endpoint public existant : `PublishedAt != null` = publié).
- **Piège rencontré pendant la migration** : Npgsql traduit `DateTime.MinValue` (valeur par défaut EF pour la nouvelle colonne `NOT NULL`) en sentinelle Postgres `'-infinity'`, pas en littéral `'0001-01-01'` — le premier backfill écrit avec cette hypothèse n'a rien mis à jour ; corrigé (SQL de la migration + données déjà appliquées).
- **Frontend** : nouvelle page `/admin/{clientSiteId}/blog` (`BlogSection.tsx`, tableau recherche/tri/pagination — même pattern que Commandes/Messages) et fiche d'édition dédiée `/admin/{clientSiteId}/blog/{postId}` (`BlogPostDetailPage.tsx`, même construction que `ProductDetailPage.tsx` : dirty-check, bouton Enregistrer, suppression avec `ConfirmModal`). Nav "Blog" ajoutée (icône `IconDocument`, déjà présente mais inutilisée), gatée sur `modules.blog.enabled` comme les autres entrées de module.

Testé (curl + CDP/Chrome headless) sur le tenant historique : création d'un brouillon → redirection immédiate vers sa fiche ; édition + case "Publié" cochée → apparaît sur `GET /blog/{slug}` public ; décochée → 404 public immédiat ; suppression (modal de confirmation) → retour à la liste, article disparu de la base. Les deux articles d'origine (Phase 4 : "Premier article" publié, "Brouillon non publié") retrouvés intacts après le test. Build backend et `tsc -b` propres.

---

## Facturation & devis de l'agence (CompanyProfile, BillingClient, Quote, Invoice) — 2026-07-30

Demandé par Ethan : automatiser la création des devis/factures qu'il envoie à ses propres clients etnof-web (pas un module vendu aux clients tenants — voir `docs/13-facturation-devis.md` pour la recherche juridique complète et `docs/07-admin-global.md` pour le détail de la section admin). Recherche + décisions de portée validées avec Ethan avant tout code (plan approuvé), puis construit étape par étape le même jour :

1. **Config entreprise** (`CompanyProfile`, une seule ligne) : SIRET, adresse, mention TVA, IBAN, mention pénalités de retard, lien CGV, logo (upload, même pattern que `EstablishmentImage`).
2. **Clients de facturation** (`BillingClient`) : lien facultatif vers un `ClientSite` existant, ou prospect/prestation hors plateforme.
3. **Devis** (`Quote`) : lignes libres, PDF (nouvelle dépendance NuGet **QuestPDF**, licence Community gratuite, approuvée par Ethan avant ajout — règle 5 de `CLAUDE.md`), passage "envoyé", puis acceptation par le client via un lien public **sans authentification** (`/devis/{id}`) — signature électronique simple (nom/email/IP capturés).
4. **Factures** (`Invoice`) : créées manuellement ou depuis un devis accepté (acompte/solde/facture unique). Numéro légal (`2026-0001`) attribué uniquement à la **finalisation** (jamais à la création en brouillon), pour respecter l'obligation de séquence chronologique sans trou — une facture finalisée est verrouillée (`IsFinalized`), seule l'annulation reste possible ensuite.

Nouvelle page `/admin/dashboard/facturation` (`AgencyBillingPage.tsx`, 4 onglets), accessible depuis un lien sur `/admin/dashboard` — même auth agence que le reste (`AdminAuth`), pas de nouveau mécanisme d'authentification.

Testé (curl, migrations EF Core appliquées une à une) : devis créé (2 lignes) → PDF valide généré à la volée → passé "envoyé" → accepté via le lien public sans aucun header d'auth (nom/email/IP capturés) → facture d'acompte créée depuis le devis accepté, finalisée → `Number = "2026-0001"` → facture de solde créée et finalisée → `Number = "2026-0002"` (séquence continue confirmée) → modification/suppression refusées après finalisation (400) → marquage payée → PDF facture valide (mentions légales incluses). `dotnet build` et `tsc -b` propres après chaque étape.

**Reste à vérifier par Ethan dans le navigateur** (pas d'outil de capture d'écran dans cet environnement) : remplir la config entreprise avec les vraies infos etnof-web, tester le flux complet visuellement, notamment le lien public d'acceptation en navigation privée. Un client de facturation et deux factures de test (`2026-0001` payée, `2026-0002`) restent en base — laissés comme données d'exemple, à supprimer ou garder au choix d'Ethan (la facture finalisée ne peut être supprimée, seulement annulée).

---

## Paiement en ligne Stripe sur les factures de l'agence — 2026-07-30 (même jour)

Suite immédiate de la facturation ci-dessus : Ethan veut que ses clients paient ses factures en ligne, argent versé sur son propre compte Stripe (question de légalité posée et répondue avant de coder — voir `docs/13-facturation-devis.md`). Repris à l'identique le pattern du module Stripe tenant (`modules/stripe/`) mais au niveau agence :

- `AgencyStripeSettings` (singleton, comme `CompanyProfile`) + `Invoice.StripeSessionId` (idempotence webhook, migration `AddAgencyStripePayment`).
- `backend/InvoicePaymentEndpoints.cs` : `GET /api/public/invoices/{id}` (jamais un brouillon), `POST /api/public/invoices/{id}/checkout` (session Stripe Checkout, refuse si facture non `sent` ou déjà payée), `POST /api/public/invoices/stripe-webhook` (marque `paid` sur `checkout.session.completed`, idempotent).
- Frontend : 5e onglet "Paiement" dans `AgencyBillingPage.tsx` (clé secrète + secret webhook, calqué sur `StripeSection.tsx`), page publique `/facture/{id}` (`InvoicePublicPage.tsx`, bouton "Payer en ligne", poll léger au retour de Stripe).

Testé (curl) : auth agence sur la config (401 sans mot de passe) ; paiement refusé sur facture déjà payée, sur un brouillon (jamais public, 404), et tant qu'aucune clé Stripe n'est configurée (400 explicite dans chaque cas). `dotnet build`/`tsc -b` propres. **Testé ensuite de bout en bout avec le vrai compte Stripe d'Ethan** (voir entrée suivante) : clé restreinte créée en mode test (`Checkout Sessions: écriture` uniquement, pas la clé standard partagée avec son autre projet Fidélité Pro Plus), `stripe login` + `stripe listen --forward-to localhost:5052/api/public/invoices/stripe-webhook` en local pour recevoir le webhook (pas de déploiement public pour l'instant), paiement réel avec une carte de test Stripe → facture passée à "Payée" automatiquement, confirmé côté base et dans les logs du listener.

## Email de confirmation de paiement (Brevo) — 2026-07-30 (même jour)

Juste après avoir validé le paiement Stripe de bout en bout, Ethan a demandé un email de confirmation automatique au client (avec la facture en PDF) dès qu'une facture est payée. Nouvelle dépendance externe signalée et confirmée : **Brevo**, déjà utilisé par Ethan sur son autre projet, expéditeur `etnofweb@gmail.com`.

- `AgencyEmailSettings` (singleton, clé API Brevo) + `Invoice.ConfirmationEmailSentAt` (évite un double envoi si Stripe rejoue l'événement webhook), migration `AddAgencyEmailSettings`.
- `backend/BrevoEmailService.cs` : simple appel REST (`POST https://api.brevo.com/v3/smtp/email`), aucun SDK NuGet ajouté — réutilise `IHttpClientFactory` déjà enregistré (même pattern que `GooglePlacesEndpoints.cs`).
- Branché dans le webhook Stripe (`InvoicePaymentEndpoints.cs`) juste après le passage à "payée" : génère le PDF (réutilise `InvoicePdfDocument`, déjà utilisé par l'endpoint de téléchargement), envoie l'email avec la facture en pièce jointe. Tout le bloc est dans un `try/catch` : un échec Brevo ne fait jamais échouer la confirmation du paiement déjà enregistrée en base.
- Frontend : nouvelle section "Email de confirmation" dans le même onglet "Paiement" de `AgencyBillingPage.tsx` (clé API Brevo, rappel de vérifier que l'expéditeur est validé côté Brevo).

Déclencheur V1 : uniquement le paiement automatique confirmé par Stripe (pas le marquage manuel "payée", pas la confirmation de devis — à reprendre plus tard si besoin). `dotnet build`/`tsc -b` propres.

**Reste à faire par Ethan** : coller sa clé API Brevo dans l'onglet Paiement (idéalement une clé restreinte à l'envoi transactionnel si son plan Brevo le permet), puis rejouer un paiement de test pour vérifier que l'email arrive bien avec la facture en pièce jointe.

## Lignes de devis/facture depuis les tarifs (PackageOffer, TariffPicker) — 2026-07-30 (même jour)

Dernière demande d'Ethan de la session facturation : piocher rapidement une ligne de devis/facture depuis ses tarifs déjà connus (modules + formules de base), au lieu de tout retaper à la main à chaque fois.

- `PackageOffer` (nouvelle entité, liste — pas un singleton) : nom + prix libre, `SortOrder`. `GET /api/admin/package-offers` auto-seed les 3 formules connues (Essentiel 690€, Business 1090€, Sur mesure 1990€) si la table est entièrement vide, jamais re-seedé après une suppression manuelle — testé (suppression d'une formule → re-GET confirme qu'elle ne revient pas).
- 6e onglet **"Formules"** dans `AgencyBillingPage.tsx` : CRUD simple (nom, prix), même niveau que `BillingClientsPanel`.
- `TariffPicker` (composant partagé) : charge `PackageOffer` + `GET /api/admin/modules` (déjà utilisé par le panneau "Tarifs des modules" de `/admin/dashboard`), affiche un `<select>` groupé (Formules/Modules) à côté du bouton "+ Ajouter une ligne" dans les panneaux Devis et Factures — sélectionner un élément ajoute une ligne préremplie (désignation + prix converti en nombre, quantité 1). Modules sans prix renseigné filtrés (pas affichés).

Testé (curl) : seed automatique confirmé, CRUD complet sur `PackageOffer`. `dotnet build`/`tsc -b` propres. Une correction de bug a été faite au passage sur `InvoicePaymentEndpoints.cs`/`BrevoEmailService.cs` : le lien "Voir ma facture" de l'email de confirmation était codé en dur sur `localhost:5173` — remplacé par `Cors:AllowedOrigin` (config déjà existante, représente l'origine réelle du frontend), pour que le lien reste valide une fois le site déployé publiquement.

**Remise à zéro de la numérotation** : les tests de la session (2026-0001 à 2026-0006) ont été supprimés directement en base (client de facturation de test + devis + factures associés) à la demande d'Ethan, pour que sa première vraie facture soit bien `2026-0001`. Un brouillon d'exemple ("Client Demo (exemple)") a été laissé en base, volontairement non finalisé, pour illustrer le principe des lignes sans consommer de numéro — à supprimer ou finaliser au choix d'Ethan.

**Reste avant un usage réel** (non traité cette session) : déploiement public du site (les liens envoyés aux clients supposent une URL publique — `Cors:AllowedOrigin` doit être configuré en conséquence), bascule de la clé Stripe de test vers la clé live (`rk_live_...`, déjà créée mais pas encore reconfigurée) et création d'un vrai webhook Stripe (destination permanente dans le dashboard, à la place de `stripe listen` qui ne sert qu'aux tests locaux — penser à arrêter ce process une fois les tests terminés).

## Token de session admin (1h), remplace le mot de passe en clair par requête — 2026-07-31

Demandé par Ethan : empêcher qu'un client accédant à `/admin/{clientSiteId}` puisse se connecter à un autre compte client, et ajouter une expiration de session (~1h). Point 1 du bilan Phase 5 ("mot de passe... pas de session, pas de rate-limiting") en partie traité (session + expiration ; le rate-limiting sur le login reste à faire).

- `backend/AdminToken.cs` (nouveau) : token opaque signé HMAC-SHA256 (`base64url(payload).base64url(signature)`, pas de dépendance JWT ajoutée), payload `{scope, siteId?, exp}`. `scope:"agency"` = mot de passe agence, valide sur tous les tenants (passe-partout support, comportement inchangé). `scope:"tenant"` = lié au `ClientSite.Id` qui l'a émis, rejeté sur tout autre tenant. Expiration 1h, secret `Admin:TokenSecret` (config) — si absent, secret aléatoire généré en mémoire au démarrage (sessions invalidées à chaque redémarrage backend, acceptable vu la durée de vie courte).
- `AdminAuth.cs` / `TenantAdminAuth.cs` : ne comparent plus un mot de passe reçu en clair à chaque requête, valident le token `Authorization: Bearer <token>`. Les deux endpoints de login (`/api/admin/login`, `/api/t/{clientSiteId}/admin/login`) émettent désormais `{ token, expiresAt }` au lieu d'un simple `200 OK`.
- Frontend : `useAdminSession.ts` stocke `{token, expiresAt}` (au lieu du mot de passe brut) en `sessionStorage`, expire côté client dès que `expiresAt` est dépassé (retour à l'écran de login sans attendre un 401) ; `adminFetch` envoie `Authorization: Bearer` au lieu de `X-Admin-Password`. Les ~30 composants qui consomment la session n'ont pas changé (variable opaque déjà threadée en prop).
- Hors scope (signalé, pas fait à ce moment-là) : pas d'intercepteur global de 401 (un token expiré en cours d'appel n'est repris qu'au prochain rechargement) ; pas de rate-limiting sur le login (traité juste après, voir entrée suivante).

Testé : `dotnet build` et `tsc --noEmit` propres. **Reste à vérifier par Ethan dans le navigateur** : login sur `/admin/{clientSiteId}`, confirmer dans les devtools que la réponse de login contient `token`/`expiresAt` et que les requêtes suivantes envoient `Authorization: Bearer ...` ; copier ce token et l'utiliser (curl/Postman) contre un autre `clientSiteId` → doit renvoyer 401 ; le mot de passe agence doit toujours fonctionner sur n'importe quel tenant.

## Rate-limiting sur le login admin — 2026-07-31 (même jour)

Suite immédiate du token de session : dernier point du bilan Phase 5 ("pas de rate-limiting") traité.

- `Program.cs` : `AddRateLimiter`/`UseRateLimiter`, intégrés au framework ASP.NET Core depuis .NET 7 — aucune dépendance ajoutée (règle 5 de `CLAUDE.md`). Policy `"login"` : fenêtre fixe de 5 tentatives/minute, partitionnée par adresse IP (`HttpContext.Connection.RemoteIpAddress`), sans file d'attente (`QueueLimit: 0`) — une 6e tentative dans la minute reçoit immédiatement `429 Too Many Requests` plutôt que d'attendre.
- Appliquée aux deux endpoints de login (`.RequireRateLimiting("login")`) : `POST /api/admin/login` (`AgencyDashboardEndpoints.cs`) et `POST /api/t/{clientSiteId}/admin/login` (`TenantAdminEndpoints.cs`). Aucun autre endpoint n'est concerné (les endpoints déjà authentifiés sont protégés par le token, pas besoin d'y ajouter un rate-limit).
- Limite assumée : partition par IP seule (pas par tenant) — un attaquant distribué sur plusieurs IP contre un seul tenant n'est pas bloqué par ce mécanisme, seul un brute-force depuis une même machine l'est. Suffisant pour un starter-kit solo (règle 7, rester simple) ; à durcir (CAPTCHA, verrouillage de compte après N échecs) si un vrai incident de brute-force distribué est constaté un jour.

Testé : `dotnet build` propre. **Reste à vérifier par Ethan** : 6 tentatives de login rapprochées avec un mauvais mot de passe → les 5 premières renvoient 401, la 6e renvoie 429 ; après 1 minute sans nouvelle tentative, le login redevient possible normalement.

## Audit UI/UX + fix responsive mobile (sidebar admin, nav publique Hestia/Helios) — 2026-07-31 (même jour)

Ethan a demandé un tour d'ensemble de l'UI/UX (admin client + site public) avant de refaire du responsive/design. Audit fait par capture d'écran via Chrome headless piloté en CDP brut (`--remote-debugging-port`, script Node maison dans le scratchpad — toujours pas de Playwright disponible sur cette machine, voir notes précédentes). Un token agence (émis via l'API de login, voir entrée token de session ci-dessus) a servi à s'authentifier dans `sessionStorage` sans connaître le mot de passe réel d'un tenant.

**Constat le plus grave** : zéro règle responsive dans tout le projet (`grep md:hidden/lg:hidden/...` sur tout `frontend/src` → 0 résultat). Sur un viewport mobile (390px) :
- La sidebar admin (`AdminLayout.tsx`, largeur fixe `w-64`) prenait toute la largeur et poussait le contenu hors écran, illisible.
- La nav publique (Hestia et Helios, ligne `flex` sans retour à la ligne géré) débordait, le sélecteur de langue (FR/EN/ES) sortait complètement de l'écran.

Autre bug trouvé au passage (mineur) : sur `/admin/{id}/modules`, les cards sans champ de config (RDV, Blog) affichaient un bloc blanc vide en bas — `grid` étire par défaut toutes les cellules d'une ligne à la hauteur de la plus haute (celle de Maps, qui a un champ "Clé API" en plus).

Ethan a écarté un autre point remonté par l'audit (données de démo — vraie fiche Google Places "Boulanger Perpignan" avec avis 1 étoile laissée sur le tenant historique lors d'un test antérieur) : pas un problème, des données de démo servent à ça.

**Fixes appliqués** (aucune dépendance ajoutée, uniquement des classes Tailwind + un peu de state React) :
- `ModulesSection.tsx` : `items-start` sur le conteneur grid — chaque card garde sa hauteur naturelle.
- `AdminLayout.tsx` : passe à `lg:` comme breakpoint (sidebar chargée, jusqu'à 14 liens). En dessous, la sidebar devient un drawer (`fixed`, hors flux) déclenché par un bouton hamburger dans une nouvelle barre mobile sticky, avec backdrop semi-transparent qui ferme au clic. Identique et toujours visible en permanence à partir de `lg`. Nouvelles icônes `IconMenu`/`IconClose` dans `components/admin/icons.tsx`.
- `TemplateHestia.tsx` / `TemplateHelios.tsx` : passent à `md:` comme breakpoint (nav publique plus légère, 6 liens max). En dessous, la ligne de liens desktop se masque, un bouton hamburger apparaît à côté du nom du site et ouvre un panneau déroulant (liens empilés + sélecteur de langue) sous la nav — même logique conditionnelle par module dupliquée dans les deux fichiers (aucun composant de nav partagé entre templates, convention déjà établie dans ce projet). Icônes hamburger/close inline (pas de fichier d'icônes partagé côté templates, contrairement à l'admin).

Testé : `npx tsc --noEmit` propre. Vérification visuelle (CDP, viewport 390×844 puis 1440×900, template du tenant historique basculé temporairement sur Helios via l'API puis restauré sur Hestia/Olivier après coup) : sidebar/nav masquées par défaut en mobile, bouton hamburger visible et fonctionnel (clic simulé via `Runtime.evaluate` + `.click()`), drawer/panneau affichent bien tous les liens (y compris le sélecteur de langue) ; aucune régression constatée en desktop (comportement identique à avant sur les deux breakpoints).

**Hors scope de cette session** : reste du responsive mobile potentiellement à auditer plus en profondeur (pages internes de l'admin type tableaux Commandes/Blog, formulaires modales) — seuls la sidebar/nav et la page Modules ont été vérifiés explicitement.

## Bulle de contact support dans l'admin client — 2026-07-31 (même jour)

Demandé par Ethan : que ses clients puissent le contacter directement depuis l'admin s'ils sont bloqués, sans chercher son email ailleurs. Décidé avec Ethan (2 questions posées) : visible sur toutes les pages de l'admin **client** uniquement (pas la vue globale agence, pas le site public), et **envoi réel** via Brevo plutôt qu'un simple lien `mailto:` (déjà configuré et utilisé pour l'email de confirmation de paiement, voir plus haut — le client reste dans l'admin).

- `backend/BrevoEmailService.cs` : nouvelle `SendSupportRequestAsync` (même pattern que `SendInvoicePaidEmailAsync` — appel REST direct, erreurs avalées, jamais d'exception remontée). `BrevoEmailRequest` gagne `ReplyTo` (le client peut laisser son email pour qu'Ethan réponde directement) et `Attachment` devient optionnel.
- **Piège Brevo rencontré et corrigé** : l'API rejette `"attachment": []` avec `missing_parameter` — un tableau vide compte comme "manquant", pas comme "rien à joindre". Les deux champs (`Attachment`, `ReplyTo`) sont donc `JsonIgnore` quand `null` (au lieu d'envoyer une liste vide), pour que l'email de support (sans pièce jointe) ne casse pas le payload — repéré en testant l'appel Brevo en direct via `curl` avec la même clé API, l'email de facture n'était pas affecté (il fournit toujours un vrai tableau non vide).
- Nouvel endpoint `POST /api/t/{clientSiteId}/admin/support` (`TenantAdminEndpoints.cs`, même garde `TenantAdminAuth` que les autres actions tenant) : 400 si message vide ou si aucune clé Brevo configurée (erreur explicite, même logique que le bouton DeepL), 500 si Brevo échoue, `{sent:true}` sinon.
- Frontend : nouveau `frontend/src/components/admin/SupportBubble.tsx` (bouton flottant bas-droite + modal façon `ConfirmModal.tsx`, textarea message + email de retour facultatif) branché une seule fois dans `AdminLayout.tsx` (visible sur toutes les pages de l'admin client automatiquement, un seul point d'ajout). `AdminLayout` gagne une prop `password` (le token de session, déjà détenu par les 4 pages qui l'utilisent) pour authentifier l'appel. Nouvelle `IconHelp` dans `components/admin/icons.tsx`.

Testé : `dotnet build`/`tsc --noEmit` propres. Email de test envoyé de bout en bout via l'API réelle (curl, avec la vraie clé Brevo d'Ethan) → reçu sur etnofweb@gmail.com avec le nom du site et le reply-to corrects. Vérifié visuellement (CDP) : bulle visible en bas à droite sur `/admin/{id}`, modal s'ouvre/se ferme correctement.

**Reste à vérifier par Ethan** : envoyer un vrai message depuis le navigateur (pas juste via curl) et confirmer la réception + que répondre à l'email revient bien vers l'adresse indiquée par le client.

Confirmé par Ethan (testé lui-même dans le navigateur) — suite immédiate : le champ email de la bulle se retape à chaque fois. Fix : `AdminLayout.tsx` réutilise le fetch de contenu déjà en place (celui qui alimentait `siteName`) pour récupérer aussi `SiteContent.Email` (page Établissement), transmis à `SupportBubble` via une nouvelle prop `defaultEmail` qui préremplit le champ sans écraser une saisie déjà en cours. Vérifié visuellement (CDP) sur "Boulangerie Dupont" (email `test@test.com` renseigné) : champ prérempli à l'ouverture de la modal.

## Suite de l'audit UI/UX : admin agence + pages restantes — 2026-07-31 (même jour)

Ethan a demandé de continuer l'audit responsive sur les pages pas encore vérifiées (tableaux/modales de l'admin client, admin agence jamais regardé). Même méthode que le premier audit (Chrome headless + CDP).

**Trouvé — le plus important** : `/admin/dashboard` (vue globale agence) n'a **jamais** reçu le fix responsive de la sidebar, parce que c'est un layout entièrement séparé (`AgencyLayout.tsx`, pas `AdminLayout.tsx`) — même bug que celui corrigé plus haut pour l'admin client (sidebar pleine largeur qui pousse tout le contenu hors écran en mobile). Confirmé sur Tableau de bord, Sites clients, Devis, Factures, Formules.

**Trouvé — régression introduite par la bulle d'aide (session précédente)** : sur les pages où le contenu remplit tout le viewport (RDV, Avis Google, Multilingue), la bulle "Aide" en position fixe chevauchait un élément interactif (toggle, case à cocher) tout en bas de page — aucune marge n'était réservée pour elle.

**Trouvé — bug pré-existant** : sur la page Multilingue (mobile), l'en-tête de chaque panneau (titre/description + boutons "Traduire automatiquement"/"Enregistrer") ne passait pas en colonne — la description se retrouvait écrasée dans une colonne très étroite à côté des boutons.

**Trouvé — mineur, pas corrigé** : les tableaux (Commandes, Clients, Messages) débordent horizontalement à l'intérieur de leur card (scroll contenu, fonctionnel) sans indication visuelle qu'il y a plus de colonnes à droite — laissé tel quel, pas bloquant.

**Fixes appliqués** :
- `AgencyLayout.tsx` : exactement le même traitement que `AdminLayout.tsx` (barre mobile + drawer `fixed` en dessous de `lg`, toujours visible en sticky au-dessus) — copié quasi à l'identique, les deux layouts partageaient déjà la même structure avant le fix.
- `AdminLayout.tsx` : `<main>` passe de `py-8` à `pb-24 pt-8` — réserve assez de place en bas de chaque page pour que la bulle Aide ne chevauche plus jamais le dernier élément interactif.
- `MultilingueSection.tsx` : les 3 en-têtes de panneau (Site, chaque offre, chaque article) passent de `flex items-center justify-between` à `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` — empilés en mobile, alignés en ligne à partir de `sm`.

Testé : `tsc --noEmit` propre. Vérification visuelle (CDP, mobile 390×844 + desktop 1440×900) : sidebar agence masquée par défaut en mobile, drawer avec sous-menu Facturation fonctionnel, desktop identique à avant ; bulle Aide ne chevauche plus la case "Samedi" de RDV ; en-tête Multilingue lisible en mobile (boutons sur leur propre ligne).

## Suite de l'audit : débordement horizontal (Tarifs des modules, fiche produit) — 2026-07-31 (même jour)

Reprise de l'audit sur les pages agence pas encore vues (Tarifs, Entreprise, Clients de facturation, Paiement) et les fiches détail (client, produit). Nouveauté dans la méthode : au-delà de l'inspection visuelle, vérification systématique de `document.documentElement.scrollWidth` vs `clientWidth` en 390px (script Node/CDP) pour détecter un débordement horizontal même quand ce n'est pas évident sur une capture d'écran.

**Trouvé** : deux pages débordaient réellement de la largeur de l'écran en mobile (toute la page défilait horizontalement, pas juste un tableau contenu dans sa card) :
- `/admin/dashboard/tarifs` (agence) : chaque ligne (`PricingSection.tsx`) alignait libellé + input + bouton "Enregistrer" sur une seule ligne sans jamais permettre de retour à la ligne — largeur cumulée bien supérieure à 390px.
- Fiche produit (`ProductDetailPage.tsx`) : la ligne Prix/Stock (`flex-1` sans `min-w-0`) ne pouvait pas rétrécir sous la largeur intrinsèque par défaut d'un `<input>`, même exigence que le bug déjà rencontré et corrigé sur l'onglet Horaires d'Établissement (voir plus haut dans ce fichier, 2026-07-27) — un flex item par défaut ne rétrécit jamais sous le contenu de son enfant sans `min-w-0` explicite.

**Vérifié sans problème** (mesuré à 390 = 390, pas de débordement) : Entreprise, Clients de facturation, Paiement, fiche client, Établissement, Blog, Commandes (le débordement des tableaux — Commandes/Clients/Messages — reste contenu dans leur card via un scroll interne, jamais la page entière).

**Fixes** :
- `PricingSection.tsx` : `flex items-center gap-3` → `flex flex-wrap items-center gap-3` — chaque ligne peut passer sur 2 lignes (input+bouton sous le libellé) au lieu de forcer la largeur de la page.
- `ProductDetailPage.tsx` : `min-w-0` ajouté aux deux labels `flex-1` (Prix, Stock) — même fix que Horaires.

Testé : `tsc --noEmit` propre ; `scrollWidth`/`clientWidth` réconciliés (390 = 390) sur les deux pages après fix ; capture desktop (1440×900) confirmant l'absence de régression sur les deux.

**Suite** : petit indicateur visuel ajouté sur les 3 tableaux qui débordent volontairement dans leur card (Commandes, Clients, Messages) — texte "← Fais glisser le tableau pour voir plus de colonnes →" au-dessus (mobile uniquement) + dégradé blanc sur le bord droit de la card pour suggérer qu'il y a plus de colonnes à faire défiler.

## Catalogue : cache le stock exact, remplace le tiroir panier par une page dédiée — 2026-07-31 (même jour)

Demandé par Ethan : ne plus afficher le nombre de stock exact sur le site public (juste un bouton "Ajouter au panier"), et remplacer le tiroir panier par une vraie page où le client ajuste ses quantités et passe commande. Décidé avec Ethan (2 questions posées) : le bouton flottant devient un lien direct vers cette page (plus de tiroir), et le formulaire de commande gagne téléphone + adresse (en plus de nom/email déjà présents) — utile pour la livraison physique, ces champs existent déjà sur `Customer` (CRM) mais n'étaient jamais remplis par le client final.

- `modules/catalogue/frontend/CatalogueSection.tsx` (`ProductCard`) : retire le badge de stock exact et le stepper de quantité — garde juste "Rupture de stock" (sans nombre) si stock à 0, bouton "Ajouter au panier" qui ajoute 1 unité. L'ajustement de quantité se fait désormais sur la page panier.
- **`CartButton` devient un simple lien** `<a href="/t/{id}/panier">` (plus de state/tiroir) — `CartDrawer.tsx` supprimé, entièrement remplacé par une nouvelle page.
- **Nouveau `modules/catalogue/frontend/CartPage.tsx`** : page de module autonome (même famille que `BlogPostPage.tsx` — montée seule via une route dédiée `/t/{clientSiteId}/panier` dans `App.tsx`, pas nichée dans un template). Volontairement **identique pour tous les templates** (pas de nav/police propre à Hestia/Helios) — seules les 2 couleurs de la palette active (accent + fond) sont reprises via `useTemplate`/`TEMPLATES` (`frontend/src/templates/registry.ts`), le reste utilise les tokens partagés etnof-web. Écart assumé au principe d'isolation d'un module (`docs/02-architecture-modules.md`) : cette page importe directement des hooks de `frontend/src/hooks/` (`useTemplate`, `useModules`) au lieu de recevoir la palette en prop comme `CatalogueSection` — parce que rien ne la rend, elle doit résoudre elle-même le tenant actif.
- Reprend le panier déjà stocké en `localStorage` (`CartContext.tsx`, inchangé) : aucune donnée à faire transiter par l'URL entre la page d'accueil et la page panier.
- **Backend** (`modules/stripe/backend/StripeModule.cs`) : `CheckoutInput` gagne `CustomerPhone`/`CustomerAddress`, propagés dans les métadonnées Stripe puis, à la création d'un nouveau `Customer` par le webhook (email jamais vu), enregistrés sur le `Customer` — même logique que `Name` aujourd'hui (un `Customer` déjà existant n'est jamais écrasé). Aucune migration : les colonnes existent déjà sur `Customer` depuis le CRM.
- Nettoyage : clé de traduction `catalogue.close` (bouton fermer du tiroir) et `catalogue.inStock` (nombre de stock) retirées des 3 langues (fr/en/es), plus utilisées. Nouvelles clés `catalogue.cartTitle`/`phonePlaceholder`/`addressPlaceholder` ajoutées aux 3 langues.

Testé : `dotnet build`/`tsc --noEmit` propres. Vérifié dans le navigateur (CDP) : cards produit sans stock affiché ; ajout au panier → bouton flottant affiche bien "Panier (1)" ; page `/t/{id}/panier` affiche l'article avec +/- quantité, total, formulaire nom/email/téléphone/adresse ; couleur du bouton "Payer par carte" confirmée différente entre un tenant Hestia/Olivier (vert olive) et le même tenant temporairement basculé sur Helios/Couchant (violet) — la palette suit bien le tenant, le reste de la page ne change pas. **Non testé de bout en bout** : le paiement Stripe réel (aucune clé Stripe configurée sur le tenant historique pour l'instant) — la plomberie téléphone/adresse est vérifiée par revue de code (même chemin que `customerName`/`customerEmail`, déjà en production) mais pas par un paiement réel.

**Reste à vérifier par Ethan** : sur un tenant avec une vraie clé Stripe configurée, passer une commande de bout en bout avec téléphone/adresse renseignés, puis vérifier dans `/admin/{id}/customers` que la fiche client créée porte bien ces deux champs.

---

## Publication volontaire du site, retouches modules (RDV/Galerie/Avis), logo par tenant — 2026-08-07

Session composée de plusieurs retours d'Ethan traités à la suite, à partir de captures d'écran :

**1. Publication volontaire du contenu/template/logo** : jusqu'ici toute modification enregistrée en admin (Contenu, Établissement, Modèle) était immédiatement visible sur le site public. Nouveau bouton "Rafraîchir le site" (`/admin/{id}/site`) : `SiteContent` gagne `PublishedContentJson` (snapshot JSON) et `ClientSite` gagne `PublishedTemplateId`/`PublishedPaletteId`/`PublishedCustomAccent`/`PublishedLogoPath`/`PublishedAt` (migrations `AddContentPublishSnapshot`, `AddClientSiteLogo`), copiés depuis les colonnes live par `POST /api/t/{id}/admin/publish` (`backend/PublishEndpoints.cs`). Le site public lit désormais `/content/published` et `/template/published` (nouveaux endpoints ; `/content` et `/template` restent inchangés, toujours utilisés tels quels par l'admin) — repli automatique sur le live tant qu'un tenant n'a jamais publié, pour ne rien casser sur les sites existants. Volontairement limité à `SiteContent` + template/logo : les modules avec leurs propres données (Catalogue, Galerie, Blog, RDV...) restent en temps réel.

**2. Retouches UX signalées par capture d'écran** :
- Pages personnalisées : "Enregistrer" ramène désormais à la liste des pages (`/admin/{id}/pages`) au lieu de rester sur l'éditeur.
- RDV public : les créneaux (auparavant tous affichés à plat, illisible) passent par une sélection de date en onglets (façon Calendly) puis seuls les créneaux du jour choisi s'affichent.
- Avis Google : les avis longs sont tronqués (`line-clamp-4`) avec un bouton "Voir plus"/"Voir moins" par avis.
- Largeur du contenu du site : conteneurs `max-w-5xl` → `max-w-7xl` sur les deux templates + footer.
- Sélecteur de palette/couleur perso retiré de l'UI admin (`SiteSection.tsx`) — jugé inutile pour l'instant par Ethan. Les colonnes `PaletteId`/`CustomAccent` restent en base, retrait réversible.
- Description (`SiteContent.Description`) passe en HTML riche : même éditeur TipTap que le contenu de page, en mode `compact` (pas de hauteur fixe imposée, suit son contenu ; toolbar réduite à gras/italique/lien, headings/listes/citation n'ont pas de sens pour un sous-titre). Rendu via `dangerouslySetInnerHTML` sur le site public ; `useDocumentMeta.ts` nettoie le HTML en texte brut avant de l'utiliser comme `<meta name="description">`.
- **Bug trouvé en testant la Description** : `SiteSection.tsx` et `OffersSection.tsx` n'envoyaient pas `cgvContent` dans leur payload `PUT /admin/content` (qui remplace tout l'objet `SiteContent`) → `null` sur une colonne `NOT NULL`, 500 à l'enregistrement. Même classe de bug déjà rencontrée et documentée plus haut dans ce fichier pour `ContentSection.tsx` (2026-07-27) — cette fois sur deux pages différentes qui n'avaient pas reçu le même correctif. Corrigé en échoant `content.cgvContent` comme le fait déjà `EstablishmentSection.tsx`.

**3. Bug de fond trouvé et corrigé — `position: fixed` cassé par le reveal-on-scroll** : la modale plein écran de la Galerie ("trop grande, devrait faire la taille de l'écran") et le bouton flottant "Panier" ("cassé") avaient la même cause racine : `useRevealOnScroll`/`Band` applique une classe Tailwind `translate-y-*` à chaque section de contenu — même `translate-y-0` génère un `transform` CSS, qui crée un nouveau *containing block* pour tout descendant `position: fixed`, cassant son positionnement viewport-relatif. Fix : `GallerySection.tsx` (modale) et `CatalogueSection.tsx` (`CartButton` + modale d'avis produit) rendus via `createPortal(..., document.body)`, qui échappe l'ancêtre transformé.

**4. Galerie transformée en slider** : navigation précédent/suivant (boucle en bout de liste), flèches clavier (←/→), Échap pour fermer, compteur "2/5".

**5. Réordonnancement des sections** : Galerie et Avis Google remontés juste après Catalogue (au lieu d'être tout en bas) sur les deux templates ; menu de navigation aligné dans le même ordre, avec un nouveau lien "Galerie" qui n'existait pas encore dans le menu.

**6. Logo par tenant** : upload/suppression depuis `/admin/{id}/establishment` (onglet Informations, `LogoUploader`), même pattern d'upload que le logo agence (`CompanyProfileEndpoints.cs`) adapté à `ClientSite.LogoPath`. Utilisé comme favicon (`useDocumentMeta.ts`, nouveau paramètre `faviconUrl`) et affiché en cercle (`rounded-full`, jusqu'à 23rem sur `sm:` et plus) à droite du texte de description (Établissement sur Hestia, hero sur Helios) — sans logo, seul le texte s'affiche, agrandi (`text-lg` → `text-xl`) au passage. Suit le même système de publication que le point 1 (`PublishedLogoPath`).

Testé : `dotnet build`/`tsc --noEmit` propres après chaque étape ; migrations générées et appliquées (`dotnet ef database update`) ; cycle publish/draft vérifié manuellement par Ethan (édition → pas de changement public → clic "Rafraîchir le site" → changement visible) ; bug `cgvContent` reproduit puis re-testé après fix. Pas d'outil de capture d'écran automatisé disponible dans cet environnement pour cette session — tous les retours visuels (positionnement/taille du logo, rendu du slider Galerie, largeur du contenu) sont venus d'Ethan au fil de la session, avec allers-retours directs sur ses captures d'écran.

## Nouveau template "Charis" — vitrine mode/vêtements — 2026-08-25

Ethan a demandé un template dédié aux commerces de vente de vêtements en ligne, inspiré du rendu de sites modernes comme karminecorp.fr (survol d'une card produit qui change de photo, fiche produit avec grande photo + slider). Détail complet dans `docs/10-templates.md`. Résumé :

- Décidé avec Ethan avant de coder (`AskUserQuestion`) : comportement survol/slider **exclusif au nouveau template** (Hestia/Helios inchangés) et **vraie page produit dédiée** (nouvelle route publique) plutôt qu'une modale agrandie. Nom choisi : `Charis` (Grâces, charme/élégance).
- Nouveau `TemplateCharis.tsx` + `charis/ProductGrid.tsx` (grille à survol, remplace `CatalogueSection` pour ce template) + `charis/ProductPage.tsx` (fiche produit, route `/t/{clientSiteId}/produits/{productId}`) — aucun changement backend au-delà de l'enregistrement du template (`TemplateEndpoints.KnownTemplateIds`/`KnownPalettesByTemplate`), le multi-photos/panier/avis produits existaient déjà.
- Wording ajouté dans l'admin (`ProductDetailPage.tsx`, section Photos) expliquant le rôle de l'ordre des photos (1ʳᵉ = affichée par défaut, 2ᵉ = au survol, suivantes = slider).

Testé : `dotnet build`/`tsc -b` propres. Pas d'outil de capture d'écran disponible dans cet environnement pour cette session — vérification visuelle (survol, slider desktop/mobile, ajout au panier, Hestia/Helios non affectés) laissée à Ethan.

## Collections, produits "mis en avant", page boutique dédiée — 2026-08-25 (même jour)

Ethan a soulevé le problème d'échelle "beaucoup de produits" (20+) : grille plate illisible sur la home, aucun filtre côté admin. Détail complet dans `docs/04-catalogue-modules.md` et `docs/10-templates.md`. Résumé :

- Décidé avec Ethan avant de coder (`AskUserQuestion`) : collections simples (0 ou 1 par produit) plutôt que des tags ; page boutique dédiée avec filtre par collection sur Charis, page boutique simple sans filtre sur Hestia/Helios.
- Nouvelle entité `Collection` + `Product.CollectionId`/`Highlighted` (migration `AddProductCollections`) ; CRUD admin (`CollectionsSection.tsx`, nouvelle section) ; sélecteur collection + toggle "mis en avant" sur la fiche produit ; filtre + badge sur la liste produits.
- Nouvelle route `/t/{clientSiteId}/boutique` (aiguilleur par template) ; home des 3 templates n'affiche plus qu'un aperçu (limite 8 ou slider "mis en avant" sur Charis) au lieu de tous les produits.

Testé : `dotnet build`/`tsc -b` propres, migration appliquée. Smoke-test backend par `curl` (collections CRUD, rattachement produit, endpoints publics, suppression de collection). **Incident** : la description du produit de démo "Bougie parfumee" a été écrasée par erreur pendant le smoke-test (payload de test sans avoir relu la valeur existante) — reste vide, à re-remplir par Ethan si besoin. Pas de vérification visuelle (pas d'outil de capture d'écran dans cet environnement) — laissée à Ethan.

## Session de test en conditions réelles sur un tenant Charis ("Atelier Lumen") — 2026-08-26

Longue session de qualification : Ethan a créé un vrai site de test (boutique de vêtements, template Charis) et a testé/corrigé au fil de l'eau, capture d'écran à l'appui à chaque retour (contrairement aux chantiers Charis précédents, faits sans vérification visuelle). Plusieurs chantiers distincts, détail complet dans `docs/04-catalogue-modules.md` (catalogue/tailles) et `docs/10-templates.md` (Charis) :

**Admin, transverse à tous les templates** :
- **Composant `Select.tsx`** (`frontend/src/components/admin/Select.tsx`) : remplace tous les `<select>` natifs du projet (menu déroulant natif du navigateur impossible à styliser aux couleurs du site) — gère aussi les groupes d'options (équivalent `<optgroup>`, utilisé par le sélecteur de tarifs Devis/Factures). Un seul composant, réutilisé partout plutôt que refait à chaque page.
- **Numéro de téléphone avec indicatif pays** (`frontend/src/components/admin/PhoneInput.tsx`) : ajout de la dépendance `libphonenumber-js` (signalé et confirmé par Ethan avant d'ajouter — voir `CLAUDE.md` règle 5) après qu'un numéro invalide s'est enregistré tel quel faute de vérification. Sélecteur de pays (drapeau + indicatif auto), formatage en direct, validation réelle par pays. Branché sur les 2 champs téléphone d'Établissement ; pas encore sur WhatsApp ni ailleurs.
- **Page "Sites clients" (agence)** repensée : liste de cards (au lieu d'une liste texte) avec couleur d'accent du template/palette, filtres recherche/statut/template, badges modules complets, bouton "Modifier"/"Supprimer" ; nécessite d'exposer `PaletteId` dans `GET /api/admin/client-sites` (`AgencyDashboardEndpoints.cs`) pour calculer la couleur d'accent par site.
- **Bouton "Supprimer le produit"** (liste Produits) : avait déjà sa modale de confirmation (session du 2026-07-27) mais gardait un style de simple lien texte, repris en vrai bouton (fond/bordure).

**Charis (détail complet dans `docs/10-templates.md`)** : nav/footer partagés entre la home et les pages standalone (`SiteChrome.tsx`, nouveau), footer en mode sombre, palette "Noir" corrigée (fond identique au blanc des cards, aucun contraste), liens de nav conditionnés à l'existence de contenu réel (pas juste au module actif), nouvelle section "Réseaux sociaux" sur la home, nouveau champ `SiteContent.StoryContent` + section "Notre histoire", home remplie par un aperçu de chaque collection (au lieu de rester quasi vide s'il n'y a que 1-2 mises en avant), cards passées de 4 à 3 colonnes max.

**Catalogue (détail complet dans `docs/04-catalogue-modules.md`)** : gestion des collections directement depuis la page Collections (cocher/décocher les produits, plus besoin de passer par chaque fiche produit), affichage public par section (une par collection, plus des chips de filtre) avec bascule automatique grille/slider selon que les produits tiennent sur une ligne, et surtout **nouveau système de tailles** (`ProductSize`, stock par taille, facultatif par produit) : admin, panier, checkout/webhook Stripe, affichage public (sélecteur sur fiche produit + tailles au survol de la card sur Charis).

**Autres retouches** : bouton "Venir chez nous" sous la carte du module Maps (lien direct vers l'itinéraire Google Maps) ; bloc "Prompt IA" sur la fiche produit (génère un prompt texte à partir du nom/de la description pour les 4 photos attendues — principale/survol/2 slider — sans jamais appeler de service de génération d'image payant, l'utilisateur colle le prompt lui-même dans l'outil de son choix).

Testé : `dotnet build`/`tsc -b` propres après chaque étape (Release config utilisée pour les migrations/builds backend le temps que le `dotnet run` de dev, verrouillant `bin/Debug`, tourne encore — **le backend doit être relancé pour charger tout le travail de cette session**, voir migrations ci-dessous). Deux migrations EF Core créées et **appliquées à la base locale** : `AddProductSizes` et `AddSiteContentStory`. Vérification visuelle par Ethan lui-même à chaque itération, contrairement aux sessions Charis précédentes.

**Reste ouvert / non fait cette session** : sélecteur de tailles pas de réordonnancement manuel (ordre de création) ; taille non ajoutable à la création du produit (seulement depuis la fiche, une fois créé) ; pas de section "Notre histoire" ni de nav conditionnée sur Hestia/Helios (Charis seulement, non demandé pour les 2 autres) ; plusieurs produits de démo d'"Atelier Lumen" ont encore des photos placeholder (couleur unie, générées en urgence en tout début de session) à remplacer par de vraies photos (prompts déjà prêts sur chaque fiche produit).

## Suite de la session de test Charis : home/boutique/fiche produit/panier — 2026-08-26 (même jour)

Continuation directe de la session précédente sur le même tenant ("Atelier Lumen"), toujours retour par retour d'Ethan sur capture d'écran. Détail complet dans `docs/10-templates.md` (nouvelle section datée). Résumé :

- **Home** : "Notre histoire" remontée avant le Catalogue ; tailles de police des titres de section harmonisées (`text-xl` partout, y compris pour les libellés venant de modules partagés — via un override CSS local à Charis plutôt que de toucher les modules) ; slider produits corrigé (tuiles en largeur fixe → largeur en fraction du conteneur, garantit 3 visibles) ; badge circulaire "Voir plus" tournant à côté des sliders de collection ; Newsletter sortie de la grille de modules, toujours en pleine largeur juste avant le footer ; nouvelle section Horaires (jours en entier), repositionnée plusieurs fois avant d'atterrir **dans** le bloc Catalogue, entre les produits mis en avant et les collections, appairée visuellement avec Maps.
- **Boutique** : largeur alignée sur les autres pages (`max-w-6xl` → `max-w-7xl`, qui s'avère être `max-w-7xl` partout ailleurs) ; chips de filtre par collection réellement branchées (décrites dans un commentaire depuis le début mais jamais codées) ; séparateur entre sections de collection.
- **Fiche produit** : fil d'Ariane, zoom plein écran sur la photo (même patron que la lightbox du module Galerie), vignettes plafonnées à 5 (badge "+N" au-delà, ouvre le carrousel complet), sélecteur de quantité, guide des tailles générique, accordéon Livraison/Retours/Paiement sécurisé, badge "stock faible" (couleur fixe, volontairement absent des cards — stock agrégé par produit alors qu'il est réel par taille), section "Nos autres produits" (slider, jusqu'à 5), barre sticky mobile "Ajouter au panier", résumé note moyenne + limite à 3 avis affichés, badge collection déplacé du texte vers une pastille sur la photo produit.
- **Panier** (page partagée par les 3 templates) : largeur alignée (`max-w-7xl`, même anomalie que la boutique) ; bouton "Voir le catalogue" sur l'état vide ; miniature produit sur chaque ligne ; rappel confiance sous le bouton de paiement.
- **Admin** : collections réordonnables par glisser-déposer (`CollectionsSection.tsx`) — nouvel endpoint `PUT .../collections/reorder`, pas de migration (`SortOrder` existait déjà sur `Collection`).

Testé : `tsc --noEmit` propre à chaque étape (relancé de nombreuses fois) ; `dotnet build` vérifié sans erreur de compilation pour le nouvel endpoint (échec de copie du binaire dû au verrou du `dotnet run` déjà lancé, pas une erreur de code — build à revalider après redémarrage du backend). Toutes les retouches vérifiées par Ethan en direct dans le navigateur, capture d'écran à l'appui. **Reste ouvert** : contenu Livraison/Retours générique (candidat à devenir un champ par établissement, comme les CGV, si le besoin se confirme) ; pas de filtrage de la boutique par collection via l'URL (le fil d'Ariane et le badge "Voir plus" renvoient vers la boutique complète).

## Formulaire de livraison du panier durci (adresse structurée, téléphone, email) — 2026-08-27

Demandé par Ethan à partir d'une capture d'écran du panier (page ajoutée le 2026-07-31, voir plus haut) : champ téléphone sans validation, pas de vérification d'email, prénom/nom pas sur la même ligne, et une seule adresse en texte libre alors que la livraison réelle a besoin de plus de structure — comparé à la pratique des grandes enseignes (Zara et consorts) avant de coder (2 questions posées).

- **`Customer` gagne une adresse structurée** (`AddressLine1`/`AddressLine2`/`PostalCode`/`City`/`Country`) au lieu d'un seul champ `Address` — migration `AddCustomerAddressFields` par **renommage** de colonne (`Address` → `AddressLine1`) plutôt qu'un Add+Drop avec SQL de backfill : préserve les adresses déjà saisies sans écrire de migration de données à la main (EF avait généré un renommage erroné vers `PostalCode` par heuristique de diff, corrigé à la main dans le fichier de migration avant application). `Country` a un défaut `"France"`. CRM (`CustomerDetailPage.tsx`, `CustomersSection.tsx`) mis à jour pour les mêmes champs. Endpoints `stripe/checkout` et le webhook (`StripeModule.cs`) propagent les 5 champs au lieu d'un seul.
- **Téléphone** (`CartPage.tsx`) : remplace le simple `<input type="tel">` par le composant `PhoneInput` déjà utilisé en admin (sélecteur de pays + indicatif automatique, validation `libphonenumber-js`) — `COUNTRIES` exporté depuis `PhoneInput.tsx` pour être réutilisé par le nouveau sélecteur "Pays" de l'adresse (`Select` générique, déjà réutilisable, pas de composant admin-only).
- **Email** : validation par regex avec message d'erreur affiché au blur (pas de validation navigateur seule).
- **Prénom/Nom** : deux champs sur la même ligne (`grid grid-cols-2`) au lieu d'un seul champ "Nom" ; concaténés côté frontend avant l'envoi (`CustomerName` backend reste un seul champ, pas de migration nécessaire côté commande).
- **Adresse structurée** : Adresse (rue, autocomplete Google conservée), Complément (optionnel), Code postal + Ville (même ligne), Pays (menu déroulant, défaut France).
- **Remplissage automatique depuis la sélection Google** (suite immédiate, demandé par Ethan après un premier test) : la recherche texte existante (`/google-places/search`) ne renvoie qu'une adresse formatée en bloc, jamais les composants séparés. Nouvel endpoint public `GET /api/t/{clientSiteId}/google-places/address-details?placeId=...` (même garde module Catalogue + rate-limiting `public-places` que `/search`, pas d'auth) qui interroge Place Details avec `fields=address_component` (singulier — particularité documentée de l'API Places Legacy, la réponse renvoie `address_components` au pluriel) et reconstruit rue/code postal/ville/pays. Au clic sur une suggestion, `DeliveryAddressAutocomplete` remplit d'abord l'adresse complète immédiatement (retour perçu instantané) puis affine avec la version structurée dès que l'appel réseau résout.
- Bouton "Payer par carte" : la condition de désactivation couvre maintenant prénom, nom, email valide, téléphone valide, adresse/code postal/ville renseignés, en plus des CGV (avant : seuls nom+email+CGV étaient vérifiés, téléphone/adresse jamais requis malgré leur usage pour la livraison).
- Nouvelles clés de traduction (fr/en/es) : `firstNamePlaceholder`, `lastNamePlaceholder`, `emailInvalid`, `addressLine2Placeholder`, `postalCodePlaceholder`, `cityPlaceholder`, `countryLabel` ; `namePlaceholder` retiré (remplacé), `addressPlaceholder` recentré sur la rue seule (au lieu de "Adresse de livraison").

**Limite connue, non corrigée** (signalée à Ethan, pas de demande de fix) : la recherche Google utilisée ici est une recherche texte générale (lieux/commerces), pas l'API dédiée "Address Autocomplete" — elle peut remonter un commerce proche plutôt que l'adresse résidentielle exacte tapée. Le remplissage fonctionne correctement quelle que soit la suggestion choisie ; basculer sur l'API dédiée serait un chantier à part (autre endpoint, autre tarification Google).

**Bug préexistant relevé, non corrigé** (composant partagé avec l'admin, pas introduit ici) : `PhoneInput.tsx` n'insère pas les espaces en direct pendant la frappe (reste "612345678" au lieu de "6 12 34 56 78") — `AsYouType` reçoit toute la chaîne accumulée d'un coup via `useMemo` au lieu d'être nourri touche par touche, ce qui désactive le formatage incrémental de `libphonenumber-js`. La validation elle-même n'est pas affectée.

Testé : `dotnet build`/`tsc --noEmit` propres ; migration appliquée à la base locale (adresses existantes vérifiées préservées après le renommage) ; backend redémarré (l'ancien processus tournait encore avec l'ancien schéma `Customer.Address`, cassé par la migration déjà appliquée). Vérification visuelle par CDP/Chrome headless (deux passes) sur le tenant "Atelier Lumen" : prénom/nom même ligne, email invalide → bordure rouge + message puis correction → erreur disparaît, téléphone avec sélecteur pays fonctionnel (validité correcte, seul le formatage visuel manque d'espaces), adresse/complément/code postal+ville/pays dans l'ordre attendu, bouton désactivé tant que le formulaire n'est pas complet ; sélection d'une suggestion Google → adresse raccourcie à la rue + code postal/ville/pays remplis automatiquement après un court délai. Aucune erreur console à aucune étape.

Confirmé par Ethan (testé lui-même dans le navigateur) — suite immédiate le même jour : discussion sur ce qui manque à la page panier par rapport aux grandes enseignes (Zara et consorts), avant de committer. Constat partagé : un panier/checkout a en général **moins** de chrome qu'une home (nav complète et footer volontairement absents ailleurs aussi, pour limiter l'abandon de panier) — donc l'absence de nav/footer sur cette page n'était pas un manque. Trois pistes retenues par Ethan parmi celles proposées (codes promo écartée — nécessiterait tout un système de réductions côté backend, pas encore existant) :

- **Bandeau nom/logo du site** : la page n'affichait qu'un lien texte "← Retour au site", sans aucun rappel de marque. Nouveau bandeau (`header`, factorisé pour les deux états de la page) : même ligne, nom du site (+ logo en cercle si le tenant en a un) à droite, réutilise les hooks déjà existants `useTemplate` (`logoUrl`) et `useContent` (`siteName`) — aucun nouvel appel réseau, ces hooks tournaient déjà ailleurs dans le projet mais n'étaient pas encore utilisés par cette page.
- **Ligne "Livraison"** : ajoutée dans les deux récapitulatifs de la page (carte principale + "Récapitulatif"), au-dessus du Total, avec un badge vert "Offerte" — clarifie un point resté implicite jusqu'ici (aucune ligne ne disait si la livraison était gratuite ou non).
- **Logos de paiement** : petite rangée d'icônes simplifiées (VISA, cercles rouge/orange façon Mastercard, "CB") sous le bouton "Payer par carte" — pas les assets officiels des marques, des formes stylisées suffisamment reconnaissables, pratique quasi systématique sur les pages de paiement observées.
- **"Vous pourriez aussi aimer"** : nouvelle section pleine largeur sous le panier/récap, jusqu'à 4 produits (hors ceux déjà dans le panier) avec image/nom/prix. Volontairement neutre (tokens partagés, pas le composant `FeaturedSlider` de Charis) pour rester identique sur les 3 templates, même principe que le reste de cette page. Un produit sans taille s'ajoute directement au panier en un clic ; un produit à tailles renvoie vers sa fiche dédiée (`/t/{clientSiteId}/produits/{id}`, route déjà partagée par tous les tenants dans `App.tsx` même si pensée à l'origine pour Charis) plutôt que de dupliquer le sélecteur de taille de `CatalogueSection.tsx`.

Testé : `tsc --noEmit` propre. Vérification visuelle par CDP/Chrome headless sur "Atelier Lumen" : bandeau nom/logo sans chevauchement (tenant sans logo → texte seul, comme prévu), ligne Livraison/Offerte présente sur les deux récapitulatifs avec le même total, icônes de paiement affichées sous le bouton, section suggestions avec 4 produits réels (image/nom/prix/bouton), aucun doublon avec les articles déjà au panier. Aucune erreur console.

Retour immédiat d'Ethan, même jour : demande de reprendre le vrai slider à survol de la home pour "Vous pourriez aussi aimer" (pas une grille neutre), et d'ajouter un vrai footer à la page panier (jusqu'ici totalement absent).

- **Footer** : réutilise `SiteFooter.tsx`, déjà partagé par les 3 templates (nom/adresse/téléphone/email/réseaux sociaux) — aucun nouveau composant. Nécessite de reproduire par template les deux réglages que les gabarits appliquent déjà chacun de leur côté : une couleur "ink" propre (`TEMPLATE_INK`, copiée des constantes déjà en dur dans `TemplateHestia.tsx`/`TemplateHelios.tsx`/`ProductPage.tsx` — aucun fichier partagé pour ça à ce jour) et un mode sombre pleine largeur pour Hestia/Charis vs. clair pour Helios (`TEMPLATE_FOOTER_DARK`). Placement conditionnel : hors du conteneur `max-w-7xl` du contenu pour la variante sombre (bande pleine largeur, comme `SiteChrome.tsx`), ré-enveloppé dans un `max-w-7xl` pour la variante claire d'Helios (qui n'a pas de fond propre et hérite du conteneur appelant, même convention que `TemplateHelios.tsx`).
- **Slider "Vous pourriez aussi aimer"** : sur Charis uniquement, réutilise directement `FeaturedSlider`/`ProductCard` de `charis/ProductGrid.tsx` (survol qui change de photo, flèches, ajout au panier avec gestion des tailles) au lieu de la grille neutre construite juste avant — aucune réimplémentation, ce composant gère déjà tout correctement puisqu'il tourne déjà dans un `CartProvider` (celui déjà présent en haut de la page panier). Reste exclusif à Charis (cohérent avec la décision du 2026-08-25 : ce comportement de survol n'existe nulle part ailleurs, y compris sur la home d'Hestia/Helios) — ces deux templates gardent la grille simple déjà en place.
- Page panier plus tout à fait "identique pour tous les templates" comme l'affirmait le commentaire d'origine (2026-07-31) : ces deux sections reprennent maintenant les couleurs/comportements exacts du template actif. Le reste (formulaire, récapitulatif, icônes de paiement...) reste neutre.

Testé : `tsc --noEmit` propre. Vérification visuelle par CDP/Chrome headless : sur Charis (Atelier Lumen), survol d'une tuile confirmé (changement de photo réel, pas juste un état CSS) + flèches affichées (5 produits éligibles) ; sur Hestia (tenant historique), grille statique sans survol/flèches comme prévu, footer identique (même structure/couleur) à celui de la home du même tenant. Helios non testé faute de tenant de test disponible pour ce template — même chemin de code que Hestia/Charis pour le choix clair/sombre, risque jugé faible. Aucune erreur console, aucune image cassée sur les deux tenants testés.

**Retouches finales de la session, mêmes retours d'Ethan** :
- **Espacement** : les sections du panier (grille panier/récap, "Vous pourriez aussi aimer", footer) étaient quasi collées les unes aux autres. `gap-8` → `gap-12` sur le conteneur principal, `pb-16`/`sm:pb-20` ajouté avant le footer (qui est hors de ce conteneur, voir plus haut) — vérifié à ~48px et ~80px d'écart respectivement.
- **Crédit agence dans le footer** : nouvelle ligne "Site réalisé par etnof-web" (lien vers `https://website-etnof-web.vercel.app/`, nouvel onglet) ajoutée dans `SiteFooter.tsx` — donc visible partout où ce footer est utilisé (les 3 templates, pas seulement le panier), pas seulement sur cette page. Nouvelle constante `AGENCY_WEBSITE_URL` dans `frontend/src/config.ts` (même pattern que `AGENCY_CONTACT_EMAIL`). Distinct de la décision du 2026-08-07 de ne pas reprendre le logo/wordmark etnof-web dans la navbar des sites générés — celle-ci concernait la marque visible en permanence sur le site du client, pas un simple crédit en pied de page (pratique courante d'agence, demandée explicitement par Ethan).

Testé : `tsc --noEmit` propre. Vérification visuelle par CDP/Chrome headless : espacements mesurés conformes, lien de crédit présent et correct (texte, href, nouvel onglet) à la fois sur `/panier` et sur la home du même tenant (confirmant qu'il est bien partagé par le footer commun). Aucune erreur console.

## Champs secrets copiables + configuration Stripe de test sur un tenant — 2026-08-27 (même jour)

Ethan bloqué sur `/admin/dashboard/paiement` : impossible (selon lui) de copier la clé secrète Stripe et le secret de webhook de l'agence, qu'il voulait reporter sur un tenant pour tester un vrai paiement en local avec le même compte Stripe de test.

- **Cause réelle** : un `<input type="password">` reste techniquement copiable au clavier (Ctrl+A/Ctrl+C copie la vraie valeur, pas les points), mais sans repère visuel ni bouton dédié ce n'était pas évident. Nouveau composant partagé `frontend/src/components/SecretField.tsx` (bascule œil afficher/masquer + bouton copier avec retour visuel, `navigator.clipboard`, même idée que le bouton "Copier" du bloc Prompt IA de `ProductDetailPage.tsx`) appliqué aux 5 champs concernés : clé secrète + webhook Stripe côté agence (`PaymentSection.tsx`) et côté tenant (`admin/StripeSection.tsx`), clé API Brevo (`PaymentSection.tsx`). Nouvelles icônes `IconEye`/`IconEyeOff`/`IconCopy` dans `components/admin/icons.tsx`.
- **Configuration réelle du tenant "Atelier Lumen"** pour permettre à Ethan de tester un paiement Stripe en local : clé secrète (`rk_test_...`) copiée depuis les réglages agence vers les réglages Stripe du tenant via l'API (testé avec un vrai appel `POST /stripe/checkout`, qui a renvoyé une vraie URL `checkout.stripe.com`). Le secret de webhook, lui, n'a **pas** été copié tel quel : il est propre à l'URL d'endpoint enregistrée côté Stripe (celui de l'agence est lié à `/api/public/invoices/stripe-webhook`, pas à l'endpoint du tenant), le copier aurait fait échouer la vérification de signature en silence. Stripe CLI (déjà installée et connectée au compte d'Ethan sur cette machine) lancée à la place : `stripe listen --forward-to http://localhost:5052/api/t/{tenantId}/stripe/webhook`, en tâche de fond. Fait notable : le secret qu'elle génère (`whsec_...`) est identique à celui déjà utilisé côté agence — la CLI Stripe génère un secret lié à la session/compte CLI, pas à l'URL de destination, donc il ne change pas d'un `stripe listen` à l'autre sur cette machine. Ce secret a été posé sur le tenant.

**À savoir pour la suite** : `stripe listen` doit rester actif pendant les tests locaux de paiement (webhook = ce qui crée réellement la commande, voir `modules/stripe/backend/StripeModule.cs`) — à relancer manuellement si le processus s'arrête (redémarrage machine, fermeture de session).

Testé : `tsc --noEmit` propre. Session de test Stripe fonctionnelle de bout en bout côté configuration (clé + webhook en place, checkout testé).

## Page de résultat de paiement dédiée + nettoyage de l'ancien bandeau — 2026-08-27 (même jour)

Demandé par Ethan après avoir testé un vrai paiement : une vraie page de succès/échec plutôt que le bandeau existant (affiché sur la home, voir l'entrée du 2026-07-27 plus haut), le panier doit être vidé au succès, et un email de confirmation doit partir au client.

- **Vidage du panier au succès et email de confirmation existaient déjà** : le webhook Stripe (`StripeModule.cs`) envoie déjà un email de confirmation de commande via Brevo (clé API de l'agence, pas du tenant) depuis la session du 07-31 environ ; le panier était déjà vidé (`localStorage.removeItem`) au retour `?checkout=success`. Seule la vraie page dédiée manquait — les deux autres demandes ont juste été vérifiées, pas réimplémentées.
- **Nouvelle page** `modules/catalogue/frontend/CheckoutResultPage.tsx`, montée sur la route `/t/{clientSiteId}/commande` (`App.tsx`) : reprend le même bandeau nom/logo + footer par template que `CartPage.tsx` (dupliqué plutôt que factorisé, même logique déjà assumée dans ce fichier). Lit `?checkout=success|cancel&session_id=...`, appelle `/stripe/session/{id}` pour le montant réellement payé. Écran succès : coche verte, montant, mention email de confirmation envoyé, rappel livraison, bouton vers la boutique. Écran annulation : icône neutre, message, bouton retour au panier (panier conservé, jamais vidé sur annulation). Visite directe sans paramètre `checkout` : redirection immédiate vers la home.
- **`CartPage.tsx`** : `returnBaseUrl` du checkout pointe désormais vers `/t/{clientSiteId}/commande` au lieu de la home.
- **Nettoyage** : l'ancien `CheckoutReturnBanner` (et son détecteur `hasCheckoutReturn`) retiré de `CatalogueSection.tsx` (Hestia/Helios) et de `charis/ProductGrid.tsx` (Charis) — il ne se déclenchera plus jamais, Stripe ne redirige plus vers la home. Imports/consts devenus inutiles (`storageKey`, `formatPrice` dans ProductGrid.tsx) retirés au passage (`noUnusedLocals` activé sur ce projet, voir `tsconfig.json`).
- Nouvelles clés de traduction (fr/en/es) : `catalogue.orderConfirmationEmailNote`, `catalogue.backToCart`.

Testé : `tsc --noEmit` propre (y compris détection des imports devenus inutiles). Test d'achat réel de bout en bout confirmé via CDP/Chrome headless, en s'appuyant sur la configuration Stripe de test posée juste avant : ajout au panier → formulaire → vraie page `checkout.stripe.com` (bon produit, bon montant) → carte de test `4242 4242 4242 4242` acceptée → redirection sur `/commande?checkout=success&session_id=...` avec le bon montant affiché → panier vidé (`localStorage` + `/panier` repasse à l'état vide) → commande bien créée en base par le webhook (forwardé par la Stripe CLI), avec le bon email/nom/article/montant/`stripeSessionId`. Aucune erreur console à aucune étape.

---

**Note pour toi (Ethan)** : donne ce fichier à Claude Code phase par phase (« on attaque la Phase 2, voici le contexte : [colle le contenu de 02-architecture-modules.md et 03-modele-donnees.md] »). Ne lui donne pas tout le projet d'un coup, ça évite qu'il brûle des étapes ou fasse des suppositions sur les phases suivantes.
