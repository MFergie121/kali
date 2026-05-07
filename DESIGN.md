# Design System — Kali AFL

> SvelteKit 2 · Svelte 5 · Tailwind v4 · shadcn-svelte · IBM Plex Mono default

## 1. Visual Theme & Atmosphere

Kali AFL is a developer's stats console dressed in the warm parchment of a typing app. The design language borrows directly from Monkeytype's Serika theme — a cream-on-charcoal world where every surface is built from semantic tokens, every page is a quiet grid of cards, and the only chromatic note is a single saturated Serika yellow that earns its presence by appearing only on actionable elements. There are no marketing flourishes here: the canvas is calm, the typography is monospaced by default, and information is the hero.

The hero is not a video — it's a punctuated cream landing page with a hand-drawn ASCII feel: the chakana logo, a lowercase wordmark, a three-line headline that reads like the opening of a README ("The AFL API / that should've / existed."), a stats bar, and a faux terminal showing the API in motion. The whole thing breathes in soft 24px radial-dot grids and rises into view with `cubic-bezier(0.16, 1, 0.3, 1)` over 380–400ms, each section staggered by ~60ms. It feels less like a product page and more like a developer toolbar that happens to be public.

Inside the app, the dashboard becomes a quiet workspace. A persistent sidebar groups navigation into collapsible "Stats" and "API Docs" sections (plus "Admin" when the session is admin), the header is a slim 56px bar with the chakana mark, and content lives inside a 72rem max-width column of cards: snapshot tiles for counts, a latest-round match list, top performers tabs, a season coverage grid of dotted round chips, and an API usage bar. Everything is lowercase, everything is tabular for numbers, and everything obeys the same trio of `bg-card / border-border / rounded-[0.625rem]` rules.

The system is theme-driven first: Serika is the default, but the user can switch between **Retro**, **Iceberg Light**, **Lil Dragon**, **Nord**, **Forest**, and **Cyberpunk**, each available in light and dark, and pair it with one of five fonts (**IBM Plex Mono**, **Geist**, **Fraunces**, **DM Sans**, **Syne**). Components are written *once* against semantic tokens; the theme layer in `src/app.css` does all the work.

**Key Characteristics:**

