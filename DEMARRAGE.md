# Démarrage local

⚠️ Depuis le 2026-07-26, la plateforme est **multi-tenant** (voir `docs/00-vision.md`) : il n'y a plus de fichier `site.config.json`, tout vit en base, par client (`ClientSite`). Les sections "Test gate — Phase X" ci-dessous sont un historique du POC, gardées pour référence mais certaines commandes ne s'appliquent plus telles quelles (voir la section "Multi-tenant" en bas, à jour).

## 0. Première installation seulement

Un seul fichier contient des secrets/de la config locale et n'est **pas** versionné avec Git :

```
cp backend/appsettings.Development.json.example backend/appsettings.Development.json
```

Puis générer le hash du mot de passe agence (celui d'Ethan — ne jamais mettre un mot de passe en clair dans un fichier) :

```
cd backend
dotnet run -- hash-password <ton-mot-de-passe>
```

Copier la valeur affichée dans `backend/appsettings.Development.json`, clé `Admin:PasswordHash`.

Trois services à lancer séparément (3 terminaux), depuis la racine du repo.

## 1. Base de données PostgreSQL (Docker)

```
docker compose up -d
```

Arrêter : `docker compose down` (les données restent dans le volume Docker).

## 2. Backend — ASP.NET Core

```
cd backend
dotnet ef database update   # première fois seulement (ou après une nouvelle migration) : crée les tables
dotnet run
```

API disponible sur http://localhost:5052 (voir `backend/Properties/launchSettings.json` si le port a changé).

> `dotnet ef` doit être installé une fois : `dotnet tool install --global dotnet-ef` si la commande n'existe pas.

## 3. Frontend — Vite + React

```
cd frontend
pnpm install
pnpm dev
```

Frontend disponible sur http://localhost:5173.

> Note : `npm` est cassé sur cette machine (installation Node globale corrompue, sans rapport avec ce projet). `pnpm` fonctionne très bien et est utilisé à la place.

---

## Multi-tenant — comment ça marche aujourd'hui

Après la migration `AddMultiTenant`, un **tenant historique** existe déjà (celui qui portait tout le contenu du POC), avec l'Id fixe `11111111-1111-1111-1111-111111111111` et le mot de passe `admin123` (mot de passe local de dev, à changer si besoin).

1. Ouvrir http://localhost:5173/ → redirige vers `/admin/dashboard` (vue globale d'Ethan).
2. Se connecter avec le mot de passe agence (celui configuré à l'étape 0).
3. La liste des clients affiche le tenant historique et tous les clients créés depuis. Chaque ligne a deux liens : "Site (aperçu)" (`/t/{id}`) et "Admin du client" (`/admin/{id}`).
4. Pour créer un nouveau client de test : remplir le formulaire à droite (nom, type, modules, **mot de passe obligatoire à la création**) → "Ajouter".
5. Ouvrir le lien "Admin du client" du nouveau tenant → écran de login plein écran, se connecter avec le mot de passe choisi (ou le mot de passe agence, qui fonctionne aussi comme clé passe-partout).
6. L'admin du client a une sidebar avec plusieurs pages : Tableau de bord, Site internet, Offres, Établissement, Modules, Messages toujours visibles ; Produits, Commandes, Clients apparaissent en plus si le module Catalogue est autorisé et activé (`/admin/{id}/{section}`, section ∈ `site|offers|establishment|modules|messages|products|orders|customers`). Voir `docs/05-roadmap-poc.md` pour le détail de chaque page ajoutée après le POC initial.
7. Ouvrir "Site (aperçu)" pour voir le rendu public de ce tenant.

**Templates** (voir `docs/10-templates.md`) : dans l'admin du client, page "Site internet" → onglet "Modèle" → choisir "Classique" ou "Moderne", recharger "Site (aperçu)" → la mise en page change (navbar pilule + sections empilées vs bandeau plein cadre en dégradé + carte offre mise en avant). Le tenant historique et un nouveau tenant sur des templates différents permettent de comparer facilement.

**Test d'isolation** (à refaire après toute modification touchant l'auth ou le scoping) :
- Le contenu/les modules/les messages de contact d'un tenant ne doivent jamais apparaître pour un autre (`curl http://localhost:5052/api/t/{idA}/content` et `.../{idB}/content` doivent différer).
- Se connecter à l'admin du tenant B avec le mot de passe du tenant A doit échouer (401), sauf si c'est le mot de passe agence (qui doit, lui, toujours fonctionner).
- `docker exec etnof-postgres psql -U etnof -d etnof_cms -c "SELECT \"ClientSiteId\", COUNT(*) FROM \"ContactMessages\" GROUP BY \"ClientSiteId\";"` pour vérifier en base.

## Durcissement sécurité (bilan Phase 5)

1. **Secrets non versionnés** : `backend/appsettings.json` (commité) ne contient plus de secret — les vraies valeurs vivent dans `backend/appsettings.Development.json` (gitignoré). En production, les fournir via variables d'environnement (`ConnectionStrings__Default`, `Admin__PasswordHash`, `Cors__AllowedOrigin`).
2. **Mots de passe hashés** (PBKDF2, `backend/AdminPasswordHasher.cs`) — jamais stockés/comparés en clair, que ce soit le mot de passe agence ou celui d'un tenant.
3. **CORS configurable** via `Cors:AllowedOrigin`.
4. **`module.meta.json` câblé dans l'admin** : noms de modules lisibles ("Contact" au lieu de `contact`).

---

## Historique du POC (Phases 0 à 5)

Gardé pour référence — certaines commandes citent `site.config.json` ou des endpoints non scopés par tenant, qui n'existent plus depuis le passage en multi-tenant. Adapter les URLs avec `/t/{clientSiteId}` ou `/admin/{clientSiteId}` en s'inspirant de la section "Multi-tenant" ci-dessus.

- **Phase 0** : `docker compose up -d`, `dotnet run` (backend, `/api/health`), `pnpm dev` (frontend, page Tailwind). Validé.
- **Phase 1** : moteur de toggle générique, validé avec des modules fictifs puis les vrais modules.
- **Phase 2** : modules Contact + Maps, formulaire fonctionnel, sauvegarde en base, toggle → 404 si désactivé.
- **Phase 3** : admin par mot de passe (toggle modules + édition contenu), devenu dynamique (pas besoin de redémarrer le backend).
- **Phase 4** : module Blog ajouté en suivant le pattern module — preuve que le pattern accélère l'ajout de nouveaux modules.
- **Phase 5** : bilan, durcissement sécurité, charte graphique appliquée, vue globale agence, puis passage en multi-tenant (voir `docs/05-roadmap-poc.md` pour le détail complet de chaque étape).
