# UI/UX Revamp - Foundation Sub-Spec

**Date:** 2026-05-06
**Branch:** `ui-revamp`
**Status:** Design (awaiting plan)

## Context

The JPR app serves Sri Lankan agri-business users: non-technical, low-literacy field operators on Android phones in poor connectivity, plus a boss who reads financial truth and operations leaders who run day-to-day work. The current UI works but does not feel native-mobile, lists lack quick actions, and the boss has no consolidated insights view.

This spec covers the **design system foundation only**. Per-role page revamps (operator, owner, admin, finance, auditor) and the login screen are deferred to follow-up sub-specs that consume this foundation. All sub-specs ship together as one big-bang release on the `ui-revamp` branch.

## Goals

- Mobile-first, native-feeling shell (5-tab bottom nav, role-aware FAB, bottom-sheet modals, skeleton loaders).
- Reusable primitives that every role page reuses with zero per-page chrome work: list page header (search + pill filters), list row with inline action + tap-to-open action sheet, smart-default form scaffold with wizard fallback, empty/error/offline/saved-toast components.
- Locale-aware typography for Tamil (default), Sinhala, English.
- Lucide-only icon strategy with a swap point reserved for a future custom SVG illustration set.
- PWA polish: splash screen, install prompt, offline banner.
- No business logic, no DB changes, no server-action changes.

## Non-Goals

- Any role-specific page (operator log, owner finance dashboard, admin vehicles list, etc.). Each role gets its own sub-spec.
- Login screen redesign (separate sub-spec, English-only stays).
- Custom SVG illustration set (Phase 2 after Lucide-only foundation ships).
- Dark mode designs (toggle scaffolded but not styled).
- Pull-to-refresh, page transition animations, haptics (deferred per Q5).

## Architecture Overview

```
src/
├── lib/
│   ├── fonts.ts                 NEW - locale-aware font loaders
│   ├── icon-map.ts              NEW - domain entity → Lucide map
│   └── nav-config.ts            NEW - per-role tab + FAB config
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx        NEW - frame wrapper
│   │   ├── top-bar.tsx          replaces topbar.tsx
│   │   ├── bottom-nav.tsx       rewrite - 5-tab, role-aware
│   │   ├── fab.tsx              NEW - corner-floating
│   │   ├── list-page.tsx        NEW - header + filter pills
│   │   ├── list-row.tsx         NEW
│   │   ├── list-search.tsx      restyle existing
│   │   ├── pagination.tsx       restyle existing
│   │   └── sliding-menu.tsx     DELETE - replaced by More tab
│   ├── ui/
│   │   ├── icon.tsx             NEW - Lucide wrapper
│   │   ├── action-sheet.tsx     NEW - bottom sheet
│   │   ├── picker-sheet.tsx     NEW
│   │   ├── empty-state.tsx      rewrite existing
│   │   ├── error-state.tsx      NEW
│   │   ├── offline-banner.tsx   restyle existing
│   │   ├── toast.tsx            NEW - Radix Toast wrapper
│   │   └── skeleton.tsx         NEW
│   ├── forms/primitives/
│   │   ├── smart-default-banner.tsx
│   │   ├── wizard-shell.tsx
│   │   ├── tile-picker.tsx
│   │   ├── stepper.tsx
│   │   ├── field.tsx
│   │   ├── photo-field.tsx
│   │   └── form-submit.tsx
│   └── install-prompt.tsx       NEW
├── app/[locale]/(dashboard)/
│   └── layout.tsx               rewire to AppShell
public/
├── manifest.json                theme_color + background_color update
└── splash/                      NEW - iOS splash PNGs
tailwind.config.ts               extend tokens
src/app/globals.css              CSS vars - color palette + shadows
```

## Section 1 - Design Tokens

**Color (HSL CSS vars in `globals.css`, exposed to Tailwind):**