- Monkeytype-inspired Serika default (`oklch(0.918 0.028 89.5)` warm cream / `oklch(0.78 0.165 87)` yellow / `oklch(0.22 0.01 260)` charcoal)
- 7 user-switchable themes × light/dark mode × 5 fonts — all driven by CSS variables in `src/app.css`
- IBM Plex Mono is the default UI font; the typing-app monospace aesthetic is load-bearing
- Lowercase prose throughout the UI ("dashboard", "matches & stats", "get started →") — Title Case is reserved for sidebar/menu labels and shadcn primitives
- Strict semantic-token discipline: `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `bg-accent`, `bg-destructive` — never hardcoded hex/rgb/oklch values in components
- Card-and-chip composition: every panel is `bg-card` + `border border-border` + `rounded-[0.625rem]`, every count gets a `chip` (`bg-secondary` outlined pill)
- `rise` keyframe (`translateY(8–10px) + opacity 0→1`, `cubic-bezier(0.16, 1, 0.3, 1)`, ~0.38–0.4s) staggered by `animation-delay` for entrance choreography
- `font-variant-numeric: tabular-nums` on every number that lives in a row, score, or table
- Decorative atmosphere is delivered by *one* device per page: a radial-dot background grid on the landing hero, a faux mac-terminal block for code, a dotted round grid for season coverage
- Chakana — a stepped Andean cross with a centred circle — is the brand mark, rendered in `currentColor` at 22–40px

## 2. Color Palette & Roles

All colors are semantic tokens defined in `src/app.css`. Components must reference tokens through Tailwind utilities (`bg-primary`, `text-muted-foreground`, etc.) — never raw values. The token reference is also in `docs/ui.md` and `docs/ui-cheat-sheet.md`.

### Surface Tokens

| Token       | Utility            | Role                                                              |
|-------------|--------------------|-------------------------------------------------------------------|
| `--background` | `bg-background` | Page canvas — the warm cream (Serika light) or dark charcoal (Serika dark) |
| `--foreground` | `text-foreground` | Primary text — charcoal on cream, warm off-white on dark        |
| `--card`       | `bg-card`         | Panels, dashboard tiles, terminal containers                    |
| `--card-foreground` | `text-card-foreground` | Text on cards (always equal to foreground)              |
| `--popover`    | `bg-popover`      | Dropdowns, the user menu, theme/font pickers                    |
| `--popover-foreground` | `text-popover-foreground` | Text inside popovers                              |

### Interactive Tokens

| Token              | Utility                  | Role                                                              |
|--------------------|--------------------------|-------------------------------------------------------------------|
| `--primary`        | `bg-primary`             | Primary CTAs ("get started →", "enter"), active tab indicator, API usage bar fill, sidebar primary, the Serika yellow itself |
| `--primary-foreground` | `text-primary-foreground` | Text on primary fills (charcoal on yellow)                  |
| `--secondary`      | `bg-secondary`           | Chip backgrounds, hover row tint, subtle filled buttons          |
| `--secondary-foreground` | `text-secondary-foreground` | Text on secondary fills                                  |
| `--accent`         | `bg-accent`              | Hover state for ghost/outline buttons and nav items             |
| `--accent-foreground` | `text-accent-foreground` | Text on accent hover                                          |
| `--destructive`    | `bg-destructive` / `text-destructive` | Sign-out button, delete actions, critical API usage (≥90%), error toasts |

### Subdued & Chrome Tokens

| Token              | Utility                  | Role                                                              |
|--------------------|--------------------------|-------------------------------------------------------------------|
| `--muted`          | `bg-muted`               | Disabled inputs, skeleton loaders, empty round dots              |
| `--muted-foreground` | `text-muted-foreground` | Section labels, captions, timestamps, body prose, sub-titles    |
| `--border`         | `border-border`          | Every divider, card edge, table row separator                    |
| `--input`          | `border-input`           | Form input borders specifically (semantically separate from layout chrome) |
| `--ring`           | `ring-ring`              | Focus rings (applied globally as `outline-ring/50` in the base layer) |

### Sidebar Tokens (do not use outside the sidebar)

`--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`. These exist so a future theme can give the sidebar a subtly different surface from the main canvas without bleeding into content cards.

### Chart Tokens

`--chart-1` through `--chart-5` — used for sparklines, leaderboard accents, and any future graph work. Never reach for raw oklch values when graphing; pick the next chart token in sequence.

### Theme Catalogue

| Theme           | Personality                                  | Primary hue               |
|-----------------|----------------------------------------------|---------------------------|
| `serika` (default) | Monkeytype warm cream + Serika yellow     | `oklch(0.78 0.165 87)`    |
| `retro`         | Warm parchment + burnt orange                | `oklch(0.74 0.19 55)`     |
| `iceberg-light` | Cool blue-grey + muted purple                | `oklch(0.66 0.1 295)`     |
| `lil-dragon`    | Soft lavender + pink                          | `oklch(0.77 0.13 350)`    |
| `nord`          | Arctic slate + icy blue                       | `oklch(0.565 0.073 253)`  |
| `forest`        | Earthy greens                                 | `oklch(0.52 0.14 145)`    |
| `cyberpunk`     | Off-white + neon pink/cyan (light) → neon yellow on near-black (dark) | `oklch(0.6 0.28 340)` / `oklch(0.85 0.22 90)` |

All themes share the same destructive red and chart palette — only the surface, foreground, and primary tokens shift.

### Reserved Raw Colors (the *only* hardcoded values allowed)

A small set of brand-imitation colors are exempt from the no-raw-values rule because they imitate external chrome:

- `#ff5f57` / `#ffbd2e` / `#28ca41` — macOS traffic-light dots in the landing-page faux terminal
- `#4285F4` / `#34A853` / `#FBBC05` / `#EA4335` — Google "G" logo paths inside `OAuthButtons.svelte`

