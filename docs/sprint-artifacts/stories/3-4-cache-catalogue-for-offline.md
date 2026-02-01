# Story 3.4: Cache Catalogue for Offline

**As a** user,
**I want** the catalogue to work without internet,
**So that** I can add cards from known brands anywhere.

## Acceptance Criteria

- [ ] **Bundled Data**: The app ships with `italy.json` inside the binary (asset/resource).
- [ ] **First Launch**: Data is immediately available (read from local file), no network request needed.
- [ ] **Image Caching**: Brand logos are cached on first display (handled by `expo-image` default policy, but ensure it's robust).
- [ ] **Zero-Network Test**:
  - Turn off WiFi/Data.
  - Launch App.
  - Go to Add Card.
  - Catalogue loads perfectly.

## Technical Notes

- **Asset Loading**: Use `expo-asset` to bundle the JSON.
- **Repository Pattern**: `CatalogueRepository.getAll()` should be synchronous or fast-async reading from bundled asset.
- **Images**: Since we use `expo-image` with remote URLs (or bundled assets?), ensure:
  - If using remote URLs: configure aggressive caching.
  - If using bundled assets: ensure `require('../assets/brand.png')` mapping exists or is generated. _Decision: For MVP Phase 1 (FR14-20), we likely want remote-first with strict caching, OR bundled assets to guarantee offline. Let's aim for Bundled Assets for reliability._
  - **Refinement**: To support OTA updates (Story 3.5), we need a hybrid approach.
    - _Base State_: Bundled JSON + Remote Image URLs.
    - _Offline State_: JSON works. Images only work if previously cached OR if we bundle low-res versions.
    - _Architecture Decision_: For Story 3.4, assume JSON is bundled. Images rely on `expo-image` disk cache.

## Implementation Plan

1.  Implement `CatalogueRepository`.
    - Function: `getBrands()` -> returns `Brand[]`.
    - Logic: `import data from '@/catalogue/italy.json'` (Bundled).
2.  Add a test case ensuring `getBrands()` returns data without mocking network.
