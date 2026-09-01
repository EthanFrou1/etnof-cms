# 14 — Guide : accueillir un nouveau client, étape par étape

Doc pratique pour Ethan (pas pour Claude Code) : le déroulé complet, du premier contact à un site en ligne chez un vrai client, avec les liens exacts vers chaque écran. À suivre dans l'ordre la première fois, puis à piocher au cas par cas une fois le réflexe pris.

Chaque étape renvoie vers la doc technique correspondante si tu veux le détail (`0X-....md`) — ce fichier reste volontairement une check-list, pas une explication.

## Vue d'ensemble : les 4 statuts d'un site

Un site créé dans l'espace agence a un statut (`Sites clients` → champ "Statut"), qui suit ce déroulé :

```
Prospection  →  En cours  →  Livré  →  (En maintenance)
```

- **Prospection** : site de démo/test, pas un vrai client — le garde-fou "CGV/Politique de confidentialité obligatoires avant paiement" est désactivé pour ce statut (voir `docs/13-facturation-devis.md`). Ne jamais laisser un vrai client sur ce statut.
- **En cours** : le vrai statut par défaut dès qu'un vrai client est engagé — c'est celui que tu utilises pendant toute la construction du site (étapes 2 à 4 ci-dessous).
- **Livré** : le site est en ligne sur le domaine du client, la prestation initiale est terminée.
- **En maintenance** : à utiliser si tu factures un suivi/des retouches après livraison (optionnel, à ton usage).

---

## Étape 1 — Devis et engagement du client

Avant de toucher au code/à la plateforme : tout passe par la partie Facturation de l'espace agence (`/admin/dashboard`), détail complet dans `docs/13-facturation-devis.md`.

