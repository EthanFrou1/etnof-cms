# 03 — Modèle de données (POC)

Le POC ne couvre que ce qui est nécessaire pour les modules Contact + Maps + Blog (voir roadmap). Rester minimal, ne pas anticiper les futurs modules dans le schéma.

## Entités du POC

### Site
Représente la config globale du site (une seule ligne en POC, car un déploiement = un client).

| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| Name | string | Nom du site client |
| ModulesConfig | jsonb | Miroir de `site.config.json`, utile si on veut un jour un petit back-office pour l'éditer sans toucher au fichier |

### ContactMessage (module Contact)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| Name | string | |
| Email | string | |
| Message | text | |
| CreatedAt | datetime | |

### BlogPost (module Blog — phase ultérieure du POC)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| Title | string | |
| Slug | string | Unique par tenant, généré depuis le titre puis désambiguïsé si collision (voir `BlogAdminEndpoints.UniqueSlugAsync`) |
| Content | text | Markdown |
| PublishedAt | datetime | Nullable (brouillon si null) |
| CreatedAt | datetime | Ajouté le 2026-07-29 avec l'admin Blog — sert à trier la liste indépendamment de la publication |

### Product (module Catalogue)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| Name | string | |
| Description | text | |
| Price | decimal | |
| Stock | int | |
| CreatedAt | datetime | |

### Collection (module Catalogue, ajouté le 2026-08-25)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| Name | string | |
| SortOrder | int | Ordre d'affichage des chips de filtre (page boutique de Charis) — assigné à la création comme `ProductImage.SortOrder` (max+1), pas de réordonnancement manuel en V1 |

Regroupement simple des produits (0 ou 1 collection par produit, pas de tags multiples) — voir `docs/04-catalogue-modules.md`.

