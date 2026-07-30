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
- Page `/admin/dashboard` — stat tiles (total, par statut) + graphiques en barres horizontales (modules les plus utilisés, types de site), plus la liste/formulaire CRUD des sites clients. Voir la mise à jour du 2026-07-30 ci-dessous pour l'emplacement actuel du code (la page a depuis été restructurée avec une sidebar).
- Graphiques construits à la main (SVG/HTML, pas de librairie de charts ajoutée) en suivant la skill dataviz : une seule teinte séquentielle (bleu `#2a78d6`, palette de référence validée) pour les comparaisons de magnitude, stat tiles pour les nombres clés plutôt qu'un graphique à 3 tranches.

### Mise à jour du 2026-07-26 : modules autorisés + tarifs

- La liste de checkboxes modules du formulaire client n'est plus codée en dur : `GET /api/admin/modules` lit dynamiquement `ModuleMetaRegistry.GetAll()`, tout module ajouté au socle apparaît automatiquement (corrige un bug où "Catalogue" n'apparaissait jamais dans ce formulaire).
- Ce que coche Ethan dans ce formulaire, ce sont les modules **autorisés** pour ce client (pas juste "actifs") — le client peut ensuite les activer/désactiver lui-même dans son propre admin, mais seulement parmi ceux-là. Voir `docs/02-architecture-modules.md`, section "Deux niveaux de contrôle".
- Nouveau panneau **"Tarifs des modules"** sur `/admin/dashboard` : prix (texte libre) par module, global au socle, affiché aux clients sur la card d'un module non autorisé ("Activer pour {prix}", avec un lien `mailto:` vers l'agence). `GET/PUT /api/admin/modules/{name}/price`.

### Reste à faire si le besoin grandit

