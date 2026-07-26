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

## Flux domaine → site client (prévu, pas encore implémenté)

Reste à construire (voir `00-vision.md`, "Hors scope actuel") :
1. Le client (ou Ethan) a ou achète un nom de domaine
2. DNS pointé vers l'IP du serveur Coolify
3. Un mécanisme de résolution associe le domaine appelé au bon `clientSiteId` (par exemple une table `domaine → clientSiteId` consultée avant de servir la requête), plutôt que le chemin `/t/{clientSiteId}` actuel
4. Coolify/Traefik génère le certificat SSL par domaine

Tant que ce mécanisme n'existe pas, chaque client est accessible via `/t/{clientSiteId}` sur le domaine unique de la plateforme — pas encore de nom de domaine personnalisé par client en production.

## Backoffice client : chemin (`/admin/{clientSiteId}`)

Chaque tenant a son admin sur un chemin dédié (pas de sous-domaine par client pour l'instant, cohérent avec l'approche "une seule installation").

## Statut

Le socle multi-tenant (isolation applicative, admin par client, vue globale agence) est implémenté et testé en local. Le routing par nom de domaine personnalisé et l'achat de domaine restent à construire — voir `00-vision.md`.
