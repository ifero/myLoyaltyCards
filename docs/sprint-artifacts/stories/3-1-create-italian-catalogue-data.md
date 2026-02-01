# Story 3.1: Create Italian Catalogue Data

**As a** developer,
**I want** a structured catalogue of Italian loyalty brands,
**So that** users can add cards with recognizable logos.

## Acceptance Criteria

- [ ] **Data File Created**: `/catalogue/italy.json` exists.
- [ ] **Content Requirements**: Contains at least 20 popular Italian retail brands (e.g., Esselunga, Conad, Coop).
- [ ] **Data Structure**: Each entry includes:
  - `id` (unique string)
  - `name` (display name)
  - `aliases` (array of alternative names for search)
  - `logoUrl` (path to local asset or remote URL)
  - `color` (brand color hex)
- [ ] **Versioning**: File includes a root-level `version` field with ISO date (e.g., "2026-02-01").
- [ ] **Assets**: Brand logos are sourced (svg/png) and placed in `assets/images/brands/` (or strictly defined URL strategy).
- [ ] **Type Safety**: TypeScript interface/schema created in `catalogue/types.ts` or `core/schemas`.

## Technical Notes

- **Source**: Use `catalogue/italy.json` as the single source of truth.
- **Top Brands**: Esselunga, Conad, Coop, Carrefour, Lidl, Eurospin, Pam, Despar, Unieuro, MediaWorld, IKEA, Decathlon, Bennet, Tigota, Sephora, Douglas, Coin, OVS, H&M, Zara.
- **Logos**: For this story, ensure we have a strategy for logos (downloading them or referencing them). If local, add them to assets.

## Implementation Plan

1. Create `catalogue` directory if missing.
2. Define TypeScript types for the catalogue.
3. Create `catalogue/italy.json` with the Top 20 brands.
4. Ensure validation (maybe a simple test or script to validate JSON against types).