- Synchronisation automatique (chaque site client expose un endpoint de statut, l'admin global vient l'interroger) — explicitement écarté pour l'instant, à reconsidérer si la saisie manuelle devient pénible avec beaucoup de clients.
- Historique des échanges / gestion de prospects (Prospect, Mockup, EmailEnvoyé...) — toujours hors scope, non implémenté.
- Mécanisme de dépendance entre modules (ex. rendre "Catalogue" prérequis d'un futur module) — toujours juste documenté dans `module.meta.json`, jamais appliqué (décision explicite d'Ethan de ne pas le construire pour l'instant, voir `docs/05-roadmap-poc.md`).

### Navigation fusionnée en sidebar (2026-07-30)

`AgencyDashboardPage.tsx` (vue globale, une seule page qui scrollait) et `AgencyBillingPage.tsx` (facturation, ses propres onglets internes) sont remplacées par une navigation unique, même pattern que l'admin par tenant (`AdminLayout.tsx`) :

- `frontend/src/components/admin/AgencyLayout.tsx` — sidebar avec les sections en accès direct (Tableau de bord, Tarifs des modules, Sites clients) et un groupe repliable "Facturation" (Entreprise, Clients, Formules, Devis, Factures, Paiement).
- `frontend/src/pages/AgencyPage.tsx` — page orchestratrice (login + layout + switch de section), remplace les deux anciens fichiers.
- `frontend/src/pages/agency/*.tsx` — un fichier par section (`OverviewSection`, `PricingSection`, `SitesSection`, `CompanySection`, `BillingClientsSection`, `PackageOffersSection`, `QuotesSection`, `InvoicesSection`, `PaymentSection`), plus `shared.tsx` pour les types/composants communs (`TariffPicker`, `formatPrice`...).
- Ancienne URL `/admin/dashboard/facturation` redirigée vers `/admin/dashboard/entreprise` (voir `App.tsx`) pour ne pas casser un lien existant.

**Pattern de création généralisé** (Sites clients, Clients de facturation, Devis, Factures) : un bouton dans le header de la page ouvre une modal contenant le formulaire, réutilisée aussi pour l'édition ; le bouton de soumission reste désactivé tant que les seules infos réellement nécessaires à la création ne sont pas renseignées (ex. nom + mot de passe pour un site, client sélectionné pour un devis/une facture).

**Formules en cards** : `PackageOffersSection.tsx` affiche les formules en cards (reprend le style de la page tarifs publique du site etnof-web) plutôt qu'en liste — `PackageOffer` a gagné `Description`, `FeaturesJson` (liste de fonctionnalités) et `Highlighted` (badge "Le plus populaire"), voir `docs/03-modele-donnees.md`.

## Facturation & devis (ajouté le 2026-07-30)

Outil de facturation pour l'agence elle-même (etnof-web), pas pour les clients tenants — voir `docs/13-facturation-devis.md` pour la recherche juridique et la décision de portée V1. À l'origine une page séparée `/admin/dashboard/facturation` (`AgencyBillingPage.tsx`) reliée par un lien depuis `/admin/dashboard` — fusionnée depuis dans la même navigation (voir mise à jour du 2026-07-30 ci-dessous), même auth que le reste de l'agence (`AdminAuth`, mot de passe agence).

Six onglets au total à ce jour (Entreprise, Clients, Formules, Devis, Factures, Paiement), ajoutés progressivement dans la même journée. Les quatre briques cœur ci-dessous, dans l'ordre où elles ont été construites :
1. **Entreprise** (`CompanyProfile`) : SIRET, adresse, mention TVA, IBAN, pénalités de retard, lien CGV, logo — une seule ligne, réutilisée sur chaque PDF.
2. **Clients** (`BillingClient`) : destinataires des devis/factures — un `ClientSite` existant (lien facultatif) ou un prospect hors plateforme.
3. **Devis** (`Quote`) : lignes libres, PDF téléchargeable (QuestPDF, génération à la volée), passage en "envoyé", puis acceptation par le client via un lien public **sans authentification** (`/devis/{id}`, `QuoteAcceptancePage.tsx`) — signature électronique simple (nom/email/IP capturés, pas de service tiers).
4. **Factures** (`Invoice`) : créées manuellement ou depuis un devis accepté (bouton "Créer une facture", choix acompte/solde/facture unique). Le numéro légal (`2026-0001`, séquence sans trou) n'est attribué qu'à la **finalisation** — une facture finalisée est verrouillée (plus de modification/suppression), seule l'annulation reste possible.

**Dépendance ajoutée** : package NuGet QuestPDF (licence Community gratuite, approuvée par Ethan — voir `docs/13-facturation-devis.md`) pour la génération des PDF, aucun service externe payant.

**Hors scope V1** (à reprendre plus tard si besoin) : envoi d'email automatique des devis/factures (le lien PDF/public est partagé manuellement par Ethan pour l'instant), avoirs/notes de crédit, conformité Factur-X/PDP (échéance légale de la réforme de facturation électronique : 1er septembre 2027 pour l'émission B2B des micro-entreprises).

Testé (curl, tenant historique + client de facturation de test) : devis créé → PDF valide (QuestPDF) → passé "envoyé" → accepté via le lien public sans aucun header d'auth → facture d'acompte créée depuis le devis accepté, finalisée (`2026-0001`) → facture de solde créée et finalisée (`2026-0002`, séquence continue confirmée) → modification/suppression refusées après finalisation (400) → marquage payée → PDF facture valide.

### Paiement en ligne des factures (ajouté le 2026-07-30)

5e onglet **Paiement** : compte Stripe **de l'agence** (`AgencyStripeSettings`, singleton) — distinct des comptes Stripe de chaque tenant (module Stripe, `docs/04-catalogue-modules.md`). Même mécanisme que ce module (session Checkout + webhook confirme le paiement), transposé au niveau agence : `backend/InvoicePaymentEndpoints.cs` expose `GET /api/public/invoices/{id}` (jamais un brouillon), `POST /api/public/invoices/{id}/checkout` (refuse si la facture n'est pas `sent` ou déjà `paid`) et `POST /api/public/invoices/stripe-webhook` (idempotent via `Invoice.StripeSessionId`). Page publique `/facture/{id}` (`InvoicePublicPage.tsx`) : bouton "Payer en ligne" si `sent`, bandeau de confirmation si `paid`, poll léger au retour de Stripe (`?checkout=success`) le temps que le webhook confirme.

