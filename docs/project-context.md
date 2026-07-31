---
project_name: 'myLoyaltyCards'
user_name: 'Ifero'
date: '2026-07-28'
stack_verified_against: 'package.json @ e9d841d'
sections_completed:
  [
    'technology_stack',
    'language_rules',
    'framework_rules',
    'testing_rules',
    'code_quality',
    'workflow_rules',
    'anti_patterns'
  ]
source: 'Verified directly against package.json, tsconfig.json, tokens/color.json, eslint.config.mjs and source. NOT regenerated from docs/architecture.md — that document is stale on the styling library, the state-management story and the colour palette.'
---

# Project Context for AI Agents

_Critical rules and patterns for implementing myLoyaltyCards. Read this before writing any code._

> **Verify before you trust.** The stack table below was checked against `package.json` on
> 2026-07-28. If you are reading this much later, re-check `package.json` before relying on a
> version. This file was wrong for months about three libraries that are not installed at all
> (NativeWind, Zustand, TanStack Query), so the habit matters.

---

## Technology Stack & Versions

### Phone App (React Native)

| Technology              | Version   | Purpose                                   |
| ----------------------- | --------- | ----------------------------------------- |
| Expo SDK                | ^55.0.19  | Development framework                     |
| React                   | 19.2.0    | UI library                                |
| React Native            | 0.83.6    | Mobile framework                          |
| TypeScript              | ~5.9.2    | Language (strict mode)                    |
| Expo Router             | ~55.0.13  | File-based navigation                     |
| react-native-unistyles  | ^3        | Styling + theming (**not** NativeWind)    |
| react-native-reanimated | 4.2.1     | Animation (+ react-native-worklets 0.7.4) |
| react-native-svg        | 15.15.3   | Vector rendering (+ svg-transformer)      |
| React Hook Form         | ^7.70.0   | Form handling                             |
| Zod                     | ^4.3.5    | Schema validation                         |
| i18next / react-i18next | ^26 / ^17 | Localisation (`en`, `it`)                 |
| expo-sqlite             | ~55.0.15  | Local database                            |
| expo-secure-store       | ~55.0.13  | Secure token storage                      |
| @shopify/flash-list     | 2.0.2     | Virtualised lists                         |
| @sentry/react-native    | ~7.11.0   | Crash + error reporting                   |

