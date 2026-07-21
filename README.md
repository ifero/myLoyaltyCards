# myLoyaltyCards

[![CI — Quality Gates](https://github.com/ifero/myLoyaltyCards/actions/workflows/ci-quality-gates.yml/badge.svg)](https://github.com/ifero/myLoyaltyCards/actions/workflows/ci-quality-gates.yml)
[![watchOS Tests](https://github.com/ifero/myLoyaltyCards/actions/workflows/watchos-tests.yml/badge.svg)](https://github.com/ifero/myLoyaltyCards/actions/workflows/watchos-tests.yml)
[![Component gallery — Storybook](https://img.shields.io/badge/Storybook-component%20gallery-ff4785.svg?logo=storybook&logoColor=white)](https://www.chromatic.com/library?appId=6a4fc5ac9de1aaad76bfb550)
[![Expo SDK 55](https://img.shields.io/badge/Expo%20SDK-55-000020.svg?logo=expo)](https://expo.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](#license)

> Your loyalty cards, on your wrist — instant, offline, and friction-free at the checkout.

**myLoyaltyCards** is an offline-first mobile app for storing and instantly displaying retail loyalty cards. It pairs a React Native (Expo) phone app with a native **Apple Watch** companion so you can raise your wrist, tap once, and show your barcode — **no phone, no network, no waiting** at the moment that matters most.

It is a community-driven, open-source passion project with **no monetization and no advertising**, built end-to-end with the [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) **Spec-Driven Development (SDD)** methodology.

---

## Table of Contents

- [Why myLoyaltyCards?](#why-myloyaltycards)
- [Key Features](#key-features)
- [Platforms & Status](#platforms--status)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Apple Watch Sync](#apple-watch-sync)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Common Scripts](#common-scripts)
- [Testing & Quality Gates](#testing--quality-gates)
- [Spec-Driven Development (BMAD)](#spec-driven-development-bmad)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Why myLoyaltyCards?

Existing loyalty-card apps fail at the **payment moment** for two reasons:

1. **Network dependency** — they show a loading spinner, or refuse to open at all, exactly when you are standing at the register with items in hand and people waiting behind you.
2. **No real wearable** — most "watch apps" are thin remotes that need the phone awake nearby, so you still end up fumbling for your phone.

myLoyaltyCards is built around a single goal: **display the right card in ≤3 seconds, every time, even fully offline.** Cards are cached locally on both the phone and the watch, sorted intelligently, and rendered as crisp barcodes optimized for small screens.

The app targets the **European Union** market, beginning with an Italian brand catalogue, and is designed to grow through community catalogue contributions.

---

## Key Features

- 📴 **Offline-first** — every card is stored locally (SQLite on the phone, SwiftData on the watch). The app is fully functional in airplane mode, basements, and rural areas. No loading screens.
- ⌚ **Apple Watch companion** — a native watchOS app that displays your cards and barcodes directly on your wrist, kept in sync from the phone.
- ➕ **Card management** — add cards by scanning a barcode with the camera, scanning from a photo, or entering details manually. Edit, delete, and mark favorites.
- 🔢 **Multi-format barcodes** — render CODE128, EAN13, EAN8, QR, CODE39, and UPC-A, with a high-contrast / brightness-boost display mode for reliable scanning.
- 🧠 **Smart sorting** — most-recently-used and frequently-used cards float to the top; pinned favorites stay one tap away.
- 🏷️ **Brand catalogue** — a curated catalogue (starting with Italy) provides brand logos and metadata, delivered as JSON and cacheable offline. The same catalogue is generated for the watch.
- 🔐 **Optional accounts & cloud sync** — use the app fully as a guest, or sign in (Supabase Auth, OTP email verification) to back up and sync cards across devices.
- 🛡️ **Privacy & GDPR** — built for EU compliance: data export, account/data deletion, and explicit consent.
- 🌍 **Internationalization** — English and Italian, with light & dark mode that follows the system preference.

---

## Platforms & Status

| Platform        | Status               | Notes                                                                  |
| --------------- | -------------------- | ---------------------------------------------------------------------- |
| iOS (phone)     | ✅ Active            | Primary platform                                                       |
| Apple Watch     | ✅ Active            | Native watchOS app embedded in the iOS app via `@bacons/apple-targets` |
| Android (phone) | ✅ Active            | Shared React Native codebase                                           |
| Wear OS         | 🗺️ Planned (Epic 10) | Native Kotlin / Jetpack Compose companion                              |

> **Note:** Apple does not allow standalone watchOS binary uploads. The watch app ships **inside the iOS app archive** (Continuous Native Generation), not as a separate build.

---

## Tech Stack

### Phone app (React Native)

| Technology                      | Version    | Purpose                        |
| ------------------------------- | ---------- | ------------------------------ |
| Expo SDK                        | 55         | Development framework          |
| React                           | 19.2       | UI library (React Compiler on) |
| React Native                    | 0.83       | Mobile framework               |
| TypeScript                      | 5.9 strict | Language                       |
| Expo Router                     | 55         | File-based navigation          |
| NativeWind (Tailwind)           | 4          | Styling                        |
| React Hook Form + Zod           | 7 / 4      | Forms & schema validation      |
| expo-sqlite                     | 55         | Local database (repository)    |
| expo-secure-store               | 55         | Secure token storage           |
| i18next / react-i18next         | —          | Internationalization (EN / IT) |
| @shopify/flash-list             | 2          | High-performance lists         |
| react-native-reanimated         | 4          | Native-thread animations       |
| react-native-watch-connectivity | 1          | Phone ↔ Watch messaging        |

### Watch app (native)

| Platform | Language           | UI              | Storage   |
| -------- | ------------------ | --------------- | --------- |
| watchOS  | Swift              | SwiftUI         | SwiftData |
| Wear OS  | Kotlin _(planned)_ | Jetpack Compose | Room      |

### Backend & tooling

| Technology                | Purpose                                |
| ------------------------- | -------------------------------------- |
| Supabase                  | PostgreSQL + Auth + Row Level Security |
| GitHub Actions            | CI quality gates & release pipelines   |
| Fastlane                  | iOS/Android build & signing automation |
| Jest + RNTL               | Unit / component testing               |
| ESLint + Prettier + Husky | Linting, formatting, git hooks         |

> The system was designed in [`docs/architecture.md`](docs/architecture.md); for the canonical, enforced implementation rules see [`docs/project-context.md`](docs/project-context.md).

---

## Architecture Overview

The codebase uses a **feature-first, layered architecture** with boundaries enforced automatically by ESLint (`eslint-plugin-boundaries`):

```
app/         → Thin route files (re-export from features only — no logic)
features/    → Self-contained feature modules (UI + local hooks)
shared/      → Cross-feature UI components & React hooks
core/        → Business logic: database, sync, auth, catalogue (no React, except where noted)
catalogue/   → Brand data (JSON source of truth) + parsing
```

**Allowed import direction:** `app → features → shared → core` (+ `catalogue`).
Cross-feature imports (`features/X → features/Y`) and upward imports (`core → features`) are **forbidden** and fail CI.

Other foundational rules (full list in [`docs/project-context.md`](docs/project-context.md)):

- **Zod schemas are the source of truth** for all data types (`type X = z.infer<typeof xSchema>`).
- **UUIDs are generated client-side** on every platform; the server never assigns IDs.
- **Dates are always UTC ISO-8601** strings (`2025-12-24T10:30:00.123Z`).
- **Database writes use transactions** (`withTransactionAsync`).
- **JSON payloads include every field** (`"brandId": null`, never omitted) for cross-platform parsing.

---

## Apple Watch Sync

The Apple Watch app is intentionally **read-only**: all changes (add / edit / delete) happen on the iPhone. Synchronization flows one way over **WatchConnectivity** (`WCSession`):

```
Phone (iOS / React Native)              Watch (watchOS / SwiftUI)
        │   add / edit / delete card           │
        │──────────────────────────────────────▶  sync message { version, type, payload }
        │                                       │   WatchSessionManager writes to SwiftData
        │◀──────────────────────────────────────  (delivery handled by WCSession)
        │   retry with backoff on failure       │   UI reads via @Query (read-only)
```

- **Versioned messages** — every sync message carries a `version` and a `type` (`CARDS_UPDATED`, `CARD_ADDED`, `CARD_DELETED`, `REQUEST_FULL_SYNC`); unknown versions trigger a full-sync request.
- **Conflict handling** — last-write-wins is resolved on the phone before sending; the watch always accepts the latest payload.
- **Resilience** — if the watch is unreachable, the phone retries with exponential backoff.
- **Read-only enforcement** — the watch UI and model expose no mutation actions.

Implementation entry points: [`core/watch-connectivity.ts`](core/watch-connectivity.ts), the native target under [`targets/watch/`](targets/watch/) (e.g. `WatchSessionManager.swift`, `CardListView.swift`), and the watch tests in [`watch-ios/Tests`](watch-ios/Tests).

---

## Project Structure

```
myLoyaltyCards/
├── app/                  # Expo Router routes (thin re-exports)
├── features/             # Feature modules (cards, add-card, auth, settings, onboarding, help, privacy)
├── shared/               # Shared UI, hooks, i18n, theme, supabase client, types
├── core/                 # Business logic: database, sync, auth, catalogue, settings, privacy, schemas
├── catalogue/            # Brand catalogue JSON (e.g. italy.json) + types
├── targets/watch/        # Native watchOS app (SwiftUI + SwiftData), generated via @bacons/apple-targets
├── watch-ios/            # watchOS test/build scripts, unit & UI tests, catalogue generator
├── supabase/             # Supabase migrations & Edge Functions
├── fastlane/             # Build & signing automation
├── scripts/              # Helper scripts (catalogue generation, watch build, vendor fixups)
├── docs/                 # SDD artifacts: PRD, architecture, epics, UX, CI/CD, sprint artifacts
├── _bmad/                # BMAD-METHOD installation (agents, workflows, config) — v6.0.4
├── .github/workflows/    # CI & release pipelines
└── AGENTS.md             # Operating rules for AI agents working in this repo
```

---

## Getting Started

### Prerequisites

- **Node.js 24** (see [`.nvmrc`](.nvmrc)) and **Yarn**
- **Xcode** (for iOS / Apple Watch) and/or **Android Studio** (for Android)
- **Ruby 4.0.5** (see [`.ruby-version`](.ruby-version)) + Bundler, for CocoaPods & Fastlane
- A device or simulator. The watch app requires a **development build** (it cannot run in Expo Go).

> **CocoaPods note:** on Homebrew Ruby, `pod install` can crash with an `Encoding::CompatibilityError`. Prefix the command with `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`.

### Install

```bash
git clone https://github.com/ifero/myLoyaltyCards.git
cd myLoyaltyCards
yarn install
cp .env.example .env   # then fill in Supabase / environment values
```

### Run the phone app

```bash
yarn ios        # build & run on iOS simulator/device
yarn android    # build & run on Android emulator/device
yarn start      # start the Metro dev server
```

### Run the Apple Watch app

```bash
yarn ios:watch        # build the phone app, then build & launch the watch app
# or, against a booted Apple Watch simulator:
yarn watch:run
```

### Local Supabase (optional, for auth/sync work)

```bash
yarn supabase:start     # start the local stack
yarn supabase:status    # show local credentials & URLs
yarn supabase:reset     # reset the local database to migrations
```

---

## Common Scripts

| Script                           | What it does                                           |
| -------------------------------- | ------------------------------------------------------ |
| `yarn start` / `ios` / `android` | Start Metro / build & run native apps                  |
| `yarn lint`                      | ESLint (incl. layer-boundary rules)                    |
| `yarn typecheck`                 | TypeScript `--noEmit`                                  |
| `yarn test`                      | Jest unit/component tests                              |
| `yarn test:coverage`             | Jest with coverage report                              |
| `yarn test:all`                  | JS tests **+** watchOS tests                           |
| `yarn watch:build` / `watch:run` | Build / run the native watchOS app                     |
| `yarn watch:catalogue:generate`  | Regenerate the watch brand catalogue from `catalogue/` |
| `yarn format`                    | Prettier write                                         |

See [`package.json`](package.json) for the full list (Fastlane match, Supabase functions, etc.).

---

## Testing & Quality Gates

Quality is enforced both locally (git hooks) and in CI:

- **Pre-commit** (Husky + lint-staged): ESLint `--fix` and Prettier on staged files.
- **Pre-push** (Husky): full `typecheck`, `lint`, and `test` must pass.
- **CI — Quality Gates** ([`ci-quality-gates.yml`](.github/workflows/ci-quality-gates.yml)) runs on every PR: `lint` → `typecheck` → `test:coverage`. PRs are blocked on failure.
- **watchOS tests** run in their own workflow ([`watchos-tests.yml`](.github/workflows/watchos-tests.yml)).

> ⚠️ **Never bypass hooks** (`--no-verify` is forbidden). If a gate fails, fix the issue and re-run. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Spec-Driven Development (BMAD)

This project is built **spec-first** using the [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) (Breakthrough Method of Agile AI-Driven Development), installed under [`_bmad/`](_bmad/) (v6.0.4). Specialized AI agents (Analyst, PM, UX Designer, Architect, Scrum Master, Dev, QA/Test Architect, Tech Writer) drive the lifecycle through four phases:

```
Phase 0  Discovery     →  brainstorming, research, product brief        (optional)
Phase 1  Planning      →  PRD  +  UX design                              docs/prd.md, docs/ux-design-specification.md
Phase 2  Solutioning   →  Architecture  +  Epics & Stories  +  Test      docs/architecture.md, docs/epics.md
                          Design  +  Implementation Readiness gate
Phase 3  Implementation→  Sprint planning → per-story specs → dev →      docs/sprint-artifacts/
                          code review → PR → retrospective
```

**The core rule: code follows a spec.** Every implementation traces back to a **story** in `docs/sprint-artifacts/stories/`, which itself traces back to the epics, PRD, and architecture. Stories move through `backlog → drafted → ready-for-dev → in-progress → review → done`, tracked in [`docs/sprint-artifacts/sprint-status.yaml`](docs/sprint-artifacts/sprint-status.yaml).

➡️ **If you want to contribute, read [CONTRIBUTING.md](CONTRIBUTING.md) first** — it explains how to work within this methodology in detail.

---

## Documentation

| Document                                                             | Purpose                                  |
| -------------------------------------------------------------------- | ---------------------------------------- |
| [`docs/prd.md`](docs/prd.md)                                         | Product Requirements (FRs / NFRs)        |
| [`docs/architecture.md`](docs/architecture.md)                       | System architecture & decisions          |
| [`docs/epics.md`](docs/epics.md)                                     | Epics & story breakdown                  |
| [`docs/ux-design-specification.md`](docs/ux-design-specification.md) | UX design specification                  |
| [`docs/project-context.md`](docs/project-context.md)                 | Enforced implementation rules for agents |
| [`docs/test-design-system.md`](docs/test-design-system.md)           | Test strategy & design                   |
| [`docs/cicd.md`](docs/cicd.md)                                       | CI/CD pipeline & release runbooks        |
| [`docs/sprint-artifacts/`](docs/sprint-artifacts/)                   | Sprint status, stories, retrospectives   |
| [`AGENTS.md`](AGENTS.md)                                             | Operating rules for AI agents            |

---

## Contributing

Contributions — code, brand-catalogue additions, bug reports, and ideas — are welcome. This project enforces the **BMAD Spec-Driven Development** methodology, so please read **[CONTRIBUTING.md](CONTRIBUTING.md)** before opening a pull request. It covers the spec-first workflow, branch & commit conventions, quality gates, code review, and how to contribute brand catalogue entries.

---

## License

Released under the **MIT License** — see [`LICENSE`](LICENSE) for the full text. © 2025–2026 Andrea Pacino.
