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
  TemplateClassique.tsx  <- navbar pilule, hero centré, sections empilées (design d'origine)
  TemplateModerne.tsx    <- bandeau plein cadre en dégradé, offre mise en avant en carte CTA
```

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

## Prochaine étape (à partir du 2026-07-28) : reprise du design des templates

Décision d'Ethan : reprendre le design visuel des templates existants, **un template à la fois** plutôt que les deux en parallèle. Pour chaque template : lui trouver un nom (marketing, pas juste "Classique"/"Moderne"), définir sa propre palette de couleurs (aujourd'hui les deux templates héritent tels quels du dégradé signature etnof-web de `docs/09-charte-graphique.md` — chaque template aurait sa propre identité), retravailler la mise en page en conséquence. Pas encore commencé — voir `PROCHAINE-SESSION.md` pour le point d'entrée de la prochaine session.
