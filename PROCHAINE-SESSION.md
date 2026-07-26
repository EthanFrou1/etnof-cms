# Reprise de session — dernière mise à jour 2026-07-26 (soir)

Ce fichier résume où on en est pour reprendre rapidement demain. Le détail complet (technique, tests effectués, bugs rencontrés) est dans `docs/05-roadmap-poc.md`, section par section datée du 2026-07-26 — ce fichier-ci n'en est qu'un résumé de reprise.

## ⚠️ Rien n'est commité

Tout le travail de cette session (et apparemment tout ce qui existe dans `backend/`, `frontend/`, `modules/`, `docs/`) est **non suivi par Git** — un seul commit existe dans l'historique ("Initial commit"), qui ne semble pas inclure ces dossiers. Avant de continuer demain, vaut le coup de vérifier `git status` et de commiter ce qui doit l'être, pour avoir un point de retour en cas de souci.

## Ce qui a été fait aujourd'hui

Dans l'ordre :

1. **Module Catalogue** (produits, panier, commande) — photos multi-upload, stock décrémenté au checkout, admin Produits (cards + modal d'ajout) et Commandes (tableau trié/filtré/paginé).
2. **Autorisation des modules à deux niveaux** — Ethan seul décide ce qu'un client peut utiliser (`authorized`), le client décide ensuite s'il l'affiche (`enabled`) parmi ce qui lui est autorisé.
3. **CRM Clients** — fiche client réelle (nom/email/téléphone/adresse/notes), rattachée aux commandes, page liste + fiche détail. Rattaché au module Catalogue (pas de module séparé).
4. **Page Modules en cards** — image par module (générées par IA, prompts dans `docs/11-images-modules.md`), toggle animé, modules non autorisés visibles mais grisés avec prix + bouton d'activation (mailto).
5. **Tarifs des modules** — panneau sur `/admin/dashboard` pour fixer un prix par module (texte libre).
6. **Page Établissement** — nom/type/adresse/téléphone + recherche Google Places en direct (autocomplete), panneau résumé avec photos façon fiche établissement. L'adresse a quitté la config du module Maps pour vivre ici.

## État du serveur (au moment d'écrire ce fichier)

- Backend lancé par Claude Code sur le port 5052 (`dotnet run --launch-profile http`) — à relancer toi-même si tu as fermé le terminal.
- Frontend Vite sur le port 5173.
- Mot de passe agence **et** mot de passe du tenant historique (`11111111-1111-1111-1111-111111111111`) : `admin123` (les deux hash sont identiques depuis la migration multi-tenant).
- Clé Google Places configurée dans `backend/appsettings.Development.json` (gitignored) — projet Google Cloud `LoyalityProject`, clé dédiée sans restriction d'application, restreinte à l'API Places.

## À vérifier / reste à faire

- [ ] **QA visuelle des deux derniers changements** (panneau photo Établissement, autocomplete sur le nom) — pas encore confirmés par capture d'écran contrairement au reste de la session.
- [ ] **Poids des images de cards Modules** : ~1,2 Mo chacune (4 images), à recompresser si tu veux alléger le chargement de la page Modules (voir `docs/11-images-modules.md`).
- [ ] **Vrais tarifs des modules** : seule une valeur de test ("450 EUR" sur Catalogue) a été posée pendant les tests — à fixer pour de vrai depuis `/admin/dashboard`.
- [ ] **Google Business Profile API (OAuth)** : mise de côté au profit de Google Places (plus simple, suffisant pour la recherche d'établissement). Si tu veux un jour l'import automatique complet depuis une fiche GMB existante (pas juste une recherche), il faudra reprendre la demande d'accès Google (voir échange du jour, API restreinte nécessitant validation manuelle de Google).
- [ ] **Grille tarifaire** (`docs/04-catalogue-modules.md`) : le module Catalogue n'a toujours pas de prix officiel dans la grille — à trancher.
- [ ] Données de démo sur le tenant historique : un produit ("Bougie parfumee"), une commande annulée, un client ("Marie Dupont") — laissés intentionnellement comme exemples, à nettoyer si tu préfères un tenant vierge pour tes démos clients.

## Pour reprendre rapidement

```
docker compose up -d
cd backend && dotnet run
# nouveau terminal
cd frontend && pnpm dev
```

Puis `http://localhost:5173/admin/dashboard`, mot de passe `admin123`.
