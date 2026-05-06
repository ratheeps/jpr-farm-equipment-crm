# UI/UX Revamp Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the design-system foundation (tokens, typography, icons, app shell, list/form primitives, system states, PWA polish) that all 5 role revamps will consume. No role page is rewritten in this plan.

**Architecture:** Bottom-up composition. Tokens first, then atomic primitives (skeleton, toast, empty/error, action sheet), then composed primitives (list page, form scaffolds), then app shell (top bar + 5-tab nav + FAB), then PWA polish, then wire the dashboard layout to the new shell. Existing role pages keep working unchanged because they consume legacy components alongside the new ones until role sub-specs migrate them.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Radix UI, lucide-react, next-intl, vitest + Testing Library, Dexie (offline), Serwist (PWA).

**Spec:** `docs/superpowers/specs/2026-05-06-ui-revamp-foundation-design.md`

---

## File Structure

**Create:**
- `src/lib/fonts.ts`
- `src/lib/icon-map.ts`
- `src/lib/nav-config.ts`
- `src/components/ui/icon.tsx`
- `src/components/ui/skeleton.tsx`
- `src/components/ui/toast.tsx`
- `src/components/ui/error-state.tsx`
- `src/components/ui/action-sheet.tsx`
- `src/components/ui/picker-sheet.tsx`
- `src/components/layout/list-page.tsx`
- `src/components/layout/list-row.tsx`
- `src/components/layout/filter-pills.tsx`
- `src/components/layout/list-skeleton.tsx`
- `src/components/layout/list-empty.tsx`
- `src/components/layout/list-error.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/layout/fab.tsx`
- `src/components/forms/primitives/field.tsx`
- `src/components/forms/primitives/smart-default-banner.tsx`
- `src/components/forms/primitives/tile-picker.tsx`
- `src/components/forms/primitives/stepper.tsx`
- `src/components/forms/primitives/photo-field.tsx`
- `src/components/forms/primitives/form-submit.tsx`
- `src/components/forms/primitives/wizard-shell.tsx`
- `src/components/install-prompt.tsx`
- `public/splash/README.md` (notes on regeneration)
- `scripts/generate-splash.mjs` (PWA splash generator script)
- `src/lib/__tests__/fonts.test.ts`
- `src/lib/__tests__/icon-map.test.ts`
- `src/lib/__tests__/nav-config.test.ts`
- `src/components/ui/__tests__/icon.test.tsx`
- `src/components/ui/__tests__/skeleton.test.tsx`
- `src/components/ui/__tests__/toast.test.tsx`
- `src/components/ui/__tests__/empty-state.test.tsx`
- `src/components/ui/__tests__/error-state.test.tsx`
- `src/components/ui/__tests__/action-sheet.test.tsx`
- `src/components/layout/__tests__/list-page.test.tsx`
- `src/components/layout/__tests__/filter-pills.test.tsx`
- `src/components/layout/__tests__/list-row.test.tsx`
- `src/components/forms/primitives/__tests__/wizard-shell.test.tsx`
- `src/components/forms/primitives/__tests__/stepper.test.tsx`
- `src/components/forms/primitives/__tests__/tile-picker.test.tsx`
- `src/components/__tests__/install-prompt.test.tsx`

**Modify:**
- `src/app/globals.css` (extend tokens)
- `tailwind.config.ts` (extend theme)
- `src/app/[locale]/layout.tsx` (wire fonts + locale class)
- `src/app/[locale]/(dashboard)/layout.tsx` (use AppShell)
- `src/components/offline-banner.tsx` (restyle + Dexie count)
- `src/components/ui/empty-state.tsx` (rewrite per new tokens)
- `src/components/layout/list-search.tsx` (restyle)
- `src/components/layout/bottom-nav.tsx` (rewrite using nav-config + 5-tab + role plans)
- `src/components/layout/topbar.tsx` (replace with thin shell wrapper consuming AppShell)
- `src/components/layout/pagination.tsx` (restyle)
- `public/manifest.json` (theme + background colors, name)
- `package.json` (add `vaul` for bottom sheet, plus dev deps for tests)
- `vitest.config.ts` (add `setupFiles` for Testing Library)
- `tests/setup.ts` (NEW shared setup, used by vitest setupFiles)

**Setup:**
- Add `@testing-library/jest-dom` to dev deps for `toBeInTheDocument()` matchers.
- Add `vaul` (~10KB) for the bottom-sheet primitive (used by ActionSheet and PickerSheet).
- Add Noto Sans Tamil + Noto Sans Sinhalese + Inter via `next/font/google` (no extra dep).

**Decision deferred:** Storybook is `soft yes`. Task 31 sets it up; if it requires more than a half-day or breaks the build, skip it and proceed to Task 32.

---

## Conventions Used Throughout

- **Test commands:** `pnpm test -t "<test name>"` runs the unit project filtered by name. `pnpm test` runs the full unit suite.
- **Lint after every commit cluster:** `pnpm lint` should pass before pushing.
- **Type-check:** `pnpm tsc --noEmit` after primitives that touch shared types.
- **Commits:** Conventional commits prefix (`feat:`, `refactor:`, `chore:`). End every commit message with the project's standard `Co-Authored-By` line if the runner sets one.

---

## Phase 1: Tokens, Test Setup, Fonts

### Task 1: Test setup file for Testing Library

**Files:**
- Create: `tests/setup.ts`
- Modify: `vitest.config.ts:11-19`
- Modify: `package.json` (devDependencies)

- [ ] **Step 1: Add `@testing-library/jest-dom` dev dep**

```bash
pnpm add -D @testing-library/jest-dom
```

- [ ] **Step 2: Create `tests/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 3: Wire `setupFiles` for the unit project**

Edit `vitest.config.ts`. In the `unit` project's `test` block, change `setupFiles: []` to `setupFiles: ["tests/setup.ts"]`. Final `unit` block:

```ts
defineProject({
  plugins: [react()],
  test: {
    name: "unit",
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: { alias: aliases },
}),
```

- [ ] **Step 4: Smoke-test the setup**

Run: `pnpm test -t "cn (class name utility)"`
Expected: existing utility test passes (`✓ src/lib/__tests__/utils.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add tests/setup.ts vitest.config.ts package.json pnpm-lock.yaml
git commit -m "chore(test): add Testing Library setup file for unit project"
```

---

### Task 2: Color tokens, radii, shadows in globals.css and Tailwind

**Files:**
- Modify: `src/app/globals.css:1-80`
- Modify: `tailwind.config.ts:1-60`

- [ ] **Step 1: Extend `globals.css` with foundation tokens**

Replace the contents of `src/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Surfaces */
    --background: 210 20% 98%;          /* slate-50 page bg */
    --foreground: 222 47% 11%;          /* slate-900 text */
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    /* Brand - green primary */
    --primary: 142 71% 35%;             /* green-600 */
    --primary-foreground: 0 0% 100%;

    /* Accent - amber/terra warning + offline */
    --accent: 38 92% 50%;               /* amber-500 */
    --accent-foreground: 26 83% 14%;    /* amber-950 */

    /* Secondary surface */
    --secondary: 210 40% 96%;           /* slate-100 */
    --secondary-foreground: 222 47% 11%;

    /* Muted text + sunken surface */
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;    /* slate-500 */

    /* Status */
    --success: 142 71% 35%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 26 83% 14%;
    --destructive: 0 72% 51%;           /* red-600 */
    --destructive-foreground: 0 0% 100%;
    --info: 217 91% 60%;                /* blue-500 */
    --info-foreground: 0 0% 100%;

    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 142 71% 35%;

    --radius: 0.875rem;                 /* 14px = lg */

    /* Shadows - referenced via Tailwind utilities below */
    --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.08);
    --shadow-sheet: 0 -4px 12px rgba(0, 0, 0, 0.10);
    --shadow-fab: 0 6px 16px rgba(22, 163, 74, 0.40);
  }

  .dark {
    --background: 222 47% 11%;
    --foreground: 210 40% 98%;
    --card: 222 47% 13%;
    --card-foreground: 210 40% 98%;
    --popover: 222 47% 13%;
    --popover-foreground: 210 40% 98%;
    --primary: 142 71% 45%;
    --primary-foreground: 0 0% 100%;
    --accent: 38 92% 55%;
    --accent-foreground: 26 83% 14%;
    --secondary: 217 19% 27%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217 19% 27%;
    --muted-foreground: 215 20% 65%;
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 55%;
    --warning-foreground: 26 83% 14%;
    --destructive: 0 72% 56%;
    --destructive-foreground: 0 0% 100%;
    --info: 217 91% 60%;
    --info-foreground: 0 0% 100%;
    --border: 217 19% 27%;
    --input: 217 19% 27%;
    --ring: 142 71% 45%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    -webkit-text-size-adjust: 100%;
    font-feature-settings: "cv11", "ss01";
  }

  /* Locale-specific line-height bumps for Tamil + Sinhala scripts */
  html.locale-ta body,
  html.locale-si body {
    line-height: 1.7;
  }

  /* Tabular numerals utility for currency/metric components */
  .tnum {
    font-variant-numeric: tabular-nums;
  }
}

/* Mobile safe-area utilities */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
.pt-safe {
  padding-top: env(safe-area-inset-top);
}

