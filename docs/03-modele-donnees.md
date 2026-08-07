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
| Address | string | |
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

### SiteContent (core, pas un module — voir `docs/06-contenu-site.md`)
| Champ | Type | Note |
|---|---|---|
| Id | Guid | |
| ClientSiteId | Guid | |
| SiteName | string | Page "Site internet", onglet "Contenu" |
| Description | text | idem — HTML riche (TipTap, mode compact : gras/italique/lien seulement) depuis le 2026-08-07, affiché avec `dangerouslySetInnerHTML` sur le site public, nettoyé en texte brut pour la balise `<meta name="description">` |
| EstablishmentName / EstablishmentType | string | Page "Établissement", onglet "Informations" — remplissables via recherche Google Places |
| Address | string | idem — Maps (`ModulesConfigJson.maps`) la lit ici, ne la stocke plus lui-même |
| Phone / Email | string | idem — affichés publiquement |
| ManagerName / ManagerPhone / ManagerEmail | string | Section "Responsable de l'établissement" (même onglet) — contact interne, jamais affiché publiquement |
| GooglePlaceId / GooglePlaceName | string | Fiche Google liée depuis la recherche de cette page (ajouté le 2026-07-29) — gratuite, ne contient jamais d'avis. Lue par le module Avis Google pour proposer directement "Actualiser les avis" sans re-chercher, sans jamais déclencher l'appel payant "reviews" toute seule |
| OpeningHoursJson | text | JSON d'une liste de 7 `DayHoursDto` (`Closed`/`MorningOpen`/`MorningClose`/`AfternoonOpen`/`AfternoonClose`, lundi→dimanche) — colonne texte brute reformée à la frontière API, même convention que `ClientSite.ModulesConfigJson` ; onglet "Horaires", gaté par le module "Horaires" |
| CgvContent | text | HTML riche (TipTap), onglet "CGV" (ajouté le 2026-08-06) — champ core plutôt qu'une page du module Pages (payant/optionnel) car obligation légale, pas une fonctionnalité premium. Affiché sur `/t/{clientSiteId}/cgv`. Bloque le paiement du panier (module Catalogue+Stripe) tant que vide, voir `docs/04-catalogue-modules.md` |
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