Nothing else should hardcode a color. Anything semantic (success, danger, accent) goes through a token.

## 3. Typography Rules

### Font Family

The default is `var(--font-sans)`, which resolves to **IBM Plex Mono** unless the user has switched fonts. The font store (`src/lib/font.svelte.ts`) writes the chosen stack to `--font-sans` on `<html>`; the choice persists in `localStorage` and is replayed by inline script in `src/app.html` to avoid FOUC.

Available fonts:

| Id             | Stack                              | Personality                          |
|----------------|------------------------------------|--------------------------------------|
| `ibm-plex-mono` (default) | `"IBM Plex Mono", monospace` | Typing-app monospace — the brand voice |
| `geist`        | `"Geist", sans-serif`              | Clean, neutral, modern               |
| `fraunces`     | `"Fraunces", serif`                | Editorial, warm, distinctive         |
| `dm-sans`      | `"DM Sans", sans-serif`            | Friendly geometric sans              |
| `syne`         | `"Syne", sans-serif`               | High-contrast display                |

Components must always use `var(--font-sans)` (or inherit it) — never hardcode a family.

### Hierarchy

| Role               | Size           | Weight  | Line height | Letter spacing | Notes                                          |
|--------------------|----------------|---------|-------------|----------------|------------------------------------------------|
| Hero headline      | `clamp(2.5rem, 6vw, 4.25rem)` | 700 | 1.05  | -0.04em        | Lowercase, three-line break, on landing page only |
| Page title         | 1.125rem       | 600     | —           | -0.02em        | Lowercase ("dashboard"), sits in the toolbar  |
| Card / nav title   | 0.875rem–0.9375rem | 600 | —           | -0.02em        | Lowercase                                      |
| Snapshot value     | 1.875–2rem     | 700     | 1           | -0.03em to -0.04em | Tabular nums                                |
| Body large         | 1.0625rem      | 400     | 1.75        | -0.01em        | Origin paragraph on landing                    |
| Body / UI          | 0.8125rem      | 400/500 | 1.6         | normal         | Card descriptions, terminal output             |
| Section label      | 0.6875rem      | 600     | —           | 0.06em         | Uppercase, muted-foreground                    |
| Chip / metadata    | 0.6875rem      | 400     | —           | 0.02em         | Lives inside a `bg-secondary` pill             |
| Caption / hint     | 0.625rem       | 400/500 | —           | 0.04em–0.12em  | Uppercase for stat labels and eyebrows         |
| Tagline            | 0.8125rem      | 400     | —           | 0.04em         | Hero sub-headline                              |

### Principles

- **Lowercase is the default voice.** Page titles ("dashboard"), section labels written as ASCII comments (`// why does this exist?`), tab buttons ("disposals", "goals", "fantasy"), and CTAs ("get started →", "enter") are all lowercase. Title Case is reserved for sidebar group labels (`Kali-AFL Stats`, `Stats`, `API Docs`, `Admin`), nav items (`Matches & Stats`), and shadcn primitives.
- **Section labels are uppercase eyebrows**, not headings. Always 0.625–0.6875rem, weight 600, letter-spacing 0.06–0.12em, color `text-muted-foreground`.
- **Tabular nums for everything numeric.** Score lines, leaderboards, snapshot tiles, percentage indicators, season counts. Always `font-variant-numeric: tabular-nums` to keep columns honest.
- **Tight negative tracking on display sizes** (-0.02em to -0.04em) creates the typing-app density.
- **One font choice flows through the whole UI.** Display, body, code, and chrome all share `var(--font-sans)` — no second display font, no per-section family swaps.
- **Decorative ASCII punctuation is encouraged.** `// comment-style eyebrow text`, arrows (`→`, `↗`), em-dashes, and the chakana mark all carry the developer-toolbar voice.

