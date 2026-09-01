# Reprise de session — dernière mise à jour 2026-09-01

Ce fichier résume où on en est pour reprendre rapidement. Le détail complet (technique, décisions, tests effectués) est dans `docs/05-roadmap-poc.md`.

## PR de cette session

Poussé sur `feature/admin-content-restructure` (`gh` toujours indisponible sur cette machine — PR à ouvrir manuellement) : https://github.com/EthanFrou1/etnof-cms/pull/new/feature/admin-content-restructure. **Ne pas merger avant validation d'Ethan.**

Le commit `d9811b4` regroupe **deux sessions distinctes** (voir `docs/05-roadmap-poc.md` pour le détail complet de chacune) :

1. **Module Fidélité + cartes bancaires enregistrées** (session du 2026-08-31) — testé de bout en bout par Claude Code (CDP), mais **jamais vérifié par Ethan en navigateur réel**. À tester en priorité avant de merger : créer un vrai compte client, passer commande, voir sa progression fidélité, repasser commande et vérifier qu'une carte enregistrée est bien proposée par Stripe Checkout.
2. **Domaine personnalisé par client + retouches admin/Charis** (session du 2026-09-01) — colonne `CustomDomain`, résolution par nom de domaine, sélecteur de palette Charis remis, "Notre histoire" remontée, passe mobile admin. Compile proprement (`dotnet build`/`tsc -b`) mais **pas de vérification en navigateur réel non plus** (login admin/agence bloqué par le classifieur de permissions automatique de Claude Code dans ces deux sessions — voir mémoire `feedback-auth-flows-untestable`).

## Prix des modules mis à jour (2026-09-01)

À la demande d'Ethan, `ModulePrices` en base a été mis à jour directement (SQL, pas via l'admin — login bloqué) : `catalogue` 690€ (était 450€), `compte-client` 250€, `fidelite` 190€, `galerie` 100€ (était "Gratuit"), `pages` 150€, `analytics` 120€. Le reste de la table n'a pas été touché.

**Écart repéré, pas corrigé (hors scope de la demande)** : `blog` est à 300€ en base mais la page marketing publique (`https://website-etnof-web.vercel.app/tarifs.html`) annonce 250€ — à trancher par Ethan.

## Page tarifs.html (projet séparé, pas ce repo)

Un brief complet a été préparé pour une session Claude Code sur l'autre projet (site marketing etnof-web) — prix de lancement (690/1090/1990€ affichés) vs prix normal (990/1490/2490€ barré, date limite 31/12/2026), nouvelle grille de modules à la carte, retrait de PayPal/Chat IA/FAQ IA (jamais construits ou abandonnés), repositionnement de "CMS" et "SEO avancé" en services distincts plutôt que fonctionnalités techniques. Le brief complet est dans l'historique de conversation de cette session — pas sauvegardé en fichier dans ce repo (ça concerne un autre projet). **Ethan doit encore lancer cette session sur l'autre repo pour appliquer les changements.**

## Nouveau doc : guide d'onboarding client

`docs/14-nouveau-client.md` (+ version mise en page publiée en artifact privé pour Ethan) : check-list opérationnelle complète, du devis au site en ligne chez un vrai client — statuts, création du site, contenu, domaine, livraison, suivi, catalogue des modules.

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

`AddLoyaltyAndSavedCards`, `AddClientSiteCustomDomain`.
