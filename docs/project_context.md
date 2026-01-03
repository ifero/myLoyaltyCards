---
project_name: 'myLoyaltyCards'
user_name: 'Ifero'
date: '2025-12-31'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow_rules', 'anti_patterns']
source: 'docs/architecture.md'
---

# Project Context for AI Agents

_Critical rules and patterns for implementing myLoyaltyCards. Read this before writing any code._

---

## Technology Stack & Versions

### Phone App (React Native)
| Technology | Version | Purpose |
|------------|---------|---------|
| Expo SDK | 54.0.0 | Development framework |
| React | 19.1.0 | UI library |
| React Native | 0.81.5 | Mobile framework |
| TypeScript | 5.6.0 | Language (strict mode) |
| Expo Router | 6.0.15 | File-based navigation |
| NativeWind | 4.x | Tailwind CSS styling |
| Zustand | 4.x | Client state management |
| TanStack Query | 5.x | Server state / caching |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation |
| expo-sqlite | Latest | Local database |
| expo-secure-store | Latest | Secure token storage |

### Watch Apps (Native)
| Platform | Language | UI Framework | Database |
|----------|----------|--------------|----------|
| watchOS | Swift 5.9+ | SwiftUI | SwiftData |
| Wear OS | Kotlin | Jetpack Compose | Room |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase | PostgreSQL + Auth + RLS |
| GitHub Actions | CI/CD |
| Fastlane | Build automation |

---

## Critical Implementation Rules

### TypeScript Configuration (Required)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| DB tables | `snake_case` plural | `loyalty_cards` |
| DB columns | `snake_case` | `created_at` |
| TS variables/functions | `camelCase` | `getUserCards()` |
| TS components | `PascalCase` | `CardList` |
| TS component files | `PascalCase.tsx` | `CardList.tsx` |
| TS utility files | `camelCase.ts` | `syncHelpers.ts` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_CARDS` |
| Zod schemas | `camelCase` + `Schema` | `loyaltyCardSchema` |

### Data Format Rules

- **Dates:** Always UTC, ISO 8601 with milliseconds: `2025-12-24T10:30:00.123Z`
- **UUIDs:** Client-generated on all platforms (never rely on server)
- **JSON nulls:** Always include ALL fields (`"brandId": null` ✅, omitting field ❌)
- **API/DB fields:** `snake_case` in DB, `camelCase` in client, transform at boundary

### Zod Schema = Source of Truth

```typescript
// All data types derive from Zod schemas
const loyaltyCardSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(50),
  barcode: z.string(),
  barcodeFormat: z.enum(['CODE128', 'EAN13', 'EAN8', 'QR', 'CODE39', 'UPCA']),
  brandId: z.string().nullable(),
  color: z.enum(['blue', 'red', 'green', 'orange', 'grey']),
  isFavorite: z.boolean().default(false),
  lastUsedAt: z.string().datetime().nullable(),
  usageCount: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

type LoyaltyCard = z.infer<typeof loyaltyCardSchema>
```

---

## Project Structure

### Feature-First Organization

```
app/           → Thin route files (re-export only)
features/      → Self-contained feature modules
shared/        → Cross-feature UI & React hooks
core/          → Business logic (NO React imports except stores)
catalogue/     → Brand data JSON (source of truth)
```

### Layer Boundaries (ESLint Enforced)

```
✅ Allowed: app/ → features/ → shared/ → core/
❌ Forbidden: core/ → features/, shared/ → features/, features/X → features/Y
```

### Import Convention

```typescript
// Within same feature: RELATIVE (max 2 levels)
import { CardItem } from './CardItem'
import { useCards } from '../hooks/useCards'

// Cross-boundary: ABSOLUTE
import { Button } from '@/shared/components/ui'
import { useCardsStore } from '@/core/stores'
```

### Route Files Pattern

```typescript
// app/add.tsx - ONLY this pattern
export { default } from '@/features/add-card'
// NO useState, useEffect, or business logic in route files
```

### Feature Exports

```typescript
// features/cards/index.tsx
export { default } from './CardListScreen'    // Main (default)
export { CardDetail } from './CardDetail'     // Sub-screens (named)
// DO NOT export: components, hooks, utilities (internal only)
```

---

## State Management Patterns

### Zustand with Immer

```typescript
import { immer } from 'zustand/middleware/immer'

