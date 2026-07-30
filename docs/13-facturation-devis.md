# 13 — Facturation & contrats

Sujet ouvert le 2026-07-30 à la demande d'Ethan : automatiser la création des devis/contrats et factures qu'il envoie à **ses propres clients etnof-web** (les commerçants/indépendants à qui il vend un site). Ce n'est **pas** un module vendu aux clients finaux (comme Blog, RDV...) — c'est un outil interne à l'agence, piloté depuis `/admin/dashboard/facturation`, sur le modèle de ce que fait déjà le panneau "Tarifs des modules".

Ce fichier fait deux choses : (1) trace écrite de la recherche juridique/pratique sur la facturation et les contrats de prestation en France, (2) l'analyse de faisabilité et la portée retenue pour la V1.

## Statut : V1 construite et testée (2026-07-30)

La portée décrite dans "Mon analyse" ci-dessous a été construite dans la même session : `CompanyProfile`, `BillingClient`, `Quote`, `Invoice` (voir `docs/03-modele-donnees.md` pour le détail des champs et `docs/07-admin-global.md` pour la section admin). Testé de bout en bout (curl) : devis créé → PDF (QuestPDF) → envoyé → accepté via le lien public sans auth (signature électronique simple : nom/email/IP) → facture d'acompte créée depuis le devis accepté et finalisée (`2026-0001`) → facture de solde finalisée (`2026-0002`, séquence sans trou confirmée) → modification/suppression refusées après finalisation → marquage payée.

**Écart avec la recherche initiale** : aucun — le découpage en 4 briques (config entreprise / clients / devis / factures), la numérotation par année (`2026-0001`), l'acompte dès la V1, QuestPDF et la signature électronique simple ont tous été confirmés avec Ethan avant le code (voir échange en fin de fichier) puis implémentés tels quels.

**Reste à vérifier par Ethan dans le navigateur** (pas d'outil de capture d'écran dans cet environnement) : remplir la config entreprise avec les vraies infos etnof-web, créer un vrai client, envoyer un devis et ouvrir le lien public dans une fenêtre de navigation privée, accepter, générer et finaliser une facture d'acompte puis de solde, vérifier visuellement les deux PDF. Un client de facturation et deux factures de test (`2026-0001`, `2026-0002`) ont été laissés en base par les tests — à supprimer ou garder comme exemple, au choix d'Ethan (la facture "2026-0001" étant finalisée, elle ne peut être supprimée que par annulation, pas par suppression).

