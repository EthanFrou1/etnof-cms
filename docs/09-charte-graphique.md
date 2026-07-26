# 09 — Charte graphique etnof-web

Extraite depuis https://website-etnof-web.vercel.app (analyse visuelle des captures d'écran). Les valeurs hex sont des approximations fidèles au rendu observé — à ajuster si un fichier de design (Figma, etc.) existant donne des valeurs exactes.

## Palette de couleurs

```css
:root {
  /* Couleurs principales */
  --color-navy: #0F172A;        /* Titres, texte fort */
  --color-green-accent: #22C55E; /* Accent principal (tagline, labels, bullets) */
  --color-gray-text: #64748B;    /* Texte secondaire / paragraphes */
  --color-border: #E2E8F0;       /* Bordures, séparateurs */

  /* Dégradé signature (logo + carte CTA) */
  --gradient-brand-start: #1E3A8A; /* bleu profond */
  --gradient-brand-mid: #2563EB;   /* bleu vif */
  --gradient-brand-end: #84CC16;   /* vert lime */

  /* Fond de page */
  --bg-page-start: #F8FAFC;
  --bg-page-end: #ECFDF5;

  /* Cartes */
  --bg-card: #FFFFFF;
}
```

Dégradé signature utilisé sur le logo et la carte "solution mise en avant" :
```css
background: linear-gradient(135deg, var(--gradient-brand-start), var(--gradient-brand-mid) 50%, var(--gradient-brand-end));
```

Fond de page (dégradé très subtil) :
```css
background: linear-gradient(180deg, var(--bg-page-start), var(--bg-page-end));
```

## Typographie

- **Police recommandée** : Inter (ou Manrope/Poppins si préférence) — sans-serif géométrique moderne, gratuite, proche du rendu observé
- **Titres (H1)** : `font-weight: 800-900`, taille très grande (ex : 64-96px desktop), `line-height: 1.05`, couleur `--color-navy`
- **Titres (H2)** : `font-weight: 800`, taille large (ex : 36-48px), même couleur
- **Labels de section** (overline, ex : "SERVICES", "PRODUIT") : majuscules, `letter-spacing: 0.1em`, taille petite (~13-14px), `font-weight: 600`, couleur grise ou verte selon contexte
- **Corps de texte** : `font-weight: 400`, `color: var(--color-gray-text)`, `line-height: 1.6`

```css
h1 { font-weight: 900; line-height: 1.05; color: var(--color-navy); }
h2 { font-weight: 800; color: var(--color-navy); }
.overline { text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.85rem; font-weight: 600; }
p { color: var(--color-gray-text); line-height: 1.6; }
```

## Rayons et ombres (radius/shadow tokens)

```css
:root {
  --radius-pill: 999px;   /* navbar flottante */
  --radius-card: 20px;    /* cartes de contenu */
  --radius-button: 12px;  /* boutons */

  --shadow-soft: 0 4px 20px rgba(15, 23, 42, 0.06);
  --shadow-card: 0 2px 12px rgba(15, 23, 42, 0.05);
}
```

Règle générale : **jamais d'angles droits**. Navbar, cartes, boutons, images — tout est arrondi. C'est un marqueur visuel fort de la marque, à respecter systématiquement.

## Composants types

### Navbar (pilule flottante)
- Fond blanc, `border-radius: var(--radius-pill)`, `box-shadow: var(--shadow-soft)`
- Logo + wordmark à gauche, liens de navigation à droite, alignés verticalement
- Flotte au-dessus du fond dégradé de la page, avec un padding généreux

### Cartes de contenu (Services, infos)
- Fond blanc (`--bg-card`), `border-radius: var(--radius-card)`, `box-shadow: var(--shadow-card)`
- Padding généreux (~32px)
- Titre en navy gras + texte descriptif en gris

### Carte CTA mise en avant (type "Fidelite Pro Plus")
- Fond en dégradé signature (bleu → vert), texte blanc
- Même radius que les autres cartes, mais visuellement plus imposante/contrastée

### Labels de section (overline)
- Toujours au-dessus d'un titre de section (H2), en majuscules, letter-spacing large, petit et discret

## Logo

- Monogramme "ENW" en dégradé bleu → vert (diagonal)
- Wordmark "etnof-web" en dessous, même dégradé appliqué au texte ou en navy selon le contexte (clair/foncé)
- Tagline "DÉVELOPPEMENT WEB" en petites majuscules, couleur verte, letter-spacing large

## Note pour Claude Code

Utiliser ces tokens CSS (variables ou config Tailwind équivalente) de façon cohérente sur l'ensemble du starter-kit et des sites générés, pour que chaque site produit reste dans l'identité visuelle etnof-web par défaut — personnalisable ensuite par client si besoin (couleur d'accent différente par exemple), mais la structure (radius, typographie, espacement) reste la même.