**There is no global state-management library and no server-state/query library.** See
[State Management](#state-management-the-actual-pattern). Do not add one without a story.

### Watch Apps (Native)

| Platform | Language   | UI Framework    | Database  |
| -------- | ---------- | --------------- | --------- |
| watchOS  | Swift 5.9+ | SwiftUI         | SwiftData |
| Wear OS  | Kotlin     | Jetpack Compose | Room      |

### Backend & Tooling

| Technology            | Purpose                      |
| --------------------- | ---------------------------- |
| Supabase              | PostgreSQL + Auth + RLS      |
| GitHub Actions        | CI/CD                        |
| Fastlane              | Build automation             |
| Style Dictionary      | Design tokens → generated TS |
| Storybook + Chromatic | `shared/components/ui/` only |

---

## Critical Implementation Rules

### TypeScript Configuration (actual, from `tsconfig.json`)

Extends `expo/tsconfig.base`, plus:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "skipLibCheck": true
}
```

Path aliases: `@/*` → repo root, plus explicit `@/features/*`, `@/shared/*`, `@/core/*`,
`@/catalogue/*`.

### Naming Conventions

| Context                | Convention             | Example             |
| ---------------------- | ---------------------- | ------------------- |
| DB tables              | `snake_case` plural    | `loyalty_cards`     |
| DB columns             | `snake_case`           | `created_at`        |
| TS variables/functions | `camelCase`            | `getUserCards()`    |
| TS components          | `PascalCase`           | `CardList`          |
| TS component files     | `PascalCase.tsx`       | `CardList.tsx`      |
| TS utility files       | `camelCase.ts`         | `syncHelpers.ts`    |
| Constants              | `SCREAMING_SNAKE_CASE` | `MAX_CARDS`         |
| Zod schemas            | `camelCase` + `Schema` | `loyaltyCardSchema` |

### Data Format Rules

- **Dates:** Always UTC, ISO 8601 with milliseconds: `2025-12-24T10:30:00.123Z`
- **UUIDs:** Client-generated on all platforms (never rely on server)
- **JSON nulls:** Always include ALL fields (`"brandId": null` ✅, omitting field ❌)
- **API/DB fields:** `snake_case` in DB, `camelCase` in client, transform at the boundary

### Zod Schema = Source of Truth

Defined in `core/schemas/card.ts`:

```typescript
export const loyaltyCardSchema = z.object({
  id: z.string().uuid(), // client-generated
  name: z.string().max(50),
  barcode: z.string(),
  barcodeFormat: barcodeFormatSchema, // z.enum([...])
  brandId: z.string().nullable(), // null for custom cards
  color: cardColorSchema, // z.enum(CARD_COLOR_KEYS)
  isFavorite: z.boolean().default(false),
  lastUsedAt: z.string().datetime().nullable(),
  usageCount: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

type LoyaltyCard = z.infer<typeof loyaltyCardSchema>;
```

---

## Project Structure

### Feature-First Organization

```
app/           → Thin route files (re-export only)
features/      → Self-contained feature modules
shared/        → Cross-feature UI & React hooks
core/          → Business logic (NO React imports)
catalogue/     → Brand data JSON (source of truth)
tokens/        → DTCG design tokens → shared/theme/tokens.generated.ts
```

### Layer Boundaries (ESLint-enforced, `eslint.config.mjs`)

```
✅ Allowed: app/ → features/ → shared/ → core/ → catalogue/
❌ Forbidden: core/ → features/, shared/ → features/, features/X → features/Y
```

`shared` may import only from `['core', 'catalogue', 'shared']`.

### Import Convention

```typescript
// Within same feature: RELATIVE (max 2 levels)
import { CardItem } from './CardItem';
import { useCards } from '../hooks/useCards';

// Cross-boundary: ABSOLUTE
import { Button } from '@/shared/components/ui';
import { getAllCards } from '@/core/database/card-repository';
```

### Route Files Pattern

```typescript
// app/add-card.tsx — ONLY this pattern
export { default } from '@/features/add-card';
```

`no-restricted-imports` blocks `useState` / `useEffect` / `useCallback` / `useMemo` from `'react'` in
`app/**/*.tsx`. Layout files (`_layout.tsx`) and test files are **exempt** — a layout legitimately
holds routing and provider logic.

### Feature Exports

```typescript
// features/cards/index.tsx
export { default } from './CardListScreen'; // Main (default)
export { CardDetail } from './CardDetail'; // Sub-screens (named)
// DO NOT export: components, hooks, utilities (internal only)
```

---

## State Management — the actual pattern

**No Zustand. No TanStack Query. No Redux.** Neither a client-store nor a server-state library is
installed, and `core/stores/` does not exist.

SQLite is the source of truth. State is local React state inside a per-feature hook that reads
through a `core/` repository:

```typescript
// features/cards/hooks/useCards.ts — the canonical shape
export function useCards(): UseCardsResult {
  const [cards, setCards] = useState<LoyaltyCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false); // only the FIRST load drives the full-screen spinner

  const fetchCards = useCallback(async () => {
    /* getAllCards() → setCards */
  }, []);
  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, isLoading, error, refetch: fetchCards };
}
```

Cross-feature hooks live in `shared/hooks/` — currently `useAutoSync`, `useCloudSync`,
`useSyncUpload`, `useNetworkStatus`. If you need shared state, prefer a hook over a new dependency.

---

## Styling & Theming (Unistyles 3)

```typescript
import { StyleSheet } from 'react-native-unistyles';