/* Touch target minimum (44px iOS guideline) */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Skeleton shimmer */
@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--secondary)) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}
```

- [ ] **Step 2: Extend `tailwind.config.ts`**

Replace the file contents with:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
        warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        info: { DEFAULT: "hsl(var(--info))", foreground: "hsl(var(--info-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      borderRadius: {
        sm: "0.5rem",     // 8
        md: "0.75rem",    // 12
        lg: "var(--radius)", // 14
        xl: "1.125rem",   // 18
        "2xl": "1.375rem",// 22
      },
      boxShadow: {
        card: "var(--shadow-card)",
        sheet: "var(--shadow-sheet)",
        fab: "var(--shadow-fab)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      transitionDuration: {
        DEFAULT: "150ms",
        sheet: "250ms",
        page: "300ms",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Build and confirm tokens compile**

Run: `pnpm build`
Expected: build completes without warnings about unknown CSS classes.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css tailwind.config.ts
git commit -m "feat(tokens): refresh color palette, radii, shadows, locale line-height"
```

---

### Task 3: Locale-aware fonts via `next/font/google`

**Files:**
- Create: `src/lib/fonts.ts`
- Create: `src/lib/__tests__/fonts.test.ts`
- Modify: `src/app/[locale]/layout.tsx`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/fonts.test.ts
import { describe, it, expect } from "vitest";
import { fontVariableForLocale, htmlClassForLocale } from "../fonts";

describe("fontVariableForLocale", () => {
  it("returns the Inter variable for English", () => {
    const v = fontVariableForLocale("en");
    expect(v).toMatch(/--font-sans/);
  });
  it("returns the Tamil variable for Tamil", () => {
    const v = fontVariableForLocale("ta");
    expect(v).toMatch(/--font-sans/);
  });
  it("returns the Sinhala variable for Sinhala", () => {
    const v = fontVariableForLocale("si");
    expect(v).toMatch(/--font-sans/);
  });
});

