---
name: add-theme
description: Add a new colour theme to the kali AFL project from a design markdown file. Use this skill whenever the user provides a design .md file and wants it turned into a theme, says "add this design as a theme", "implement this design doc", "create a theme from this", or refers to a DESIGN-*.md file. Also trigger when the user wants to add a new colour scheme or visual style to the app, even if they don't explicitly say "theme".
---

# Add Theme

Implement a new colour theme in the kali AFL SvelteKit project from a design specification markdown file. You'll add CSS token blocks, update the theme TypeScript enum, and optionally wire up a new font.

## What you'll produce

- `[data-theme="<id>"]` light mode block in `src/app.css`
- `.dark[data-theme="<id>"]` dark mode block in `src/app.css`
- Theme ID added to `Theme` union type and `themes` array in `src/lib/theme.svelte.ts`
- Optionally (ask first): new font entry in `src/lib/font.svelte.ts` and `src/app.html`

---

## Step 1 — Read the design file

Read the design MD file the user has provided. Extract:

- **Theme name** — derive a short kebab-case ID (e.g. "BMW M" → `bmw`, "Lil Dragon" → `lil-dragon`)
- **Colour palette** — every hex value with its semantic label (canvas, surface-card, primary, muted, hairline, etc.)
- **Primary accent** — the main brand/interactive colour
- **Mood** — is the design dark-first (black canvas) or light-first (white/pale canvas)?
- **Font recommendations** — note any open-source substitutes for proprietary fonts

---

## Step 2 — Map design colours to app CSS tokens

The app's theming system uses these CSS custom properties. Map the design's colours to them:

| App token | Role | What to use from the design |
|---|---|---|
| `--background` | Page floor | Canvas / main page background |
| `--foreground` | Primary text | Main body text colour |
| `--card` | Card surface | surface-card / slightly elevated bg |
| `--card-foreground` | Text on cards | Usually same as `--foreground` |
| `--popover` | Dropdown/popup bg | surface-elevated or one step lighter than card |
| `--popover-foreground` | Text in popups | Usually same as `--foreground` |
| `--primary` | Main action colour | Brand accent / primary colour |
| `--primary-foreground` | Text on primary buttons | White if primary is dark, dark if primary is light |
| `--secondary` | Secondary surface | Slightly different from `--background` (hover states, chips) |
| `--secondary-foreground` | Text on secondary | Usually same as `--foreground` |
| `--muted` | Softest surface | Lowest-contrast surface (surface-soft, near-invisible panels) |
| `--muted-foreground` | Dimmed text | Secondary/caption text |
| `--accent` | Hover highlight | Hover/active colour — can be same as primary |
| `--accent-foreground` | Text on accent | Contrasting text colour |
| `--destructive` | Error/danger | Red or error colour from design |
| `--border` | Dividers, card outlines | Hairline / border colour |
| `--input` | Input field borders | Usually same as `--border` |
| `--ring` | Focus ring | Usually same as `--primary` |
| `--chart-1` to `--chart-5` | Data visualisation | Brand palette: primary, secondary accents, then neutrals |
| `--sidebar` | Sidebar background | Slightly different from `--background` |
| `--sidebar-foreground` | Sidebar text | Same as `--foreground` |
| `--sidebar-primary` | Sidebar active item | Same as `--primary` |
| `--sidebar-primary-foreground` | Text on sidebar active | Same as `--primary-foreground` |
| `--sidebar-accent` | Sidebar hover | Same as `--secondary` or a shade lighter |
| `--sidebar-accent-foreground` | Sidebar hover text | Same as `--foreground` |
| `--sidebar-border` | Sidebar divider | Same as `--border` |
| `--sidebar-ring` | Sidebar focus ring | Same as `--ring` |

---

## Step 3 — Convert hex values to OKLCH

All colour values in `src/app.css` must use OKLCH format: `oklch(L C H)`

- **L** = lightness (0 = black, 1 = white)
- **C** = chroma / saturation (0 = grey, ~0.2+ = vivid)
- **H** = hue angle (0–360: red ≈ 25, yellow ≈ 85, green ≈ 140, blue ≈ 255, purple ≈ 305)