## 4. Component Stylings

### Buttons

`src/lib/components/ui/button/button.svelte` defines six variants, all sharing `rounded-md`, focus ring `focus-visible:ring-ring/50 focus-visible:ring-[3px]`, and hover transitions on background only.

| Variant       | Default                                     | Hover                       | Use for                                |
|---------------|---------------------------------------------|-----------------------------|----------------------------------------|
| `default`     | `bg-primary` / `text-primary-foreground`    | `bg-primary/90`             | Primary CTAs (get started, enter, sign in) |
| `secondary`   | `bg-secondary` / `text-secondary-foreground` | `bg-secondary/80`           | Supporting actions                     |
| `outline`     | `bg-background` + `border` / `text-foreground` | `bg-accent`              | Tertiary actions, dialog triggers      |
| `ghost`       | transparent / `text-foreground`             | `bg-accent`                 | Icon buttons, sidebar trigger, dropdown triggers |
| `link`        | transparent / `text-primary` underline      | `underline`                 | Inline links inside text               |
| `destructive` | `bg-destructive` / white                    | `bg-destructive/90`         | Sign-out, delete, dangerous admin actions |

Sizes: `sm` (h-8), `default` (h-9), `lg` (h-10), `icon` / `icon-sm` / `icon-lg` for square icon buttons.

### Cards & Containers

The canonical card recipe:

```html
<div class="bg-card border border-border rounded-[0.625rem] overflow-hidden">
  <div class="card-header"> <!-- 0.875rem 1.25rem padding, border-b border-border -->
    <span class="section-label">…</span>
    <span class="chip">…</span>
  </div>
  <div class="card-body">…</div>
</div>
```

- Border-radius: `0.625rem` (= `var(--radius)`) — the project default. Smaller fragments use `--radius-sm/md`.
- Border: always `1px solid var(--border)` — never tint with primary unless using `color-mix(in oklch, var(--border), var(--primary) 20%)` for a subtle hover state.
- Padding: header `0.875rem 1.25rem`, body `1rem 1.25rem`, snapshot tiles `1.375rem 1.5rem 1.25rem`.
- Animation: cards rise into view with the standard `rise` keyframe, staggered by 40–60ms via inline `animation-delay`.

### Chips

The chip is a load-bearing primitive across the app — every count, badge, and metadata pill uses it:

```html
<span class="chip"><!-- bg-secondary, border-border, rounded-md (0.375rem),
  padding 0.1rem 0.45rem, font-size 0.6875rem, color muted-foreground --></span>
```

For "primary" feature highlights (e.g. the "biggest selling point" badge on the landing feature card), use a primary-outline variant: `border border-primary`, `text-primary`, `rounded-[0.25rem]`, `padding 0.125rem 0.375rem`, `font-size 0.5rem`, `letter-spacing 0.1em`, uppercase.

### Inputs & Forms

Inputs (see `src/lib/components/ui/input/`) are `bg-background` (never `bg-muted` unless disabled), `border border-input rounded-md px-3 py-2`, with `placeholder:text-muted-foreground` and `focus-visible:ring-2 focus-visible:ring-ring`. Error helper text is `text-destructive`; neutral helper text is `text-muted-foreground`.

### Sidebar & Navigation

The sidebar (`src/lib/components/ui/sidebar/*`) is `bg-sidebar` with collapsible groups (`bits-ui` `Collapsible.Root`). Active nav items use `bg-sidebar-primary` + `text-sidebar-primary-foreground`. Hover uses `bg-sidebar-accent` + `text-sidebar-accent-foreground`. Group labels are uppercase 11–12px in `text-sidebar-foreground/muted` with a chevron that rotates on `[data-state=open]`.

The header is a sticky 56px (`h-14`) bar with `bg-background`, `border-b border-border`, the sidebar trigger on the left, the chakana logo + "Kali-AFL" wordmark, and the user menu on the right. A `nav-loading-bar` (3px, `bg-primary`, sliding keyframe) appears at the top of the viewport while `$navigating` is truthy.

