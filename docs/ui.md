# Theme Colour Usage Guide

> shadcn-svelte · Tailwind CSS v4 · SvelteKit

---

## 1. The Golden Rule

Never reference a raw colour value (`hex`, `rgb`, `oklch`) in a component. Always use semantic token utilities. The CSS variable layer handles theme switching automatically.

```svelte
<!-- ✅ Correct -->
<div class="bg-background text-foreground border border-border">

<!-- ❌ Never do this -->
<div style="background: #e8e1cc; color: #2c2e31;">
```

---

## 2. Token Reference

### Surface Tokens

| Token                  | Tailwind Utility          | Usage                                |
| ---------------------- | ------------------------- | ------------------------------------ |
| `--background`         | `bg-background`           | Page / app canvas                    |
| `--foreground`         | `text-foreground`         | Primary body text                    |
| `--card`               | `bg-card`                 | Card and panel backgrounds           |
| `--card-foreground`    | `text-card-foreground`    | Text sitting on cards                |
| `--popover`            | `bg-popover`              | Dropdowns, tooltips, floating panels |
| `--popover-foreground` | `text-popover-foreground` | Text inside popovers                 |

### Interactive Tokens

| Token                    | Tailwind Utility            | Usage                                       |
| ------------------------ | --------------------------- | ------------------------------------------- |
| `--primary`              | `bg-primary`                | Primary buttons, active states, key accents |
| `--primary-foreground`   | `text-primary-foreground`   | Text/icons on primary backgrounds           |
| `--secondary`            | `bg-secondary`              | Secondary buttons, subtle filled areas      |
| `--secondary-foreground` | `text-secondary-foreground` | Text on secondary backgrounds               |
| `--accent`               | `bg-accent`                 | Hover states, selection highlights          |
| `--accent-foreground`    | `text-accent-foreground`    | Text on accent backgrounds                  |
| `--destructive`          | `bg-destructive`            | Delete actions, error states, danger alerts |

### Subdued Tokens

| Token                | Tailwind Utility        | Usage                                      |
| -------------------- | ----------------------- | ------------------------------------------ |
| `--muted`            | `bg-muted`              | Disabled states, empty areas, subtle fills |
| `--muted-foreground` | `text-muted-foreground` | Placeholder text, captions, helper text    |

### Chrome Tokens

| Token      | Tailwind Utility | Usage                                             |
| ---------- | ---------------- | ------------------------------------------------- |
| `--border` | `border-border`  | All dividers, input outlines, card edges          |
| `--input`  | `border-input`   | Input field borders specifically                  |
| `--ring`   | `ring-ring`      | Focus rings (via `outline-ring/50` in base layer) |

### Sidebar Tokens

| Token                          | Tailwind Utility                  | Usage                      |
| ------------------------------ | --------------------------------- | -------------------------- |
| `--sidebar`                    | `bg-sidebar`                      | Sidebar background         |
| `--sidebar-foreground`         | `text-sidebar-foreground`         | Sidebar body text          |
| `--sidebar-primary`            | `bg-sidebar-primary`              | Active nav item background |
| `--sidebar-primary-foreground` | `text-sidebar-primary-foreground` | Text on active nav item    |
| `--sidebar-accent`             | `bg-sidebar-accent`               | Sidebar hover states       |
| `--sidebar-accent-foreground`  | `text-sidebar-accent-foreground`  | Text on sidebar hover      |
| `--sidebar-border`             | `border-sidebar-border`           | Sidebar dividers           |
| `--sidebar-ring`               | `ring-sidebar-ring`               | Sidebar focus rings        |

---

## 3. Text Hierarchy

Use the three-level text hierarchy consistently. Never invent intermediate shades.

```svelte
<!-- Level 1 — Primary content: headings, body, labels -->
<h1 class="text-foreground font-medium">Page Title</h1>
<p class="text-foreground text-sm">Body copy goes here.</p>

<!-- Level 2 — Supporting content: metadata, secondary labels -->
<span class="text-muted-foreground text-sm">Last updated 2 days ago</span>

<!-- Level 3 — Decorative / disabled: placeholders, hints -->
<p class="text-muted-foreground/60 text-xs">Optional field</p>
```

### When to use each level

| Level     | Token                      | Examples                                             |
| --------- | -------------------------- | ---------------------------------------------------- |
| Primary   | `text-foreground`          | Headings, body copy, form labels, table data         |
| Secondary | `text-muted-foreground`    | Timestamps, descriptions, captions, breadcrumbs      |
| Tertiary  | `text-muted-foreground/60` | Placeholder text, empty state hints, disabled labels |
| Accent    | `text-primary`             | Links, active nav items, highlighted values          |
| Danger    | `text-destructive`         | Inline error messages, validation feedback           |

---

## 4. Backgrounds & Surfaces

### Layering model

Surfaces should feel subtly layered — background is the base, cards sit one level above, popovers one above that.

```
bg-background      ← canvas / page root
  └─ bg-card       ← panels, cards, sections
       └─ bg-popover  ← dropdowns, modals, tooltips
```

```svelte
<!-- Page layout -->
<main class="min-h-screen bg-background">

  <!-- Content card -->
  <div class="rounded-lg border border-border bg-card p-4">

    <!-- Dropdown inside card -->
    <div class="bg-popover shadow-md rounded-md p-2">
```

### Muted fills

Use `bg-muted` for areas that should recede — table header rows, skeleton loaders, disabled inputs, tag/badge backgrounds.

```svelte
<tr class="bg-muted">                          <!-- table header -->
<div class="bg-muted rounded h-4 w-32 animate-pulse"> <!-- skeleton -->
<input class="bg-muted" disabled />            <!-- disabled input -->
```

