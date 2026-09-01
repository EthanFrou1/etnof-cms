# 08 — Hébergement et domaines clients

## ⚠️ Mis à jour (2026-07-26) : passage en multi-tenant

Ce document décrivait à l'origine un hébergement "un déploiement Docker Compose par client". Ce principe a été abandonné (voir `00-vision.md`) : la plateforme est maintenant multi-tenant, **une seule installation** (un backend, un frontend, une base de données PostgreSQL) sert tous les clients. La section "Isolation entre clients" ci-dessous est donc obsolète et conservée seulement pour historique.

## Décision (toujours valable)

Auto-hébergement via Coolify (déjà en place chez Ethan), pas d'IIS/Windows Server, pas de Vercel/Railway payant.

## Pourquoi

- .NET 8 tourne nativement en conteneur Linux, pas besoin de Windows/IIS
- Coolify gère nativement : reverse proxy (Traefik), SSL automatique (Let's Encrypt)
- Une seule installation multi-tenant = un seul déploiement à maintenir, contrairement à un stack par client

## Isolation entre clients (mis à jour)

Plus d'isolation au niveau infrastructure (plus un stack Docker par client). L'isolation se fait maintenant **au niveau applicatif** : chaque requête est scopée par `clientSiteId` (voir `02-architecture-modules.md`), chaque ligne en base porte une clé `ClientSiteId`. Testé à chaque tenant créé (voir `05-roadmap-poc.md`, section passage en multi-tenant).

## Flux domaine → site client

1. **Le client achète et reste propriétaire de son propre nom de domaine** (chez le registrar de son choix — OVH, Ionos…), jamais Ethan/l'agence. Décision confirmée par recherche sur la concurrence (2026-09-01) : Duda (plateforme white-label pour agences, le cas le plus proche du nôtre) et Webflow fonctionnent tous les deux ainsi — ni l'un ni l'autre ne revend de domaines, seulement l'hébergement/SSL. Ethan peut proposer de s'en occuper *pour* le client (service payant), mais toujours avec le compte du client, jamais le sien.
2. Le client (ou Ethan pour lui) pointe son domaine vers le serveur Coolify — un simple enregistrement DNS (CNAME/A) à ajouter chez son registrar.
3. **Décision d'Ethan (2026-09-01)** : pas de sous-domaine gratuit du type `client.etnof-web.com` en attendant — un site n'est considéré "en ligne" que lorsque son propre domaine est configuré. Jusque-là il reste seulement accessible via `/t/{clientSiteId}` (lien de prévisualisation interne, jamais donné à un client final).
4. **Implémenté (2026-09-01)** : `ClientSite.CustomDomain` (nullable, normalisé sans protocole/`www.`/chemin — voir `DomainEndpoints.NormalizeDomain`), renseigné par Ethan depuis l'espace agence (`SitesSection.tsx`, "Domaine personnalisé"), jamais par le client. `GET /api/domain-resolve?host=...` (`backend/DomainEndpoints.cs`) résout un nom d'hôte vers un `clientSiteId`. Côté frontend, `App.tsx` (`DomainRouter`) appelle cet endpoint quand le nom d'hôte visité n'est ni `localhost` ni reconnu par les routes internes (`/admin/...`, `/t/{clientSiteId}/...`) — un domaine résolu affiche le site public du tenant correspondant (`renderTenantSite`, factorisée pour être partagée entre `/t/{clientSiteId}/...` et la résolution par domaine), un domaine inconnu (y compris celui de la plateforme elle-même) retombe sur le dashboard agence.
5. **Reste à faire côté infra** (hors code applicatif) : ajouter le domaine du nouveau client dans la configuration Coolify/Traefik pour qu'il route vers l'appli et obtienne son certificat Let's Encrypt — geste manuel par Ethan à chaque nouveau client vu le volume (pas d'automatisation API Coolify prévue pour l'instant, non nécessaire tant que ce n'est pas un vrai point de friction).

**Hébergement payé par l'agence**, jamais refacturé séparément au client (les tarifs d'Ethan l'incluent déjà) — décision confirmée le 2026-09-01.

## Backoffice client : chemin (`/admin/{clientSiteId}`)

Chaque tenant a son admin sur un chemin dédié (pas de sous-domaine par client pour l'instant, cohérent avec l'approche "une seule installation").

## Statut

Le socle multi-tenant (isolation applicative, admin par client, vue globale agence) est implémenté et testé en local. Le routing par nom de domaine personnalisé (colonne + résolution + routing frontend, voir ci-dessus) est codé et compile (`dotnet build`/`tsc -b` propres, migration appliquée), **pas encore vérifié en conditions réelles** (pas de vrai domaine/serveur Coolify à disposition dans cet environnement). Reste à faire, hors code : premier déploiement Coolify réel, test bout en bout avec un vrai nom de domaine pointé vers le serveur.
