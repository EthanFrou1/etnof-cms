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
| Multilingue | +250€ | Implémenté (2026-07-30), voir catégorie B |
| Prise de rendez-vous | +290€ | Implémenté (2026-07-28) |
| Paiement Stripe | +350€ | Implémenté (2026-07-29) |
| Paiement PayPal | +200€ | Abandonné (2026-07-29) — Stripe seul retenu |
| Newsletter | +190€ | Implémenté (2026-07-28) |
| Avis Google | +100€ | Implémenté (2026-07-28) |
| WhatsApp | +90€ | Implémenté (2026-07-28) |
| Chat IA | +390€ | Mis de côté pour l'instant (2026-07-29) |
| FAQ IA | +290€ | Mis de côté pour l'instant (2026-07-29) |
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

1. **Prise de rendez-vous (RDV)** — 290€ — fait
2. **Newsletter** — 190€ — fait
3. **Avis Google** — 100€ — fait
4. **WhatsApp** — 90€ — fait
5. ~~Paiement PayPal — 200€~~ — abandonné (2026-07-29), voir section 5
6. **Paiement Stripe** — 350€ — fait
7. **FAQ IA** — 290€ — mis de côté pour l'instant
8. **Chat IA** — 390€ — mis de côté pour l'instant

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

**But technique sur le site** : nouveau module `avis-google`. Récupère et affiche la note moyenne + une sélection d'avis via l'API Google Places.