- Primary: green scale 50–900. Brand `green-600` ≈ `hsl(142 71% 35%)`.
- Accent: amber/terra 50–900. Used for warnings, "offline", attention.
- Semantic: success `green-600`, warning `amber-500`, danger `red-600`, info `blue-600`.
- Surface: white / slate-50 / slate-100 (cards, page bg, sunken).
- Text: slate-900 (primary), slate-600 (secondary), slate-400 (muted).
- Dark mode: deferred. Toggle scaffolded but no styles.

**Spacing:** Tailwind defaults (`0.25rem` base).

**Radii:** `sm=8`, `md=12`, `lg=14`, `xl=18`, `2xl=22`, `full`. Cards default `lg`. Bottom-sheet `xl` top-only. Pills `full`.

**Type scale:** Tailwind defaults plus a hero "display" size for KPIs (`text-4xl/extrabold`).

**Shadows:**
- card: `0 1px 3px rgba(0,0,0,.08)`
- sheet: `0 -4px 12px rgba(0,0,0,.1)`
- FAB: `0 6px 16px rgba(22,163,74,.4)`

**Motion:** 150ms ease-out for taps, 250ms ease-in-out for sheets, 300ms slide for page transitions (deferred to Phase 2).

**Touch targets:** minimum 44×44 px. Tap targets use full row height where possible.

All tokens declared in `tailwind.config.ts theme.extend` plus CSS variables in `globals.css` for runtime swap.

## Section 2 - Typography

**Source:** `src/lib/fonts.ts`. Single export per locale.

- `en` → Inter (variable, weights 400/600/700/800).
- `ta` → Noto Sans Tamil (weights 400/600/700).
- `si` → Noto Sans Sinhalese (weights 400/600/700).

**Loading strategy:**

- Self-host via `next/font/google` for build-time optimization.
- Locale-conditional: only the active locale's font is loaded. Implemented in root `layout.tsx` by reading `params.locale` and selecting one font function.
- `font-display: swap`.
- CSS variable `--font-sans` exposed; `body { font-family: var(--font-sans); }`.

**Type scale tokens (Tailwind classes):**

- `text-xs` 12 caption, `text-sm` 14 secondary, `text-base` 16 body, `text-lg` 18 subhead, `text-xl` 20 h3, `text-2xl` 24 h2, `text-4xl` 36 hero KPI.

**Locale tweaks:**

- Tamil and Sinhala scripts often need extra line-height. Apply `leading-7` minimum on body text via root class `.locale-ta`, `.locale-si`.
- `font-variant-numeric: tabular-nums` on currency/metric components so columns align.

**Anti-pattern guard:** never hardcode `font-family: Inter`. Always reference the var.

## Section 3 - Iconography

Library: `lucide-react` (already in deps).

**Wrapper:** `src/components/ui/icon.tsx`. Thin typed component `<Icon name="tractor" size="md" />`. Lets us swap Lucide for a custom SVG set in Phase 2 without touching consumers.

**Sizes:** `xs`=14, `sm`=16, `md`=20 (default), `lg`=24, `xl`=32. Map to Tailwind `h-/w-` classes.

**Stroke weight:** Lucide `2` default; `1.5` for icons inside dense lists; `2.5` for nav active state.

**Color:** inherit `currentColor` always. No hardcoded fills.

**Entity registry:** `src/lib/icon-map.ts`. String keys map to Lucide components for domain entities. Single swap point for Phase 2 illustrations.

Examples:

- vehicle type "tractor" → `Tractor`, "truck" → `Truck`, "harvester" → `Combine`.
- crop "paddy" → `Wheat`, "coconut" → `TreePalm`.
- expense "fuel" → `Fuel`, "wages" → `Users`, "maintenance" → `Wrench`.

**No emoji anywhere.** Empty/error states use Lucide icons at `xl` size with muted color.

## Section 4 - App Shell

`src/components/layout/app-shell.tsx` wraps the `(dashboard)` route group.

**Anatomy (mobile-first, max-width 768 desktop centered):**

```
┌─────────────────────────────┐  safe-area-top (notch padding)
│  TopBar (sticky)            │  56px. Title + back/menu + right actions.
├─────────────────────────────┤
│  OfflineBanner (when off)   │  shown only when navigator.onLine === false
│                             │     or unsynced records > 0
├─────────────────────────────┤
│                             │
│  <main> (scrollable)        │  fills, scroll-snap optional
│                             │
│  Optional FAB (corner-floating)
│                             │
├─────────────────────────────┤
│  BottomNav (5 tabs, fixed)  │  64px + safe-area-bottom
└─────────────────────────────┘
```