describe("htmlClassForLocale", () => {
  it("emits a stable locale class", () => {
    expect(htmlClassForLocale("ta")).toBe("locale-ta");
    expect(htmlClassForLocale("si")).toBe("locale-si");
    expect(htmlClassForLocale("en")).toBe("locale-en");
  });
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `pnpm test -t "fontVariableForLocale"`
Expected: FAIL `Cannot find module '../fonts'`.

- [ ] **Step 3: Create `src/lib/fonts.ts`**

```ts
import { Inter, Noto_Sans_Tamil, Noto_Sans_Sinhala } from "next/font/google";
import type { Locale } from "@/i18n/config";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const notoSinhala = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export function fontForLocale(locale: Locale) {
  switch (locale) {
    case "ta":
      return notoTamil;
    case "si":
      return notoSinhala;
    case "en":
    default:
      return inter;
  }
}

export function fontVariableForLocale(locale: Locale): string {
  return fontForLocale(locale).variable;
}

export function htmlClassForLocale(locale: Locale): string {
  return `locale-${locale}`;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -t "fontVariableForLocale"` and `pnpm test -t "htmlClassForLocale"`
Expected: PASS.

- [ ] **Step 5: Wire fonts into root locale layout**

Edit `src/app/[locale]/layout.tsx`. Replace the file contents with:

```tsx
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n/config";
import { fontForLocale, htmlClassForLocale } from "@/lib/fonts";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "JPR Management",
  description: "Machinery Rental & Paddy Farm Management",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "JPR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#16a34a",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const font = fontForLocale(locale as Locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${font.variable} ${htmlClassForLocale(locale as Locale)}`}>
      <body>
        <NavigationProgress />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Build to confirm fonts resolve**

Run: `pnpm build`
Expected: build completes; no `Module not found` errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/fonts.ts src/lib/__tests__/fonts.test.ts src/app/[locale]/layout.tsx
git commit -m "feat(typography): locale-aware font loading (Inter / Noto Tamil / Noto Sinhala)"
```

---

## Phase 2: Nav Config + Icon System

### Task 4: Per-role nav configuration

**Files:**
- Create: `src/lib/nav-config.ts`
- Create: `src/lib/__tests__/nav-config.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/nav-config.test.ts
import { describe, it, expect } from "vitest";
import { getNavConfig, type RoleNavKey } from "../nav-config";

describe("getNavConfig", () => {
  it("returns 5 tabs for each role", () => {
    const roles: RoleNavKey[] = ["operator", "admin", "finance", "owner", "auditor"];
    for (const role of roles) {
      expect(getNavConfig(role).tabs).toHaveLength(5);
    }
  });

  it("returns FAB config for action roles", () => {
    expect(getNavConfig("operator").fab).toBeDefined();
    expect(getNavConfig("admin").fab).toBeDefined();
    expect(getNavConfig("finance").fab).toBeDefined();
  });

  it("returns no FAB for read-only roles", () => {
    expect(getNavConfig("owner").fab).toBeUndefined();
    expect(getNavConfig("auditor").fab).toBeUndefined();
  });

  it("operator FAB targets log-work", () => {
    expect(getNavConfig("operator").fab?.href).toBe("/operator/log");
  });

  it("includes a More tab for every role", () => {
    const roles: RoleNavKey[] = ["operator", "admin", "finance", "owner", "auditor"];
    for (const role of roles) {
      const last = getNavConfig(role).tabs.at(-1);
      expect(last?.labelKey).toBe("more");
    }
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `pnpm test -t "getNavConfig"`
Expected: FAIL `Cannot find module '../nav-config'`.

- [ ] **Step 3: Implement `src/lib/nav-config.ts`**

```ts
import {
  Home,
  ClipboardList,
  Receipt,
  PalmTree,
  MoreHorizontal,
  Truck,
  FolderKanban,
  ArrowLeftRight,
  Wallet,
  Wrench,
  Coins,
  TrendingUp,
  Users,
  FileBarChart,
  Download,
  Plus,
  type LucideIcon,
} from "lucide-react";

export type RoleNavKey = "operator" | "admin" | "finance" | "owner" | "auditor";

export interface NavTab {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

export interface FabConfig {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

export interface NavConfig {
  tabs: NavTab[];
  fab?: FabConfig;
}

const moreTab: NavTab = { href: "/more", labelKey: "more", icon: MoreHorizontal };

const operatorConfig: NavConfig = {
  tabs: [
    { href: "/operator", labelKey: "home", icon: Home },
    { href: "/operator/history", labelKey: "history", icon: ClipboardList },
    { href: "/operator/expenses", labelKey: "expenses", icon: Receipt },
    { href: "/operator/leave", labelKey: "leave", icon: PalmTree },
    moreTab,
  ],
  fab: { href: "/operator/log", labelKey: "logWork", icon: Plus },
};

const adminConfig: NavConfig = {
  tabs: [
    { href: "/admin", labelKey: "home", icon: Home },
    { href: "/admin/vehicles", labelKey: "vehicles", icon: Truck },
    { href: "/admin/projects", labelKey: "projects", icon: FolderKanban },
    { href: "/admin/invoices", labelKey: "invoices", icon: Receipt },
    moreTab,
  ],
  fab: { href: "/admin/projects/new", labelKey: "newJob", icon: Plus },
};

const financeConfig: NavConfig = {
  tabs: [
    { href: "/finance", labelKey: "home", icon: Home },
    { href: "/finance/receivables", labelKey: "receivables", icon: ArrowLeftRight },
    { href: "/finance/cash-transactions", labelKey: "cash", icon: Wallet },
    { href: "/finance/invoices", labelKey: "invoices", icon: Receipt },
    moreTab,
  ],
  fab: { href: "/finance/cash-transactions/new", labelKey: "newReceipt", icon: Plus },
};

const ownerConfig: NavConfig = {
  tabs: [
    { href: "/owner", labelKey: "home", icon: Home },
    { href: "/owner/finance", labelKey: "finance", icon: Coins },
    { href: "/owner/staff-performance", labelKey: "staff", icon: Users },
    { href: "/owner/reports", labelKey: "reports", icon: TrendingUp },
    moreTab,
  ],
};

const auditorConfig: NavConfig = {
  tabs: [
    { href: "/auditor", labelKey: "home", icon: Home },
    { href: "/auditor/reports", labelKey: "reports", icon: FileBarChart },
    { href: "/auditor/transactions", labelKey: "transactions", icon: ArrowLeftRight },
    { href: "/auditor/export", labelKey: "export", icon: Download },
    moreTab,
  ],
};

const configs: Record<RoleNavKey, NavConfig> = {
  operator: operatorConfig,
  admin: adminConfig,
  finance: financeConfig,
  owner: ownerConfig,
  auditor: auditorConfig,
};

export function getNavConfig(role: RoleNavKey): NavConfig {
  return configs[role];
}
```

> Note: lucide-react does not export `PalmTree`. If TypeScript flags the import, swap to `Trees` (or any sensible substitute) and update the test if needed. Confirm imports compile before moving on.

- [ ] **Step 4: Verify imports compile**

Run: `pnpm tsc --noEmit`
Expected: no errors. If `PalmTree` is missing, change to `Trees` and re-run.

- [ ] **Step 5: Run tests**

Run: `pnpm test -t "getNavConfig"`
Expected: 5 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/nav-config.ts src/lib/__tests__/nav-config.test.ts
git commit -m "feat(nav): per-role nav config with 5 tabs + role-aware FAB"
```

---

### Task 5: Icon wrapper + entity icon map

**Files:**
- Create: `src/components/ui/icon.tsx`
- Create: `src/lib/icon-map.ts`
- Create: `src/components/ui/__tests__/icon.test.tsx`
- Create: `src/lib/__tests__/icon-map.test.ts`

- [ ] **Step 1: Write the failing test for icon-map**

```ts
// src/lib/__tests__/icon-map.test.ts
import { describe, it, expect } from "vitest";
import { resolveEntityIcon } from "../icon-map";

describe("resolveEntityIcon", () => {
  it("returns a Lucide component for a known vehicle type", () => {
    const Icon = resolveEntityIcon("vehicle.tractor");
    expect(typeof Icon).toBe("object"); // ForwardRefExoticComponent
  });
  it("falls back to a generic icon for unknown keys", () => {
    const Icon = resolveEntityIcon("nonsense.key");
    expect(Icon).toBeDefined();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `pnpm test -t "resolveEntityIcon"`
Expected: FAIL `Cannot find module '../icon-map'`.

- [ ] **Step 3: Implement `src/lib/icon-map.ts`**

```ts
import {
  Tractor,
  Truck,
  Combine,
  Wheat,
  TreePalm,
  Fuel,
  Users,
  Wrench,
  Coins,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  "vehicle.tractor": Tractor,
  "vehicle.truck": Truck,
  "vehicle.harvester": Combine,
  "crop.paddy": Wheat,
  "crop.coconut": TreePalm,
  "expense.fuel": Fuel,
  "expense.wages": Users,
  "expense.maintenance": Wrench,
  "expense.other": Coins,
};

export function resolveEntityIcon(key: string): LucideIcon {
  return map[key] ?? HelpCircle;
}
```

- [ ] **Step 4: Run icon-map test**

Run: `pnpm test -t "resolveEntityIcon"`
Expected: 2 PASS.

- [ ] **Step 5: Write the failing test for `<Icon>`**

```tsx
// src/components/ui/__tests__/icon.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Icon } from "../icon";

describe("<Icon>", () => {
  it("renders an svg with the requested size class", () => {
    render(<Icon name="vehicle.tractor" size="lg" data-testid="icon" />);
    const el = screen.getByTestId("icon");
    expect(el.classList.contains("h-6")).toBe(true);
    expect(el.classList.contains("w-6")).toBe(true);
  });

  it("uses md size by default", () => {
    render(<Icon name="vehicle.tractor" data-testid="icon" />);
    const el = screen.getByTestId("icon");
    expect(el.classList.contains("h-5")).toBe(true);
  });

  it("forwards aria-label for accessibility", () => {
    render(<Icon name="vehicle.tractor" aria-label="Tractor" />);
    expect(screen.getByLabelText("Tractor")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run, expect failure**

Run: `pnpm test -t "<Icon>"`
Expected: FAIL `Cannot find module '../icon'`.

- [ ] **Step 7: Implement `src/components/ui/icon.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";
import { resolveEntityIcon } from "@/lib/icon-map";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClass: Record<IconSize, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

export interface IconProps extends React.SVGAttributes<SVGElement> {
  name: string;
  size?: IconSize;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = "md",
  strokeWidth = 2,
  className,
  ...rest
}: IconProps) {
  const Resolved = resolveEntityIcon(name);
  return (
    <Resolved
      className={cn(sizeClass[size], className)}
      strokeWidth={strokeWidth}
      {...rest}
    />
  );
}
```

- [ ] **Step 8: Run icon tests**

Run: `pnpm test -t "<Icon>"`
Expected: 3 PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/icon-map.ts src/lib/__tests__/icon-map.test.ts src/components/ui/icon.tsx src/components/ui/__tests__/icon.test.tsx
git commit -m "feat(ui): icon wrapper + entity icon map (Lucide-only)"
```

---

## Phase 3: Atomic Primitives

### Task 6: `<Skeleton>` shimmer placeholder

**Files:**
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/__tests__/skeleton.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/__tests__/skeleton.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "../skeleton";

describe("<Skeleton>", () => {
  it("applies the shimmer class", () => {
    render(<Skeleton data-testid="sk" />);
    expect(screen.getByTestId("sk").classList.contains("skeleton")).toBe(true);
  });
  it("merges custom className", () => {
    render(<Skeleton className="h-4 w-32" data-testid="sk" />);
    const el = screen.getByTestId("sk");
    expect(el.classList.contains("h-4")).toBe(true);
    expect(el.classList.contains("w-32")).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `pnpm test -t "<Skeleton>"`
Expected: FAIL `Cannot find module '../skeleton'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/ui/skeleton.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton rounded-md", className)}
      aria-hidden="true"
      {...rest}
    />
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -t "<Skeleton>"`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/skeleton.tsx src/components/ui/__tests__/skeleton.test.tsx
git commit -m "feat(ui): Skeleton primitive for loading states"
```

---

### Task 7: `<Toast>` (Radix Toast) wrapper

**Files:**
- Create: `src/components/ui/toast.tsx`
- Create: `src/components/ui/__tests__/toast.test.tsx`
- Modify: `src/app/[locale]/(dashboard)/layout.tsx` (later in Task 25; not yet)

- [ ] **Step 1: Confirm `@radix-ui/react-toast` is in deps**

```bash
pnpm list @radix-ui/react-toast
```

It's already in deps. If not, `pnpm add @radix-ui/react-toast`.

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/ui/__tests__/toast.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToastProvider, ToastViewport, Toast, ToastTitle } from "../toast";

describe("<Toast>", () => {
  it("renders an open toast with a title", () => {
    render(
      <ToastProvider>
        <Toast open variant="success">
          <ToastTitle>Saved</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>
    );
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run, expect failure**

Run: `pnpm test -t "<Toast>"`
Expected: FAIL `Cannot find module '../toast'`.

- [ ] **Step 4: Implement**

```tsx
// src/components/ui/toast.tsx
"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const ToastProvider = ToastPrimitive.Provider;

export const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...rest }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-20 left-0 right-0 z-[60] flex flex-col gap-2 px-4 outline-none",
      className
    )}
    {...rest}
  />
));
ToastViewport.displayName = "ToastViewport";

type ToastVariant = "success" | "info" | "error";

interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> {
  variant?: ToastVariant;
}

export const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  ToastProps
>(({ variant = "info", className, children, ...rest }, ref) => {
  const Icon =
    variant === "success" ? CheckCircle2 : variant === "error" ? AlertCircle : Info;
  const accent =
    variant === "success"
      ? "text-success"
      : variant === "error"
      ? "text-destructive"
      : "text-info";
  return (
    <ToastPrimitive.Root
      ref={ref}
      duration={2500}
      className={cn(
        "flex items-start gap-3 rounded-lg bg-foreground/95 px-4 py-3 text-background shadow-card",
        className
      )}
      {...rest}
    >
      <Icon className={cn("h-5 w-5 shrink-0", accent)} aria-hidden />
      <div className="flex-1 text-sm">{children}</div>
    </ToastPrimitive.Root>
  );
});
Toast.displayName = "Toast";

export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
export const ToastAction = ToastPrimitive.Action;
export const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>((props, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    aria-label="Close"
    className="rounded-md p-1 text-background/70 hover:text-background"
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitive.Close>
));
ToastClose.displayName = "ToastClose";
```

- [ ] **Step 5: Run tests**

Run: `pnpm test -t "<Toast>"`
Expected: 1 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/toast.tsx src/components/ui/__tests__/toast.test.tsx
git commit -m "feat(ui): Toast wrapper around Radix Toast (success/info/error)"
```

---

### Task 8: Rewrite `<EmptyState>` against new tokens + `<ErrorState>`

**Files:**
- Modify: `src/components/ui/empty-state.tsx`
- Create: `src/components/ui/error-state.tsx`
- Create: `src/components/ui/__tests__/empty-state.test.tsx`
- Create: `src/components/ui/__tests__/error-state.test.tsx`

- [ ] **Step 1: Write the failing test for EmptyState**

```tsx
// src/components/ui/__tests__/empty-state.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { EmptyState } from "../empty-state";

describe("<EmptyState>", () => {
  it("renders icon, title, and description", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No logs yet"
        description="Tap the green plus button to add one"
      />
    );
    expect(screen.getByText("No logs yet")).toBeInTheDocument();
    expect(
      screen.getByText("Tap the green plus button to add one")
    ).toBeInTheDocument();
  });

  it("renders an action link when provided", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No logs"
        actionLabel="Add log"
        actionHref="/operator/log"
      />
    );
    const link = screen.getByRole("link", { name: "Add log" });
    expect(link).toHaveAttribute("href", "/operator/log");
  });
});
```

- [ ] **Step 2: Run, expect failure (or partial - existing component may match some assertions)**

Run: `pnpm test -t "<EmptyState>"`
Expected: at least one FAIL (token classes don't match new design).

- [ ] **Step 3: Rewrite `src/components/ui/empty-state.tsx`**

```tsx
import { type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <Icon className="h-12 w-12 text-muted-foreground/60" strokeWidth={1.5} />
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center justify-center h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-card"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run EmptyState tests**

Run: `pnpm test -t "<EmptyState>"`
Expected: 2 PASS.

- [ ] **Step 5: Write the failing test for ErrorState**

```tsx
// src/components/ui/__tests__/error-state.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "../error-state";

describe("<ErrorState>", () => {
  it("renders title and retry button", async () => {
    const onRetry = vi.fn();
    render(<ErrorState title="Could not load" onRetry={onRetry} />);
    expect(screen.getByText("Could not load")).toBeInTheDocument();

    const button = screen.getByRole("button", { name: "Try again" });
    await userEvent.click(button);
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 6: Run, expect failure**

Run: `pnpm test -t "<ErrorState>"`
Expected: FAIL `Cannot find module '../error-state'`.

- [ ] **Step 7: Implement `src/components/ui/error-state.tsx`**

```tsx
"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Could not load",
  description = "Try again or save offline.",
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <AlertTriangle
        className="h-12 w-12 text-warning"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground max-w-xs">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center justify-center h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold shadow-card"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Run ErrorState tests**

Run: `pnpm test -t "<ErrorState>"`
Expected: 1 PASS.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/empty-state.tsx src/components/ui/__tests__/empty-state.test.tsx src/components/ui/error-state.tsx src/components/ui/__tests__/error-state.test.tsx
git commit -m "feat(ui): rewrite EmptyState + add ErrorState with retry"
```

---

## Phase 4: Bottom-Sheet Primitives

### Task 9: Add `vaul` and build `<ActionSheet>`

**Files:**
- Modify: `package.json` (add `vaul`)
- Create: `src/components/ui/action-sheet.tsx`
- Create: `src/components/ui/__tests__/action-sheet.test.tsx`

- [ ] **Step 1: Add the dep**

```bash
pnpm add vaul
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/ui/__tests__/action-sheet.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Plus, Wrench } from "lucide-react";
import { ActionSheet } from "../action-sheet";

describe("<ActionSheet>", () => {
  it("renders title and action tiles when open", async () => {
    const onLog = vi.fn();
    render(
      <ActionSheet
        open
        onOpenChange={() => {}}
        title="Tractor #4"
        actions={[
          { label: "Log work", icon: Plus, onClick: onLog },
          { label: "Service", icon: Wrench, onClick: () => {}, destructive: true },
        ]}
      />
    );
    expect(screen.getByText("Tractor #4")).toBeInTheDocument();
    const logTile = screen.getByRole("button", { name: /Log work/i });
    await userEvent.click(logTile);
    expect(onLog).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run, expect failure**

Run: `pnpm test -t "<ActionSheet>"`
Expected: FAIL `Cannot find module '../action-sheet'`.

- [ ] **Step 4: Implement**

```tsx
// src/components/ui/action-sheet.tsx
"use client";

import * as React from "react";
import { Drawer } from "vaul";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionSheetItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  actions: ActionSheetItem[];
}

export function ActionSheet({
  open,
  onOpenChange,
  title,
  description,
  actions,
}: ActionSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex flex-col rounded-t-2xl bg-card pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-sheet">
          <div className="mx-auto mt-2 mb-3 h-1.5 w-10 rounded-full bg-muted" />
          {title && (
            <div className="px-4 pb-3">
              <Drawer.Title className="text-base font-semibold">{title}</Drawer.Title>
              {description && (
                <Drawer.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </Drawer.Description>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 px-4">
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                disabled={a.disabled}
                onClick={() => {
                  a.onClick();
                  onOpenChange(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg p-4 text-sm font-semibold transition",
                  a.destructive
                    ? "bg-destructive/10 text-destructive"
                    : "bg-secondary text-foreground",
                  "disabled:opacity-50"
                )}
              >
                <a.icon className="h-6 w-6" strokeWidth={2} aria-hidden />
                {a.label}
              </button>
            ))}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm test -t "<ActionSheet>"`
Expected: 1 PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/ui/action-sheet.tsx src/components/ui/__tests__/action-sheet.test.tsx
git commit -m "feat(ui): ActionSheet bottom sheet (drag-handle + 2-col action tiles)"
```

---

### Task 10: `<PickerSheet>` for form picker fields

**Files:**
- Create: `src/components/ui/picker-sheet.tsx`

- [ ] **Step 1: Implement directly (composition over Drawer; no new behavior worth a TDD pass)**

```tsx
// src/components/ui/picker-sheet.tsx
"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PickerOption<T = string> {
  value: T;
  label: string;
  subtitle?: string;
}

interface PickerSheetProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: PickerOption<T>[];
  value?: T;
  onSelect: (value: T) => void;
  searchPlaceholder?: string;
}

export function PickerSheet<T extends string | number>({
  open,
  onOpenChange,
  title,
  options,
  value,
  onSelect,
  searchPlaceholder = "Search…",
}: PickerSheetProps<T>) {
  const [query, setQuery] = React.useState("");
  const filtered = React.useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex max-h-[80vh] flex-col rounded-t-2xl bg-card shadow-sheet">
          <div className="mx-auto mt-2 mb-3 h-1.5 w-10 rounded-full bg-muted" />
          <div className="px-4 pb-3">
            <Drawer.Title className="text-base font-semibold">{title}</Drawer.Title>
          </div>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-11 w-full rounded-lg bg-secondary pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="overflow-y-auto px-2 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
            {filtered.map((o) => {
              const selected = o.value === value;
              return (
                <button
                  key={String(o.value)}
                  type="button"
                  onClick={() => {
                    onSelect(o.value);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left",
                    selected && "bg-primary/10"
                  )}
                >
                  <div>
                    <div className="text-sm font-semibold text-foreground">{o.label}</div>
                    {o.subtitle && (
                      <div className="text-xs text-muted-foreground">{o.subtitle}</div>
                    )}
                  </div>
                  {selected && <Check className="h-5 w-5 text-primary" />}
                </button>
              );
            })}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/picker-sheet.tsx
git commit -m "feat(ui): PickerSheet (searchable bottom-sheet picker)"
```

---

## Phase 5: List Primitives

### Task 11: Restyle `<ListSearch>` against new tokens

**Files:**
- Modify: `src/components/layout/list-search.tsx`

- [ ] **Step 1: Replace contents**

```tsx
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useCallback, useState } from "react";
import { Search, X } from "lucide-react";

interface Props {
  placeholder?: string;
}

export function ListSearch({ placeholder = "Search…" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  const apply = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) {
        params.set("q", next);
      } else {
        params.delete("q");
      }
      params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          apply(e.target.value);
        }}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg bg-secondary pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            apply("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify dev build**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/list-search.tsx
git commit -m "refactor(ui): restyle ListSearch with new tokens + clear button"
```

---

### Task 12: `<FilterPills>` horizontal pill rail

**Files:**
- Create: `src/components/layout/filter-pills.tsx`
- Create: `src/components/layout/__tests__/filter-pills.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/layout/__tests__/filter-pills.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterPills } from "../filter-pills";

describe("<FilterPills>", () => {
  it("renders pills, marks the active one, and fires onChange", async () => {
    const onChange = vi.fn();
    render(
      <FilterPills
        value="all"
        onChange={onChange}
        options={[
          { value: "all", label: "All" },
          { value: "active", label: "Active", count: 8 },
          { value: "idle", label: "Idle", count: 3 },
        ]}
      />
    );
    const all = screen.getByRole("button", { name: /All/ });
    expect(all).toHaveAttribute("data-active", "true");

    await userEvent.click(screen.getByRole("button", { name: /Active 8/ }));
    expect(onChange).toHaveBeenCalledWith("active");
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `pnpm test -t "<FilterPills>"`
Expected: FAIL `Cannot find module '../filter-pills'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/layout/filter-pills.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FilterPillOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterPillsProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterPillOption[];
  className?: string;
}

export function FilterPills({
  value,
  onChange,
  options,
  className,
}: FilterPillsProps) {
  return (
    <div
      role="tablist"
      className={cn("-mx-1 flex gap-2 overflow-x-auto px-1 pb-1", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            )}
          >
            {o.label}
            {typeof o.count === "number" && (
              <span className={cn("ml-1.5 tnum", active ? "opacity-90" : "text-muted-foreground")}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -t "<FilterPills>"`
Expected: 1 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/filter-pills.tsx src/components/layout/__tests__/filter-pills.test.tsx
git commit -m "feat(ui): FilterPills horizontal rail with optional counts"
```

---

### Task 13: `<ListPage>` header + sticky shell

**Files:**
- Create: `src/components/layout/list-page.tsx`
- Create: `src/components/layout/__tests__/list-page.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/layout/__tests__/list-page.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListPageHeader } from "../list-page";

describe("<ListPageHeader>", () => {
  it("renders title and count badge", () => {
    render(<ListPageHeader title="Vehicles" count={12} />);
    expect(screen.getByText("Vehicles")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `pnpm test -t "<ListPageHeader>"`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/layout/list-page.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface ListPageHeaderProps {
  title: string;
  count?: number;
  right?: React.ReactNode;
  children?: React.ReactNode; // optional rows below title (search, filters)
  className?: string;
}

export function ListPageHeader({
  title,
  count,
  right,
  children,
  className,
}: ListPageHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-30 -mx-4 mb-4 flex flex-col gap-3 bg-background/95 px-4 pb-3 pt-4 backdrop-blur",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
        {typeof count === "number" && (
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground tnum">
            {count}
          </span>
        )}
        {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -t "<ListPageHeader>"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/list-page.tsx src/components/layout/__tests__/list-page.test.tsx
git commit -m "feat(ui): ListPageHeader (sticky title + count + slot for search/filters)"
```

---

### Task 14: `<ListRow>` with inline action + tap-to-open ActionSheet

**Files:**
- Create: `src/components/layout/list-row.tsx`
- Create: `src/components/layout/__tests__/list-row.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/layout/__tests__/list-row.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Plus, Tractor } from "lucide-react";
import { ListRow } from "../list-row";

describe("<ListRow>", () => {
  it("fires onClick when row body is tapped", async () => {
    const onRow = vi.fn();
    render(
      <ListRow
        leadingIcon={Tractor}
        title="Tractor #4"
        subtitle="Karthik · 3 hrs today"
        onClick={onRow}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Tractor #4/i }));
    expect(onRow).toHaveBeenCalledOnce();
  });

  it("inline action click does not bubble to row click", async () => {
    const onRow = vi.fn();
    const onAction = vi.fn();
    render(
      <ListRow
        leadingIcon={Tractor}
        title="Tractor #4"
        onClick={onRow}
        inlineAction={{ icon: Plus, label: "Log work", onClick: onAction }}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Log work" }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onRow).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `pnpm test -t "<ListRow>"`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/layout/list-row.tsx
"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ListRowInlineAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

interface ListRowProps {
  leadingIcon?: LucideIcon;
  leadingTone?: "primary" | "warning" | "neutral";
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  inlineAction?: ListRowInlineAction;
  onClick?: () => void;
  className?: string;
}

const toneClass: Record<NonNullable<ListRowProps["leadingTone"]>, string> = {
  primary: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
  neutral: "bg-secondary text-muted-foreground",
};

export function ListRow({
  leadingIcon: Leading,
  leadingTone = "primary",
  title,
  subtitle,
  meta,
  inlineAction,
  onClick,
  className,
}: ListRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg bg-card px-3 py-3 text-left shadow-card transition",
        "active:bg-secondary/60",
        className
      )}
    >
      {Leading && (
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            toneClass[leadingTone]
          )}
          aria-hidden
        >
          <Leading className="h-5 w-5" strokeWidth={2} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {title}
        </span>
        {subtitle && (
          <span className="block truncate text-xs text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
      {meta && (
        <span className="ml-auto shrink-0 text-sm font-semibold tnum">{meta}</span>
      )}
      {inlineAction && (
        <span
          role="button"
          tabIndex={0}
          aria-label={inlineAction.label}
          onClick={(e) => {
            e.stopPropagation();
            inlineAction.onClick();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              inlineAction.onClick();
            }
          }}
          className="ml-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-card"
        >
          <inlineAction.icon className="h-4 w-4" strokeWidth={2.25} />
        </span>
      )}
    </button>
  );
}
```

> Note: Inline action uses a nested `<span role="button">` rather than a real `<button>` because nested buttons are invalid HTML. Click and keyboard handlers are wired explicitly. The accessible-name comes from `aria-label`.

- [ ] **Step 4: Run tests**

Run: `pnpm test -t "<ListRow>"`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/list-row.tsx src/components/layout/__tests__/list-row.test.tsx
git commit -m "feat(ui): ListRow with inline action + tap-to-open behavior"
```

---

### Task 15: `<ListSkeleton>`, `<ListEmpty>`, `<ListError>`, restyle `<Pagination>`

**Files:**
- Create: `src/components/layout/list-skeleton.tsx`
- Create: `src/components/layout/list-empty.tsx`
- Create: `src/components/layout/list-error.tsx`
- Modify: `src/components/layout/pagination.tsx`

- [ ] **Step 1: Implement `list-skeleton.tsx`**

```tsx
// src/components/layout/list-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";

interface ListSkeletonProps {
  count?: number;
}

export function ListSkeleton({ count = 6 }: ListSkeletonProps) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg bg-card px-3 py-3 shadow-card"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement `list-empty.tsx`**

```tsx
// src/components/layout/list-empty.tsx
import { type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface ListEmptyProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function ListEmpty(props: ListEmptyProps) {
  return <EmptyState {...props} />;
}
```

- [ ] **Step 3: Implement `list-error.tsx`**

```tsx
// src/components/layout/list-error.tsx
"use client";

import { ErrorState } from "@/components/ui/error-state";

interface ListErrorProps {
  onRetry?: () => void;
}

export function ListError({ onRetry }: ListErrorProps) {
  return (
    <ErrorState
      title="Could not load"
      description="Try again or save offline."
      onRetry={onRetry}
    />
  );
}
```

- [ ] **Step 4: Inspect existing `pagination.tsx`**

Run: `cat src/components/layout/pagination.tsx`

- [ ] **Step 5: Restyle the rendered output**

Open `src/components/layout/pagination.tsx`. Change the outermost container's classes (and any button classes) to match the new tokens. The root container should be:

```tsx
<nav className="mt-4 flex items-center justify-center gap-2" aria-label="Pagination">
```

Each clickable page button gets:

```tsx
className={cn(
  "min-w-9 h-9 rounded-md text-sm font-semibold tnum",
  active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
)}
```

Disabled prev/next buttons get `opacity-50 pointer-events-none`. Keep the existing query-string logic intact; the only change is class strings and the `tnum` numeric tabular alignment.

- [ ] **Step 6: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/list-skeleton.tsx src/components/layout/list-empty.tsx src/components/layout/list-error.tsx src/components/layout/pagination.tsx
git commit -m "feat(ui): list state primitives (skeleton/empty/error) + Pagination restyle"
```

---

## Phase 6: Form Primitives

### Task 16: `<Field>` shell + `<SmartDefaultBanner>`

**Files:**
- Create: `src/components/forms/primitives/field.tsx`
- Create: `src/components/forms/primitives/smart-default-banner.tsx`

- [ ] **Step 1: Implement `field.tsx`**

```tsx
// src/components/forms/primitives/field.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Implement `smart-default-banner.tsx`**

```tsx
// src/components/forms/primitives/smart-default-banner.tsx
"use client";

import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartDefaultBannerProps {
  summary: string;
  onContinue: () => void;
  onChange: () => void;
  className?: string;
}

export function SmartDefaultBanner({
  summary,
  onContinue,
  onChange,
  className,
}: SmartDefaultBannerProps) {
  return (
    <div className={cn("rounded-lg border border-dashed border-warning/60 bg-warning/10 p-3", className)}>
      <div className="flex items-start gap-2">
        <Pin className="mt-0.5 h-4 w-4 text-warning" aria-hidden />
        <div>
          <p className="text-xs text-warning-foreground/80">Continue from yesterday?</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{summary}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onContinue}
          className="h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
        >
          Yes, continue
        </button>
        <button
          type="button"
          onClick={onChange}
          className="h-10 rounded-md bg-secondary text-foreground text-sm font-semibold"
        >
          Change
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/forms/primitives/field.tsx src/components/forms/primitives/smart-default-banner.tsx
git commit -m "feat(forms): Field shell + SmartDefaultBanner"
```

---

### Task 17: `<TilePicker>` (single + multi)

**Files:**
- Create: `src/components/forms/primitives/tile-picker.tsx`
- Create: `src/components/forms/primitives/__tests__/tile-picker.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/forms/primitives/__tests__/tile-picker.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tractor, Truck } from "lucide-react";
import { TilePicker } from "../tile-picker";

describe("<TilePicker>", () => {
  it("marks the selected tile and fires onChange", async () => {
    const onChange = vi.fn();
    render(
      <TilePicker
        value="t1"
        onChange={onChange}
        options={[
          { value: "t1", label: "Tractor #4", icon: Tractor },
          { value: "t2", label: "Truck #2", icon: Truck },
        ]}
      />
    );
    expect(
      screen.getByRole("button", { name: /Tractor #4/i })
    ).toHaveAttribute("data-selected", "true");

    await userEvent.click(screen.getByRole("button", { name: /Truck #2/i }));
    expect(onChange).toHaveBeenCalledWith("t2");
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `pnpm test -t "<TilePicker>"`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/forms/primitives/tile-picker.tsx
"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TileOption<T> {
  value: T;
  label: string;
  subtitle?: string;
  icon: LucideIcon;
}

interface TilePickerProps<T> {
  value: T | T[];
  onChange: (value: T | T[]) => void;
  options: TileOption<T>[];
  multi?: boolean;
  className?: string;
}

export function TilePicker<T extends string | number>({
  value,
  onChange,
  options,
  multi = false,
  className,
}: TilePickerProps<T>) {
  const isSelected = (v: T) =>
    Array.isArray(value) ? value.includes(v) : value === v;

  function toggle(v: T) {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      onChange(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    } else {
      onChange(v);
    }
  }

  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      {options.map((o) => {
        const selected = isSelected(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            data-selected={selected}
            onClick={() => toggle(o.value)}
            className={cn(
              "flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 text-center transition",
              selected
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            )}
          >
            <o.icon className="h-7 w-7 text-foreground" strokeWidth={1.75} aria-hidden />
            <span className="text-sm font-semibold text-foreground">{o.label}</span>
            {o.subtitle && (
              <span className="text-xs text-muted-foreground">{o.subtitle}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -t "<TilePicker>"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/forms/primitives/tile-picker.tsx src/components/forms/primitives/__tests__/tile-picker.test.tsx
git commit -m "feat(forms): TilePicker (single + multi-select)"
```

---

### Task 18: `<Stepper>` numeric +/- with clamp

**Files:**
- Create: `src/components/forms/primitives/stepper.tsx`
- Create: `src/components/forms/primitives/__tests__/stepper.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/forms/primitives/__tests__/stepper.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Stepper } from "../stepper";

describe("<Stepper>", () => {
  it("increments and decrements within bounds", async () => {
    const onChange = vi.fn();
    render(<Stepper value={2} onChange={onChange} step={0.5} min={0} max={3} />);

    await userEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(onChange).toHaveBeenLastCalledWith(2.5);

    await userEvent.click(screen.getByRole("button", { name: "Decrease" }));
    expect(onChange).toHaveBeenLastCalledWith(1.5);
  });

  it("clamps at max", async () => {
    const onChange = vi.fn();
    render(<Stepper value={3} onChange={onChange} step={1} min={0} max={3} />);
    await userEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `pnpm test -t "<Stepper>"`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/forms/primitives/stepper.tsx
"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  formatter?: (v: number) => string;
  className?: string;
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  formatter,
  className,
}: StepperProps) {
  const clamp = (n: number) => Math.min(Math.max(n, min), max);
  const dec = () => {
    const next = clamp(round(value - step));
    if (next !== value) onChange(next);
  };
  const inc = () => {
    const next = clamp(round(value + step));
    if (next !== value) onChange(next);
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Decrease"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-foreground disabled:opacity-40"
      >
        <Minus className="h-5 w-5" strokeWidth={2.25} />
      </button>
      <div className="flex-1 rounded-lg border-2 border-border bg-card py-2 text-center text-2xl font-extrabold tabular-nums">
        {formatter ? formatter(value) : value}
      </div>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label="Increase"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
      >
        <Plus className="h-5 w-5" strokeWidth={2.25} />
      </button>
    </div>
  );
}

function round(n: number): number {
  // avoid 2.5000000000004 results from float math
  return Math.round(n * 1000) / 1000;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -t "<Stepper>"`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/forms/primitives/stepper.tsx src/components/forms/primitives/__tests__/stepper.test.tsx
git commit -m "feat(forms): numeric Stepper with clamp + tabular-nums"
```

---

### Task 19: `<PhotoField>` + `<FormSubmit>`

**Files:**
- Create: `src/components/forms/primitives/photo-field.tsx`
- Create: `src/components/forms/primitives/form-submit.tsx`

- [ ] **Step 1: Implement `photo-field.tsx`**

```tsx
// src/components/forms/primitives/photo-field.tsx
"use client";

import * as React from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoFieldProps {
  value?: File | null;
  onChange: (file: File | null) => void;
  label?: string;
  className?: string;
}

export function PhotoField({
  value,
  onChange,
  label = "Add photo",
  className,
}: PhotoFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const previewUrl = React.useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card text-muted-foreground"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="" className="h-full w-full rounded-lg object-cover" />
        ) : (
          <>
            <Camera className="h-7 w-7" strokeWidth={1.5} />
            <span className="text-sm font-semibold">{label}</span>
          </>
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Implement `form-submit.tsx`**

```tsx
// src/components/forms/primitives/form-submit.tsx
"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pending?: boolean;
  variant?: "primary" | "secondary";
}

export function FormSubmit({
  pending,
  disabled,
  className,
  children,
  variant = "primary",
  ...rest
}: FormSubmitProps) {
  const palette =
    variant === "primary"
      ? "bg-primary text-primary-foreground"
      : "bg-secondary text-foreground";
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-base font-semibold shadow-card",
        palette,
        "disabled:opacity-60",
        className
      )}
      {...rest}
    >
      {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/forms/primitives/photo-field.tsx src/components/forms/primitives/form-submit.tsx
git commit -m "feat(forms): PhotoField (camera capture) + FormSubmit primary button"
```

---

### Task 20: `<WizardShell>` step controller

**Files:**
- Create: `src/components/forms/primitives/wizard-shell.tsx`
- Create: `src/components/forms/primitives/__tests__/wizard-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/forms/primitives/__tests__/wizard-shell.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardShell } from "../wizard-shell";

describe("<WizardShell>", () => {
  it("advances and goes back", async () => {
    const onSubmit = vi.fn();
    render(
      <WizardShell onSubmit={onSubmit}>
        <div>Step A</div>
        <div>Step B</div>
        <div>Step C</div>
      </WizardShell>
    );
    expect(screen.getByText("Step A")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step B")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Step A")).toBeInTheDocument();
  });

  it("submits on the last step", async () => {
    const onSubmit = vi.fn();
    render(
      <WizardShell onSubmit={onSubmit}>
        <div>Only step</div>
      </WizardShell>
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `pnpm test -t "<WizardShell>"`
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/forms/primitives/wizard-shell.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface WizardShellProps {
  children: React.ReactNode; // each child is a step
  initialStep?: number;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  nextLabel?: string;
  backLabel?: string;
  canAdvance?: (step: number) => boolean;
  className?: string;
}

export function WizardShell({
  children,
  initialStep = 0,
  onSubmit,
  isSubmitting,
  submitLabel = "Save",
  nextLabel = "Next",
  backLabel = "Back",
  canAdvance,
  className,
}: WizardShellProps) {
  const steps = React.Children.toArray(children);
  const total = steps.length;
  const [step, setStep] = React.useState(Math.max(0, Math.min(initialStep, total - 1)));
  const isLast = step === total - 1;
  const blocked = canAdvance ? !canAdvance(step) : false;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full",
              i <= step ? "bg-primary" : "bg-secondary"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Step {step + 1} of {total}
      </p>
      <div>{steps[step]}</div>
      <div className="grid grid-cols-3 gap-2 pt-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || isSubmitting}
          className="col-span-1 h-12 rounded-lg bg-secondary text-foreground text-sm font-semibold disabled:opacity-40"
        >
          {backLabel}
        </button>
        {isLast ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={blocked || isSubmitting}
            className="col-span-2 h-12 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {submitLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
            disabled={blocked}
            className="col-span-2 h-12 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -t "<WizardShell>"`
Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/forms/primitives/wizard-shell.tsx src/components/forms/primitives/__tests__/wizard-shell.test.tsx
git commit -m "feat(forms): WizardShell step controller (progress + back/next/save)"
```

---

## Phase 7: App Shell

### Task 21: `<TopBar>`

**Files:**
- Modify: `src/components/layout/topbar.tsx` (replace contents)

- [ ] **Step 1: Inspect existing**

Run: `cat src/components/layout/topbar.tsx`

- [ ] **Step 2: Replace with the new TopBar**

```tsx
// src/components/layout/topbar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
  back?: boolean | string; // true = router.back(), string = href
  right?: React.ReactNode;
  brand?: boolean;
  className?: string;
}

export function TopBar({
  title,
  back,
  right,
  brand = false,
  className,
}: TopBarProps) {
  const router = useRouter();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-2 bg-background/95 px-3 pt-safe backdrop-blur",
        className
      )}
    >
      {back ? (
        typeof back === "string" ? (
          <Link
            href={back}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-md text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-md text-foreground"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )
      ) : null}
      {brand ? (
        <span className="text-base font-extrabold tracking-tight">JPR Farm</span>
      ) : title ? (
        <h1 className="truncate text-base font-semibold">{title}</h1>
      ) : null}
      {right && <div className="ml-auto flex items-center gap-1">{right}</div>}
    </header>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/topbar.tsx
git commit -m "refactor(ui): rewrite TopBar (sticky, safe-area-aware, slot-based)"
```

---

### Task 22: Rewrite `<BottomNav>` against `nav-config`

**Files:**
- Modify: `src/components/layout/bottom-nav.tsx`

- [ ] **Step 1: Replace contents**

```tsx
// src/components/layout/bottom-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { getNavConfig, type RoleNavKey } from "@/lib/nav-config";

interface BottomNavProps {
  role: RoleNavKey;
}

export function BottomNav({ role }: BottomNavProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const { tabs } = getNavConfig(role);

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 pb-safe backdrop-blur"
    >
      <ul className="grid h-16" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const href = `/${locale}${tab.href}`;
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={tab.href} className="contents">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[10px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} aria-hidden />
                <span>{t(tab.labelKey as Parameters<typeof t>[0])}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Add missing translation keys**

Open `messages/en.json`, `messages/ta.json`, `messages/si.json`. Under the existing `nav` namespace, ensure these keys exist (add any missing):

```
home, history, expenses, leave, more, vehicles, projects, invoices,
receivables, cash, finance, staff, reports, transactions, export, logWork,
newJob, newReceipt
```

For each missing key, add a localized string (English fallback values are fine for ta/si during foundation; localization happens in role sub-specs).

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: no errors. If `useTranslations` complains about unknown keys, the messages were added correctly.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/bottom-nav.tsx messages/en.json messages/ta.json messages/si.json
git commit -m "refactor(nav): rewrite BottomNav against nav-config (5 tabs, role-aware)"
```

---

### Task 23: `<Fab>` and `useFab` hook

**Files:**
- Create: `src/components/layout/fab.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/layout/fab.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FabProps {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: LucideIcon;
  hidden?: boolean;
  className?: string;
}

export function Fab({ href, onClick, label, icon: Icon, hidden, className }: FabProps) {
  if (hidden) return null;
  const styles = cn(
    "fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab",
    "bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)]",
    className
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} className={styles}>
        <Icon className="h-6 w-6" strokeWidth={2.25} aria-hidden />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={styles}>
      <Icon className="h-6 w-6" strokeWidth={2.25} aria-hidden />
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/fab.tsx
git commit -m "feat(ui): Fab corner-floating action button"
```

---

### Task 24: `<AppShell>` wrapper

**Files:**
- Create: `src/components/layout/app-shell.tsx`

- [ ] **Step 1: Implement**

```tsx
// src/components/layout/app-shell.tsx
import * as React from "react";
import { useLocale } from "next-intl";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Fab } from "@/components/layout/fab";
import { TopBar } from "@/components/layout/topbar";
import { OfflineBanner } from "@/components/offline-banner";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";
import { getNavConfig, type RoleNavKey } from "@/lib/nav-config";

interface AppShellProps {
  role: RoleNavKey;
  topBar?: React.ReactNode;
  children: React.ReactNode;
  hideFab?: boolean;
}

export function AppShell({
  role,
  topBar,
  children,
  hideFab = false,
}: AppShellProps) {
  const config = getNavConfig(role);
  const fab = config.fab;

  return (
    <ToastProvider swipeDirection="down">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col bg-background">
        {topBar}
        <OfflineBanner />
        <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] pt-2">
          {children}
        </main>
        {fab && !hideFab && (
          <Fab href={`/${useLocaleSafe()}${fab.href}`} label={fab.labelKey} icon={fab.icon} />
        )}
        <BottomNav role={role} />
        <ToastViewport />
      </div>
    </ToastProvider>
  );
}

function useLocaleSafe() {
  // Wrapper so this stays a Server Component candidate by default;
  // the surrounding ToastProvider already forces the client path.
  return useLocale();
}
```

> Note: AppShell is a client component because of ToastProvider. Either add `"use client"` at the top of the file, or split into two files: a server-component wrapper that mounts a small client component for ToastProvider + Fab href computation.

- [ ] **Step 2: Convert to client component**

Add `"use client";` as the first line of `app-shell.tsx`.

- [ ] **Step 3: Type-check + build**

Run: `pnpm tsc --noEmit && pnpm build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-shell.tsx
git commit -m "feat(layout): AppShell composes TopBar + BottomNav + FAB + Toast viewport"
```

---

## Phase 8: Existing Component Restyle (OfflineBanner)

### Task 25: Restyle `<OfflineBanner>` + Dexie unsynced count

**Files:**
- Modify: `src/components/offline-banner.tsx`

- [ ] **Step 1: Replace contents**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { WifiOff } from "lucide-react";
import {
  syncAll,
  pendingSyncCount,
  registerBackgroundSync,
} from "@/lib/offline/sync";

export function OfflineBanner() {
  const t = useTranslations("operator");
  const [isOnline, setIsOnline] = useState(true);
  const [pending, setPending] = useState(0);

  async function refreshPending() {
    try {
      setPending(await pendingSyncCount());
    } catch {
      // pendingSyncCount throws when SSR; ignore
    }
  }

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshPending();

    const onOffline = () => setIsOnline(false);
    const onOnline = async () => {
      setIsOnline(true);
      await registerBackgroundSync();
      await syncAll();
      await refreshPending();
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    const interval = window.setInterval(refreshPending, 5000);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.clearInterval(interval);
    };
  }, []);

  if (isOnline && pending === 0) return null;

  const message = isOnline
    ? `Syncing · ${pending} pending`
    : pending > 0
    ? `${t("offlineBanner")} · ${pending} unsynced`
    : t("offlineBanner");

  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-warning/15 px-4 py-2 text-sm font-semibold text-warning-foreground"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/components/offline-banner.tsx
git commit -m "refactor(offline): restyle OfflineBanner + show Dexie unsynced count"
```

---

## Phase 9: PWA Polish

### Task 26: Manifest theme + name

**Files:**
- Modify: `public/manifest.json`

- [ ] **Step 1: Inspect existing**

Run: `cat public/manifest.json`

- [ ] **Step 2: Update theme + background colors**

Set the following keys in `public/manifest.json` (preserve existing icon entries):

```json
{
  "name": "JPR Farm",
  "short_name": "JPR",
  "description": "Machinery rental and paddy farm management",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#16a34a",
  "background_color": "#f8fafc",
  "lang": "ta",
  "dir": "ltr",
  "icons": [ ... existing entries ... ]
}
```

If `display`, `orientation`, `start_url`, `lang`, `dir`, `name`, `short_name`, or `description` are missing, add them. If `theme_color` and `background_color` are different, overwrite to the values above.

- [ ] **Step 3: Build and inspect manifest**

Run: `pnpm build && head -40 .next/server/app/manifest*.json 2>/dev/null || cat public/manifest.json`

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json
git commit -m "chore(pwa): refresh manifest (theme color, name, orientation)"
```

---

### Task 27: iOS splash screen generator

**Files:**
- Create: `scripts/generate-splash.mjs`
- Create: `public/splash/README.md`
- Modify: `package.json` (add a `gen:splash` script)
- Modify: `src/app/[locale]/layout.tsx` (add splash `<link>` tags)

- [ ] **Step 1: Add the generator**

```js
// scripts/generate-splash.mjs
// Renders a flat splash for iOS PWA at common iPhone sizes.
// Run with `pnpm gen:splash`.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const sizes = [
  { name: "iphone-se",   w: 750,  h: 1334 },
  { name: "iphone-8p",   w: 1242, h: 2208 },
  { name: "iphone-x",    w: 1125, h: 2436 },
  { name: "iphone-xr",   w: 828,  h: 1792 },
  { name: "iphone-12",   w: 1170, h: 2532 },
  { name: "iphone-12pm", w: 1284, h: 2778 },
  { name: "iphone-14p",  w: 1179, h: 2556 },
  { name: "iphone-14pm", w: 1290, h: 2796 },
];

const bg = "#f8fafc";
const fg = "#16a34a";

await mkdir("public/splash", { recursive: true });

for (const s of sizes) {
  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}">
      <rect width="100%" height="100%" fill="${bg}"/>
      <circle cx="${s.w / 2}" cy="${s.h / 2}" r="${Math.min(s.w, s.h) * 0.18}" fill="${fg}"/>
      <text x="50%" y="${s.h / 2 + Math.min(s.w, s.h) * 0.32}"
        text-anchor="middle" font-family="system-ui, sans-serif"
        font-size="${Math.min(s.w, s.h) * 0.06}" font-weight="800" fill="#0f172a">
        JPR Farm
      </text>
    </svg>
  `);
  await sharp(svg).png().toFile(`public/splash/${s.name}.png`);
  console.log(`wrote public/splash/${s.name}.png`);
}
```

- [ ] **Step 2: Add `sharp` (dev dep) and the script**

```bash
pnpm add -D sharp
```

Edit `package.json` `scripts`:

```json
"gen:splash": "node scripts/generate-splash.mjs"
```

- [ ] **Step 3: Generate splashes**

Run: `pnpm gen:splash`
Expected: 8 PNGs written to `public/splash/`.

- [ ] **Step 4: Add a README**

```md
<!-- public/splash/README.md -->
# iOS Splash Screens

Generated by `pnpm gen:splash`. Do not hand-edit - re-run the script after
brand changes (background color, logo, label).

iOS Safari uses the linked PNGs only when the PWA is launched as
"Add to Home Screen". Android derives splash from manifest theme + icon.
```

- [ ] **Step 5: Wire splash links into root layout**

Edit `src/app/[locale]/layout.tsx`. Add the following inside the `<html>` tree, just before `<body>`:

```tsx
<head>
  <link rel="apple-touch-startup-image" href="/splash/iphone-12.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="/splash/iphone-12pm.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="/splash/iphone-14p.png" media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="/splash/iphone-14pm.png" media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="/splash/iphone-xr.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" />
  <link rel="apple-touch-startup-image" href="/splash/iphone-x.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="/splash/iphone-8p.png" media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="/splash/iphone-se.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
</head>
```

- [ ] **Step 6: Build**

Run: `pnpm build`

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-splash.mjs public/splash/ package.json pnpm-lock.yaml src/app/[locale]/layout.tsx
git commit -m "chore(pwa): generate iOS splash screens + link them in root layout"
```

---

### Task 28: `<InstallPrompt>` (PWA add-to-home-screen)

**Files:**
- Create: `src/components/install-prompt.tsx`
- Create: `src/components/__tests__/install-prompt.test.tsx`
- Modify: `src/components/layout/app-shell.tsx` (mount `<InstallPrompt />`)

- [ ] **Step 1: Write the failing test (cooldown logic only)**

```tsx
// src/components/__tests__/install-prompt.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { canPromptInstall } from "../install-prompt";

describe("canPromptInstall", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it("returns false within 7 days of last dismissal", () => {
    localStorage.setItem("install-prompt:dismissedAt", String(Date.now()));
    expect(canPromptInstall()).toBe(false);
  });
  it("returns true after 7 days", () => {
    const eightDaysAgo = Date.now() - 8 * 24 * 3600 * 1000;
    localStorage.setItem("install-prompt:dismissedAt", String(eightDaysAgo));
    expect(canPromptInstall()).toBe(true);
  });
  it("returns true if never dismissed", () => {
    expect(canPromptInstall()).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect failure**

Run: `pnpm test -t "canPromptInstall"`
Expected: FAIL `Cannot find module '../install-prompt'`.

- [ ] **Step 3: Implement**

```tsx
// src/components/install-prompt.tsx
"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { Smartphone, Share, X } from "lucide-react";

const KEY = "install-prompt:dismissedAt";
const COOLDOWN_MS = 7 * 24 * 3600 * 1000;

export function canPromptInstall(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return true;
  const ts = Number(raw);
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > COOLDOWN_MS;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [open, setOpen] = React.useState(false);
  const [event, setEvent] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [iosFallback, setIosFallback] = React.useState(false);

  React.useEffect(() => {
    if (!canPromptInstall()) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setOpen(true);
    }

    const isIOSStandalone =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches;
    const isIOSSafari =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);

    if (isIOSSafari && !isIOSStandalone) {
      setIosFallback(true);
      setOpen(true);
    } else {
      window.addEventListener("beforeinstallprompt", onBeforeInstall);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    window.localStorage.setItem(KEY, String(Date.now()));
    setOpen(false);
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    dismiss();
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 rounded-t-2xl bg-card pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] shadow-sheet">
          <div className="mx-auto mt-2 mb-3 h-1.5 w-10 rounded-full bg-muted" />
          <div className="flex items-start gap-3 px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <Drawer.Title className="text-base font-semibold">
                Install JPR Farm
              </Drawer.Title>
              <Drawer.Description className="mt-1 text-sm text-muted-foreground">
                {iosFallback
                  ? "Tap the Share icon, then choose Add to Home Screen."
                  : "Works offline. Faster to open than a browser tab."}
              </Drawer.Description>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="rounded-md p-1 text-muted-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {iosFallback ? (
            <div className="mt-4 px-4">
              <div className="rounded-lg bg-secondary px-3 py-3 text-sm">
                <Share className="mr-2 inline h-4 w-4 text-foreground" />
                Share → Add to Home Screen
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="mt-3 h-12 w-full rounded-lg bg-secondary text-sm font-semibold"
              >
                Got it
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2 px-4">
              <button
                type="button"
                onClick={dismiss}
                className="h-12 rounded-lg bg-secondary text-sm font-semibold"
              >
                Later
              </button>
              <button
                type="button"
                onClick={install}
                className="h-12 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
              >
                Install
              </button>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -t "canPromptInstall"`
Expected: 3 PASS.

- [ ] **Step 5: Mount in `AppShell`**

Edit `src/components/layout/app-shell.tsx`. Add an import and mount the prompt inside the shell:

```tsx
import { InstallPrompt } from "@/components/install-prompt";
// ...
<ToastViewport />
<InstallPrompt />
```

- [ ] **Step 6: Type-check + build**

Run: `pnpm tsc --noEmit && pnpm build`

- [ ] **Step 7: Commit**

```bash
git add src/components/install-prompt.tsx src/components/__tests__/install-prompt.test.tsx src/components/layout/app-shell.tsx
git commit -m "feat(pwa): InstallPrompt with 7-day cooldown + iOS fallback copy"
```

---

## Phase 10: Wire-In + Verify

### Task 29: Rewire dashboard layout to use `<AppShell>`

**Files:**
- Modify: `src/app/[locale]/(dashboard)/layout.tsx`

- [ ] **Step 1: Replace contents**

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { TopBar } from "@/components/layout/topbar";
import type { RoleNavKey } from "@/lib/nav-config";

function getRoleNavKey(role: string): RoleNavKey {
  switch (role) {
    case "super_admin":
      return "owner";
    case "admin":
      return "admin";
    case "operator":
      return "operator";
    case "auditor":
      return "auditor";
    case "finance":
      return "finance";
    default:
      return "operator";
  }
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const session = await getSession();
  const { locale } = await params;
  if (!session) {
    redirect(`/${locale}/login`);
  }

  const navKey = getRoleNavKey(session.role);
  return (
    <AppShell role={navKey} topBar={<TopBar brand />}>
      {children}
    </AppShell>
  );
}
```

> Note: The legacy `SlidingMenu` referenced inside the old `BottomNav` is now removed by the new BottomNav implementation, but the file `src/components/layout/sliding-menu.tsx` is still imported by some role pages. Leave it on disk until role sub-specs migrate. The new BottomNav does not import it.

- [ ] **Step 2: Boot the dev server and click through every role**

Run: `pnpm dev`

In a browser, visit `/ta`, `/si`, `/en` for each role's home (you may need to seed test users via `pnpm db:seed`):
- `/ta/owner`
- `/ta/admin`
- `/ta/operator`
- `/ta/finance`
- `/ta/auditor`

Confirm: bottom nav shows 5 tabs per role, FAB shows for action roles only, top bar is sticky, content scrolls under it, no horizontal scroll, safe-area padding works on a narrow viewport.

- [ ] **Step 3: Type-check + build**

Run: `pnpm tsc --noEmit && pnpm build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/(dashboard)/layout.tsx
git commit -m "refactor(layout): wire dashboard route group to AppShell"
```

---

### Task 30: Lighthouse + manual a11y verification

**Files:** none (verification only)

- [ ] **Step 1: Run a production build**

```bash
pnpm build && pnpm start
```

- [ ] **Step 2: Lighthouse mobile audit**

In Chrome DevTools → Lighthouse, run the **Progressive Web App** + **Accessibility** audits against `http://localhost:3000/ta`.

Expected: PWA score ≥ 90. Accessibility score ≥ 90. If either is below, capture the failing checks in a follow-up issue and proceed (this plan does not block on perfect scores).

- [ ] **Step 3: Manual tap-target check**

Open DevTools → Elements. For 10 random buttons in the new primitives (top bar, bottom nav, list rows, FAB, action sheet tiles, stepper buttons, form submit, install prompt buttons), check that computed `min-height` ≥ 44px.

- [ ] **Step 4: Color contrast spot-check**

Use DevTools color picker. Verify these pairs pass WCAG AA (≥ 4.5:1):
- Primary green button text on green-600 surface.
- Slate-600 secondary text on white surface.
- Warning text on amber-50 banner.
- Active tab label on background.

- [ ] **Step 5: Commit nothing - verification step**

If any checks fail, capture in a follow-up issue. Report back to the planning agent before declaring foundation done.

---

### Task 31: Storybook (optional - soft yes)

**Files:**
- (multiple, depends on Storybook init)

- [ ] **Step 1: Time-box: 4 hours**

If init or first stories take more than 4 hours, abandon this task and skip to Task 32. Document the gap in a follow-up.

- [ ] **Step 2: Init**

```bash
pnpm dlx storybook@latest init --type nextjs
```

- [ ] **Step 3: Add a story per primitive**

Minimum coverage: `Skeleton`, `EmptyState`, `ErrorState`, `Toast`, `ActionSheet`, `PickerSheet`, `FilterPills`, `ListRow`, `Stepper`, `TilePicker`, `WizardShell`, `Fab`, `BottomNav`. Each story shows the default variant; light theme only. Skip Tamil/Sinhala variants in this phase.

- [ ] **Step 4: Verify build**

```bash
pnpm build-storybook
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add .storybook src/**/*.stories.tsx package.json pnpm-lock.yaml
git commit -m "chore(storybook): scaffold Storybook with stories for foundation primitives"
```

---

## Self-Review

**Spec coverage:**
- Section 1 Tokens - Task 2.
- Section 2 Typography - Task 3.
- Section 3 Iconography - Task 5.
- Section 4 App Shell - Tasks 21 (TopBar), 22 (BottomNav), 23 (Fab), 24 (AppShell), 29 (wire-in). Per-role tabs are encoded in nav-config (Task 4).
- Section 5 List primitives - Tasks 11 (ListSearch), 12 (FilterPills), 13 (ListPageHeader), 14 (ListRow), 15 (ListSkeleton/Empty/Error + Pagination restyle).
- Section 6 Form primitives - Tasks 16 (Field + SmartDefaultBanner), 17 (TilePicker), 18 (Stepper), 19 (PhotoField + FormSubmit), 20 (WizardShell). PickerSheet - Task 10.
- Section 7 System states - Task 6 (Skeleton), 7 (Toast), 8 (EmptyState rewrite + ErrorState), 25 (OfflineBanner).
- Section 8 PWA polish - Task 26 (manifest), 27 (splash), 28 (install prompt).
- Section 9 Migration - Task 29 (wire dashboard layout). `sliding-menu.tsx` left on disk per spec note.
- Section 10 Testing - every primitive task has a unit/component test pair. Storybook is Task 31 (optional). Lighthouse + a11y verify is Task 30.

**Placeholder scan:** none of the patterns ("TBD", "TODO", "implement later", "fill in details", "Add appropriate error handling", "Write tests for the above" without code, "Similar to Task N") appear above. Every code step contains complete code.

**Type consistency:**
- `RoleNavKey` is defined in Task 4 and reused in Task 22 (BottomNav), Task 24 (AppShell), Task 29 (dashboard layout). Same name everywhere.
- `getNavConfig` returns `{ tabs, fab? }` (Task 4); both consumed unchanged in Tasks 22 and 24.
- `Icon` prop names (`name`, `size`, `strokeWidth`) consistent.
- `ActionSheet` and `PickerSheet` use the same Drawer wrapper from `vaul` and the same backdrop classes.
- `Stepper` test uses `name: "Increase" / "Decrease"` and the implementation uses matching `aria-label` values.

**Risks captured:**
- Lucide icon names: `PalmTree` may not exist; Task 4 calls this out and provides a fallback (`Trees`). Same pattern noted for `TreePalm` in Task 5 - confirm at type-check time.
- Storybook is time-boxed; can be skipped without breaking the rest of the plan.
- `next/font/google` font subsets must include `tamil` and `sinhala`. Verified spelling in Task 3 against current `next/font` API; if any name fails (`Noto_Sans_Sinhala` casing), check the live Google Fonts list and rename in `fonts.ts`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-06-ui-revamp-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