### Neutral greys (C = 0)
| Hex | OKLCH |
|-----|-------|
| `#000000` | `oklch(0 0 0)` |
| `#0d0d0d` | `oklch(0.085 0 0)` |
| `#1a1a1a` | `oklch(0.135 0 0)` |
| `#262626` | `oklch(0.185 0 0)` |
| `#2b2b2b` | `oklch(0.21 0 0)` |
| `#3c3c3c` | `oklch(0.285 0 0)` |
| `#7e7e7e` | `oklch(0.52 0 0)` |
| `#bbbbbb` | `oklch(0.76 0 0)` |
| `#e0e0e0` | `oklch(0.89 0 0)` |
| `#f0f0f0` | `oklch(0.955 0 0)` |
| `#f8f8f8` | `oklch(0.977 0 0)` |
| `#ffffff` | `oklch(1 0 0)` |

### Chromatic values — estimate by hue range
| Colour family | Hue (H) | Notes |
|---|---|---|
| Red / coral | 20–35 | Vivid red #e22718 ≈ `oklch(0.584 0.23 27)` |
| Orange | 40–60 | |
| Yellow / amber | 75–95 | Serika yellow #e2b714 ≈ `oklch(0.78 0.165 87)` |
| Green | 130–155 | |
| Teal / cyan | 175–200 | |
| Blue | 240–270 | BMW Blue #1c69d4 ≈ `oklch(0.52 0.175 255)` |
| Indigo / violet | 270–295 | |
| Purple | 295–320 | |
| Pink / magenta | 330–355 | |

For chroma: 0 = grey, 0.05–0.10 = pastel/tinted, 0.12–0.18 = mid-saturation, 0.18–0.25 = vivid. When in doubt, go slightly lower — it's easier to increase chroma than to fix a clashing neon.

---

## Step 4 — Construct light and dark mode variants

Every theme needs both a light and a dark block, even if the design is dark-only.

### Dark-first design (e.g. BMW M, Cyberpunk — canvas is near-black)
- **Light block** (`[data-theme="id"]`): Use a clean light-grey background (e.g. `oklch(0.977 0 0)`), dark foreground, keep the brand primary colour
- **Dark block** (`.dark[data-theme="id"]`): Use the design's authentic dark palette — this is the "real" version

### Light-first design (e.g. Nord, Iceberg — canvas is light/pale)
- **Light block** (`[data-theme="id"]`): Use the design's authentic light palette
- **Dark block** (`.dark[data-theme="id"]`): Invert: use a dark background, light foreground, keep the brand primary colour

### Dark mode border/input convention
In all dark themes in this project, `--border` is `oklch(1 0 0 / 10%)` and `--input` is `oklch(1 0 0 / 15%)`. Follow this — don't use a solid colour for dark mode borders.

---

## Step 5 — Write the CSS blocks

Open `src/app.css`. The file is organised in this order:
1. `:root` — Serika Light defaults
2. `[data-theme="*"]` blocks — one per theme (light mode)
3. `.dark` — Serika Dark defaults
4. `.dark[data-theme="*"]` blocks — one per theme (dark mode)
5. `@theme inline` — Tailwind token mappings (do not touch)
6. `@layer base` — do not touch

Insert the new **light block** after the last existing `[data-theme="*"]` block, before `.dark`.
Insert the new **dark block** just before `@theme inline`.

Follow the comment style of existing blocks:
```css
[data-theme="my-theme"] {
  /* My Theme Light — short description */
  --background: oklch(...);
  ...
}

.dark[data-theme="my-theme"] {
  /* My Theme Dark — short description */
  --background: oklch(...);
  ...
}
```

---

## Step 6 — Update theme.svelte.ts

File: `src/lib/theme.svelte.ts`

1. Add the theme ID to the end of the `Theme` union type
2. Add `{ id: "my-theme", label: "My Theme Label" }` at the end of the `themes` array

---

## Step 7 — Handle fonts (ask the user first)

If the design doc mentions a font recommendation (especially an open-source substitute for a proprietary typeface):

**Ask the user**: "The design recommends [FontName] as the typeface. Would you like me to add it as a font option in the app?"

If yes:
1. `src/lib/font.svelte.ts` — add to `Font` union type and `fonts` array:
   ```ts
   { id: "font-id", label: "Font Name", stack: '"Font Name", sans-serif' }
   ```
2. `src/app.html` — two changes:
   - Add `&family=Font+Name:wght@300;400;700` to the Google Fonts `href` (before `&display=swap`)
   - Add `'font-id': '"Font Name", sans-serif'` to the `fontMap` object in the blocking `<script>`

---

## Step 8 — Verify

Run `npm run check`. Expect 0 errors. The pre-existing warnings (state_referenced_locally) are fine — any new errors indicate a TypeScript mistake in the type unions.