**Portée V1 (rester simple)** : lecture seule (pas de réponse aux avis depuis l'admin). Décision prise avec Ethan pendant le cadrage (deux questions posées) : pas de rafraîchissement automatique périodique — Ethan (ou le client) déclenche la récupération manuellement depuis le back-office ("Actualiser les avis"), et choisit ensuite lesquels afficher publiquement parmi ceux récupérés.

**Dépendance externe** : Google Places API — mais **pas** le même champ que le module Horaires. Vérifié explicitement avant de coder (règle 5 de `CLAUDE.md`) : le champ `reviews` relève du SKU payant "Place Details Enterprise + Atmosphere" (~25-40$/1000 appels après un quota gratuit de 1000/mois), contrairement aux champs `opening_hours`/`photos`/`address` utilisés par Horaires/Établissement qui sont gratuits ("Basic"/"Pro Data"). Volontairement isolé dans son propre fichier backend (`AvisGoogleAdminEndpoints.cs`) plutôt que d'étendre l'endpoint `/details` partagé, pour ne jamais faire payer les autres appelants de cet endpoint. Le déclenchement manuel (au lieu d'un rafraîchissement automatique) réduit encore le volume d'appels réels, largement dans le quota gratuit.

**Statut** : [x] construit (2026-07-28) — `modules/avis-google/`. Admin : recherche Google Places (réutilise l'endpoint de recherche existant, gratuit) pour lier une fiche, bouton "Actualiser les avis" (appel payant explicite, jamais automatique), liste des avis récupérés avec toggle par avis pour choisir ceux affichés publiquement. Upsert par horodatage Google (`GoogleTime`) : un rafraîchissement met à jour le contenu sans perdre les choix déjà faits. Widget public (note moyenne + avis sélectionnés) branché sur Hestia et Helios, masqué tant qu'aucun avis n'est sélectionné.

---

## 4. WhatsApp — 90€

**But pour le client** : donner un moyen de contact instantané et familier à ses visiteurs (beaucoup plus utilisé que l'email par certains publics locaux).

**But technique sur le site** : nouveau module `whatsapp`. Bouton flottant qui ouvre une conversation WhatsApp pré-remplie vers le numéro du client (lien `wa.me/{numero}?text=...`), pas d'intégration API.

**Portée V1 (rester simple)** : un simple lien `wa.me`, configurable (numéro **et** message pré-rempli) depuis l'admin du client — décision prise avec Ethan pendant le cadrage (deux questions posées). Pas de WhatsApp Business API (messagerie automatisée, statistiques...) — hors scope, coût et complexité disproportionnés pour ce que demande l'option à 90€.

**Dépendance externe** : aucune (un lien `wa.me` ne nécessite ni compte développeur ni clé API).

**Statut** : [x] construit (2026-07-28) — `modules/whatsapp/`. Bouton flottant vert WhatsApp officiel (décision d'Ethan : reconnaissabilité universelle plutôt que la palette du template, contrairement aux autres modules recolorés — voir `docs/05-roadmap-poc.md`), numéro et message configurables via le champ générique `MODULE_FIELDS` (même mécanisme que `maps.apiKey`). Aucun code backend : comme Maps, tout passe par `ModulesConfigJson` déjà générique.

---

## 5. Paiement PayPal — 200€

**But pour le client** : encaisser réellement en ligne (contrairement au Catalogue actuel qui enregistre juste une commande sans paiement carte, voir `docs/04-catalogue-modules.md`).

**But technique sur le site** : se branche sur le flux de commande déjà existant du module Catalogue (pas de duplication) — au moment de valider le panier, le client final paie via PayPal, la commande passe automatiquement en "payée" seulement après confirmation du paiement.

**Portée V1 (rester simple)** : PayPal Checkout standard (bouton officiel), pas d'abonnements/paiements récurrents.

**Dépendance externe** : compte développeur PayPal côté client + intégration de son SDK.

**Statut** : abandonné (décision d'Ethan, 2026-07-29) — un seul moyen de paiement retenu : Stripe.

---

## 6. Paiement Stripe — 350€

**But pour le client** : encaisser réellement en ligne, seul moyen de paiement retenu par Ethan (PayPal abandonné, voir section précédente).

**But technique sur le site** : se branche sur le flux de commande du module Catalogue plutôt que de le dupliquer. Modèle retenu après discussion avec Ethan : **compte Stripe propre à chaque client** (pas de Stripe Connect/marketplace) — chaque tenant crée son propre compte sur stripe.com et fournit sa propre clé secrète + son propre secret de webhook depuis son admin (`/admin/{clientSiteId}/stripe`). L'argent va directement sur le compte du client, jamais sur un compte agence ; Stripe prend ses propres frais de transaction, l'agence ne prélève aucune commission automatique (cohérent avec un modèle de vente au forfait, pas à la commission). Stripe Connect aurait permis une commission automatique mais est nettement plus lourd (approbation "plateforme", onboarding/KYC des clients à gérer) — écarté pour rester simple (règle 7 de `CLAUDE.md`).

**Portée V1 (rester simple)** : Stripe Checkout hébergé (redirection vers une page payée par Stripe, pas de formulaire de carte custom, pas de Stripe.js côté client — le backend crée la session et renvoie son URL). Une commande n'est créée qu'à la confirmation du paiement par webhook (`checkout.session.completed`), jamais au moment du clic "Payer" : évite de décrémenter du stock sur un paiement abandonné. Paiement sur place **retiré** du module Catalogue (décision d'Ethan) — Stripe est désormais l'unique façon de finaliser une commande. Pas d'abonnements, pas de remboursement automatique depuis l'admin (à faire manuellement dans le tableau de bord Stripe si besoin).

**Dépendance externe** : compte Stripe propre à chaque client (validé avec Ethan avant de coder) + package NuGet `Stripe.net`.

**Statut** : [x] construit (2026-07-29) — `modules/stripe/`. Clé secrète et secret de webhook stockés dans une table dédiée (`StripeSettings`, jamais dans `ModulesConfigJson` qui est public — voir `docs/03-modele-donnees.md`). `POST /stripe/checkout` valide le panier/stock puis crée la session Stripe ; `POST /stripe/webhook` vérifie la signature puis crée la commande (idempotent via `Order.StripeSessionId`) ; `GET /stripe/session/{id}` sert à afficher une confirmation au retour sur le site public sans dépendre du webhook. Page admin `/admin/{clientSiteId}/stripe` pour coller les deux secrets, avec l'URL de webhook à créer côté Stripe affichée en clair.

**Reste à faire par Ethan** : créer un compte Stripe (mode test pour commencer), coller la clé secrète + créer le webhook dans le tableau de bord Stripe (URL fournie dans l'admin), et tester un vrai paiement de bout en bout. Pour tester le webhook en local sans déployer, utiliser le [Stripe CLI](https://stripe.com/docs/stripe-cli) (`stripe listen --forward-to localhost:5162/api/t/{clientSiteId}/stripe/webhook`) plutôt que le tableau de bord Stripe (qui exige une URL publique) ; tarif (350€) à renseigner dans le panneau "Tarifs des modules" de `/admin/dashboard`.

---

## 7. FAQ IA — 290€

**But pour le client** : réduire les questions répétitives par email/téléphone en laissant les visiteurs poser leur question en langage naturel, avec une réponse basée sur son contenu réel (offres, horaires, établissement...).

**But technique sur le site** : nouveau module `faq-ia`. Widget de question-réponse sur le site public, qui interroge une API IA (Claude) en lui donnant le contenu du site du client comme contexte, pour répondre uniquement à partir de ce qu'il a réellement configuré (pas d'invention de politique de retour, horaires, etc. non renseignés).

**Portée V1 (rester simple)** : contexte = les champs `SiteContent` déjà en base (pas d'indexation avancée de documents), pas d'historique de conversation persistant.

**Dépendance externe** : **API Claude (ou équivalent), facturée à l'usage — à valider explicitement avec toi avant de commencer (règle 5)**, y compris qui porte le coût par appel (répercuté dans le prix client ou à la charge d'Ethan).

**Statut** : mis de côté pour l'instant (décision d'Ethan, 2026-07-29) — pas abandonné, juste dépriorisé après Stripe. Reprendre ce fichier au moment de l'attaquer.

---

## 8. Chat IA — 390€

**But pour le client** : équivalent conversationnel complet (pas juste question/réponse ponctuelle comme la FAQ IA) — un chat qui peut tenir une conversation multi-tours avec un visiteur.

**But technique sur le site** : nouveau module `chat-ia`. Fenêtre de chat sur le site public, même principe de contexte que FAQ IA mais avec historique de conversation dans la session du visiteur. Probablement construit après/à partir de FAQ IA plutôt que de zéro (beaucoup de logique partagée) — à re-décider selon ce qu'on apprend en construisant FAQ IA.

**Portée V1 (rester simple)** : historique en mémoire de session (pas de persistance des conversations en base pour la V1), pas de prise de RDV ou d'actions depuis le chat (juste répondre).

**Dépendance externe** : même remarque que FAQ IA — **API Claude facturée à l'usage, à valider avant de commencer (règle 5)**.

**Statut** : mis de côté pour l'instant, même décision que FAQ IA (2026-07-29).

---

## Catégorie B — Transverses, pas des modules isolés

Ces trois options ne suivront **pas** le pattern "dossier `/modules/xxx`" de `docs/02-architecture-modules.md` — elles touchent plusieurs modules à la fois plutôt que d'en ajouter un nouveau.

- **Back-office / CMS (450€)** : déjà largement couvert par l'admin construit en Phase 3/5. Reste à durcir avant vente (vrai hash de mot de passe, gestion multi-utilisateurs) plutôt qu'à construire — voir le bilan de Phase 5 dans `docs/05-roadmap-poc.md`.
- **SEO avancé (390€)** : optimisations transverses (sitemap, structured data/JSON-LD, rendu serveur des balises `<head>` pour les aperçus de lien réseaux sociaux...) qui s'appliquent à tout le site, pas une fonctionnalité qu'on active/désactive. Voir "SEO de base" ci-dessous pour ce qui est déjà offert gratuitement, afin de ne pas vendre en "avancé" ce qui est déjà inclus.

### SEO de base (gratuit, implémenté le 2026-08-06)

Titre d'onglet + `<meta name="description">` + balises Open Graph (`og:title`/`og:description`) posés dynamiquement en JS à l'arrivée sur le site public d'un tenant (page d'accueil : nom/description du site ; article de blog : titre/extrait du contenu). Nouveau hook `frontend/src/hooks/useDocumentMeta.ts`, appelé depuis `PublicSite.tsx` ; `modules/blog/frontend/BlogPostPage.tsx` reproduit la même logique en local plutôt que d'importer le hook (un module reste isolé, voir `docs/02-architecture-modules.md`).

**Limite connue, assumée pour rester simple** : le site est une SPA 100% cliente (pas de SSR/prerendering, pas de react-router — voir `App.tsx`, navigation par rechargement complet de page). Googlebot exécute le JS et indexe donc correctement ces balises, **mais** les robots qui ne l'exécutent pas (aperçus de lien WhatsApp/Facebook/Instagram/LinkedIn) ne les verront jamais — un `curl` de la page ne renvoie que le HTML statique de `index.html`. Lever cette limite demanderait un vrai rendu côté serveur des balises `<head>` (SSR complet ou "prerendering" ciblé sur les bots de partage) : plus gros chantier, à ranger dans "SEO avancé" plutôt que dans cette base gratuite.

**Volontairement pas fait pour l'instant** : sitemap.xml et robots.txt. Un sitemap n'a de sens qu'à la racine du vrai domaine du site (`https://boulangerie-dupont.fr/sitemap.xml`), or le routage par domaine personnalisé n'existe pas encore (voir `docs/08-hebergement-domaines.md` : tenants seulement accessibles via `/t/{clientSiteId}` sur le domaine de la plateforme aujourd'hui) — construire un sitemap maintenant serait du travail non exploitable tant que ce point d'infra n'est pas résolu. À reprendre une fois le routage par domaine en place.

### Pages personnalisées, implémenté le 2026-08-06

Suite du brainstorm de fonctionnalités manquantes (`docs/07-admin-global.md`) — le plus gros morceau de la liste, avec une vraie décision d'architecture (comment le visiteur trouve les pages). Question posée à Ethan avant de coder : liens automatiques dans le pied de page, ou pas de lien auto (le client se débrouille) ? Réponse, plus précise que les deux options proposées : **un onglet dans le header, intitulé choisi par le client, listant ses pages dans un ordre qu'il choisit lui-même**.

**Portée construite** : module complet (backend + admin + section publique), premier vrai module de ce projet à suivre le pattern `docs/02-architecture-modules.md` de bout en bout depuis Galerie.

- **Entité `CustomPage`** (`modules/pages/backend/CustomPage.cs`) — même forme que `BlogPost` (Title/Slug/Content/PublishedAt), plus `SortOrder`. Contenu en HTML, même éditeur riche TipTap que le blog (`RichTextEditor.tsx` réutilisé tel quel).
- **Admin** (`PagesSection.tsx` + `PageDetailPage.tsx`, `/admin/{clientSiteId}/pages[/{id}]`) — liste courte avec boutons monter/descendre (premier réordonnancement du projet ; `POST /admin/pages/{id}/move`, échange le `SortOrder` avec le voisin plutôt qu'un vrai algorithme de tri par lot — pas de glisser-déposer pour éviter une dépendance externe de plus après TipTap).
- **Intitulé du menu** : pas de nouvelle table — un champ `menuLabel` de plus dans `ModulesConfigJson` (même mécanisme générique que `maps.apiKey`), configuré depuis l'onglet "Modules" comme n'importe quel autre champ de module.
- **Menu déroulant public** (`modules/pages/frontend/CustomPagesNav.tsx`) — nouveau composant, premier vrai dropdown du site public (jusqu'ici la nav n'avait que des liens à plat + le sélecteur de langue, qui est un groupe de boutons, pas un popover). Ferme au clic extérieur en desktop ; en mobile, s'affiche à plat dans le panneau déjà déroulé (pas de popover imbriqué dans un panneau plein écran). Branché dans `TemplateHestia.tsx` et `TemplateHelios.tsx` (desktop + mobile, 4 points d'intégration au total), couleur héritée du nav de chaque template (`color: inherit`) pour rester cohérent avec les deux styles de navbar (pilule blanche Hestia / bandeau plein `ink` Helios).
- **Page publique** (`modules/pages/frontend/CustomPageView.tsx`, route `/t/{clientSiteId}/pages/{slug}` ajoutée dans `App.tsx`) — même structure que `BlogPostPage.tsx` (rendu HTML, meta description/OG générées).

**Pas de support multilingue pour l'instant** — comme les autres modules non couverts par `ContentTranslation` (RDV, Newsletter...), voir la note dans `PagesModule.cs`. Étendre Multilingue à ce module serait un chantier à part.

### Éditeur riche pour le blog (TipTap), implémenté le 2026-08-06

Le contenu d'un article était un simple `<textarea>` (texte brut). Dépendance externe validée avec Ethan avant d'installer (règle 5 de `CLAUDE.md`) : `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/pm` (~30-40 Ko gzippé, licence MIT). Portée volontairement limitée (rester simple) : gras, italique, titres H2/H3, listes à puces/numérotées, citation, lien — **pas d'images inline** (pas de gestion d'upload dans l'éditeur pour l'instant).

- `frontend/src/components/admin/RichTextEditor.tsx` — nouveau composant partagé, barre d'outils + `EditorContent`, branché dans `BlogPostDetailPage.tsx` (remplace le `<textarea>`).
- Le contenu est maintenant stocké/renvoyé en HTML (`editor.getHTML()`) plutôt qu'en texte brut — **aucune migration de schéma** côté backend (`BlogPost.Content` reste une simple colonne `string`).
- Côté public (`modules/blog/frontend/BlogPostPage.tsx`), rendu conditionnel : si le contenu contient une balise HTML (regex `/<[a-z][\s\S]*>/i`), rendu via `dangerouslySetInnerHTML` (contenu de confiance : seul l'admin authentifié du tenant peut l'écrire, même modèle de confiance que le reste de l'admin) ; sinon repli sur l'ancien rendu `whitespace-pre-wrap` pour ne pas casser les articles écrits avant ce changement. La génération de la meta description (voir "SEO de base" ci-dessus) retire aussi les balises HTML avant troncature.

### Optimisation des images uploadées, implémentée le 2026-08-06

Suite du brainstorm de fonctionnalités manquantes (`docs/07-admin-global.md`), catégorie UI/UX site public. Constat vérifié avant de coder : les 4 points d'upload d'image du projet (photos produits, galerie, établissement, logo agence) stockaient les octets bruts reçus du navigateur, sans aucun redimensionnement/compression — un visiteur pouvait donc télécharger une photo de smartphone à pleine résolution (3-4000px) rien que pour afficher une vignette. Dépendance externe validée avec Ethan avant d'installer (règle 5 de `CLAUDE.md`) : `SkiaSharp` (licence MIT), retenue plutôt qu'ImageSharp pour sa licence sans ambiguïté et parce que ses binaires natifs étaient déjà partiellement présents en dépendance transitive de QuestPDF.

- Nouveau `backend/ImageProcessing.cs`, un seul point d'appel (`ResizeAndCompress(bytes, extension)`) réutilisé par les 4 endpoints d'upload (`CatalogueAdminEndpoints.cs`, `GalleryAdminEndpoints.cs`, `EstablishmentEndpoints.cs`, `CompanyProfileEndpoints.cs`).
- Redimensionne si la plus grande dimension dépasse 1600px (conserve le ratio), réencode dans le **même format que l'original** (jamais de bascule vers JPEG, pour ne pas casser la transparence d'un PNG). Les SVG (logo) passent inchangés — vectoriel, rien à redimensionner. Si le décodage échoue (fichier corrompu), les octets d'origine sont conservés tels quels plutôt que de faire échouer tout l'upload.
- Vérifié à l'exécution (pas seulement à la compilation) via un petit projet jetable : le logo existant (500×500) recompresse sans perte de dimension, une image synthétique 3000×2000 redescend bien à 1600×1067.

### Statistiques (Google Analytics), implémenté le 2026-08-06

Demandé par Ethan comme suite du brainstorm de fonctionnalités manquantes (`docs/07-admin-global.md`) — question posée avant de coder : compteur maison (zéro dépendance, zéro cookie) ou intégration Google Analytics (plus riche, mais dépendance externe + bandeau de consentement RGPD nécessaire) ? Réponse : Google Analytics.

Nouveau module config-only `modules/analytics/` (même famille que WhatsApp/Réseaux sociaux — un seul champ `measurementId` dans `ModulesConfigJson`, aucun backend). `CookieConsentBanner.tsx` gère à la fois le bandeau et le chargement du script GA4 (`gtag.js`) : **le script ne se charge jamais avant un clic explicite sur "Accepter"** — c'est le point RGPD central. Choix mémorisé en `localStorage` par tenant, jamais reproposé une fois tranché. Refus = navigation normale du site, aucun cookie Google posé.

**Portée V1 assumée (rester simple)** : le bandeau n'est monté que sur la page d'accueil (`PublicSite.tsx`), pas sur les pages détail blog (`BlogPostPage.tsx`) ni le panier (`CartPage.tsx`), qui vivent en dehors de ce composant. Conséquence : ces pages ne déclenchent pas de mesure GA même après consentement. Comme l'essentiel du contenu d'un site (offres, établissement, blog en liste, RDV, newsletter...) vit déjà sur la page d'accueil elle-même, ça couvre la majorité du trafic réel — mais un futur passage pourrait étendre le montage du bandeau à ces routes si le besoin se confirme.

**Dépendance externe** : compte Google Analytics à créer par le client (gratuit), aucune clé API/SDK côté backend — juste un ID de mesure collé dans son admin.

### Multilingue (250€) — implémenté (2026-07-30)

**But pour le client** : afficher son site (et ses articles de blog) en anglais et espagnol en plus du français, sans ressaisir tout son contenu dans un back-office séparé par langue.

**But technique** : ce fichier prévoyait initialement de "repenser `SiteContent`/`Offer`/etc. pour porter plusieurs langues" — décision finalement plus simple à l'implémentation : une table générique `ContentTranslation` (voir `docs/03-modele-donnees.md`) stocke un champ traduit à la fois (`EntityType`/`EntityId`/`Locale`/`Field`/`Value`), **sans toucher au schéma** de `SiteContent`/`Offer`/`BlogPost`. Le français reste la valeur "de base" déjà en place ; l'anglais/espagnol ne sont que des lignes optionnelles dans cette table à part. `GET /content` et `GET /blog(/{slug})` acceptent `?locale=en|es`, fusionné dans la réponse seulement si le module est autorisé+activé pour ce tenant — sinon comportement inchangé. Toujours "transverse" au sens où le code touche `ContentEndpoints.cs`/`BlogModule.cs` (core + un autre module) plutôt que d'être 100% isolé dans `/modules/multilingue`, mais le `module.meta.json`/`authorized`/`enabled` suit le pattern standard (précédent : `Offer.ProductId` référencé par le module Catalogue, `GooglePlaceId` lu par Avis Google).

**Portée V1 (rester simple, décision d'Ethan)** : anglais et espagnol seulement (pas de liste de langues configurable). Traduit : nom du site, description, offres (titre/description), articles de blog (titre/contenu). **Ne traduit pas** : établissement (adresse/téléphone/horaires — faits, pas du texte marketing), ni les autres modules (RDV, Newsletter, etc.). Saisie manuelle des traductions par le client depuis `/admin/{clientSiteId}/multilingue` (onglets English/Español, 3 panneaux Site/Offres/Blog) — aucune traduction automatique, donc aucune dépendance externe (règle 5 de `CLAUDE.md`).

**Dépendance externe** : aucune pour la saisie manuelle.

**Mise à jour du 2026-07-30 (même jour)** : ajout d'un bouton "Traduire automatiquement" (par champ groupé — nom+description, ou titre+contenu) qui préremplit le brouillon depuis l'**API DeepL**, validée explicitement avec Ethan avant de coder (règle 5 de `CLAUDE.md`) — offre gratuite 500 000 caractères/mois. Le bouton ne fait que proposer une traduction dans le brouillon : il ne sauvegarde jamais tout seul, le client relit/corrige puis clique "Enregistrer" comme pour une traduction manuelle. Clé configurée dans `DeepL:ApiKey` (`backend/appsettings.Development.json`, gitignoré) — si absente, le bouton affiche une erreur explicite plutôt que de planter silencieusement. Voir `modules/multilingue/backend/DeepLTranslator.cs`.

**Statut** : [x] construit (2026-07-30) — `modules/multilingue/` (backend : entité + helper `MultilingueModule`, traduction automatique `DeepLTranslator.cs`, CRUD admin `MultilingueAdminEndpoints.cs` ; frontend : `LanguageSwitcher.tsx` affiché dans la nav d'Hestia/Helios si le module est actif). Page admin `MultilingueSection.tsx` (bouton "✨ Traduire automatiquement" par champ groupé). Testé avec le tenant historique : `?locale=en` sans traduction retombe sur le français, avec une traduction elle s'affiche ; `?locale=en` ignoré tant que le module n'est pas autorisé+activé.

**Reste à faire par Ethan** : créer un compte DeepL (gratuit) sur deepl.com, générer une clé API, la coller dans `DeepL:ApiKey` de `backend/appsettings.Development.json` (et en production, variable d'environnement `DeepL__ApiKey`).

**Mise à jour du 2026-07-30 (même jour) — habillage du site traduit aussi** : au-delà du contenu propre à chaque client (ci-dessus), les textes fixes du site public (liens de nav, titres de section "Bienvenue"/"Établissement"/"Horaires"/"Offres", et tous les formulaires/libellés internes de chaque module : Contact, RDV, Newsletter, Avis Google, Blog, Catalogue/panier/paiement) sont désormais traduits eux aussi, dans les 3 langues (le français redevient alors le contenu du dictionnaire plutôt que la valeur "de base" de `SiteContent`). Décision d'Ethan : périmètre complet plutôt que la seule "coquille" des templates.

Un unique dictionnaire statique `modules/multilingue/frontend/translations.ts` (`t(locale, clé, vars?)` + `localeTag(locale)` pour les dates `Intl`) porte ces chaînes — **distinct** de `ContentTranslation` (qui reste réservé au contenu propre à chaque tenant) : ce dictionnaire est identique pour tous les tenants, écrit à la main une fois pour toutes, jamais éditable depuis l'admin, aucun appel DeepL. Écart assumé à "un module reste isolé" (`docs/02-architecture-modules.md`) : chaque module public (Contact, Maps, RDV, Newsletter, Avis Google, Blog, Catalogue) importe ce fichier directement via l'alias `@modules/...` plutôt que de dupliquer ~90 chaînes — l'i18n est par nature transverse. Les avis Google eux-mêmes (texte de l'avis, nom de l'auteur) restent en français : ce sont des données Google en lecture seule (voir `GooglePlacesEndpoints.cs`, `language=fr`), pas du texte du site.

## Catégorie C — Prestations hors-code

Ces options ne sont pas des fonctionnalités du site — ce sont des livrables qu'Ethan produit directement (design, texte), sans ligne de code ni toggle `authorized`/`enabled`. Elles n'ont pas leur place dans `ModuleMetaRegistry`/le panneau "Tarifs des modules" de `/admin/dashboard` (qui liste des fonctionnalités activables), et ne suivent aucun pattern de ce fichier :

- **Logo (190€)** — livrable graphique.
- **Charte graphique (390€)** — livrable graphique (palette, typo, déclinaisons).
- **Rédaction des textes (sur devis)** — livrable texte.

**Page supplémentaire (80€)** — tranché le 2026-08-06 : construit comme un vrai module "Pages personnalisées" plutôt qu'un livrable manuel, voir la section dédiée plus bas.