**Hors scope V1** (non construit, à reprendre plus tard si besoin) : envoi automatique du **lien de devis** par email (toujours partagé manuellement — seule la confirmation de **paiement de facture** a un email automatique, voir plus bas), avoirs/notes de crédit, conformité Factur-X/PDP (échéance légale : 1er septembre 2027 pour l'émission B2B des micro-entreprises — les données sont déjà stockées de façon structurée, voir "Mon analyse", pour ne pas repartir de zéro le moment venu), comptabilité/export FEC.

## Paiement en ligne (ajouté le 2026-07-30, même session)

Ethan a demandé, juste après la V1 ci-dessus, que ses clients puissent payer une facture en ligne avec l'argent versé sur **son propre compte Stripe**. Question de légalité posée et répondue avant de coder : oui, sans restriction particulière (Stripe = PSP agréé ; la facture reste obligatoire quel que soit le moyen de paiement ; le CA encaissé compte normalement pour le plafond micro-entreprise ; à verser sur le compte bancaire dédié obligatoire au-delà de 10 000€ de CA deux années de suite).

Construit en reprenant exactement le pattern du module Stripe déjà existant pour les tenants (`modules/stripe/`), mais au niveau agence (`AgencyStripeSettings`, singleton — voir `docs/03-modele-donnees.md` et `docs/07-admin-global.md`). Aucune nouvelle dépendance (`Stripe.net` déjà présent). Détail technique et statut de test dans `docs/07-admin-global.md`, section "Paiement en ligne des factures". **Testé de bout en bout avec le vrai compte Stripe d'Ethan** (clé restreinte en mode test, `stripe listen` en local) — paiement réel simulé, facture marquée payée automatiquement.

## Email de confirmation de paiement (ajouté le 2026-07-30, même session)

Ethan a ensuite demandé qu'un email de confirmation parte automatiquement au client dès qu'une facture est payée en ligne, avec la facture (PDF) en pièce jointe. Nouvelle dépendance externe signalée et confirmée avec Ethan : **Brevo**, déjà utilisé sur son autre projet (Fidélité Pro Plus), expéditeur `etnofweb@gmail.com`. Pas de SDK NuGet — un simple appel REST (`backend/BrevoEmailService.cs`) suffit. Déclencheur V1 : uniquement le paiement confirmé automatiquement par le webhook Stripe. Détail dans `docs/07-admin-global.md`, section "Email de confirmation de paiement".

## Lignes de devis/facture depuis les tarifs (ajouté le 2026-07-30, même session)

Dernière demande d'Ethan de la session : pouvoir piocher rapidement une ligne de devis/facture depuis ses tarifs déjà connus (modules à la carte + formules de base), plutôt que de tout retaper à la main. Nouvelle entité `PackageOffer` pour les 3 formules (auto-seedée, éditable), sélecteur `TariffPicker` combinant formules + modules déjà tarifés (`ModulePrice`) dans les deux panneaux Devis et Factures. Aucune dépendance externe. Détail dans `docs/07-admin-global.md`, section "Lignes de devis/facture depuis les tarifs".

## Contexte etnof-web (relevé sur https://website-etnof-web.vercel.app/, 2026-07-30)

- Statut juridique : **auto-entreprise** (micro-entreprise), gérant Ethan Frou (avec Noa Frou).
- Clientèle : commerçants, indépendants, petites entreprises, salons, boutiques locales → très majoritairement des **clients professionnels (B2B)**, pas des particuliers.
- Offres : forfaits (Essentiel 690€, Business 1090€, Sur mesure 1990€) + options à la carte (voir `04-catalogue-modules.md`), donc des montants qui dépassent systématiquement les seuils légaux évoqués plus bas.
- Aucun numéro de TVA affiché publiquement (normal en franchise en base, voir plus bas) ; SIRET non affiché sur le site mais obligatoire sur les factures.

## Recherche : mentions obligatoires sur une facture (auto-entrepreneur, 2026)

**Mentions universelles** : identité du vendeur (nom, adresse, SIRET, mention "EI" — entreprise individuelle, obligatoire depuis la réforme du statut), identité du client (nom/raison sociale + adresse), numéro de facture (séquence chronologique continue, sans trou), date d'émission, description de la prestation, montant HT, conditions de paiement (délai, pénalités).

**TVA** : en franchise en base (cas de la quasi-totalité des auto-entrepreneurs, y compris etnof-web), la mention **"TVA non applicable, art. 293 B du CGI"** est obligatoire sur chaque facture. Si assujetti, il faut taux, montant TVA et TTC.

**Assurance professionnelle** : si l'activité est soumise à une RC Pro obligatoire, il faut mentionner les références du contrat, l'assureur et la couverture géographique. (À vérifier si etnof-web a une RC Pro souscrite — pas une obligation légale pour du dev web en soi, mais fortement recommandée.)

**Pénalités de retard et indemnité de recouvrement** : le taux de pénalité de retard et la mention de l'**indemnité forfaitaire de 40€ pour frais de recouvrement** sont des mentions obligatoires sur chaque facture (et doivent aussi figurer dans les CGV), même entre pros. Le taux contractuel de pénalité ne peut jamais être inférieur à 3x le taux d'intérêt légal.

**Sanction** : mention manquante ou inexacte → amende de 15€ par erreur, plafonnée à 25% du montant de la facture.

Sources : [LegalPlace — mentions obligatoires facture auto-entrepreneur](https://www.legalplace.fr/guides/mentions-obligatoires-facture-auto-entrepreneur/), [Portail Auto-Entrepreneur — checklist mentions](https://www.portail-autoentrepreneur.fr/academie/gestion-auto-entreprise/facturation/mentions-obligatoires-facture), [Freebe — pénalités de retard micro-entreprise](https://www.freebe.me/blog/facturer-des-penalites-de-retard-micro-entreprise), [GoCardless — pénalités de retard facture auto-entreprise](https://gocardless.com/fr/guides/articles/penalite-retard-facture-autoentreprise)

## Recherche : quand la facture / le devis sont obligatoires

- **Facture obligatoire entre professionnels** : systématique, dès le premier euro.
- **Facture obligatoire face à un particulier** : uniquement à partir de **25€ TTC** (en dessous, une simple note suffit, mais en pratique autant toujours facturer).
- **Devis obligatoire face à un particulier** : dès que le montant dépasse **1 500€** (seuil réglementaire général). Entre professionnels, aucun devis n'est légalement imposé, mais c'est la pièce contractuelle qui prouve l'accord sur le prix et le périmètre — indispensable en pratique dès qu'un litige est possible.

Vu les tarifs etnof-web (690€ à 1990€+), **un devis signé avant travaux est donc quasi systématiquement de mise**, que le client soit une entreprise (bonne pratique + preuve contractuelle) ou un particulier exceptionnel (obligation légale au-delà de 1500€).

Sources : [economie.gouv.fr — devis obligatoire comment ça marche](https://www.economie.gouv.fr/entreprises/gerer-sa-comptabilite-et-ses-demarches/devis-obligatoire-comment-ca-marche), [Assistant-juridique.fr — facture obligatoire](https://www.assistant-juridique.fr/facture_obligatoire.jsp)

## Recherche : contrat de création de site internet — clauses spécifiques au métier

Au-delà du socle CGV classique (objet, prix, délais, modalités de paiement, résiliation, responsabilité), deux clauses sont particulièrement importantes pour une activité de dev web :

- **Propriété intellectuelle** : par défaut, le développeur/designer reste titulaire des droits sur le site (œuvre de l'esprit) tant que le contrat ne prévoit pas de cession explicite. Le contrat doit préciser **le moment où les droits sont transférés au client** — en pratique, à la livraison **et** sous réserve du paiement intégral (donc pas de transfert de propriété si la dernière facture n'est pas soldée — un levier de protection en cas d'impayé).
- **Cahier des charges / périmètre** : le devis fixe le prix, un cahier des charges (même sommaire) fixe ce qui est livré — utile pour cadrer les demandes hors-scope en cours de projet (nombre de pages, révisions incluses, etc.).
- **Hébergement/maintenance après livraison** : à clarifier si etnof-web continue d'héberger/maintenir le site après la vente initiale (pertinent ici vu que la plateforme etnof-cms est multi-tenant — le client ne "possède" pas le code, il loue un espace sur la plateforme d'Ethan, ce qui est un cas un peu différent d'un site livré en code source).

Sources : [LegalPlace — clause propriété intellectuelle prestation de service](https://www.legalplace.fr/guides/clause-propriete-intellectuelle-prestation-service/), [LegalStart — contrat de création de site internet](https://www.legalstart.fr/fiches-pratiques/relations-commerciales/contrat-de-creation-site-internet/), [CGV-Expert — CGV création de sites internet](https://v-images.com/pourquoi-et-comment-rediger-des-cgv-pour-la-creation-de-sites-internet/)

## Recherche : droit de rétractation (si jamais un client est un particulier)

Pour un contrat de prestation de service conclu à distance avec un particulier, le délai de rétractation légal est de **14 jours**. Mais il tombe si l'exécution commence avant la fin du délai **à la demande expresse du client** — en pratique, il suffit d'ajouter au devis/contrat une case à cocher du type *"Je demande l'exécution immédiate de la prestation et renonce à mon droit de rétractation de 14 jours"*. Comme etnof-web vend quasi exclusivement en B2B, ce point est secondaire mais à garder en tête si un particulier commande un jour.

Source : [economie.gouv.fr — vente à distance, droit de rétractation](https://www.economie.gouv.fr/particuliers/vente-distance-droit-retractation)

## Recherche : signature électronique

En France, la signature électronique a la même valeur juridique qu'une signature manuscrite (art. 1367 du Code civil), à condition d'identifier le signataire et son consentement. Trois niveaux (règlement eIDAS) :

- **Simple** (ex. validation par lien/email, case à cocher + horodatage) : suffisante pour la **grande majorité des devis et contrats commerciaux courants**. Faible valeur probatoire en cas de litige, mais largement utilisée par les TPE/indépendants.
- **Avancée** (vérification d'identité) : recommandée pour des contrats plus sensibles.
- **Qualifiée** (certificat délivré par un prestataire agréé) : rarement nécessaire pour ce type d'activité.

Pour etnof-web, une signature simple (le client clique "j'accepte le devis", horodatage + IP + email enregistrés) est largement suffisante et évite d'intégrer un service tiers payant (Yousign, DocuSign...) dès la V1.

Sources : [Axonaut — valeur juridique signature électronique](https://axonaut.com/blog/vie_dune_entreprise/devis-entreprise/quelles-sont-les-regles-pour-faire-un-devis/signature-electronique-valeur-juridique/), [Signaturit — valeur juridique de la signature électronique](https://www.signaturit.com/fr/blog/la-valeur-juridique-de-la-signature-electronique/)

## Recherche : réforme de la facturation électronique (2026-2027) — point de vigilance important

C'est le point le plus structurant pour la conception de ce futur outil :

- **1er septembre 2026** : toutes les entreprises assujetties à la TVA (y compris en franchise en base, donc y compris etnof-web) doivent être en mesure de **recevoir** des factures électroniques via une plateforme agréée.
- **1er septembre 2027** : les micro-entreprises doivent aussi **émettre** leurs factures B2B domestiques au format électronique structuré (Factur-X, UBL ou CII), transmises via une **Plateforme de Dématérialisation Partenaire (PDP)** ou le Portail Public de Facturation (PPF). **Un PDF envoyé par email ne suffira plus** pour les clients professionnels.
- Comme la clientèle d'etnof-web est presque exclusivement B2B, cette échéance **concerne directement** un futur module de facturation.

Sources : [Portail Auto-Entrepreneur — facture électronique obligatoire, calendrier](https://www.portail-autoentrepreneur.fr/academie/gestion-auto-entreprise/facturation/facture-electronique-obligatoire), [Pennylane — obligation facture électronique auto-entrepreneur](https://www.pennylane.com/fr/fiches-pratiques/facture-electronique/obligation-pour-les-auto-entrepreneurs), [Cegid — calendrier facture électronique 2026-2027](https://www.cegid.com/fr/facture-electronique-obligatoire/calendrier-facture-electronique/)

## Mon analyse

**Oui, c'est automatisable, et ça vaut le coup** — c'est exactement le genre de tâche répétitive (ressaisir les mêmes infos, calculer les mêmes mentions légales, relancer les impayés) qu'un outil interne bien pensé élimine. Le projet a déjà la moitié du terrain : `ClientSite` existe comme fichier de "mes clients", `/admin/dashboard` existe comme espace réservé à Ethan, le pattern "config + génération de document" est déjà rodé (édition de contenu, génération de PDF n'existe pas encore mais serait la seule vraie brique technique nouvelle).

**Le point qui doit piloter la conception, c'est la réforme de facturation électronique de 2027.** Construire aujourd'hui un simple "générateur de PDF envoyé par email" est une bonne V1 (rien n'empêche de l'utiliser jusqu'à l'échéance), mais il faut le savoir dès le départ pour ne pas se coincer dans une architecture qui suppose "un PDF = une facture valide" pour toujours. Concrètement : stocker les données de facturation comme des **données structurées** (montants, lignes, client, dates) plutôt que directement comme un PDF figé, pour pouvoir un jour générer un Factur-X ou brancher une PDP sans tout refaire. Le PDF reste la sortie d'affichage, pas la source de vérité.

**Découpage que je proposerais** (à confirmer/ajuster avec toi avant tout code, comme d'habitude sur ce projet) :

1. **Config entreprise** (nouvel écran dans `/admin/dashboard`) : raison sociale, forme juridique, SIRET, adresse, régime TVA, RIB/IBAN, mentions légales par défaut (pénalités de retard, indemnité 40€, "TVA non applicable art. 293 B du CGI"), logo. Une seule fois, réutilisé partout.
2. **Devis** : lié à un `ClientSite` (ou un client "prospect" pas encore devenu tenant), lignes libres (reprenant si possible les offres/modules déjà tarifés dans `ModulePrice`), génération PDF, statut (brouillon/envoyé/accepté/refusé), acceptation par signature électronique simple côté client (lien public, pas d'auth).
3. **Facture** : générée à partir d'un devis accepté (ou manuellement), numérotation séquentielle automatique (obligation légale — jamais de trou), statut (brouillon/envoyée/payée/en retard), export PDF conforme aux mentions obligatoires listées ci-dessus.
4. **Suivi** : tableau des devis/factures en cours, relance manuelle des impayés (pas d'automatisation d'envoi tant qu'aucun service d'emailing n'est validé — règle 5 de `CLAUDE.md`).

**Ce qui nécessite une dépendance externe à valider avec toi avant de coder** (règle 5) :
- Génération PDF : une librairie .NET (ex. QuestPDF) — pas de service payant nécessaire, ça peut rester 100% local.
- Envoi automatique par email (devis/factures/relances) : nécessite un service SMTP/Resend, comme déjà noté pour la confirmation de RDV — à trancher.
- Signature électronique avancée/PDP pour 2027 : hors scope V1, à revisiter en 2027 (encore un an devant nous).

**Ce que je NE ferais PAS en V1** : comptabilité complète (rapprochement bancaire, export FEC, déclarations), gestion de la TVA si un jour etnof-web en sort du régime franchise, paiement en ligne intégré au devis (Stripe existe déjà comme module — possible de le réutiliser plus tard mais pas nécessaire pour commencer).

## Questions ouvertes pour toi

- Les "clients de facturation" sont-ils toujours les mêmes que les `ClientSite` existants (tenants hébergés), ou faut-il pouvoir facturer quelqu'un qui n'a pas (encore) de site sur la plateforme (ex. juste une refonte, ou une prestation hors-code type logo) ?
- As-tu déjà des CGV rédigées quelque part (même un brouillon) ou faut-il partir de zéro ?
- Numérotation actuelle de tes factures (si tu factures déjà manuellement aujourd'hui) : format déjà utilisé, pour ne pas créer un trou dans ta séquence légale en démarrant l'outil ?
- Prio par rapport au reste de la roadmap modules (`12-plan-modules-restants.md`) : on traite ça en parallèle, ou on le place dans la file après un module en cours ?
