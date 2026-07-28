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
| Slug | string | Unique |
| Content | text | Markdown |
| PublishedAt | datetime | Nullable (brouillon si null) |

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

Pas de paiement en ligne réel : une commande est enregistrée et décrémente le stock à la validation, mais rien n'est prélevé automatiquement (voir `docs/04-catalogue-modules.md`, entrée Catalogue produits).

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
| Description | text | idem |
| EstablishmentName / EstablishmentType | string | Page "Établissement", onglet "Informations" — remplissables via recherche Google Places |
| Address | string | idem — Maps (`ModulesConfigJson.maps`) la lit ici, ne la stocke plus lui-même |
| Phone / Email | string | idem — affichés publiquement |
| ManagerName / ManagerPhone / ManagerEmail | string | Section "Responsable de l'établissement" (même onglet) — contact interne, jamais affiché publiquement |
| OpeningHoursJson | text | JSON d'une liste de 7 `DayHoursDto` (`Closed`/`MorningOpen`/`MorningClose`/`AfternoonOpen`/`AfternoonClose`, lundi→dimanche) — colonne texte brute reformée à la frontière API, même convention que `ClientSite.ModulesConfigJson` ; onglet "Horaires", gaté par le module "Horaires" |

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

## Note sur le module Maps

Pas de table dédiée pour Maps lui-même. L'adresse qu'il affiche n'est **pas** stockée dans sa config module — elle vit dans `SiteContent.Address` (voir `docs/06-contenu-site.md`), partagée avec d'autres usages potentiels de l'adresse de l'établissement. Seul `apiKey` (propre à l'embed Google Maps) reste dans `ModulesConfigJson.maps`.

## Règle pour la suite

Chaque nouveau module ajouté après le POC ajoute ses propres entités dans ce fichier, sans jamais modifier les entités d'un autre module.