const styles = StyleSheet.create((theme) => ({
  card: { backgroundColor: theme.colors.surface }
}));
```

- `shared/theme/` is the single source of truth; Unistyles themes are **derived** from it.
- `StyleSheet.configure` runs at **module-evaluation** time via the side-effect import
  `@/shared/theme/unistyles` — so themed styles work **before** `ThemeProvider` mounts.
- `adaptiveThemes: false`. The active theme comes from `resolveInitialTheme()`, which reads the
  user's **persisted preference** (synchronously, via `Storage.getItemSync`) and falls back to
  `Appearance.getColorScheme()`. Note this can disagree with `app.json`'s
  `userInterfaceStyle: 'automatic'`, which follows the **system** scheme.
- `useTheme()` **throws** outside `ThemeProvider` (`shared/theme/ThemeProvider.tsx`). Pre-provider
  code must use `StyleSheet.create((theme) => …)` or import constants from `@/shared/theme/colors`.
- **Never edit `shared/theme/tokens.generated.ts`.** Edit `tokens/*.json` then `yarn tokens:build`.
  `yarn tokens:check` guards drift in CI **and** pre-push.
- **Unistyles gotcha:** its Babel plugin remaps RN `Pressable`, causing per-press shadow churn. Use
  raw-RN buttons in the nav bar.

---

## Database Patterns

### Transactions Required

```typescript
await db.withTransactionAsync(async () => {
  await db.runAsync('INSERT OR REPLACE INTO loyalty_cards ...', [...])
})
```

### Migration Pattern

```typescript
if (currentVersion === 0) {
  await createCurrentSchema(db); // Fresh install
} else {
  await runMigrations(db); // Upgrade path
}
```

---

## Sync Patterns

### Cloud Sync (Phone ↔ Supabase)

- **Throttling:** 5 minutes cooldown, persistent across sessions
- **Force sync:** Bypasses throttle for manual refresh

### Watch Sync (Phone ↔ Watch)

- **No throttling:** Immediate sync on changes
- **Retry:** 3 attempts with exponential backoff
- **Watch is READ-ONLY for card _data_** (create/edit/delete/favourite only on phone); it MAY emit
  `CARD_USED` usage events, applied commutatively on the phone — no edit conflict
  (ADR-2026-06-09-001)

### Message Type (actual, `core/watch-connectivity.ts`)

```typescript
export type WatchMessage =
  | { type: 'requestCards' } // watch → phone
  | { type: 'cards'; payload: WatchCardPayload[] } // phone → watch
  | { type: 'syncCard'; payload: { id: string; cardData: any } }
  | { type: 'ack'; payload?: { id?: string } }
  // watch → phone usage telemetry; phone applies usageCount += 1, lastUsedAt = max,
  // dedup by "<id>:<usedAt>". Story 9.6 / ADR-2026-06-09-001.
  | { version: 1; type: 'CARD_USED'; payload: { id: string; usedAt: string } }
  | { type: string; payload?: any }; // forward-compat catch-all
```

Versioned messages carry `version`; handle unknown versions gracefully by requesting a full sync.

---

## Error Handling & Logging

### Error Shape

```typescript
interface AppError {
  code: string; // Machine-readable
  message: string; // User-friendly
  details?: unknown;
}
```

### Loading State Names

- `isLoading` — Initial load
- `isRefreshing` — Background refresh
- `isSyncing` — Sync in progress
- `isPending` — Mutation pending

### Logging (`core/utils/logger.ts`) — four methods, not two

| Method                                    | `__DEV__`       | Production                                                     |
| ----------------------------------------- | --------------- | -------------------------------------------------------------- |
| `logger.info(…)`                          | `console.info`  | **no-op**                                                      |
| `logger.warn(…)`                          | `console.warn`  | **no-op**                                                      |
| `logger.notify(msg, { tags?, context? })` | `console.warn`  | `Sentry.captureMessage(msg, 'warning')` — non-fatal, countable |
| `logger.error(…)`                         | `console.error` | `Sentry.captureException`                                      |

`info`/`warn` are **invisible in production**. If a condition must be measurable in the field, use
`logger.notify` (Story 16.14). `notify`'s `message` must be a string **literal** — a compile-time
guard rejects anything widening to `string`, so Sentry's grouping key cannot be polluted. Tag values
must be low-cardinality literals and are **not** redacted by the PII scrubber.

Never call `console.*` directly outside `core/utils/logger.ts`.

---

## Testing Rules

### Co-located Tests — `__tests__/` folders are banned (CI-enforced)

```
features/cards/components/CardItem.tsx
features/cards/components/CardItem.test.tsx  ← same folder
```

`app/` holds **no** test files. Tests whose subject is a route live in the top-level `test/`
directory and import via `@/app/...`.

### Coverage

`jest.config.js` `collectCoverageFrom` covers `features/**`, `core/**`, `shared/**` at an **80 %
global** threshold. The `app/` directory is **not measured** — logic placed there is invisible to the
gate, so put testable logic in `shared/` or `features/`.

### Cross-Platform Fixtures

```
test-fixtures/
├── card-valid.json           # All platforms must parse
├── card-all-formats.json     # All barcode formats
└── sync-message-v1.json      # Sync protocol
```

### Runtime-parity warning (learned the hard way)

Jest runs on Node with full ICU. **Hermes ships a subset of the standard library** — it has no
`Intl.RelativeTimeFormat`, and `Intl` behaves three different ways (full on Node/Jest, OS-ICU on
Android Hermes, limited on iOS Hermes). Green tests do **not** prove a Hermes build works; a
production crash shipped this way (Story 16.15). Verify Hermes support before using any
stdlib/`Intl` API. Some surfaces — native splash screens especially — cannot be validated in Expo Go
or a dev build at all and require a release build.

---

## Critical Anti-Patterns

| ❌ Don't                                     | ✅ Do Instead                                        |
| -------------------------------------------- | ---------------------------------------------------- |
| Add Zustand / TanStack Query / NativeWind    | Use local hooks over `core/` repositories; Unistyles |
| Import features from other features          | Move to `shared/` or `core/`                         |
| Import React in `core/`                      | Put React code in `shared/` or `features/`           |
| Add logic to route files                     | Re-export from features (`_layout.tsx` exempt)       |
| Edit `shared/theme/tokens.generated.ts`      | Edit `tokens/*.json`, run `yarn tokens:build`        |
| Call `useTheme()` before `ThemeProvider`     | `StyleSheet.create((theme) => …)` or `theme/colors`  |
| Omit fields in JSON                          | Include all fields with `null`                       |
| Use native `Date` types in sync              | Use ISO 8601 strings                                 |
| Auto-generate UUIDs on server                | Generate client-side                                 |
| Skip transactions for DB writes              | Always use `withTransactionAsync`                    |
| Use `console.log` directly                   | Use the `logger` wrapper                             |
| Use `logger.warn` for prod-visible signals   | Use `logger.notify` (`warn` is `__DEV__`-only)       |
| Create a `__tests__/` folder                 | Co-locate `*.test.ts(x)` beside the subject          |
| Assume an `Intl`/stdlib API exists on Hermes | Verify on a real build first                         |
| `git push --no-verify`                       | Fix the gate (forbidden by CONTRIBUTING)             |

### Watch App Rules

- Watch is **READ-ONLY for card _data_** — usage events (`CARD_USED`) permitted, applied
  commutatively on phone (ADR-2026-06-09-001)
- Handle unknown message versions gracefully (request full sync)
- Store dates as strings, parse only for display

---

## Environment Configuration

| Environment | Supabase              | Distribution            |
| ----------- | --------------------- | ----------------------- |
| Dev         | `myloyaltycards-dev`  | TestFlight / Internal   |
| Production  | `myloyaltycards-prod` | App Store / Google Play |

`app.json` is the static base; `app.config.ts` extends it only to inject a computed
`android.versionCode` (Story 16.7). `runtimeVersion.policy` is `appVersion`, so **any native change
requires a new binary and cannot ship as an OTA update.**

---

## Colour Palette

Canonical values live in `tokens/color.json` → `shared/theme/tokens.generated.ts`. Never hardcode.

### Virtual-logo palette (`CARD_COLORS`) — for cards with no official logo

| Colour | Hex       |
| ------ | --------- |
| Blue   | `#1A73E8` |
| Red    | `#E2231A` |
| Green  | `#16A34A` |
| Orange | `#F59E0B` |
| Grey   | `#64748B` |

### Brand primary

| Theme | `primary` |
| ----- | --------- |
| Light | `#1A73E8` |
| Dark  | `#4DA3FF` |

Theme backgrounds are `#FFFFFF` (light) and `#000000` (dark, true-black OLED). Targets are WCAG 2.1
AA; `shared/theme/colors.contrast.test.ts` guards it.

---

## Quick Reference Checklist

Before submitting code, verify:

- [ ] TypeScript strict mode satisfied (incl. `noUncheckedIndexedAccess`)
- [ ] Imports follow layer boundaries
- [ ] Route files only re-export
- [ ] Zod schema used for data types
- [ ] UUIDs generated client-side
- [ ] Dates in ISO 8601 UTC format
- [ ] All JSON fields present (null not omitted)
- [ ] Database writes use transactions
- [ ] Styling via Unistyles + theme tokens, no hardcoded hex
- [ ] Logging uses the wrapper; prod-visible signals use `logger.notify`
- [ ] Tests co-located; no `__tests__/` folder; no tests in `app/`
- [ ] New strings added to **both** `shared/i18n/locales/en.ts` and `it.ts` (no parity test exists)
- [ ] Sync messages include `version` where versioned
- [ ] `yarn lint` / `typecheck` / `test` / `tokens:check` run in a checkout with its own
      `node_modules` (a `.claude` worktree qualifies after `yarn install`); native builds
      (`yarn watch:build`, `yarn ios`) still need the **main checkout**, and `--no-verify` is forbidden
      everywhere