Légalité confirmée avec Ethan avant de coder : Stripe est un PSP agréé, aucune autorisation spéciale requise pour un auto-entrepreneur ; la facture reste obligatoire quel que soit le moyen de paiement ; le CA encaissé via Stripe compte normalement pour le plafond micro-entreprise, à verser sur le compte bancaire dédié (obligatoire au-delà de 10 000€ de CA deux années de suite).

Testé (curl) : `GET /api/admin/stripe-settings` refusé sans mot de passe agence (401) ; paiement refusé sur une facture déjà payée et sur un brouillon (400, jamais exposé publiquement — 404) ; paiement refusé tant qu'aucune clé Stripe n'est configurée (400 explicite). **Testé de bout en bout avec le vrai compte Stripe d'Ethan** (mode test, clé restreinte `Checkout Sessions: écriture` uniquement — pas la clé standard partagée avec son autre projet, `stripe listen` en local pour le webhook faute de déploiement public) : paiement réel avec la carte de test Stripe, facture passée à "Payée" automatiquement, confirmé côté base et dans les logs du webhook.

### Email de confirmation de paiement (ajouté le 2026-07-30, même session)

Dès qu'une facture est payée via le webhook Stripe ci-dessus, un email de confirmation part automatiquement au client (`BillingClient.Email`) avec la facture en PDF jointe — via **Brevo** (déjà utilisé par Ethan sur un autre projet), en simple appel REST (`backend/BrevoEmailService.cs`, `POST https://api.brevo.com/v3/smtp/email`), pas de SDK NuGet ajouté. Config (clé API Brevo) dans une nouvelle section "Email de confirmation" du même onglet "Paiement" (`AgencyEmailSettings`, singleton comme `AgencyStripeSettings`). L'envoi est entouré d'un `try/catch` dans le webhook : un échec Brevo ne fait jamais échouer la confirmation du paiement déjà enregistrée. `Invoice.ConfirmationEmailSentAt` évite un double envoi si Stripe rejoue l'événement.

Déclencheur V1 : uniquement le paiement automatique via Stripe (pas le marquage manuel "payée", pas la confirmation de devis — à reprendre plus tard si le besoin se confirme).

### Lignes de devis/facture depuis les tarifs (ajouté le 2026-07-30, même session)

6e onglet **"Formules"** : gère `PackageOffer` (nom + prix libre, ex "Essentiel — 690€"), auto-seedé avec les 3 formules connues à la première consultation si la table est vide, entièrement éditable ensuite. Dans les onglets Devis et Factures, un nouveau sélecteur **`TariffPicker`** (à côté du bouton "+ Ajouter une ligne") liste les formules et les modules déjà tarifés (`GET /api/admin/modules`, déjà utilisé par le panneau "Tarifs des modules" de `/admin/dashboard`) — cliquer un élément ajoute une ligne préremplie (désignation + prix, quantité 1). Le prix (texte libre, ex "250€"/"Offert") est converti en nombre en ne gardant que les chiffres, même principe que `formatPriceEur`/`onlyDigits` déjà utilisés côté `ModulesSection.tsx`.

## Pourquoi la séparation stricte n'a pas été retenue

L'argument initial ("aucune donnée d'un client ne transite par un système partagé") reste valable **pour les données des clients eux-mêmes** (contenu de leur site, messages de contact, etc. — toujours isolés par déploiement). Il ne s'appliquait pas vraiment à ce tableau de bord : c'est Ethan qui saisit manuellement des métadonnées **à propos de** ses clients (pas une réplication de leurs données), donc le coupler au starter-kit n'introduit pas de fuite de données entre clients.
