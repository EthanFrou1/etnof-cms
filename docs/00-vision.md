# 00 — Vision du projet

## Le problème actuel

Chaque nouveau projet client etnof-web repart quasiment de zéro : structure du site, formulaire de contact, intégration Maps, back-office éventuel... Beaucoup de code réécrit à chaque fois, ce qui coûte du temps (donc de l'argent) et augmente le risque d'erreurs ou d'oublis.

## L'objectif

Construire une plateforme modulaire : un socle de code (React + .NET) où chaque fonctionnalité vendue dans la grille tarifaire (Blog, RDV, Paiement Stripe, Multilingue, Chat IA, etc.) existe déjà sous forme de module prêt à l'emploi, activable ou non selon le client — sans repartir de zéro à chaque nouveau projet.

## ⚠️ Changement de cap (2026-07-26) : passage en multi-tenant

Le POC (Phases 0 à 5, voir `05-roadmap-poc.md`) a été construit sur le principe **"un déploiement = un client"** : chaque client avait sa propre installation isolée, sa propre base de données. Ce principe est **abandonné** depuis le 2026-07-26, à la demande d'Ethan : la plateforme est maintenant **multi-tenant** — une seule installation partagée, où chaque client est une ligne en base de données (table `ClientSite`), avec son propre mot de passe et son propre contenu, mais tout géré depuis le même backend/frontend/base de données.

Concrètement, démarrer un nouveau projet client devient :
1. Ethan crée le client depuis sa vue globale (`/admin/dashboard`) : nom, type de site, modules activés, mot de passe
2. Le client reçoit le lien vers son admin (`/admin/{id-de-son-site}`) pour éditer son contenu
3. Son site public est accessible sur `/t/{id-de-son-site}` — à terme sur son propre nom de domaine (voir "Hors scope actuel" ci-dessous)

## Ce que ce projet n'est PAS (mis à jour)

- ~~Ce n'est pas un CMS multi-tenant façon Wix/Webflow~~ — **si, maintenant, c'est exactement ça, assumé.** Voir le changement de cap ci-dessus.
- Ce n'est pas (encore) un produit à vendre à d'autres développeurs — c'est un outil interne à etnof-web
- Ce n'est pas une réécriture de tout ce qui existe déjà chez les clients actuels — c'est pour les futurs projets

## Hors scope actuel (prévu, pas encore construit)

- **Nom de domaine personnalisé par client** : à terme, chaque client doit pouvoir connecter son propre domaine (ou s'en faire acheter un, à la manière de Wix/Squarespace) pour son site public. Pas encore implémenté — la plateforme fonctionne aujourd'hui avec des URLs internes (`/t/{id}`).
- **Achat de domaine pour le compte d'un client** : nécessiterait d'intégrer une API de registrar tierce et payante — à signaler et valider explicitement le moment venu (voir règle 5 de `CLAUDE.md`).
- Facturation/forfaits formels au-delà d'une simple liste de modules activés par client.

## Deux systèmes d'administration à ne pas confondre (voir `07-admin-global.md`)

1. **Admin par client** (`/admin/{id}`) : accès par mot de passe pour CE client, pour éditer son propre contenu et activer/désactiver ses propres modules. Ne voit jamais les données d'un autre client.
2. **Vue globale agence** (`/admin/dashboard`) : réservée à Ethan, mot de passe agence, vue d'ensemble sur tous les clients (création de comptes, statuts, stats). Voir `07-admin-global.md`.

## Critères de succès

- Isolation stricte entre clients : aucune donnée d'un client n'est jamais visible ou modifiable par un autre (testé à chaque nouveau tenant créé)
- Activer/désactiver un module pour un client se reflète immédiatement sur son site, sans affecter les autres clients
- Ajouter un nouveau module (backend + frontend) suit un pattern clair et documenté, reproductible rapidement — voir `02-architecture-modules.md`
