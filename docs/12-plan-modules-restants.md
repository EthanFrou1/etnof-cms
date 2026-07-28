# 12 — Plan de construction des modules restants

Marche à suivre pour construire, un par un, les modules qui manquent encore par rapport à la grille tarifaire réelle d'etnof-web (https://website-etnof-web.vercel.app/tarifs.html, relevée le 2026-07-28). Complète `docs/04-catalogue-modules.md` (qui reste la table de statut à jour) sans la remplacer.

## Grille tarifaire de référence (relevée le 2026-07-28)

**Formules de base** : Essentiel (690€), Business (1090€), Sur mesure (1990€) — hors sujet ici, ce sont des forfaits, pas des modules.

**Options à la carte** :

| Option | Prix | Statut |
|---|---|---|
| Contact | inclus formule Essentiel | Déjà implémenté |
| Google Maps | Offert | Déjà implémenté |
| Blog | +250€ | Déjà implémenté |
| Page supplémentaire | +80€ | À trancher (voir catégorie C) |
| Back-office / CMS | +450€ | Largement couvert, à durcir (catégorie B) |
| Multilingue | +250€ | Transverse (catégorie B) |
| Prise de rendez-vous | +290€ | Implémenté (2026-07-28) |
| Paiement Stripe | +350€ | À construire |
| Paiement PayPal | +200€ | À construire |
| Newsletter | +190€ | Implémenté (2026-07-28) |
| Avis Google | +100€ | À construire |
| WhatsApp | +90€ | À construire |
| Chat IA | +390€ | À construire |
| FAQ IA | +290€ | À construire |
| SEO avancé | +390€ | Transverse (catégorie B) |
| Logo | +190€ | Prestation hors-code (catégorie C) |
| Charte graphique | +390€ | Prestation hors-code (catégorie C) |
| Rédaction des textes | Sur devis | Prestation hors-code (catégorie C) |

## Comment on procède

On fait les modules **un par un**, jamais plusieurs en parallèle (règle 7 de `CLAUDE.md` : rester simple). Pour chaque module de la catégorie A :

1. On relit ensemble ce fichier pour ce module précis : son but client, son but technique, sa portée V1 volontairement minimale.
2. Tu valides (ou ajustes) la portée avant que je code quoi que ce soit — surtout si une dépendance externe payante est listée (règle 5 de `CLAUDE.md` : jamais de service tiers sans validation explicite).
3. Je suis STRICTEMENT le pattern décrit dans `docs/02-architecture-modules.md` (copier un module proche, dossier isolé, `authorized`/`enabled`, routes `/api/t/{clientSiteId}/...`).
4. Je teste avec deux tenants (un avec le module autorisé, un sans) avant de considérer que c'est fini.
5. On met à jour `docs/04-catalogue-modules.md` (statut) et la case correspondante dans ce fichier.
6. Tarif : tu renseignes le prix dans le panneau "Tarifs des modules" de `/admin/dashboard` une fois le module livré.
7. Dernière étape systématique : je te donne le prompt d'image du module (gabarit commun + sujet, voir `docs/11-images-modules.md`), prêt à coller dans ChatGPT — tu me renvoies le fichier généré, je le dépose dans `frontend/public/module-icons/{nom-module}.png` et j'ajoute l'entrée dans `docs/11-images-modules.md`.

## Ordre de construction proposé (catégorie A)

Basé sur la note de priorité déjà actée dans `docs/04-catalogue-modules.md` (RDV/Newsletter en premiers, bons candidats pour re-valider le pattern sur un cas avec plus de logique métier que Blog), puis regroupement par famille pour réutiliser ce qui vient d'être construit :

1. **Prise de rendez-vous (RDV)** — 290€
2. **Newsletter** — 190€
3. **Avis Google** — 100€
4. **WhatsApp** — 90€
5. **Paiement PayPal** — 200€
6. **Paiement Stripe** — 350€
7. **FAQ IA** — 290€
8. **Chat IA** — 390€

---

## 1. Prise de rendez-vous (RDV) — 290€

**But pour le client** : ses propres clients peuvent réserver un créneau (coupe, consultation, table...) directement depuis le site, sans appel téléphonique — réduit les no-shows et la charge d'accueil.