### Hover states

Always use `bg-accent` (not `bg-muted`) for interactive hover states so the intent is clear.

```svelte
<button class="hover:bg-accent hover:text-accent-foreground">
<tr class="hover:bg-accent/50 cursor-pointer">
```

---

## 5. Borders & Dividers

Use `border-border` for everything. Don't reach for opacity variants or custom colours.

```svelte
<!-- Standard border -->
<div class="border border-border rounded-md">

<!-- Divider between sections -->
<hr class="border-border" />

<!-- Input border -->
<input class="border border-input rounded-md px-3 py-2" />

<!-- Table borders -->
<td class="border-b border-border px-3 py-2">
```

Use `border-input` specifically on form inputs — it's the same value by default but semantically separates form chrome from layout chrome, making it easier to adjust later.

---

## 6. Interactive Elements

### Buttons

Follow shadcn-svelte's variant model closely.

| Variant       | Background       | Text                        | Hover               | Use for                 |
| ------------- | ---------------- | --------------------------- | ------------------- | ----------------------- |
| `default`     | `bg-primary`     | `text-primary-foreground`   | `bg-primary/90`     | Primary CTA             |
| `secondary`   | `bg-secondary`   | `text-secondary-foreground` | `bg-secondary/80`   | Supporting actions      |
| `outline`     | transparent      | `text-foreground`           | `bg-accent`         | Tertiary actions        |
| `ghost`       | transparent      | `text-foreground`           | `bg-accent`         | Icon buttons, nav items |
| `destructive` | `bg-destructive` | `text-white`                | `bg-destructive/90` | Delete, remove          |

### Focus rings

The base layer applies `outline-ring/50` globally. Never remove focus outlines — this is critical for accessibility. If you need a custom focus style, use `ring-ring`.

```svelte
<button class="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
```

---

## 7. Form Elements

```svelte
<div class="space-y-1.5">
  <!-- Label -->
  <label class="text-sm font-medium text-foreground">Email</label>

  <!-- Input -->
  <input
    class="w-full rounded-md border border-input bg-background px-3 py-2
           text-sm text-foreground placeholder:text-muted-foreground
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    placeholder="you@example.com"
  />

  <!-- Helper / error text -->
  <p class="text-xs text-muted-foreground">We'll never share your email.</p>
  <p class="text-xs text-destructive">This field is required.</p>
</div>
```

Key rules:

- Input background is always `bg-background`, not `bg-muted` (unless disabled)
- Placeholder text is always `text-muted-foreground`
- Error text is always `text-destructive`
- Disabled inputs: `bg-muted text-muted-foreground cursor-not-allowed`

---

## 8. Badges & Status Indicators

Prefer `variant="outline"` with a coloured dot over filled coloured badges. This keeps colour usage restrained and prevents clashing with theme accents.

```svelte
<!-- Preferred: outline badge + dot -->
<span class="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground">
  <span class="size-1.5 rounded-full bg-primary"></span>
  Active
</span>

<!-- Acceptable: muted filled badge (neutral status) -->
<span class="rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-xs font-medium">
  Draft
</span>

<!-- Danger badge -->
<span class="rounded-full bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-0.5 text-xs font-medium">
  Failed
</span>
```

---

## 9. Sidebar & Navigation

```svelte
<nav class="bg-sidebar border-r border-sidebar-border">

  <!-- Nav item — default -->
  <a class="flex items-center gap-2 rounded-md px-3 py-2
            text-sm text-sidebar-foreground
            hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
    Dashboard
  </a>

  <!-- Nav item — active -->
  <a class="flex items-center gap-2 rounded-md px-3 py-2
            text-sm bg-sidebar-primary text-sidebar-primary-foreground font-medium">
    Settings
  </a>

</nav>
```

The sidebar tokens exist separately from the main surface tokens so that sidebars can be styled independently per theme (e.g. a slightly darker sidebar on light themes, a slightly lighter one on dark themes).

---

## 10. Do's and Don'ts

### ✅ Do

- Use semantic tokens exclusively — `bg-primary`, `text-muted-foreground`, `border-border`
- Use `bg-accent` for hover states on interactive elements
- Use `text-muted-foreground` for all secondary/supporting text
- Apply `border-border` consistently across all dividers and outlines
- Use `bg-destructive` only for genuinely destructive or error states
- Let the theme layer do the work — write components once, they adapt automatically

### ❌ Don't

- Hardcode any colour values anywhere in component files
- Use `bg-muted` for hover states (it reads as disabled, not interactive)
- Apply `text-primary` to decorative text — reserve it for actionable elements
- Mix sidebar tokens and surface tokens (e.g. don't use `bg-sidebar` outside the sidebar)
- Use `bg-card` and `bg-background` interchangeably — they layer, don't swap
- Add `dark:` variants manually — the `data-theme` system handles all of this

---

## 11. Quick Cheat Sheet

```
Page canvas          bg-background / text-foreground
Cards & panels       bg-card / text-card-foreground
Popovers & modals    bg-popover / text-popover-foreground
Primary CTA          bg-primary / text-primary-foreground
Hover state          bg-accent / text-accent-foreground
Subtle fill          bg-muted / text-muted-foreground
Disabled / hints     text-muted-foreground/60
All borders          border-border
Input borders        border-input
Focus rings          ring-ring
Danger / errors      bg-destructive / text-destructive
Sidebar              bg-sidebar / text-sidebar-foreground
Sidebar active       bg-sidebar-primary / text-sidebar-primary-foreground
```