### Logo (Chakana)

`src/lib/components/ui/custom/logo.svelte` renders a stepped Andean chakana cross with a centred circle, drawn in `currentColor` at 22–40px with stroke-width 4.5. Use it at 22px next to the wordmark in headers, 34–40px on the landing hero and sign-in card. Never recolor it directly — it inherits `currentColor`, so wrapping in `text-primary` is the way to tint it (the sign-in card uses this).

### Faux Terminal (landing-page only)

A pseudo-macOS terminal pane used to show API request/response examples. Built from `color-mix(in oklch, var(--background), black 30%)` for the body and `40%` for the title bar — this stays in tune with the active theme rather than going pure black. Three traffic-light dots (the only allowed hardcoded brand colors), a small lowercase title (`request`, `200 OK · application/json`), and a `pre` body with token-coloured spans (`t-key` → `var(--primary)`, `t-str` → primary mixed with white, `t-num` / `t-brace` / `t-muted` → semi-transparent whites).

### API Usage Bar

Track is `color-mix(in oklch, var(--muted), transparent 30%)`, fill is `bg-primary`. Once usage reaches ≥90%, both the percentage label and the fill switch to `var(--destructive)`. The bar is always 3px tall and uses `border-radius: 9999px` (the only "fully rounded" element other than tiny round dots).

### Round Dots (season coverage grid)

Tiny 22px square chips with `border-radius: 0.25rem`, used to show whether a round has been scraped. `round-scraped` → `bg-primary` with the round number in 8px weight 600 inside; `round-empty` → `bg-muted` with `border border-border`. P / F1 / SF / PF / GF labels are used for pre-season and finals.

## 5. Layout Principles

### Spacing & Rhythm

- **Base unit**: 0.25rem (4px), via Tailwind's spacing scale.
- **Card padding**: 1.25rem horizontal, 0.875rem vertical (header) / 1rem vertical (body).
- **Page padding**: 1.5rem horizontal on mobile up to 2rem on desktop, 2rem vertical at the page top.
- **Inter-card gap**: 0.75rem in dashboard grids, 1.25rem between major sections.
- **Hero padding**: 5rem 1.5rem 4rem on desktop, 3.5rem 1.25rem 3rem on mobile.

### Containers

- **App pages**: `max-width: 72rem` centred, with a 1.5rem gutter — this is the standard dashboard column.
- **Landing prose** (origin, terminals, endpoints): `max-width: 52rem`.
- **Landing features grid**: `max-width: 72rem`, 4-column → 2-column → 1-column.
- **Sign-in card**: `max-width: 22rem`.

### Grid Patterns

- Snapshot tiles: `repeat(4, 1fr)` → `repeat(2, 1fr)` below 640px.
- Dashboard mid-section: `1fr 1fr` (latest round + top performers) → 1 column below 768px.
- Nav cards: `repeat(3, 1fr)` → `repeat(2, 1fr)` below 768px → 1 column below 480px.

### Whitespace Philosophy

Cream is the new whitespace. The Serika cream `--background` is *meant* to feel like a Moleskine page, so generous gutters and quiet card framing are the default. Information density inside a card is fine; competing density between cards is not. Every page should look like a single column of related cards, separated by 0.75–1.25rem of cream.

### Border Radius Scale

| Value                                   | Context                                                                  |
|-----------------------------------------|--------------------------------------------------------------------------|
| `var(--radius)` = 0.625rem (10px)       | Cards, terminal blocks, hero stats bar, sign-in card (0.75rem variant)   |
| `var(--radius-md)` = 0.5rem (calc)      | Buttons (`rounded-md` per shadcn defaults)                               |
| `var(--radius-sm)` = 0.375rem (calc)    | Chips, endpoint pills, round dots (0.25rem variant)                     |
| `9999px`                                | API usage bar track + fill, the only "stadium" shape                     |
| `50%`                                   | Terminal traffic-light dots, performer rank circles when used            |

