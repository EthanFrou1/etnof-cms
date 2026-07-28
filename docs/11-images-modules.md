# 11 — Images des cards Modules

Images utilisées par les cards de la page `/admin/{clientSiteId}/modules` (voir `frontend/src/pages/admin/ModulesSection.tsx`). Générées par IA par Ethan, pas de service payant intégré au code (règle 5 de `CLAUDE.md`).

Format attendu : `frontend/public/module-icons/{nom-module}.png`, ratio **16:10** (paysage). Déposer le fichier généré directement dans ce dossier avec le bon nom, aucune autre config nécessaire — tant qu'un fichier n'existe pas, la card affiche automatiquement un dégradé de secours avec l'initiale du module.

## Gabarit commun (garder identique pour chaque module, seul le sujet change)

```
Flat modern vector illustration, soft rounded shapes, no text, no logos, no letters,
clean minimal composition centered on a plain background, diagonal gradient background
from deep blue (#1E3A8A) through vivid blue (#2563EB) to lime green (#84CC16),
soft ambient lighting, subtle drop shadows, generous negative space,
professional SaaS product illustration style, similar to Stripe or Linear marketing illustrations,
16:10 landscape aspect ratio

Subject: [SUJET DU MODULE]
```

## Sujet par module

| Fichier | Sujet à coller dans `[SUJET DU MODULE]` |
|---|---|
| `contact.png` | a stylized speech bubble combined with an envelope icon, floating above a minimal desk surface, representing a contact form |
| `maps.png` | a stylized location pin dropping onto a simplified map with soft rounded roads and a small building outline |
| `blog.png` | a stylized open book or article page with a floating pen, representing a blog |
| `catalogue.png` | a stylized shopping bag or product box with a small price tag attached, representing an online product catalogue |
| `horaires.png` | a stylized clock face with rounded hour and minute hands, paired with a small minimalist calendar page peeking out behind it, representing opening hours and schedule |
| `rdv.png` | a stylized calendar page with a checkmark on one date, paired with a small clock icon, representing booking an appointment slot |
| `newsletter.png` | a stylized envelope with a small paper airplane or upward arrow above it, representing sending/subscribing to a newsletter |
| `avis-google.png` | a stylized five-pointed star (filled) next to a rounded speech bubble containing a few small horizontal lines, representing a customer review/rating |

## Notes

- Le dégradé de fond de chaque image doit rester proche du dégradé de marque etnof-web (`#1E3A8A → #2563EB → #84CC16`, voir `docs/09-charte-graphique.md`) pour que les 4 cards forment un ensemble cohérent même générées séparément.
- Pas de texte/lettres dans l'image : le nom du module est déjà affiché en overlay par-dessus (voir `ModulesSection.tsx`).
- Module futur ajouté : réutiliser le même gabarit avec un nouveau sujet, l'ajouter à `MODULE_IMAGES` dans `frontend/src/pages/admin/ModulesSection.tsx`.
