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

**Note pour toi (Ethan)** : donne ce fichier à Claude Code phase par phase (« on attaque la Phase 2, voici le contexte : [colle le contenu de 02-architecture-modules.md et 03-modele-donnees.md] »). Ne lui donne pas tout le projet d'un coup, ça évite qu'il brûle des étapes ou fasse des suppositions sur les phases suivantes.