## 6. Depth & Elevation

| Level        | Treatment                                                                | Use                                                |
|--------------|--------------------------------------------------------------------------|----------------------------------------------------|
| 0 (Canvas)   | `bg-background`                                                          | Page root                                          |
| 1 (Surface)  | `bg-card` + `border border-border`                                       | Dashboard tiles, panels, all data containers       |
| 2 (Floating) | `bg-popover` + `border border-border` + `shadow-md`                      | Dropdowns, the user menu, theme/font pickers       |
| 3 (Modal)    | `bg-popover` over a backdrop using `oklch(0 0 0 / 0.35)` or token-driven | Full-screen overlays                               |

### Shadow Philosophy

Shadows are nearly invisible on cream. Elevation is achieved primarily through token shifts (`background` → `card` → `popover`) and a 1px `border-border` outline. Buttons get `shadow-xs` per shadcn defaults; popovers add `shadow-md`. Avoid larger shadow scales — they fight the typing-app calm.

### Decorative Depth

- **Radial dot grid** on the landing hero (`background-image: radial-gradient(circle, var(--border) 1px, transparent 1px); background-size: 24px 24px;`) gives a graph-paper feel without weight.
- **`color-mix()` row dividers** (`color-mix(in oklch, var(--border), transparent 50%)`) soften long lists of rows.
- **No glows, no blurs, no gradients on UI surfaces.** The cream-and-yellow palette doesn't need them.

## 7. Do's and Don'ts

### ✅ Do

- Use semantic Tailwind tokens **exclusively**: `bg-background`, `bg-card`, `bg-primary`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-destructive`, etc.
- Write components once and let `src/app.css` handle theming — every theme adapts automatically.
- Default UI prose to lowercase. Reserve Title Case for sidebar/menu labels and shadcn primitives.
- Use `font-variant-numeric: tabular-nums` on every number that lives in a row, score, leaderboard, or stat tile.
- Animate entrances with the standard `rise` keyframe (`translateY(8–10px) + opacity`, `cubic-bezier(0.16, 1, 0.3, 1)`, ~380–400ms) and stagger via `animation-delay`.
- Use `var(--font-sans)` (or inherit it) so the user's font choice flows through your component.
- Build cards from `bg-card + border border-border + rounded-[0.625rem]` — every panel is a sibling of every other panel.
- Use the `chip` pattern (`bg-secondary` outlined pill) for any inline count or metadata badge.
- Use `color-mix(in oklch, var(--token), …)` when you need a tinted variant of a token — it preserves theme-awareness.
- Tint the chakana logo by wrapping it in a `text-*` class (`currentColor` does the rest).

### ❌ Don't

- **Don't hardcode `oklch(...)`, `#hex`, or `rgb(...)` values in components.** This is the most common rule violation in the codebase today — `players/+page.svelte` and `teams/+page.svelte` both hardcode `oklch(0.52 0.14 145)` (forest green) for "winner" / "positive" semantics, which means switching to a non-forest theme leaves green leaking through where the theme's `--primary` should appear. If you need a "win/positive" semantic, introduce a single new token (e.g. `--success`) in `src/app.css` and reference it as a token. Same rule for `rgba(255, 255, 255, ...)` blocks inside the landing terminal — prefer `color-mix(in oklch, var(--foreground), transparent N%)`. Same for `oklch(0 0 0 / 0.35)` modal backdrops — prefer a token-driven shade.
- Don't use `bg-muted` for hover. Hover means "interactive"; muted means "disabled". Use `bg-accent` for hover states.
- Don't apply `text-primary` decoratively. Reserve the Serika yellow for things the user can act on (CTAs, active state, view-all links on hover, focus rings).
- Don't mix sidebar tokens with surface tokens. `bg-sidebar` and friends only belong inside `<Sidebar>`; using them in content cards breaks future theme independence.
- Don't add manual `dark:` variants. The `data-theme` + `.dark` system in `app.css` covers all combinations — adding `dark:` overrides shadows the theme layer.
- Don't introduce a second display font. The brand voice is one font choice flowing everywhere.
- Don't override the focus ring. The base layer applies `outline-ring/50` globally for accessibility — keep it.
- Don't reach for shadows to communicate elevation. Use a token shift (`bg-card` → `bg-popover`) plus a 1px border.
- Don't add new themes by tweaking root variables. Themes are full `:root` / `[data-theme="…"]` / `.dark[data-theme="…"]` blocks in `src/app.css` — copy a complete block.
- Don't break lowercase by adding Title-Case headings to dashboard or landing pages. Match the surrounding voice.
- Don't render hero text in pure black/white — use `text-foreground` so it tracks the theme's chosen ink.

