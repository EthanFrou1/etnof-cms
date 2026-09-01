# CLAUDE.md — Instructions pour Claude Code

Ce fichier est lu automatiquement par Claude Code au démarrage de chaque session. Il définit les règles du projet.

## Contexte du projet

Starter-kit modulaire pour la création de sites web clients (etnof-web). Le but : un socle de code réutilisable où chaque projet client active uniquement les modules dont il a besoin (Blog, RDV, Paiement, Chat IA, etc.), au lieu de repartir de zéro à chaque fois.

Ce n'est PAS un CMS multi-tenant. Chaque client = un déploiement indépendant généré à partir de ce socle.

## Stack technique (figé — ne pas changer sans validation explicite)

- Backend : ASP.NET Core (.NET 8), EF Core, PostgreSQL
- Frontend : React + Vite + TypeScript + TailwindCSS
- Environnement : 100% local en phase POC (Docker Compose), aucun service payant tant que non validé
- Config des modules : fichier `site.config.json` à la racine de chaque projet généré

## Règles de fonctionnement avec Claude Code

1. **Ne jamais sauter une phase.** Le fichier `docs/05-roadmap-poc.md` liste les phases dans l'ordre. Chaque phase a une checklist de validation (test gate) à cocher avant de passer à la suivante.
2. **Avant de coder une phase**, relire le fichier de doc correspondant dans `docs/`.
3. **Après chaque phase**, mettre à jour `docs/05-roadmap-poc.md` (cocher les cases faites) et signaler explicitement ce qui a été testé et validé.
4. **Un module = un dossier isolé.** Ne jamais mélanger le code de deux modules dans le même fichier. Voir `docs/02-architecture-modules.md` pour le pattern exact.
5. **Ne pas ajouter de dépendance/service externe** (API tierce, service payant, librairie lourde) sans le signaler et demander confirmation.
6. **Toujours proposer un test simple et rapide à faire manuellement** à la fin d'une tâche (lancer l'app, cliquer, vérifier un comportement) plutôt que de supposer que ça marche.
7. **Rester simple.** Pas de sur-ingénierie (pas de microservices, pas de message queue, pas de Kubernetes) : c'est un starter-kit pour un développeur solo, pas une plateforme d'entreprise.

## Où trouver quoi

- `docs/00-vision.md` — le pourquoi du projet
- `docs/01-stack-technique.md` — détail des choix techniques et alternatives écartées
- `docs/02-architecture-modules.md` — comment un module est structuré et comment le toggle fonctionne
- `docs/03-modele-donnees.md` — schéma de base de données
- `docs/04-catalogue-modules.md` — liste des modules prévus (alignés sur la grille tarifaire etnof-web)
- `docs/05-roadmap-poc.md` — phases, todo list, checklists de validation
- `JIRA.md` — conventions Jira (fichier générique, identique sur tous les repos d'Ethan et Noa)