const useCardsStore = create<CardsState>()(
  immer((set) => ({
    cards: [],
    addCard: (card) => set((state) => { 
      state.cards.push(card)
    }),
  }))
)
```

### TanStack Query (Offline-First Defaults)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})
```

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
  await createCurrentSchema(db)  // Fresh install
} else {
  await runMigrations(db)        // Upgrade path
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
- **Watch is READ-ONLY** for MVP (prevents conflicts)

### Message Versioning

```typescript
type SyncMessage = {
  version: number  // Always include
  type: 'CARDS_UPDATED' | 'CARD_ADDED' | 'CARD_DELETED' | 'REQUEST_FULL_SYNC'
  payload: unknown
}
```

---

## Error Handling

### Error Shape

```typescript
interface AppError {
  code: string      // Machine-readable
  message: string   // User-friendly
  details?: unknown
}
```

### Loading State Names
- `isLoading` - Initial load
- `isRefreshing` - Background refresh
- `isSyncing` - Sync in progress
- `isPending` - Mutation pending

### Logging

```typescript
const logger = {
  log: (msg: string, data?: object) => {
    if (__DEV__) console.log(msg, data)
  },
  error: (msg: string, error: unknown) => {
    console.error(msg, error)
    if (!__DEV__) Sentry.captureException(error)
  },
}
```

---

## Testing Rules

### Co-located Tests

```
features/cards/components/CardItem.tsx
features/cards/components/CardItem.test.tsx  ← Same folder
```

### Cross-Platform Fixtures

```
test-fixtures/
├── card-valid.json           # All platforms must parse
├── card-all-formats.json     # All barcode formats
└── sync-message-v1.json      # Sync protocol
```

---

## Critical Anti-Patterns

### NEVER Do These

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Import features from other features | Move to `shared/` or `core/` |
| Import React in `core/` (except stores) | Use `shared/` for React code |
| Add logic to route files | Re-export from features only |
| Omit fields in JSON | Include all fields with `null` |
| Use native Date types in sync | Use ISO 8601 strings |
| Auto-generate UUIDs on server | Generate client-side |
| Skip transactions for DB writes | Always use `withTransactionAsync` |
| Use `console.log` directly | Use `logger` wrapper |
| Forget sync message version | Always include `version` field |

### Watch App Rules
- Watch is **READ-ONLY** for MVP
- Handle unknown message versions gracefully (request full sync)
- Store dates as strings, parse only for display

---

## Environment Configuration

### Two Environments
| Environment | Supabase | Distribution |
|-------------|----------|--------------|
| Dev | `myloyaltycards-dev` | TestFlight / Internal |
| Production | `myloyaltycards-prod` | App Store / Google Play |

### Expo Config

```typescript
// app.config.ts
const ENV = process.env.APP_ENV || 'dev'
const envConfig = {
  dev: { bundleIdentifier: 'com.myloyaltycards.dev' },
  production: { bundleIdentifier: 'com.myloyaltycards.app' },
}
```

---

## Color Palette (Virtual Logos)

| Color | Hex |
|-------|-----|
| Blue | `#3B82F6` |
| Red | `#EF4444` |
| Green | `#22C55E` |
| Orange | `#F97316` |
| Grey | `#6B7280` |

---

## Quick Reference Checklist

Before submitting code, verify:

- [ ] TypeScript strict mode enabled
- [ ] Imports follow layer boundaries
- [ ] Route files only re-export
- [ ] Zod schema used for data types
- [ ] UUIDs generated client-side
- [ ] Dates in ISO 8601 UTC format
- [ ] All JSON fields present (null not omitted)
- [ ] Database writes use transactions
- [ ] Logging uses wrapper, not console
- [ ] Tests co-located with source
- [ ] Sync messages include version