### Bad Practices Flagged in the Current Codebase

These are present today and should be migrated when touched:

- `src/routes/home/kali-afl/players/+page.svelte` and `src/routes/home/kali-afl/teams/+page.svelte` — multiple hardcoded `oklch(0.52 0.14 145)` (and alpha variants) representing "winner / positive / form-W". Replace with a semantic `--success` token (or `--primary` if you decide that wins should always read as the theme's primary accent).
- `src/routes/+page.svelte` terminal section — uses `rgba(255, 255, 255, 0.x)` for body, dim, muted text. These work because the terminal pane is forced dark via `color-mix`, but they should switch to `color-mix(in oklch, white, transparent N%)` or a `--terminal-foreground` token if the terminal is ever themed.
- `src/routes/home/kali-afl/teams/+page.svelte:801` — modal backdrop uses raw `oklch(0 0 0 / 0.35)`. Move to a token (e.g. `--overlay`) or at minimum a documented shared constant.

## 8. Responsive Behavior

### Breakpoints

The app uses Tailwind v4 defaults plus a small set of bespoke `@media` rules in component `<style>` blocks:

| Breakpoint        | Width      | Key changes                                                                   |
|-------------------|------------|-------------------------------------------------------------------------------|
| Mobile small      | <480px     | Nav cards collapse to single column                                           |
| Mobile            | 480–640px  | Snapshot grid 2-col, hero stats stack vertically with row layout per stat     |
| Tablet small      | 640–768px  | Mid grid (latest round + top performers) collapses to single column           |
| Tablet            | 768–900px  | Sidebar still visible, feature grid 2-col                                     |
| Desktop           | 900–1280px | Full sidebar, 3–4 column grids, headlines at upper clamp                      |
| Wide              | >1280px    | Page max-widths cap at 52rem / 72rem; gutters absorb the rest                |

### Touch Targets

- Buttons default to `h-9` (36px) — keep `lg` (40px) for primary CTAs on touch-heavy screens.
- Sidebar menu buttons and trigger reach 36–44px in practice.
- Round dots in the season grid (22px) are decorative, not interactive — that's why they can sit below the WCAG target.

### Collapsing Strategy

- **Sidebar**: `collapsible="offcanvas"` on desktop with rail mode, full sheet drawer on mobile (`isMobile` toggles `Sheet`).
- **Hero stats bar**: side-by-side 4-up on desktop → vertical stack on mobile with each stat becoming a row (`flex-direction: row; justify-content: space-between`) and dividers hidden.
- **Headlines**: scaled with `clamp()` rather than per-breakpoint rules.
- **Section padding**: 5rem → 3.5rem vertical on mobile.

### Image / Asset Behavior

- The chakana SVG scales as a `currentColor` icon — no rasterisation issues at any size.
- The landing hero uses a CSS radial-dot background, not an image; it scales to any viewport.

## 9. Agent Prompt Guide

### Quick Token Reference

- Primary CTA: "use `bg-primary` (Serika yellow) with `text-primary-foreground`"
- Page canvas: "`bg-background` with `text-foreground`"
- Card: "`bg-card` with `border border-border` and `rounded-[0.625rem]`"
- Hover state: "`bg-accent` with `text-accent-foreground`"
- Section label / eyebrow: "uppercase 0.6875rem 600 weight, `text-muted-foreground`, letter-spacing 0.06–0.12em"
- Chip: "`bg-secondary`, `border border-border`, `rounded-md`, padding 0.1rem 0.45rem, 0.6875rem `text-muted-foreground`"
- Critical / danger: "`bg-destructive` or `text-destructive`"
- Sidebar surface: "`bg-sidebar` with `text-sidebar-foreground`; active item `bg-sidebar-primary`"

### Example Component Prompts

- "Build a dashboard tile: `bg-card`, `border border-border`, `rounded-[0.625rem]`, padding 1.375rem 1.5rem 1.25rem. Inside: a 2rem-weight-700 number in `text-foreground` with `font-variant-numeric: tabular-nums` and tight letter-spacing -0.03em, then a 0.6875rem uppercase `text-muted-foreground` label below with letter-spacing 0.04em. Animate in with the rise keyframe staggered 60ms after siblings."
- "Create a section header inside a card: 0.875rem 1.25rem padding, `border-b border-border`, flex with a 0.6875rem uppercase 0.06em-tracked `text-muted-foreground` section label on the left, a chip with the count next to it, and a small lowercase 'view all →' link on the right that turns `text-primary` on hover."
- "Add an API usage bar: 3px tall track `color-mix(in oklch, var(--muted), transparent 30%)`, fill `bg-primary` with `border-radius: 9999px` and `transition: width 0.4s ease`. When percentage ≥90, swap fill to `bg-destructive` and the percentage text to `text-destructive`."
- "Add a primary CTA button labelled 'get started →' lowercase. Use `<Button>` from `$lib/components/ui/button` with the default variant — yellow background, charcoal text, `rounded-md`, hover `bg-primary/90`."
- "Render a season-coverage round dot: 1.375rem square, `rounded-[0.25rem]`. If the round is scraped, `bg-primary` with the round number rendered at 0.5rem weight 600 inside (`color-mix(in oklch, var(--foreground), transparent 20%)`). Otherwise `bg-muted` with `border border-border` and the number in `text-muted-foreground` at 50% opacity."
- "Create a sidebar nav group: `<SidebarGroup>` with a Collapsible.Trigger as the group label (uppercase 11–12px, hover `bg-sidebar-accent` with `text-sidebar-accent-foreground`), a chevron that rotates on `[data-state=open]`, and `<SidebarMenuItem>` children that show `bg-sidebar-primary` + `text-sidebar-primary-foreground` when their href matches the current path."

### Iteration Guide

When refining or generating components:

1. **Touch tokens, not values.** Every visual decision should resolve to one of the tokens listed in §2. If you find yourself reaching for a hex code, you're missing a token.
2. **Match the voice.** Prefer lowercase prose for in-app text, Title Case for navigation/menu labels, uppercase for eyebrows. Avoid sentence-case headlines that feel marketing-y.
3. **Reuse the card recipe.** New panels should look like siblings of existing dashboard cards — `bg-card`, `border border-border`, `rounded-[0.625rem]`, the same `card-header` structure.
4. **Animate entrances, not interactions.** The `rise` keyframe is for new content arriving on the page. Hover/active states should be color-only — no scale, no translate.
5. **Tabular nums or it didn't happen.** Anything that looks like a count, score, percentage, or leaderboard rank gets `font-variant-numeric: tabular-nums`.
6. **Test against three themes.** When you build a new component, eyeball it under Serika light, Serika dark, and one chromatic theme (Lil Dragon or Cyberpunk are good stress tests). If the component looks broken on any of them, you've leaked a hardcoded color.
7. **One device per page.** The landing page has the radial dot grid and the faux terminal; the dashboard has the round-dot coverage grid; the matches page has its own primary device. Don't pile decorative elements onto a single page — pick one and let it breathe.
