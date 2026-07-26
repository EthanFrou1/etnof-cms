# 07 — Admin global etnof-web

## Objectif

Un outil réservé à Ethan, donnant une vue d'ensemble sur tous les projets clients : quels modules sont actifs chez qui, type de site, statut du projet, lien vers le site déployé, avec des statistiques agrégées (graphiques).

Ce n'est PAS un backoffice pour les clients (voir Phase 3 dans `05-roadmap-poc.md` pour ça) — c'est un tableau de bord d'observation.

## Décision (2026-07-26) : implémenté dans ce repo, données manuelles

Contrairement à l'approche initialement envisagée ci-dessous (outil séparé), Ethan a demandé cette fonctionnalité **directement dans l'admin de ce repo**, avec les données **en base de données** (pas de fichier séparé). Décision assumée : chaque site client reste bien un déploiement isolé (`docs/08-hebergement-domaines.md`), mais l'outil de suivi vit dans le même code que le starter-kit plutôt que dans un projet à part.

**Pas de synchronisation automatique** avec les sites clients déployés : Ethan saisit lui-même chaque client dans la vue globale (nom, type de site, description, URL, statut, modules actifs), au moment où il livre le projet. Rien ne se connecte aux déploiements réels des clients.

### Implémenté

- Entité `ClientSite` (`backend/ClientSite.cs`) : nom, type de site (texte libre), description, URL, statut (`En cours`/`Livré`/`En maintenance`), liste de modules actifs.
- Endpoints (protégés par le même mot de passe admin que le reste de `/api/admin`, voir `backend/AgencyDashboardEndpoints.cs`) :
  - `GET/POST/PUT/DELETE /api/admin/client-sites[/{id}]` — CRUD du catalogue
  - `GET /api/admin/stats` — agrégats (total, répartition par statut/type/module) pour les graphiques
- Page `/admin/dashboard` (`frontend/src/pages/AgencyDashboardPage.tsx`), accessible depuis un lien discret sur `/admin` — stat tiles (total, par statut) + graphiques en barres horizontales (modules les plus utilisés, types de site), plus la liste/formulaire CRUD des sites clients.
- Graphiques construits à la main (SVG/HTML, pas de librairie de charts ajoutée) en suivant la skill dataviz : une seule teinte séquentielle (bleu `#2a78d6`, palette de référence validée) pour les comparaisons de magnitude, stat tiles pour les nombres clés plutôt qu'un graphique à 3 tranches.

### Mise à jour du 2026-07-26 : modules autorisés + tarifs

- La liste de checkboxes modules du formulaire client n'est plus codée en dur : `GET /api/admin/modules` lit dynamiquement `ModuleMetaRegistry.GetAll()`, tout module ajouté au socle apparaît automatiquement (corrige un bug où "Catalogue" n'apparaissait jamais dans ce formulaire).
- Ce que coche Ethan dans ce formulaire, ce sont les modules **autorisés** pour ce client (pas juste "actifs") — le client peut ensuite les activer/désactiver lui-même dans son propre admin, mais seulement parmi ceux-là. Voir `docs/02-architecture-modules.md`, section "Deux niveaux de contrôle".
- Nouveau panneau **"Tarifs des modules"** sur `/admin/dashboard` : prix (texte libre) par module, global au socle, affiché aux clients sur la card d'un module non autorisé ("Activer pour {prix}", avec un lien `mailto:` vers l'agence). `GET/PUT /api/admin/modules/{name}/price`.

### Reste à faire si le besoin grandit

- Synchronisation automatique (chaque site client expose un endpoint de statut, l'admin global vient l'interroger) — explicitement écarté pour l'instant, à reconsidérer si la saisie manuelle devient pénible avec beaucoup de clients.
- Historique des échanges / gestion de prospects (Prospect, Mockup, EmailEnvoyé...) — toujours hors scope, non implémenté.
- Mécanisme de dépendance entre modules (ex. rendre "Catalogue" prérequis d'un futur module) — toujours juste documenté dans `module.meta.json`, jamais appliqué (décision explicite d'Ethan de ne pas le construire pour l'instant, voir `docs/05-roadmap-poc.md`).

## Pourquoi la séparation stricte n'a pas été retenue

L'argument initial ("aucune donnée d'un client ne transite par un système partagé") reste valable **pour les données des clients eux-mêmes** (contenu de leur site, messages de contact, etc. — toujours isolés par déploiement). Il ne s'appliquait pas vraiment à ce tableau de bord : c'est Ethan qui saisit manuellement des métadonnées **à propos de** ses clients (pas une réplication de leurs données), donc le coupler au starter-kit n'introduit pas de fuite de données entre clients.