### Product.CollectionId / Product.Highlighted (ajoutés le 2026-08-25)
`Product` gagne `CollectionId` (`Guid?`, pas de navigation EF — même choix que `Offer.ProductId`/`OrderItem.ProductId` ci-dessous, pas de contrainte FK en base ; supprimer une collection met explicitement ce champ à `null` sur ses produits plutôt que de dépendre d'une cascade) et `Highlighted` (`bool`, défaut `false` — "mis en avant" sur la home, même nom que `PackageOffer.Highlighted`).

### ProductSize (module Catalogue, ajouté le 2026-08-26)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ProductId | Guid | FK vers Product, cascade delete (même pattern que `ProductImage`) |
| Label | string | Libre (`S`/`M`/`L`, `38`/`40`...), pas une liste fermée |
| Stock | int | Stock propre à cette taille |
| SortOrder | int | Ordre d'affichage, assigné à la création (max+1) — pas de réordonnancement manuel en V1 |

Facultatif et **optionnel par produit** (décision d'Ethan, `AskUserQuestion` : stock suivi par taille plutôt qu'informatif, et facultatif plutôt qu'obligatoire pour ne pas forcer une taille sur un produit qui n'en a pas besoin, ex. une bougie). Tant qu'un produit n'a aucune `ProductSize`, `Product.Stock` reste la seule source de vérité (comportement inchangé). Dès qu'au moins une taille existe, `Product.Stock` n'est **plus utilisé pour la vente** — chaque taille a son propre stock, vérifié/décrémenté par `StripeModule.cs` (voir `docs/04-catalogue-modules.md`) ; le champ reste visible mais désactivé dans l'admin (`ProductDetailPage.tsx`) pour ne pas laisser croire qu'il sert encore à quelque chose.

### ProductImage (module Catalogue)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ProductId | Guid | FK vers Product, cascade delete |
| Path | string | Chemin relatif servi statiquement (`/uploads/{clientSiteId}/{productId}/{fichier}`) |
| SortOrder | int | Ordre d'affichage des photos |

### Order (module Catalogue)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| CustomerId | Guid | FK vers Customer, `ON DELETE RESTRICT` |
| CustomerName | string | Snapshot au moment de la commande (même logique que `OrderItem.ProductName`) |
| CustomerEmail | string | Snapshot au moment de la commande |
| Status | string | `pending` / `fulfilled` / `cancelled` |
| Total | decimal | Calculé à la création, pas recalculé ensuite |
| CreatedAt | datetime | |

### Customer (module Catalogue, ajouté le 2026-07-26)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| Name | string | |
| Email | string | Recherché par égalité insensible à la casse au checkout (find-or-create) |
| Phone | string | |
| AddressLine1 | string | Rue et numéro (ex-colonne unique `Address`, renommée le 2026-08-27 — voir `docs/05-roadmap-poc.md`) |
| AddressLine2 | string | Complément (appartement, étage...), facultatif |
| PostalCode | string | |
| City | string | |
| Country | string | Texte libre, défaut "France" |
| Notes | string | Usage libre agence/client |
| CreatedAt | datetime | |

Pas de navigation EF `Order.Customer` (évite le cycle de sérialisation JSON déjà rencontré avec `ProductImage.Product` — voir `docs/05-roadmap-poc.md`). Les endpoints qui ont besoin des deux font deux requêtes séparées.

### OrderItem (module Catalogue)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| OrderId | Guid | FK vers Order, cascade delete |
| ProductId | Guid | Pas de FK stricte (le produit peut être supprimé après coup) |
| ProductName | string | Copie du nom au moment de la commande |
| UnitPrice | decimal | Copie du prix au moment de la commande |
| Quantity | int | |
| SizeLabel | string? | Ajouté le 2026-08-26 avec `ProductSize` — `null` pour un produit sans taille, sinon copie du `Label` choisi au moment de la commande (même logique snapshot que `ProductName`/`UnitPrice`, reste correct même si la taille est supprimée du produit ensuite) |
| ImagePath | string? | Ajouté le 2026-08-31 — copie du chemin de la 1ʳᵉ photo du produit (triée par `SortOrder`) au moment de la commande, même logique snapshot. `null` si le produit n'avait aucune photo. Affiché dans l'historique de commandes de la page "Mon compte" (`AccountPage.tsx`) |

### OrderStatusChange (module Catalogue, ajouté le 2026-08-31)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| OrderId | Guid | |
| FromStatus / ToStatus | string | |
| ActorLabel | string | Copie (pas une FK) — même principe que `AdminActionLog.ActorLabel` |
| CreatedAt | DateTime | |

"Suivi" affiché dans la ligne dépliée d'une commande (`OrdersSection.tsx` → `OrderDetailPanel.tsx`) — une ligne ajoutée à chaque vrai changement de statut (`PUT /admin/catalogue/orders/{id}/status`), jamais si le statut renvoyé est identique à l'actuel. Distinct de `AdminActionLog` (générique à tout l'admin) : ici on garde explicitement l'ancien/nouveau statut pour une vraie timeline, pas juste "Modification — Commandes".

### OrderComment (module Catalogue, ajouté le 2026-08-31)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| OrderId | Guid | |
| AuthorLabel | string | |
| Text | string | |
| CreatedAt | DateTime | |

Note interne sur une commande, jamais visible du client — même section que "Suivi" ci-dessus.

### ProductReview (module Catalogue, ajouté le 2026-08-06)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| ProductId | Guid | Pas de FK stricte, même choix qu'`OrderItem.ProductId` |
| AuthorName | string | Saisi librement par le visiteur, pas de vérification d'achat en V1 |
| Rating | int | 1 à 5 |
| Comment | string | |
| Selected | bool | Même pattern de curation que `GoogleReview.Selected` — soumis publiquement, affiché seulement une fois approuvé par le client depuis son admin. Défaut `false` à la création |
| CreatedAt | datetime | |

### Order.StripeSessionId (ajouté le 2026-07-29, module Stripe)
Colonne nullable ajoutée à `Order` (voir plus haut) : identifiant de la session Stripe Checkout ayant produit la commande. Sert de clé d'idempotence pour le webhook (Stripe peut renvoyer le même événement plusieurs fois) — `null` pour les commandes créées avant le module Stripe.

### StripeSettings (module Stripe, ajouté le 2026-07-29)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | Une seule ligne par tenant (même convention que `RdvSchedule`/`GoogleReviewSettings`) |
| SecretKey | string? | Clé secrète du compte Stripe **propre au client** (pas de compte plateforme/Connect) |
| WebhookSecret | string? | Secret de signature du endpoint webhook créé par le client dans son propre tableau de bord Stripe |

Volontairement **pas** dans `ClientSite.ModulesConfigJson` comme les autres champs de config module (ex. `maps.apiKey`) : cette colonne est renvoyée telle quelle par l'endpoint public `/api/t/{clientSiteId}/config/modules` (lu par `useModules()` sur le site public) — une clé secrète Stripe n'a rien à faire dans une réponse publique. Table dédiée, lue/écrite uniquement par les endpoints admin authentifiés (`TenantAdminAuth`) de `modules/stripe/backend/StripeAdminEndpoints.cs`.

Paiement en ligne réel depuis le module Stripe (voir plus bas, `StripeSettings`) : une commande n'est désormais créée qu'après confirmation du paiement (webhook Stripe), plus de paiement sur place — voir `docs/04-catalogue-modules.md`, entrée Catalogue produits.

### ModulePrice (agence, ajouté le 2026-07-26)
| Champ | Type | Note |
|---|---|---|
| ModuleName | string | Clé primaire — pas de `ClientSiteId`, un prix vaut pour tout le socle |
| Price | string | Texte libre ("250€", "Offert"...), pas un decimal — affiché sur la card d'un module non autorisé ("Activer pour {Price}"), édité depuis `/admin/dashboard` |

### EstablishmentImage (ajouté le 2026-07-26)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | Rattaché directement au tenant, pas à un module |
| Path | string | `/uploads/{clientSiteId}/establishment/{fichier}` |
| SortOrder | int | |

Photos affichées dans le panneau résumé de la page "Établissement" (`EstablishmentSection.tsx`). Même pattern d'upload que `ProductImage`.

### AdminActionLog (core, ajouté le 2026-08-31)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| ActorType | string | `"owner"` / `"employee"` / `"agency"` |
| ActorLabel | string | Copie ("Propriétaire" / "Agence (support)" / prénom+nom de l'Employé au moment de l'action) — pas une FK, reste correct même si le compte Employé est ensuite supprimé |
| Method | string | HTTP (`POST`/`PUT`/`DELETE`) |
| Path | string | Chemin complet de la requête |
| Action | string | Libellé lisible dérivé du chemin (`AdminActionLogger.DescribeAction`) — pas écrit à la main par endpoint |
| StatusCode | int | |
| CreatedAt | DateTime | |

Capturé génériquement par un middleware (`Program.cs`, voir `AdminActionLogger.cs`) sur toute requête d'écriture réussie sous `/api/t/{clientSiteId}/admin/...`, quel que soit l'endpoint — pas d'ajout à la main requis quand une nouvelle page admin arrive. Visible par le Propriétaire (page "Historique", owner-only comme Comptes/Modules/Stripe) et par l'agence (modale "Historique" sur chaque card de `SitesSection.tsx`) ; pagination par 20 ("Charger plus", `skip`/`take`). Les actions de l'agence via le mot de passe passe-partout sont loguées comme les autres — décision d'Ethan, la transparence protège le client autant que l'agence. La connexion elle-même (`POST .../admin/login`, `.../admin/accounts/invitation/confirm`) est loguée à la main (pas de token sur la requête de login, donc pas capturable par le middleware générique) — voir `TenantAdminEndpoints.cs`.

### TenantAdminAccount (core, ajouté le 2026-08-31)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| FirstName / LastName | string | |
| Email | string | Unique par tenant (pas de contrainte FK en base, vérifié à la création/modification côté endpoint) |
| Phone | string | Facultatif |
| PasswordHash | string | Même hachage PBKDF2 que `ClientSite.PasswordHash` (`AdminPasswordHasher`) — vide tant que le compte n'est pas activé, jamais choisi par le Propriétaire (voir `TenantAdminAccountInvite` ci-dessous) |
| ActivatedAt | DateTime? | Null tant que l'invitation n'a pas été suivie — affiché "En attente d'activation" dans `AccountsSection.tsx` |
| CreatedAt | DateTime | |

Compte "Employé" — accès admin restreint (pas de Modules, Paiement Stripe, ni la gestion des comptes elle-même, voir `TenantAdminAuth.IsOwnerAuthorizedAsync`), connexion quotidienne par email + mot de passe (pas de lien magique à chaque fois — décision d'Ethan, plus simple au quotidien). Le compte "Propriétaire" n'a pas de ligne ici : c'est toujours `ClientSite.PasswordHash`, jamais dupliqué. Un seul rôle existe (la présence d'une ligne ici EST le rôle "Employé") — pas de colonne `Role`, pas de permissions configurables.

### TenantAdminAccountInvite (core, ajouté le 2026-08-31)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| AccountId | Guid | |
| Token | string | Aléatoire (32 octets), à usage unique |
| ExpiresAt | DateTime | 48h après création (contre 15 min pour `CustomerLoginToken` — une invitation n'est pas une connexion routinière) |
| UsedAt | DateTime? | |
| CreatedAt | DateTime | |

Lien d'invitation envoyé par email (Brevo) à la création d'un `TenantAdminAccount` (ou au clic sur "Renvoyer l'invitation") — l'employé définit lui-même son mot de passe en le suivant, jamais transmis par le Propriétaire. Même patron 2 temps que `CustomerLoginToken` (module Compte client) : un GET ne consomme jamais le lien (affiche juste "définir mon mot de passe"), seul le POST de confirmation derrière un vrai clic l'active.

### SiteContent (core, pas un module — voir `docs/06-contenu-site.md`)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| SiteName | string | Page "Site internet", onglet "Contenu" |
| Description | text | idem — HTML riche (TipTap, mode compact : gras/italique/lien seulement) depuis le 2026-08-07, affiché avec `dangerouslySetInnerHTML` sur le site public, nettoyé en texte brut pour la balise `<meta name="description">` |
| StoryContent | text | Ajouté le 2026-08-26, onglet "Contenu" (même page que Description) — texte plus long ("Notre histoire"), distinct de `Description` qui reste le court texte d'accroche du hero. Affiché dans une section dédiée sur les templates qui la prennent en charge (Charis pour l'instant, voir `docs/10-templates.md`) accompagnée si possible de la 1ʳᵉ photo d'établissement ; section absente tant que ce champ est vide. Traductible comme `Description`/`SiteName` (module Multilingue) |
| EstablishmentName / EstablishmentType | string | Page "Établissement", onglet "Informations" — remplissables via recherche Google Places |
| Address | string | idem — Maps (`ModulesConfigJson.maps`) la lit ici, ne la stocke plus lui-même |
| Phone / Email | string | idem — affichés publiquement |
| ManagerName / ManagerPhone / ManagerEmail | string | Section "Responsable de l'établissement" (même onglet) — contact interne, jamais affiché publiquement |
| GooglePlaceId / GooglePlaceName | string | Fiche Google liée depuis la recherche de cette page (ajouté le 2026-07-29) — gratuite, ne contient jamais d'avis. Lue par le module Avis Google pour proposer directement "Actualiser les avis" sans re-chercher, sans jamais déclencher l'appel payant "reviews" toute seule |
| OpeningHoursJson | text | JSON d'une liste de 7 `DayHoursDto` (`Closed`/`MorningOpen`/`MorningClose`/`AfternoonOpen`/`AfternoonClose`, lundi→dimanche) — colonne texte brute reformée à la frontière API, même convention que `ClientSite.ModulesConfigJson` ; onglet "Horaires", gaté par le module "Horaires" |
| CgvContent | text | HTML riche (TipTap), onglet "CGV" (ajouté le 2026-08-06) — champ core plutôt qu'une page du module Pages (payant/optionnel) car obligation légale, pas une fonctionnalité premium. Affiché sur `/t/{clientSiteId}/cgv`. Bloque le paiement du panier (module Catalogue+Stripe) tant que vide, voir `docs/04-catalogue-modules.md` |
| LegalNoticeContent / PrivacyPolicyContent | text | Ajoutés le 2026-08-31, onglet "Mentions légales" — même raisonnement que `CgvContent` (obligation légale pour tout site, pas seulement une boutique, donc champ core plutôt qu'une page du module Pages). Affichés sur `/t/{clientSiteId}/mentions-legales` et `/confidentialite`. Pas de garde-fou bloquant comme `CgvContent` (rien à interrompre côté paiement) |
| PublishedContentJson | text? | Ajouté le 2026-08-07 — snapshot JSON de ce même contenu tel que publié (bouton "Rafraîchir le site", `PublishEndpoints.cs`). `null` tant que le tenant n'a jamais publié : l'endpoint public retombe alors sur les champs live ci-dessus. Voir aussi `ClientSite.Published*` pour le même principe côté template/logo |

### Offer (core, liste liée à SiteContent)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| SiteContentId | Guid | FK vers SiteContent |
| Title / Price / Description | string | Page "Offres" (`/admin/{clientSiteId}/offers`) |
| ProductId | Guid? | Lien facultatif vers `Product` (module Catalogue) — pas de FK stricte ni de navigation EF, même choix que `Order.CustomerId` ; toujours `null` si le tenant n'a pas le module Catalogue |

### RdvSchedule (module RDV, ajouté le 2026-07-28)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | Une seule ligne par tenant |
| SlotDurationMinutes | int | Durée d'un créneau, globale à tout le planning |
| WeekdayRulesJson | text | JSON d'une liste de 7 `WeekdayRuleDto` (`DayOfWeek` 0=lundi..6=dimanche, `Enabled`, `StartTime`, `EndTime` au format "HH:mm") — même convention qu'`OpeningHoursJson`, mais indépendante du module Horaires (décision d'Ethan) |

Aucune table de créneaux persistée : les créneaux disponibles sont calculés à la volée depuis ce gabarit (fenêtre glissante de 21 jours, voir `RdvModule.GenerateAvailableSlots`), pas stockés un par un.

### Booking (module RDV)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| StartsAt | datetime | Figé au moment de la réservation (snapshot), indépendant du planning ensuite modifié |
| DurationMinutes | int | idem |
| CustomerName / CustomerEmail / CustomerPhone / Note | string | |
| Status | string | `confirmed` / `cancelled` — pas de `fulfilled` (un rendez-vous a lieu ou non, pas d'étape de traitement) |
| CreatedAt | datetime | |

### GalleryImage (module Galerie, ajouté le 2026-08-06)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| Path | string | `/uploads/{clientSiteId}/gallery/{fichier}` — même pattern d'upload qu'EstablishmentImage/ProductImage, mais pas de plafond de photos |
| SortOrder | int | Ordre d'ajout, pas de réordonnancement manuel en V1 |

### CustomPage (module Pages personnalisées, ajouté le 2026-08-06)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| Title | string | |
| Slug | string | Unique par tenant, généré depuis le titre, même logique que `BlogPost.Slug` (`PagesAdminEndpoints.UniqueSlugAsync`) |
| Content | string | HTML — même éditeur riche (TipTap) que `BlogPost.Content` |
| SortOrder | int | Ordre dans le menu déroulant du header, modifiable via boutons monter/descendre (`POST .../move`) |
| PublishedAt | datetime? | null = brouillon, comme `BlogPost` |
| CreatedAt | datetime | |

### NewsletterSubscriber (module Newsletter, ajouté le 2026-07-28)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| Email | string | Dédoublonné par égalité insensible à la casse à l'inscription (pas de contrainte unique en base) |
| CreatedAt | datetime | |

### GoogleReviewSettings (module Avis Google, ajouté le 2026-07-28)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | Une seule ligne par tenant (retrouvée par égalité, même convention que `RdvSchedule` — pas de clé primaire composite) |
| PlaceId | string | Identifiant Google Places de la fiche liée |
| PlaceName | string | Nom affiché dans l'admin (issu de la recherche Google) |
| AverageRating | double? | Instantané de la note moyenne Google, mis à jour à chaque actualisation |
| UserRatingsTotal | int? | Nombre total d'avis Google (pas seulement ceux importés/sélectionnés) |
| LastFetchedAt | datetime? | Date de la dernière actualisation manuelle |

### GoogleReview (module Avis Google)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| GoogleTime | long | Horodatage Unix renvoyé par Google pour cet avis précis — clé naturelle utilisée pour l'upsert lors d'une actualisation (préserve `Selected` sans le réinitialiser) |
| AuthorName, ProfilePhotoUrl, Rating, Text, RelativeTimeDescription | string/int | Miroir en lecture seule du contenu Google, jamais modifié côté site |
| Selected | bool | Choisi par le client dans son back-office pour affichage public (défaut `false` à l'import) |
| FetchedAt | datetime | Date de la dernière actualisation ayant touché cet avis |

### CompanyProfile (agence, ajouté le 2026-07-30)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | Une seule ligne en base (get-or-create), pas de `ClientSiteId` — config de l'agence elle-même, pas d'un tenant |
| LegalName / TradeName / LegalForm / Siret / Address / Email / Phone | string | Identité de l'agence, affichée sur les devis/factures |
| VatMention | string | Mention TVA à faire figurer sur chaque document (défaut : franchise en base, art. 293 B du CGI) |
| Iban / Bic | string | Coordonnées bancaires affichées sur les factures |
| LatePaymentMention | string | Texte libre en pied de facture (pénalités de retard + indemnité forfaitaire de 40€, mention obligatoire) |
| CgvUrl | string | Lien vers les CGV publiées (pas de duplication du texte sur chaque document) |
| LogoPath | string? | `/uploads/agency/logo/{fichier}`, même pattern d'upload que `EstablishmentImage` |
| UpdatedAt | datetime | |

### BillingClient (agence, ajouté le 2026-07-30)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid? | Lien facultatif vers un `ClientSite` existant — pas de FK stricte ni de navigation EF, même choix qu'`Offer.ProductId`. `null` pour un prospect ou une prestation hors plateforme |
| Name / IsCompany / Siret / Address / Email / Phone / Notes | string/bool | Destinataire des devis/factures |
| CreatedAt | datetime | |

### Quote (agence, ajouté le 2026-07-30)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| Number | string | Format `D-2026-0001`, généré à la création (`MAX+1` par année) — pas d'obligation légale de séquence sans trou pour un devis, contrairement à `Invoice.Number` |
| BillingClientId | Guid | |
| Status | string | `draft` / `sent` / `accepted` / `refused` / `expired` |
| IssueDate / ValidUntil | datetime | `ValidUntil` par défaut = +30 jours (cohérent avec les CGV : devis non confirmé sous 30 jours = caduc) |
| LineItemsJson | text | JSON d'une liste de `QuoteLineDto(Label, Quantity, UnitPrice)` — même convention que `SiteContent.OpeningHoursJson` |
| TotalHt | decimal | Calculé et figé à l'enregistrement, comme `Order.Total` |
| Notes | string | |
| AcceptedAt / AcceptedByName / AcceptedByEmail / AcceptedFromIp | datetime?/string? | Signature électronique simple capturée via la page publique d'acceptation (`/devis/{id}`, sans auth) |
| CreatedAt | datetime | |

### Invoice (agence, ajouté le 2026-07-30)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| Number | string? | **Null tant que brouillon** — assigné uniquement à la finalisation (`POST /finalize`), format `2026-0001` par année, séquence légale sans trou. Une facture finalisée n'est jamais supprimée ni renumérotée |
| BillingClientId | Guid | |
| QuoteId | Guid? | Lien facultatif vers le devis d'origine (pas de FK stricte), permet plusieurs factures par devis (acompte + solde) |
| InvoiceType | string | `acompte` / `solde` / `unique` |
| Status | string | `draft` / `sent` / `paid` / `overdue` (calculé côté frontend, pas stocké) / `cancelled` |
| IssueDate / DueDate | datetime | `DueDate` par défaut = +30 jours |
| LineItemsJson | text | JSON d'une liste de `InvoiceLineDto`, même convention que `Quote.LineItemsJson` |
| TotalHt | decimal | |
| Notes | string | |
| PaidAt | datetime? | |
| IsFinalized | bool | Verrouille les lignes et le numéro — `PUT`/`DELETE` refusés si `true` |
| StripeSessionId | string? | Idempotence du webhook de paiement en ligne (ajouté le 2026-07-30), même rôle qu'`Order.StripeSessionId` |
| CreatedAt | datetime | |

### AgencyStripeSettings (agence, ajouté le 2026-07-30)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | Une seule ligne en base (get-or-create), comme `CompanyProfile` |
| SecretKey / WebhookSecret | string? | Compte Stripe **de l'agence** (pas celui d'un tenant) — encaisse les factures qu'Ethan émet lui-même. Jamais exposé sur un endpoint public, distinct de `StripeSettings` (module Stripe, par tenant) |

### PackageOffer (agence, ajouté le 2026-07-30)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| Name | string | Nom de la formule (ex "Essentiel") |
| Price | string | Texte libre, même convention que `ModulePrice.Price` (ex "690€") |
| Description | string | Ajouté le 2026-07-30 (même jour) — texte affiché sur la card publique de la formule |
| FeaturesJson | string | Ajouté le 2026-07-30 (même jour) — liste JSON de fonctionnalités (bullet points), même convention que `ModulesConfigJson` (colonne texte brute, reformée en liste à la frontière API) |
| Highlighted | bool | Ajouté le 2026-07-30 (même jour) — affiche le badge "Le plus populaire" sur la card |
| SortOrder | int | Ordre d'affichage |

Liste (pas un singleton) éditable depuis la section "Formules" de `/admin/dashboard` (`frontend/src/pages/agency/PackageOffersSection.tsx`, voir `docs/07-admin-global.md`) — auto-seedée avec les 3 formules connues (Essentiel/Business/Sur mesure, reprises du contenu du site public etnof-web) si la table est entièrement vide, jamais re-seedée après une suppression manuelle. Sert, avec `ModulePrice`, à préremplir rapidement une ligne de devis/facture (`TariffPicker`, `frontend/src/pages/agency/shared.tsx`). Affichée en cards (pas en liste) : la formule `Highlighted` reprend le dégradé de marque et un badge, les autres un simple encadré.

### ContentTranslation (module Multilingue, ajouté le 2026-07-30)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| EntityType | string | `"site"` (SiteContent, singleton) / `"offer"` / `"blog-post"` |
| EntityId | Guid? | `null` pour `"site"`, sinon l'Id de l'`Offer`/`BlogPost` traduit |
| Locale | string | `"en"` / `"es"` — jamais `"fr"` : le français reste la valeur "de base" déjà stockée dans `SiteContent`/`Offer`/`BlogPost`, pas dupliquée ici |
| Field | string | `"siteName"` / `"description"` / `"title"` / `"content"` selon l'entité |
| Value | string | Texte traduit — vide retombe sur l'original côté API (`MultilingueModule.Merge`), jamais un champ blanc affiché |

Table générique plutôt que d'ajouter des colonnes `Locale` à `SiteContent`/`Offer`/`BlogPost` (ceux-ci restent inchangés) — voir `docs/12-plan-modules-restants.md`, catégorie B ("transverse"). Pas de FK stricte ni de navigation EF vers l'entité traduite, même choix qu'`Offer.ProductId`. `GET /api/t/{clientSiteId}/content` et `GET/{slug}` du module Blog acceptent un paramètre `?locale=en|es` optionnel, ignoré (contenu français inchangé) si le module Multilingue n'est pas autorisé+activé pour ce tenant. CRUD admin dans `MultilingueAdminEndpoints.cs` (`/api/t/{clientSiteId}/admin/multilingue/...`).

## Note sur le module Maps

Pas de table dédiée pour Maps lui-même. L'adresse qu'il affiche n'est **pas** stockée dans sa config module — elle vit dans `SiteContent.Address` (voir `docs/06-contenu-site.md`), partagée avec d'autres usages potentiels de l'adresse de l'établissement. Seul `apiKey` (propre à l'embed Google Maps) reste dans `ModulesConfigJson.maps`.

## Règle pour la suite

Chaque nouveau module ajouté après le POC ajoute ses propres entités dans ce fichier, sans jamais modifier les entités d'un autre module.
