# Story 3.1: Create Italian Catalogue Data

**As a** developer,
**I want** a structured catalogue of Italian loyalty brands,
**So that** users can add cards with recognizable logos.

## Acceptance Criteria

- [x] **Data File Created**: `/catalogue/italy.json` exists.
- [x] **Content Requirements**: Contains at least 20 popular Italian retail brands (e.g., Esselunga, Conad, Coop).
- [x] **Data Structure**: Each entry includes:
  - `id` (unique string)
  - `name` (display name)
  - `aliases` (array of alternative names for search)
  - `logoUrl` (path to local asset or remote URL)
  - `color` (brand color hex)
- [x] **Versioning**: File includes a root-level `version` field with ISO date (e.g., "2026-02-01").
- [x] **Assets**: Brand logos are sourced (svg/png) and placed in `assets/images/brands/` (or strictly defined URL strategy).
- [x] **Type Safety**: TypeScript interface/schema created in `catalogue/types.ts` or `core/schemas`.

## Technical Notes

- **Source**: Use `catalogue/italy.json` as the single source of truth.
- **Top Brands**: Esselunga, Conad, Coop, Carrefour, Lidl, Eurospin, Pam, Despar, Unieuro, MediaWorld, IKEA, Decathlon, Bennet, Tigota, Sephora, Douglas, Coin, OVS, H&M, Zara.
- **Logos**: For this story, ensure we have a strategy for logos (downloading them or referencing them). If local, add them to assets.

## Implementation Plan

1. Create `catalogue` directory if missing.
2. Define TypeScript types for the catalogue.
3. Create `catalogue/italy.json` with the Top 20 brands.
4. Ensure validation (maybe a simple test or script to validate JSON against types).

## Tasks/Subtasks

- [x] Define catalogue type/schema
  - [x] Add/confirm TypeScript types in `catalogue/types.ts` or `core/schemas`
- [x] Create `catalogue/italy.json`
  - [x] Add at least 20 brand entries with required fields
  - [x] Add root `version` ISO date
- [x] Define logo strategy and assets
  - [x] Place local assets in `assets/images/brands/` or document remote URL strategy
- [x] Validation
  - [x] Add/update test validating JSON shape (e.g., `catalogue/italy.test.ts`)

## Dev Notes

- Keep catalogue as single source of truth for phone and build-time generation for watch apps.
- Ensure all fields are present for each brand entry; avoid omitted fields.

## Dev Agent Record

### Implementation Plan

- TBD

### Debug Log

- None

### Completion Notes

- None

## File List

- catalogue/italy.json
- catalogue/types.ts
- catalogue/italy.test.ts

## Change Log

- 2026-02-05: Story repaired - added missing sections
- 2026-02-01: Story completed - implemented catalogue data structure with 20 Italian brands

## Status

- Status: done
