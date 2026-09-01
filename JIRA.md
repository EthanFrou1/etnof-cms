# JIRA.md — Conventions Jira (fichier générique, identique sur tous les repos)

Ce fichier est le même dans tous les projets (etnof-cms, FideliteProPlus, Nexios...). Il donne à
n'importe quel agent Claude Code, quel que soit le repo où il tourne, les conventions Jira de
l'entreprise pour qu'il reste cohérent avec ce qui existe déjà.

Site Jira : `https://ethanfrou1.atlassian.net`. Plan gratuit (10 utilisateurs max sur le site,
100 automatisations/mois, 2 Go de stockage) — ne pas proposer d'automatisation lourde ou de
fonctionnalité premium sans le signaler.

## Un projet Jira par produit (pas par client)

| Produit | Repo | Clé Jira | Responsable |
|---|---|---|---|
| etnof-cms | `etnof-cms` | `KAN` | Ethan |
| FideliteProPlus | `projet-loyaltyCard` | `FID` | Ethan |
| Nexios | (pas encore de repo) | `NEX` | Noa |

Personnes : Ethan Frou (`ethanfrou1@gmail.com`), Noa Frou (`nfrou4@gmail.com`).

Chaque produit multi-tenant (etnof-cms, FideliteProPlus) a un seul projet Jira, même s'il sert
plusieurs clients — le client n'est jamais un projet à part, voir plus bas.

## Comment classer un ticket

- **Parent (Epic)** = le client/tenant concerné (ex: "Au salon d'Alma", "BB.Dynasty"), ou l'epic
  "Plateforme (cœur produit)" si le ticket ne concerne aucun client en particulier. Un ticket n'a
  qu'un seul Parent — ne jamais l'utiliser pour autre chose que cet axe-là.
- **Étiquette (label)** = le module/thème technique concerné (ex: `blog`, `catalogue`, `stripe`,
  `rdv`...). Axe secondaire, complémentaire au Parent. Une étiquette n'existe qu'une fois tapée sur
  un vrai ticket — pas de liste à préremplir à part.
- Ne **jamais créer un projet Jira par client** — ça ne scale pas (décision explicite d'Ethan).

## Types de tickets

`Epic`, `Sous-tâche`, `Tâche`, `Bug`, `Demande client` (support/config demandée par un client, à
distinguer d'une tâche de dev interne). `Fonctionnalité`/`Story` existent par défaut mais ne sont
pas activement utilisés.

## Statuts (harmonisés sur les 3 projets)

`Ouvert`  → `En cours` → `Revue en cours` → `Terminé`.

## Filtres

Chacun a ses filtres persos "Mes tickets" (par projet + un global tous projets), qui excluent les
tickets Terminé (`statusCategory != Done`) et affichent la colonne Parent. Pas de filtre par
client — voir plus haut.

## Pour un agent qui a accès à Jira (MCP Atlassian)

- Avant de créer un ticket à partir d'un historique/journal (commits, docs de session...),
  vérifier qu'il correspond à un besoin **réel et actuel**, pas à quelque chose déjà résolu dans
  une session ultérieure. En cas de doute, demander plutôt que d'importer en masse.
- Le connecteur actuel ne permet **pas** de : créer/renommer un projet, inviter un utilisateur,
  créer un filtre sauvegardé, créer un composant ou un type de ticket, éditer un workflow. Pour
  ces actions, donner la marche à suivre manuelle (Paramètres du projet / du site) plutôt que
  d'essayer de les exécuter.
- Ne pas committer avec des identifiants Jira dans les messages de commit sauf si ça devient une
  convention explicitement demandée — pour l'instant les commits restent descriptifs, sans
  référence de ticket.