1. **Créer le client de facturation** : `Facturation → Clients` — nom, SIRET si société, adresse (autocomplete Google), email, téléphone.
   - ⚠️ Ce "client de facturation" (`BillingClient`) est un **objet différent** du site lui-même (`ClientSite`, créé à l'étape 2) — ils ne sont pas automatiquement liés. C'est normal, tu les relies quand le site existe (voir étape 2).
2. **Créer le devis** : `Facturation → Devis` — nouveau devis pour ce client, lignes piochées directement dans tes tarifs (`TariffPicker` : formules de base + modules à la carte, déjà configurés dans `Tarifs des modules`).
3. **Envoyer le lien du devis** au client (partagé à la main pour l'instant, pas d'envoi automatique par email — voir "Hors scope V1" dans `docs/13-facturation-devis.md`).
4. **Attendre l'acceptation** (signature électronique simple sur la page publique du devis) avant de commencer à construire quoi que ce soit.
5. Une fois accepté : génère la **facture d'acompte** depuis le devis accepté, envoie-la (email automatique avec le PDF + lien de paiement Stripe).

→ Le devis accepté = ta référence pour savoir **quels modules le client a payés** (tu les autoriseras un par un à l'étape 2).

---

## Étape 2 — Création du site

`Sites clients` (`/admin/dashboard/sites`) → bouton "Créer un site".

1. **Nom, type de site, description** (informatifs, affichés côté agence).
2. **Mot de passe** — celui du compte Propriétaire du site (obligatoire à la création). Tu peux le changer plus tard depuis "Modifier" sur la même card (champ "Laisser vide pour ne pas changer") si besoin de le réinitialiser pour le client.
3. **Statut** : laisse "En cours" (jamais "Prospection" pour un vrai client — voir vue d'ensemble ci-dessus).
4. **Template** : choisis le modèle de mise en page (Hestia, Helios ou Charis — voir `docs/10-templates.md` pour le détail visuel de chacun). Le client pourra changer la palette de couleurs lui-même depuis son admin (`Site internet`), pas le template.
5. **Modules autorisés** : coche uniquement les modules que le devis couvre (voir le tableau récapitulatif en annexe). Autoriser un module l'active **immédiatement** côté client — cocher = donner l'accès, pas juste une case indicative.
6. **Domaine personnalisé** : laisse **vide** pour l'instant (voir étape 4 — jamais avant que le DNS du client soit prêt).
7. Valide → tu obtiens l'`id` du site (visible dans l'URL de sa card, ou dans le lien "Admin du client").

**Juste après** : reviens sur `Facturation → Clients`, ouvre "Modifier" sur le client de facturation créé à l'étape 1, et choisis ce site dans le menu déroulant "Site client lié" — ça affichera "Lié à : {nom du site}" sur sa fiche.

---

## Étape 3 — Configuration et contenu

Deux façons de faire, selon la formule vendue :

- **Le client remplit lui-même** : donne-lui le lien `/admin/{id}` + son mot de passe. Son propre tableau de bord affiche une check-list de démarrage (établissement renseigné, description, au moins une offre/produit, une photo) qui disparaît une fois complète — pas besoin de la lui expliquer, elle se suffit à elle-même.
- **Tu remplis pour lui** (prestation clé en main) : connecte-toi sur `/admin/{id}` avec son mot de passe, renseigne toi-même :

Check-list minimum avant de considérer un site "prêt à publier" :

- [ ] **Établissement** : nom, adresse, téléphone, email (`Établissement → Informations`) — l'adresse alimente aussi le module Maps si activé.
- [ ] **Horaires** si le module est activé (`Établissement → Horaires`, ou récupérés automatiquement via la recherche Google Places).
- [ ] **Photos** de l'établissement (`Établissement → Photos`), au moins 1.
- [ ] **Description du site** + **Notre histoire** si Charis (`Site internet → Contenu`).
- [ ] **Palette de couleurs** choisie (`Site internet → Modèle`, pastilles sous chaque template).
- [ ] **Logo** si le client en a un (`Établissement → Informations`).
- [ ] Contenu propre à chaque module activé : produits (Catalogue), articles (Blog), créneaux (RDV), etc.
- [ ] **CGV + Politique de confidentialité** (`Établissement → Livraison & CGV` et `Mentions légales`) — **obligatoire** si Catalogue + Paiement Stripe sont tous les deux activés, sinon le bouton de paiement reste bloqué côté serveur pour de vrai (pas juste caché).
- [ ] **Paiement Stripe** si vendu : le client fournit sa propre clé Stripe (`Paiement Stripe`, `docs/13...`/`docs/04...` pour le détail) — jamais la tienne.

---

## Étape 4 — Domaine et mise en ligne

Détail complet et décisions dans `docs/08-hebergement-domaines.md` — résumé actionnable ici.

1. **Le client garde son propre nom de domaine** (chez le registrar de son choix) — toi tu ne l'achètes jamais en ton nom. S'il n'en a pas encore, oriente-le vers OVH/Ionos (ou occupe-toi de l'achat avec **son** compte à lui si tu proposes ce service).
2. Donne-lui (ou configure toi-même) **l'enregistrement DNS** à ajouter chez son registrar pour pointer vers ton serveur Coolify (CNAME ou A selon ce que Coolify demande à ce moment-là).
3. **Attends que le DNS ait propagé** (quelques minutes à quelques heures) avant de continuer — un domaine qui ne résout pas encore ne sert à rien de configurer côté plateforme.
4. Une fois le DNS bon : renseigne le champ **"Domaine personnalisé"** du site dans `Sites clients` (sans `https://` ni `www.`, ex. `boulangerie-dupont.fr`).
5. **Côté serveur (Coolify/Traefik)** : ajoute ce domaine dans la configuration Coolify de l'appli pour qu'il route dessus et obtienne son certificat HTTPS (Let's Encrypt, automatique une fois le domaine déclaré côté Coolify) — geste manuel à faire toi-même à chaque nouveau client, pas encore automatisé.
6. Repasse la check-list de l'étape 3 une dernière fois, puis clique **"Rafraîchir le site"** (`Site internet`, en haut de page) — c'est ce qui publie réellement le contenu/template en cours d'édition vers le site public. Tant que ce bouton n'a jamais été cliqué, le domaine affichera une version vide/par défaut.
7. **Vérifie en visitant le vrai domaine** (pas `/t/{id}`) que tout s'affiche correctement, sur mobile et desktop.

⚠️ Rappel de la décision du 2026-09-01 : **pas de sous-domaine gratuit type `client.etnof-web.com`** en attendant — tant que le domaine du client n'est pas prêt, le site n'est tout simplement pas publié.

---

## Étape 5 — Livraison

1. Passe le statut du site sur **"Livré"** (`Sites clients`).
2. Génère et envoie la **facture de solde** depuis `Facturation → Factures` si ta formule prévoit un paiement en deux temps.
3. Envoie au client ses accès définitifs : lien de son site (le vrai domaine), lien de son admin (`/admin/{id}`), rappel de son mot de passe si tu l'as choisi pour lui.
4. Petit message/appel de prise en main si besoin (pas d'outil de formation intégré à la plateforme pour l'instant).

---

## Étape 6 — Suivi après livraison

- **Messages entrants** du site du client : visibles dans son admin (`Messages`) — pas de notification centralisée côté agence aujourd'hui, à surveiller à la demande du client ou en te connectant toi-même.
- **Ajouter un module plus tard** : reviens sur `Sites clients`, coche le nouveau module autorisé (facture-le au passage si applicable).
- **Historique des actions** (`Historique` côté client, ou modale dans `Sites clients` côté agence) si tu dois retracer qui a changé quoi.
- **Changer de statut** vers "En maintenance" si tu factures un suivi régulier.

---

## Annexe — Catalogue des modules disponibles

Récapitulatif pour savoir quoi proposer/cocher. Prix réels configurés dans `Tarifs des modules` (pas fixés dans le code), pas répétés ici pour éviter que ce fichier se désynchronise.

| Module | Ce qu'il fait |
|---|---|
| Contact | Formulaire de contact, messages sauvegardés en base |
| Horaires | Onglet horaires d'ouverture, récupération auto via Google Places |
| Maps | Carte avec l'adresse (nécessite une clé Google Maps du client) |
| Galerie | Galerie photo illimitée (au-delà des 3 photos d'Établissement) |
| Réseaux sociaux | Icônes Facebook/Instagram en pied de page |
| WhatsApp | Bouton flottant vers une conversation WhatsApp pré-remplie |
| Statistiques | Google Analytics 4 + bandeau cookies RGPD |
| Offres | Grille tarifaire/mises en avant, sans notion de stock (utile sans Catalogue) |
| Catalogue produits | Produits, photos, prix, stock, panier, commandes |
| Paiement Stripe | Encaissement carte bancaire (dépend de Catalogue, compte Stripe du client) |
| Compte client | Connexion par lien email, historique de commandes |
| Fidélité | Programme points ou carte à tampons (dépend de Compte client) |
| Blog | Articles avec page de détail |
| Prise de RDV | Créneaux configurés par le client, réservables en ligne |
| Newsletter | Formulaire d'inscription, export CSV des inscrits |
| Avis Google | Note moyenne + avis récupérés automatiquement |
| Multilingue | Traduction FR/EN/ES du contenu principal + blog |
| Pages personnalisées | Pages libres (à propos, etc.) sous un menu déroulant |

---

## Annexe — Liens utiles

- Vue globale agence : `/admin/dashboard`
- Sites clients : `/admin/dashboard/sites`
- Tarifs des modules : `/admin/dashboard/tarifs`
- Facturation → Entreprise (tes coordonnées, config Stripe/email) : `/admin/dashboard/entreprise`
- Facturation → Clients (BillingClient) : `/admin/dashboard/clients`
- Facturation → Formules : `/admin/dashboard/formules`
- Facturation → Devis : `/admin/dashboard/devis`
- Facturation → Factures : `/admin/dashboard/factures`
- Admin d'un site donné : `/admin/{clientSiteId}`
- Aperçu public interne d'un site (avant domaine) : `/t/{clientSiteId}`
