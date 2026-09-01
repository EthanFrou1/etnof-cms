# Reprise de session — dernière mise à jour 2026-09-01

Ce fichier résume où on en est pour reprendre rapidement. Le détail complet (technique, décisions, tests effectués) est dans `docs/05-roadmap-poc.md`.

## PR précédente mergée

La PR de la session précédente (#23, `feature/admin-content-restructure` — module Fidélité/cartes enregistrées, domaine personnalisé, retouches admin/Charis) a été validée et mergée dans `main` par Ethan pendant cette session. GitHub a supprimé la branche distante après le merge.

## PR de cette session

Nouvelle branche `feature/admin-content-restructure` (recréée sous le même nom après suppression de la précédente) poussée sur GitHub — `gh` toujours indisponible sur cette machine, **PR à ouvrir manuellement** : https://github.com/EthanFrou1/etnof-cms/pull/new/feature/admin-content-restructure

Contenu (commit `cac5a3f`) :
- **Prix du module Blog corrigé** : 300€ → 250€, pour matcher la page marketing `tarifs.html` (déjà mise à jour par Ethan de son côté avec les nouveaux prix — voir cette page pour la grille complète).
- **5 nouveaux modules-services** (catalogue pur, pas de fonctionnalité technique à activer — même pattern que `horaires`) : `seo-avance` (390€), `logo` (190€), `charte-graphique` (390€), `espace-gestion` (190€), `redaction-contenu` (sans prix chiffré, sur devis).
- **Nouveau toggle "Visible"** dans `/admin/dashboard` → Tarifs des modules (`ModulePrice.Visible`, migration `AddModulePriceVisibility`) : masque un module du catalogue de **tous** les clients d'un coup, sans empêcher de l'autoriser quand même pour un client précis depuis sa fiche (l'autorisation par client prime toujours sur le masquage général).
- **Décision prise avec Ethan** : "Page supplémentaire" (+80€ sur `tarifs.html`) reste volontairement hors du système de modules — ce n'est pas une fonctionnalité on/off, juste un tarif à l'unité pour la composition des forfaits sur la page marketing.

**Bug piégé et corrigé pendant la session** : la migration EF Core générée pour `ModulePrice.Visible` mettait `DEFAULT FALSE` en base malgré le défaut C# `true`, ce qui aurait masqué silencieusement les 17 modules existants pour tous les clients non-autorisés. Corrigé (colonne, fichier de migration, données) avant tout impact réel.

**Testé** (curl, backend local) : `dotnet build` et `tsc -b` propres ; masquage global d'un module → disparaît bien du catalogue d'un tenant non autorisé, mais reste visible pour un tenant explicitement autorisé pour ce module. **Pas encore vérifié par Ethan dans le navigateur** (toggle "Visible" sur les cards de `/admin/dashboard` → Tarifs des modules).

## État des tenants de test

- **Historique** (`11111111-1111-1111-1111-111111111111`) : Hestia/Olivier, mot de passe `admin123`.
- **Boulangerie Dupont** (`e5d113ff-a734-47e9-8aae-78dea8d6102a`) : Hestia/Argile.
- **Atelier Lumen** (`36d1b5f8-d5a4-493a-9ff3-d46616816adb`) : Charis (palette en base : `argile`, invalide pour Charis → retombe sur Noir), mot de passe `admin123`. Module Compte client actif.
- **Aucun tenant Helios** n'existe encore.

## Pour reprendre rapidement

```
docker compose up -d
cd backend && dotnet run
# nouveau terminal
cd frontend && pnpm dev
```

Puis `http://localhost:5173/admin/dashboard`, mot de passe `admin123`.

## Migrations ajoutées cette branche (à appliquer si pas déjà fait : `dotnet ef database update`)

`AddModulePriceVisibility`.
