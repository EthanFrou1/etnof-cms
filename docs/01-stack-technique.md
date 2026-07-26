# 01 — Stack technique

## Choix retenus

| Brique | Choix | Pourquoi |
|---|---|---|
| Backend | ASP.NET Core .NET 8 | Déjà maîtrisé (stack pro chez elloha), performant, typé |
| ORM | Entity Framework Core | Standard .NET, migrations faciles |
| Base de données | PostgreSQL | Gratuit, robuste, déjà utilisé dans le brief outil de prospection, bon support JSON (utile pour stocker de la config flexible par module) |
| Frontend | React + Vite + TypeScript | Préférence exprimée, écosystème riche, Vite = démarrage rapide |
| Style | TailwindCSS | Rapide à mettre en place, cohérent avec du responsive rapide pour des sites vitrines |
| Config modules | Fichier `site.config.json` (JSON) | Simple, versionnable avec Git, lisible sans outil, pas besoin de base de données pour ça au niveau POC |
| Environnement dev | Docker Compose (Postgres + API + éventuellement front) | Coût zéro, reproductible, même environnement partout |
| Hébergement (post-POC uniquement) | Coolify auto-hébergé, ou Vercel (front) + Railway (API) selon projet client | Décision à prendre projet par projet, pas dans le scope du POC |

## Alternatives écartées et pourquoi

- **SQLite au lieu de PostgreSQL** : plus léger, mais PostgreSQL reste gratuit en local via Docker et évite une migration de moteur de base de données plus tard si un module (Blog avec recherche, multilingue) a besoin de fonctionnalités plus avancées.
- **Next.js au lieu de React + Vite** : Next.js apporte du SSR/SEO natif intéressant pour des sites vitrines, mais complexifie l'architecture pour un POC. À réévaluer une fois le mécanisme de modules validé — ce n'est pas un choix figé à vie, juste écarté pour le POC.
- **Un vrai CMS headless existant (Strapi, Payload)** : irait plus vite pour la gestion de contenu générique, mais ne correspond pas à l'idée centrale du projet (modules alignés sur TA propre grille tarifaire, pas un CMS générique).

## Règle de stabilité

Ces choix sont figés pour la durée du POC. Toute remise en question doit être discutée explicitement avant de changer de direction en cours de route — l'objectif est justement d'éviter de se perdre.