**Components:**

- `TopBar` - slot props: `title`, `back?`, `right?`. Shows role badge for super_admin/auditor. On home tab, shows logo + brand instead.
- `BottomNav` - 5 tabs, role-driven config from `src/lib/nav-config.ts`. Active tab `green-600`, inactive `slate-500`. Tab is icon plus label always (never icon-only).
- `Fab` - corner-floating (24px from screen edge), 56×56, primary green, icon-only with screen-reader label. Per-route `useFab()` hook injects `label` and `onClick`. Hidden by default; opted in per page. Hidden entirely for owner and auditor.
- `OfflineBanner` - restyled with amber tokens, `WifiOff` icon, unsynced count. Persistent, not a toast.

**Per-role tab plans:**

- Operator: Home · History · Expenses · Leave · More (FAB: + Log)
- Admin: Home · Vehicles · Projects · Invoices · More (FAB: context-driven)
- Finance: Home · Receivables · Cash · Invoices · More (FAB: + Receipt)
- Owner: Home · Finance · Staff · Reports · More (no FAB)
- Auditor: Home · Reports · Transactions · Export · More (no FAB)

**Safe-area handling:** `env(safe-area-inset-*)` padding via Tailwind `pt-safe`/`pb-safe` utility classes. Critical for iOS PWA install.

**Scroll behavior:** body locked; only `<main>` scrolls. Bottom nav never moves. Pull-to-refresh deferred to Phase 2.

## Section 5 - List Page Primitives

`src/components/layout/list-page.tsx` plus sub-components.

**Header (sticky to top of `<main>`):**

- `<ListPageHeader>` - title + count badge + sticky-on-scroll.
- `<ListSearch>` - full-width search input, `slate-100` background, Lucide `Search` left, clear button right when filled.
- `<FilterPills>` - horizontal scroll rail of pill chips. `data-active` toggles `green-600` fill. Counts inline (e.g. "Active 8").

**Row:**

- `<ListRow>` - full-width tappable card, `rounded-lg`, white surface, `px-3 py-3`. Slots: `leading` (entity icon in colored circle), `title`, `subtitle`, `meta` (right-aligned), `inlineAction` (one icon button - top action per Q4 hybrid).
- Tap row body → opens `<ActionSheet>` with the full action list.
- Tap `inlineAction` → fires primary action directly.
- No long-press, no swipe.

**Action sheet:**

- `<ActionSheet>` - bottom sheet (Radix `Dialog` with custom positioning). Drag-handle bar, title row, 2-column grid of large tappable action tiles (icon + label, ~80×80). Destructive actions get `red-50` surface.

**In-list states:**

- `<ListSkeleton count={n} />` - shimmering placeholder rows.
- `<ListEmpty icon title description action />` - Lucide `Inbox`-class icon at `xl`, friendly copy, optional CTA.
- `<ListError onRetry />` - Lucide `CloudOff`/`AlertTriangle`, "Could not load. Try again" + retry button.

**Pagination:** existing `<Pagination>` restyled. Infinite-scroll deferred to Phase 2.

## Section 6 - Form Primitives

`src/components/forms/primitives/`.

**Smart-default banner:**

- `<SmartDefaultBanner>` - amber surface, dashed border, `Pin` icon, copy "Continue from yesterday: {summary}" plus two CTAs ("Yes, continue" green, "Change" neutral). Pre-fills the form on accept.

**Wizard stepper:**

- `<WizardShell>` - manages step state, segmented progress bar, step counter "X of N", footer with `Back` and `Next` buttons. Children are `<WizardStep>` slots, validated independently.
- Each step optimized for one input. No keyboard typing where avoidable.

**Tile picker (one-tap selection):**