**But technique sur le site** : nouveau module `rdv`. Le client configure un gabarit hebdomadaire récurrent depuis son admin : une durée de créneau (ex. 30 min) globale, et pour chaque jour de la semaine un statut actif/inactif avec une plage horaire propre (ex. Lundi actif 9h-12h, Mardi inactif, indépendant des horaires d'ouverture du module Horaires). Les créneaux disponibles sont calculés à la volée à partir de ce gabarit (pas de ligne persistée par créneau) ; un visiteur choisit un horaire libre et laisse nom/email/téléphone ; la réservation (`Booking`) fige l'heure et la durée au moment de la réservation.

**Portée V1 (rester simple)** : un seul gabarit récurrent par semaine, pas d'exceptions ponctuelles (jour férié, fermeture exceptionnelle un jour normalement actif — explicitement post-V1, à traiter si le besoin apparaît). Fenêtre de disponibilité glissante fixe (21 jours), pas configurable. Pas de sync avec Google Calendar/Outlook. Pas d'email de confirmation automatique tant qu'aucun service d'envoi n'est validé (le client voit ses réservations dans son admin, comme les messages Contact).

**Dépendance externe** : aucune pour la V1 telle que décrite. Une confirmation par email nécessiterait un service d'envoi (ex. SMTP, Resend...) — à valider séparément le moment venu.

**Statut** : [x] construit (2026-07-28) — `modules/rdv/`. Gabarit hebdomadaire récurrent (durée globale + plage horaire propre par jour, indépendante du module Horaires — décision d'Ethan après une première version à créneaux ponctuels), créneaux générés à la volée, admin du client configure le planning et voit/annule les réservations (filtres à venir/passés/annulés/tous), widget public de réservation branché sur Hestia et Helios, carte "Rendez-vous à venir" sur le tableau de bord du client.

---

## 2. Newsletter — 190€

**But pour le client** : collecter des emails de visiteurs intéressés, pour communiquer plus tard (promos, actus) sans dépendre des réseaux sociaux.

**But technique sur le site** : nouveau module `newsletter`. Formulaire d'inscription (email) sur le site public, liste des inscrits consultable/exportable (CSV) depuis l'admin du client.

**Portée V1 (rester simple)** : pas d'envoi de campagne depuis l'admin (ce serait un vrai service d'emailing, hors scope V1) — le module capte et stocke les emails, l'envoi de newsletter se fait pour l'instant hors site (le client exporte le CSV et l'utilise dans l'outil de son choix).

**Dépendance externe** : aucune pour la V1. Un envoi de campagne intégré nécessiterait un service tiers (Mailchimp, Brevo...) — à valider séparément si demandé plus tard.

**Statut** : [x] construit (2026-07-28) — `modules/newsletter/`. Formulaire d'inscription public (idempotent, pas d'erreur si déjà inscrit), liste + export CSV côté admin, widget branché sur Hestia et Helios.

---

## 3. Avis Google — 100€

**But pour le client** : afficher ses avis Google existants sur son site pour rassurer les visiteurs, sans ressaisie manuelle.

**But technique sur le site** : nouveau module `avis-google`. Récupère et affiche la note moyenne + une sélection d'avis via l'API Google Places (le même mécanisme que le module Horaires utilise déjà pour récupérer les horaires depuis Google Places — réutilisable).

**Portée V1 (rester simple)** : lecture seule (pas de réponse aux avis depuis l'admin), rafraîchi périodiquement plutôt qu'en temps réel.

**Dépendance externe** : Google Places API — déjà utilisée par le module Horaires, donc le client a probablement déjà une clé configurée. À confirmer que ça reste dans le même quota/coût que l'usage actuel avant de généraliser.

**Statut** : [ ] à construire

---

## 4. WhatsApp — 90€

**But pour le client** : donner un moyen de contact instantané et familier à ses visiteurs (beaucoup plus utilisé que l'email par certains publics locaux).

**But technique sur le site** : nouveau module `whatsapp`. Bouton flottant qui ouvre une conversation WhatsApp pré-remplie vers le numéro du client (lien `wa.me/{numero}?text=...`), pas d'intégration API.

**Portée V1 (rester simple)** : un simple lien `wa.me`, configurable (numéro) depuis l'admin du client. Pas de WhatsApp Business API (messagerie automatisée, statistiques...) — hors scope, coût et complexité disproportionnés pour ce que demande l'option à 90€.

**Dépendance externe** : aucune (un lien `wa.me` ne nécessite ni compte développeur ni clé API).

**Statut** : [ ] à construire

---

## 5. Paiement PayPal — 200€

**But pour le client** : encaisser réellement en ligne (contrairement au Catalogue actuel qui enregistre juste une commande sans paiement carte, voir `docs/04-catalogue-modules.md`).

**But technique sur le site** : se branche sur le flux de commande déjà existant du module Catalogue (pas de duplication) — au moment de valider le panier, le client final paie via PayPal, la commande passe automatiquement en "payée" seulement après confirmation du paiement.

**Portée V1 (rester simple)** : PayPal Checkout standard (bouton officiel), pas d'abonnements/paiements récurrents.

**Dépendance externe** : **compte développeur PayPal côté client + intégration de son SDK — à valider explicitement avec toi avant de commencer (règle 5 de `CLAUDE.md`)**, notamment le mode sandbox/test à utiliser pendant le développement.

**Statut** : [ ] à construire

---

## 6. Paiement Stripe — 350€

**But pour le client** : alternative/complément à PayPal, souvent préférée pour la carte bancaire directe (pas besoin de compte PayPal côté acheteur).

**But technique sur le site** : même principe que PayPal — branché sur le flux de commande du Catalogue existant plutôt que dupliqué.

**Portée V1 (rester simple)** : Stripe Checkout hébergé (pas de formulaire de carte custom à maintenir soi-même — plus simple et plus sûr), pas d'abonnements.

**Dépendance externe** : **compte Stripe côté client + SDK Stripe — à valider explicitement avec toi avant de commencer (règle 5)**, idem mode test pendant le développement. Construit après PayPal pour réutiliser le même branchement sur le flux de commande.

**Statut** : [ ] à construire

---

## 7. FAQ IA — 290€

**But pour le client** : réduire les questions répétitives par email/téléphone en laissant les visiteurs poser leur question en langage naturel, avec une réponse basée sur son contenu réel (offres, horaires, établissement...).

**But technique sur le site** : nouveau module `faq-ia`. Widget de question-réponse sur le site public, qui interroge une API IA (Claude) en lui donnant le contenu du site du client comme contexte, pour répondre uniquement à partir de ce qu'il a réellement configuré (pas d'invention de politique de retour, horaires, etc. non renseignés).

**Portée V1 (rester simple)** : contexte = les champs `SiteContent` déjà en base (pas d'indexation avancée de documents), pas d'historique de conversation persistant.

**Dépendance externe** : **API Claude (ou équivalent), facturée à l'usage — à valider explicitement avec toi avant de commencer (règle 5)**, y compris qui porte le coût par appel (répercuté dans le prix client ou à la charge d'Ethan).

**Statut** : [ ] à construire

---

## 8. Chat IA — 390€

**But pour le client** : équivalent conversationnel complet (pas juste question/réponse ponctuelle comme la FAQ IA) — un chat qui peut tenir une conversation multi-tours avec un visiteur.

**But technique sur le site** : nouveau module `chat-ia`. Fenêtre de chat sur le site public, même principe de contexte que FAQ IA mais avec historique de conversation dans la session du visiteur. Probablement construit après/à partir de FAQ IA plutôt que de zéro (beaucoup de logique partagée) — à re-décider selon ce qu'on apprend en construisant FAQ IA.

**Portée V1 (rester simple)** : historique en mémoire de session (pas de persistance des conversations en base pour la V1), pas de prise de RDV ou d'actions depuis le chat (juste répondre).

**Dépendance externe** : même remarque que FAQ IA — **API Claude facturée à l'usage, à valider avant de commencer (règle 5)**.

**Statut** : [ ] à construire

---

## Catégorie B — Transverses, pas des modules isolés

Ces trois options ne suivront **pas** le pattern "dossier `/modules/xxx`" de `docs/02-architecture-modules.md` — elles touchent plusieurs modules à la fois plutôt que d'en ajouter un nouveau.

- **Back-office / CMS (450€)** : déjà largement couvert par l'admin construit en Phase 3/5. Reste à durcir avant vente (vrai hash de mot de passe, gestion multi-utilisateurs) plutôt qu'à construire — voir le bilan de Phase 5 dans `docs/05-roadmap-poc.md`.
- **Multilingue (250€)** : nécessite de repenser `SiteContent`/`Offer`/etc. pour porter plusieurs langues (pas juste un module en plus) — à traiter comme un chantier de modèle de données à part entière, pas dans cette liste module-par-module.
- **SEO avancé (390€)** : optimisations transverses (métadonnées, sitemap, structured data...) qui s'appliquent à tout le site, pas une fonctionnalité qu'on active/désactive.

## Catégorie C — Prestations hors-code

Ces options ne sont pas des fonctionnalités du site — ce sont des livrables qu'Ethan produit directement (design, texte), sans ligne de code ni toggle `authorized`/`enabled`. Elles n'ont pas leur place dans `ModuleMetaRegistry`/le panneau "Tarifs des modules" de `/admin/dashboard` (qui liste des fonctionnalités activables), et ne suivent aucun pattern de ce fichier :

- **Logo (190€)** — livrable graphique.
- **Charte graphique (390€)** — livrable graphique (palette, typo, déclinaisons).
- **Rédaction des textes (sur devis)** — livrable texte.

**Page supplémentaire (80€)** est à trancher : soit c'est un livrable manuel comme ci-dessus (Ethan ajoute une page statique de plus au moment de la livraison, pas de code réutilisable), soit c'est le signe qu'un vrai module "Pages personnalisées" (le client crée/édite ses propres pages depuis son admin) aurait de la valeur. À décider avant de le classer définitivement — pas de développement tant que ce choix n'est pas fait.
