---
name: design-system
description: >
  Design system and component guidelines for the Agent Router UI. Use when
  building, styling, or reviewing any React component, page, or layout.
  Triggers on: creating UI components, writing JSX/TSX, choosing colors,
  styling with Tailwind, using Radix UI primitives, building forms, modals,
  tables, navigation, dashboards, or any visual/UX work.
---

# Agent Router Design System

## Philosophy

Clarity through simplicity. Every element earns its place. Communicate complex
functionality through clean interfaces and generous whitespace rather than visual noise.

**Principles (ranked):**

1. **Usability first** - Every interaction obvious, every state visible
2. **Quiet confidence** - Warm neutrals, purposeful color, no decoration for its own sake
3. **Consistent rhythm** - Predictable spacing, type scale, and component patterns
4. **Progressive disclosure** - Show only what's needed; reveal detail on demand

## Color Palette

| Token              | Hex       | Role                                      |
|--------------------|-----------|-------------------------------------------|
| `graphite`         | `#2E2924` | Primary text, headings, dark backgrounds  |
| `mint-cream`       | `#EAF0E6` | Page background, card surfaces, light fill|
| `caramel`          | `#E5A161` | Accent — highlights, badges, hover states |
| `spicy-orange`     | `#CF5326` | CTA buttons, alerts, destructive actions  |

Derived shades (generate with Tailwind `opacity` or `color-mix`):

- `graphite/80` for secondary text
- `graphite/10` for subtle borders
- `mint-cream` with `caramel/10` overlay for warm card surfaces
- `spicy-orange/10` for error/warning backgrounds

**Usage rules:**

- Default page bg: `mint-cream`
- Cards/panels: `mint-cream` bg, `white` interior
- Primary CTA: `spicy-orange` bg, white text
- Secondary CTA: `graphite` bg, white text
- Links/interactive: `spicy-orange` on hover, `graphite` default
- Caramel is accent only — never for large surfaces

## Typography

Serif + sans-serif pairing via `next/font/google`:

| Role           | Font              | Weight      | Usage                         |
|----------------|-------------------|-------------|-------------------------------|
| Headings       | Playfair Display  | 600, 700    | h1-h3, hero text, page titles |
| Body / UI      | Inter             | 400, 500, 600 | Paragraphs, labels, buttons |
| Code / Mono    | Geist Mono        | 400         | Code blocks, technical values |

**Scale (Tailwind classes):**

- `text-3xl` / `text-4xl` — page titles (Playfair)
- `text-xl` / `text-2xl` — section headings (Playfair)
- `text-base` — body text (Inter)
- `text-sm` — secondary text, captions (Inter)
- `text-xs` — labels, badges (Inter, uppercase tracking-wide when appropriate)

## Spacing & Layout

- Base unit: `4px` (Tailwind default)
- Component internal padding: `p-4` (16px) minimum, `p-6` for cards
- Section gaps: `gap-8` or `gap-12`
- Page max-width: `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8`
- Generous whitespace between sections (`py-12` to `py-16`)

## Component Library: Radix UI

Use `@radix-ui/react-*` primitives for all interactive components. Style with Tailwind — never CSS modules.

### Workflow

1. Determine if Radix has a primitive for the pattern (dialog, popover, select, tabs, etc.)
2. If yes, use the Radix primitive — do NOT build custom
3. Wrap in a project component under `src/components/ui/` with consistent styling
4. If no Radix primitive exists, build with semantic HTML + aria attributes

Each file exports a styled wrapper around the Radix primitive. Components accept a `className` prop for one-off overrides via `cn()` (clsx + twMerge).

## Interaction & Motion

- Transitions: `transition-colors duration-150` for hovers
- Dialogs: `animate-in fade-in` (Radix built-in data attributes)
- No bouncy animations — keep motion subtle and functional
- Focus rings: `focus-visible:ring-2 focus-visible:ring-spicy-orange/50 focus-visible:outline-none`

## Dark Mode

Not planned for v1. Design around the light palette. If added later, invert `graphite` and `mint-cream` roles.