- `<TilePicker>` - 2-column grid of large tap targets (~140×120). Each tile: entity icon top, label below, optional subtitle. Selected = `green-50` bg + `green-600` border. Used for vehicle/farm/crop/category pickers.

**Numeric stepper:**

- `<Stepper value onChange step min max>` - minus circle (`slate-200`), big tabular-nums readout (`text-2xl`), plus circle (`green-600`). Long-press accelerates.

**Picker bottom-sheet:**

- `<PickerSheet>` - opened from a field on single-screen forms. Search at top, scrollable tile list below. Returns selection on tap.

**Field shell:**

- `<Field label>` - uppercase 11px slate-600 label above content. Used by tile picker, stepper, single-screen single-field row.

**Photo capture:**

- `<PhotoField>` - large dashed-border tile with camera icon. Tap → opens device camera (`<input type="file" capture="environment">`).

**Submit:**

- `<FormSubmit>` - full-width green-600 button, disabled state `slate-200`. Loading shows spinner; success briefly shows check on a `green-100` flash before nav.

**Form pattern (per Q10 C+A):** every operator-facing create form opens with `<SmartDefaultBanner>`. Skipping or no-defaults falls into `<WizardShell>` with `<TilePicker>` or `<Stepper>` steps.

## Section 7 - System State Components

`src/components/ui/`. Extends existing `empty-state.tsx`.

**Empty state (`<EmptyState>`):**

- Centered. Lucide icon at `xl` (40-48px), muted `slate-400`.
- Title `text-base bold`.
- Description `text-sm slate-500`, max ~12 words.
- Optional primary action (full-width green button when CTA is "create first X").
- Used inside lists, tabs with no data, search-no-results.

**Error state (`<ErrorState>`):**

- Same layout as empty. Icon = Lucide `AlertTriangle` or `CloudOff`. Color `amber-500`.
- Friendly copy: "Could not load. Try again or save offline."
- Primary "Try again" button, secondary text-button.
- Auto-included in `error.tsx` route boundaries.

**Offline banner (`<OfflineBanner>`):**

- Persistent top banner between TopBar and `<main>`.
- `amber-50` bg, `amber-700` text, Lucide `WifiOff` icon.
- Copy: "Working offline · {n} unsynced". When n=0, "Working offline · saving locally".
- Hidden when online AND no pending records. State derived from `navigator.onLine` plus Dexie unsynced count.
- Replaces existing banner styling, keeps Dexie integration.

**Saved-toast (`<Toast>`):**

- Radix Toast wrapper. `slate-900` bg, white text, `slate-100` secondary action color.
- Auto-dismiss 2.5s. Bottom of screen, above bottom nav.
- Variants: success (green check), info (default), error (red `AlertCircle`). Saved-confirms use success.

**Skeleton loader (`<Skeleton>`):**

- `slate-100` plus animated shimmer (Tailwind keyframes). Sizes via className.
- Used in list rows, dashboard tiles, detail screens.
- Replaces all spinner usage in route loading states.

## Section 8 - PWA Polish

**Splash screen:**

- iOS PWA: multiple sized PNGs in `public/splash/`. Generated at build time via script for common iPhone resolutions.
- Android PWA: derived from `manifest.json` `theme_color` + `background_color` + maskable icon.
- Manifest update: `theme_color: "#16a34a"`, `background_color: "#f8fafc"`, `display: "standalone"`, `orientation: "portrait"`.

**Install prompt:**

- `src/components/install-prompt.tsx` - listens for `beforeinstallprompt`, stashes the event, shows a dismissable bottom-sheet card "Install JPR Farm app · works offline · faster" with Install/Later buttons.
- Triggered after the second session OR after the first successful sync (state in `localStorage`). Never on the login screen. Never re-prompted within 7 days of dismissal.
- iOS Safari has no `beforeinstallprompt` - fallback bottom-sheet shows "Share → Add to Home Screen" instructions when user-agent matches iOS Safari and not standalone.

**Already configured (untouched):**

- Serwist SW registration (`src/workers/sw.ts`).
- Manifest exists at `public/manifest.json`. Only theme/color edits needed.

## Section 9 - Migration Approach

