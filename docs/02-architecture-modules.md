# 02 — Architecture du système de modules

## Principe général

Un module = une fonctionnalité vendable (Contact, Maps, Blog, RDV, Paiement...). Chaque module est isolé et suit toujours la même structure, pour que Claude Code (ou toi) puisse en ajouter un nouveau en copiant le pattern d'un module existant.

Depuis le passage en multi-tenant (2026-07-26, voir `00-vision.md`), toutes les routes d'un module sont scopées par tenant : `/api/t/{clientSiteId}/...`. Chaque module reste isolé au sens du code (dossier séparé), mais ses données sont maintenant partagées dans la même base, distinguées par `ClientSiteId`.

## Structure d'un module

```
/modules
  /contact
    backend/
      ContactModule.cs        <- déclare le module (nom, endpoints minimal API — pas de Controller MVC)
      ContactMessage.cs       <- modèle EF Core, avec ClientSiteId (multi-tenant)
    frontend/
      ContactSection.tsx      <- composant React affiché si le module est actif, reçoit clientSiteId en prop
      ContactSection.config.ts <- schéma des champs configurables du module
    module.meta.json          <- métadonnées (nom affiché, description, dépendances éventuelles)
```

> Écart assumé avec la version initiale de ce doc : le backend utilise des *minimal API* (`app.MapPost(...)` directement dans `XModule.cs`) plutôt que des Controllers MVC classiques — cohérent avec `Program.cs` qui est lui-même en minimal API depuis la Phase 0. Pas de fichier `XController.cs` séparé.
>
> `module.meta.json` est utilisé depuis le bilan de la Phase 5 : `ModuleMetaRegistry` (`backend/ModuleMetaRegistry.cs`) le lit pour donner un nom lisible aux modules dans l'admin (`displayName`/`description`). `XSection.config.ts` reste non exploité par le code — connu, pas bloquant.

## La config des modules : en base, par tenant

Avant le passage en multi-tenant, chaque module était configuré via un fichier `site.config.json` unique à la racine du projet. **Ce fichier n'existe plus.** Chaque tenant (table `ClientSite`) porte sa propre config dans la colonne `ModulesConfigJson`, avec exactement la même forme que l'ancien fichier :

```json
{
  "contact": { "authorized": true, "enabled": true },
  "maps": { "authorized": true, "enabled": true, "apiKey": "" },
  "blog": { "authorized": true, "enabled": false },
  "catalogue": { "authorized": false, "enabled": false }
}
```

> `maps.address` a existé un temps mais a été retiré (2026-07-26) : l'adresse est une info d'établissement partagée entre modules, pas propre à Maps — elle vit maintenant dans `SiteContent.Address` (voir `docs/06-contenu-site.md`, page "Établissement"). Un module garde dans `ModulesConfigJson` uniquement ce qui lui est vraiment propre (ex. `apiKey`).

## Deux niveaux de contrôle : autorisation (agence) et activation (client)

Depuis 2026-07-26, chaque module a deux booléens distincts, pas un seul :

- **`authorized`** — décidé uniquement par Ethan, depuis `/admin/dashboard` (formulaire "Modules autorisés" d'un client). Correspond à ce que le client a acheté/négocié.
- **`enabled`** — décidé par le client, depuis son propre admin (`/admin/{clientSiteId}/modules`), mais **seulement parmi les modules autorisés**. Un module non autorisé reste grisé dans son admin, quoi qu'il fasse.

Le module est effectivement actif publiquement seulement si `authorized && enabled`. Autoriser un module l'active aussi immédiatement (le client peut ensuite le masquer) ; révoquer l'autorisation le désactive aussi.

**Rétrocompatibilité** : un module déjà présent dans `ModulesConfigJson` sans champ `authorized` explicite (configs créées avant l'ajout de ce champ) est traité comme autorisé — voir `ModuleRegistry.IsAuthorized`. Un module absent du JSON (jamais touché par Ethan) ne l'est pas.

## Comment le toggle fonctionne

**Côté backend** : `ModuleRegistry` (service *scoped*, dépend d'`AppDbContext`) lit `ClientSite.ModulesConfigJson` à chaque appel, pour le `clientSiteId` demandé (pas de cache — coût négligeable). Toutes les routes d'un module sont toujours mappées dans `Program.cs`, mais chaque handler vérifie `ModuleRegistry.IsEnabledAsync(clientSiteId, "nom-du-module")` en premier (qui vérifie `authorized && enabled`) et renvoie `Results.NotFound()` sinon pour CE tenant. `ModuleRegistry.SetEnabledAsync` (appelé par l'admin du tenant) refuse silencieusement si le module n'est pas autorisé ; `ModuleRegistry.SetAuthorizedAsync` (appelé uniquement par `AgencyDashboardEndpoints`) est le seul chemin qui peut poser `authorized`. Un toggle par un client n'affecte que sa propre ligne en base, jamais les autres tenants (testé à chaque nouveau tenant créé).

**Côté frontend** : le hook `useModules(clientSiteId)` lit `/api/t/{clientSiteId}/config/modules` et n'affiche/importe que les composants des modules actifs pour CE tenant, via `React.lazy()` (code splitting réel). Voir `frontend/vite.config.ts` (alias `@modules`) et `frontend/tsconfig.json` pour la résolution des imports hors de `/frontend`.

## Règle de dépendances entre modules

Un module peut déclarer une dépendance dans `module.meta.json` (ex : le module "Paiement Stripe" pourrait nécessiter le module "Panier"). Toujours pas implémenté — prévu pour plus tard.

## Ajouter un nouveau module (pattern à suivre)

1. Copier le dossier d'un module existant proche (`/modules/contact` par exemple)
2. Renommer, adapter l'entité (ajouter `ClientSiteId` !), les endpoints (routes préfixées `/api/t/{clientSiteId}/...`, requêtes EF Core filtrées par `ClientSiteId`), le composant React (prop `clientSiteId`)
3. Ajouter une entrée dans `docs/04-catalogue-modules.md`
4. Le module apparaîtra automatiquement dans l'admin de chaque tenant qui l'active (rien à ajouter côté config globale, il n'y en a plus)
5. Tester avec au moins deux tenants : activer chez l'un → vérifier qu'il apparaît et fonctionne pour lui uniquement ; l'autre tenant ne doit voir ni le module actif ni ses données