- Build foundation on `ui-revamp` branch (current).
- Existing role pages keep working unchanged during foundation work - they consume legacy components.
- Foundation lands as one PR. Role pages then consume new primitives in subsequent sub-spec PRs.
- No DB migrations. No server-action changes. Pure UI plus tokens plus i18n font wiring.
- `sliding-menu.tsx` deletion blocked until role sub-specs ship - keep alive during overlap.

## Section 10 - Testing Approach

**Unit (vitest):**

- Pure helpers: `nav-config` per-role tab generator, `icon-map` resolver, font loader returns correct family per locale.
- Component logic: `<WizardShell>` step state machine, `<Stepper>` clamp + long-press accelerator, `<OfflineBanner>` visibility derived from `navigator.onLine` plus Dexie count, `<InstallPrompt>` 7-day cooldown.

**Component (Testing Library):**

- `<ListRow>` - tapping body opens action sheet, tapping inline action fires primary callback (not both), keyboard navigation reaches both targets.
- `<ActionSheet>` - drag-to-dismiss, escape to close, focus trap, primary actions reachable.
- `<TilePicker>` - selected state, single vs multi mode.
- `<EmptyState>` / `<ErrorState>` - render with icon, optional CTA fires.

**Visual / a11y:**

- Storybook (NEW dev dep, `pnpm sb`) one story per primitive, light variant + Tamil + Sinhala. Soft-yes - defer if it slips and rely on per-page integration tests in role sub-specs.
- Lighthouse PWA audit ≥ 90 on `/[locale]` after foundation lands.
- Manual a11y: tap target ≥ 44px verified per primitive. Color contrast WCAG AA on `green-600/white` and `slate-600/white-50`.

**No RLS or DB tests touched in this sub-spec** - foundation is pure UI.

## Risks

- **Storybook scope creep** - if Storybook setup adds more than ~half a day, drop it and document the gap. Per-page integration tests in role sub-specs cover the regression risk.
- **Bottom-sheet library choice** - Radix Dialog plus custom positioning is hand-rolled. If swipe-to-dismiss UX is too rough, add `vaul` (~10KB). Decide during plan, not now.
- **Font payload** - Noto Sans Tamil/Sinhala can be ~80-150KB each. Locale-conditional loading mitigates. Confirm with bundle analyzer post-build.
- **Sliding-menu deletion timing** - must coordinate with role sub-specs. Marked deferred above.

## Decisions Locked During Brainstorm

| # | Decision |
|---|----------|
| Q1 | Big-bang release across all 5 roles |
| Q2 | Both owner and admin get insights (owner = full financial truth, admin = ops-flavored) |
| Q3 | Friendly + iconic visual tone; warmth carried by color/radius/spacing (not emoji) |
| Q4 | List quick actions = inline icon (top action) plus tap-row → bottom sheet (full set) |
| Q5 | Native features: bottom nav, FAB, bottom-sheet, skeletons, install prompt, splash, offline banner essential. Pull-to-refresh + page transitions nice-to-have. Skip haptics. |
| Q6 | 5-tab bottom nav + corner floating FAB |
| Q7 | All 13 owner-dashboard metrics in scope |
| Q8 | Hero + sectioned cards layout (reused for /admin and /finance home) |
| Q9 | Phone + password auth retained (eye-toggle reveal) |
| Q10 | Smart-default form pattern primary, wizard fallback |
| Q11 | Lucide icons only |
| Q12 | Per-locale Noto fonts (Inter for English) |
| Q13 | Green primary palette + amber/terra accents |
| Q14 | List-page header: title + sticky search + scrollable pill filters |
| Q15 | Empty/error use illustration+copy, offline uses persistent banner, saved uses toast |
| Q16 | Lucide now, custom SVG set in Phase 2 |

## Next Step

Run the writing-plans skill to produce the implementation plan for this foundation sub-spec.

After foundation ships, return to brainstorming for the next sub-spec in this order:

1. Operator role (validates foundation under highest-action role)
2. Owner + Admin + Finance dashboards (consumes hero + sectioned cards layout)
3. Auditor + Login + remaining polish
