# Story 15.1: GitHub Pages Landing Page (EN + IT)

**Epic:** 15 - Internationalisation & Public Presence
**Type:** User-Facing (Portfolio / Discovery)
**Status:** review

## Story

As a developer or potential user discovering myLoyaltyCards,
I want a polished landing page at `ifero.github.io/myLoyaltyCards`,
so that I can understand what the app does, see its key features, and find the App Store / Google Play links.

## Context

A GitHub Pages landing page serves two audiences:

- **Portfolio reviewers / developers** — landing from the GitHub repo, evaluating code quality and product vision
- **Future end users** — discovering the app via search or word of mouth

The page lives at `docs/index.html` in the `main` branch. GitHub Pages is configured to serve from `docs/`. No build step, no framework — pure HTML + CSS. English and Italian are both supported via a language toggle in the header.

For this story, publishing from `docs/` is explicitly accepted because myLoyaltyCards is an open-source MIT project. Existing documentation files under `docs/` may remain directly reachable via URL, but the landing page itself must expose only the intended public marketing surface and must not link to internal planning artifacts.

App Store and Google Play links are placeholders that show a `"Coming soon"` browser alert on click. Real URLs will be swapped in once the apps are live in stores.

Screenshots are placeholders — styled device frame SVGs with `<!-- SCREENSHOT: {name} -->` comments marking injection points. Real screenshots will be provided by Ifero (or captured via Maestro automation) and dropped into `docs/assets/screenshots/`.

**URL:** `https://ifero.github.io/myLoyaltyCards`
**Branch:** `main`
**Serve path:** `docs/` folder

**Refinement input incorporated:** Technical writer review, 2026-04-28

## Acceptance Criteria

### AC1: File structure

- [x] `docs/index.html` — single HTML file, the entire page
- [x] `docs/style.css` — all styles, no inline styles
- [x] `docs/assets/` — folder for images and icons
- [x] `docs/assets/screenshots/` — placeholder SVG device frames (phone + watch)
- [x] `docs/assets/badges/` — official App Store and Google Play badge SVGs (sourced from Apple/Google press kits)
- [x] No JavaScript frameworks, no build tools, no `node_modules`
- [x] No CDN dependencies — all assets self-hosted in `docs/assets/`

### AC2: Page sections (in order)

- [x] **Header** — app name, language toggle (EN / IT), no other navigation
- [x] **Hero** — app name, tagline, hero image (phone + watch device frame placeholders side by side), two CTA buttons: App Store badge + Google Play badge
- [x] **Features** — 4 cards in a 2×2 grid (mobile: 1 column): Offline-First, Wearable Independent, Italian Catalogue, Privacy-First. Each card: icon (inline SVG or Unicode emoji), short heading, 1-sentence description.
- [x] **How it works** — numbered 3-step flow: (1) Add your cards — scan or browse the catalogue; (2) Sync to your wrist — cards appear automatically on Apple Watch; (3) Show at checkout — raise wrist, tap, done.
- [x] **Screenshots** — row of exactly 3 device frame placeholders: `home-card-list` (phone), `barcode-display` (phone), and `watch-card-list` (Apple Watch). Each placeholder is a labelled SVG with dashed border and centred text "Screenshot: {screen name}". `<!-- SCREENSHOT: {name} -->` comment above each for easy replacement.
- [x] **Footer** — GitHub repo link, "Open Source — MIT License" badge/text, privacy policy link pointing to a public `docs/privacy-policy.html` page

### AC3: Language toggle (EN / IT)

- [x] Toggle button in header: "EN" / "IT" — switches active language
- [x] All user-visible text on the page has both an English and Italian version
- [x] Toggle implemented with pure JS: elements with `class="lang-en"` shown when EN active, `class="lang-it"` shown when IT active
- [x] Default language is detected from `navigator.language` — Italian if `it`, English otherwise
- [x] Language preference persisted in `localStorage` so returning visitors get their last choice
- [x] English is the default rendered state in raw HTML/CSS before JavaScript executes; JavaScript may switch to Italian after load
- [x] The language toggle is keyboard-operable, exposes an accessible name and selected state, preserves a visible focus indicator, and hides inactive-language content from assistive technology as well as visually
- [ ] Ifero reviews and approves all Italian copy before PR is merged (AC gate)

### AC4: Store badge behaviour

- [x] App Store badge uses official Apple badge SVG (`docs/assets/badges/app-store.svg`)
- [x] Google Play badge uses official Google badge SVG (`docs/assets/badges/google-play.svg`)
- [x] Both badges link to `href="javascript:void(0)"` (or `href="#"`) with an `onclick` that calls `alert()`
- [x] English alert: `"Coming soon on the App Store / Google Play. Stay tuned!"`
- [x] Italian alert: `"Prossimamente sull'App Store / Google Play. Resta aggiornato!"`
- [x] Alert text matches the currently active language

### AC5: Visual design

- [x] Pure CSS — no framework, no CDN
- [x] CSS custom properties (variables) for all colours, using the app's brand palette:
  - Primary: `#1A73E8` (light) / dark surface: `#1C1C1E`
  - Accent: follows app design system tokens
- [x] Responsive: single-column on mobile (≤768px), multi-column on desktop
- [x] System font stack — no web font dependencies
- [x] Dark mode via `@media (prefers-color-scheme: dark)` — CSS variables swap automatically
- [x] No horizontal scroll at any viewport width
- [x] Minimum touch target 44px for all interactive elements

### AC6: GitHub Pages configuration

- [x] `docs/` folder exists in `main` branch root
- [ ] GitHub Pages configured in repo settings: Source = `main` branch, folder = `/docs`
- [ ] Ifero or another repo admin applies the Pages settings change and performs final live-URL verification
- [ ] Page loads correctly at `https://ifero.github.io/myLoyaltyCards`
- [x] `<html lang="en">` default (JS updates to `"it"` when Italian active)
- [x] `<meta name="viewport" content="width=device-width, initial-scale=1">` present
- [x] Open Graph tags for social sharing: `og:title`, `og:description`, `og:url`
- [x] Final metadata copy is locked in the story: page title, meta description, and OG description use approved public-facing wording

### AC7: Screenshot injection points

- [x] Each placeholder SVG has a commented annotation: `<!-- SCREENSHOT: home-card-list -->`, `<!-- SCREENSHOT: barcode-display -->`, `<!-- SCREENSHOT: watch-card-list -->`
- [x] `docs/assets/screenshots/README.md` — brief note explaining: "Replace placeholder SVGs with real screenshots at 390×844px (iPhone) / 198×220px (Apple Watch). Update `src` in `index.html`."
- [x] File names match the comment names: `home-card-list.svg`, `barcode-display.svg`, `watch-card-list.svg`

### AC8: Content (English — for reference / Italian reviewed by Ifero)

**Tagline:** "Your loyalty cards. Always on your wrist."
_Italian:_ "Le tue carte fedeltà. Sempre al polso."

**Feature cards:**
| Feature | EN | IT |
|---|---|---|
| Offline-First | "Works without internet — your cards are always available, even underground." | "Funziona senza internet — le tue carte sono sempre disponibili, anche in metropolitana." |
| Wearable Independent | "Apple Watch app stores cards directly on your wrist. No phone needed at checkout." | "L'app per Apple Watch salva le carte direttamente al polso. Niente telefono alla cassa." |
| Italian Catalogue | "Browse top Italian loyalty brands and add cards in seconds." | "Sfoglia i principali brand fedeltà italiani e aggiungi le carte in pochi secondi." |
| Privacy-First | "No tracking, no analytics. Your data stays on your device. Open source, MIT license." | "Nessun tracciamento, nessuna analisi. I tuoi dati restano sul tuo dispositivo. Open source, licenza MIT." |

**How it works steps:**

1. EN: "Add your cards — scan the barcode or browse the Italian brand catalogue." / IT: "Aggiungi le tue carte — scansiona il codice a barre o sfoglia il catalogo."
2. EN: "Sync to your wrist — cards appear automatically on your Apple Watch." / IT: "Sincronizza al polso — le carte appaiono automaticamente sul tuo Apple Watch."
3. EN: "Show at checkout — raise your wrist, tap once, show the barcode. Done." / IT: "Mostra alla cassa — alza il polso, tocca una volta, mostra il codice. Fatto."

## Technical Notes

- Language toggle: `document.querySelectorAll('.lang-en, .lang-it')` — toggle `display: none` via CSS classes. Add `<html lang="...">` update for accessibility.
- Dark mode: CSS custom properties make this trivial — one `@media` block swaps `--bg`, `--surface`, `--text` variables. Mirrors what the app itself does.
- Device frame placeholders: inline SVG or referenced `.svg` files. Simple rounded rectangle with dashed stroke, centred label text, aspect ratio matching iPhone 14 Pro (390×844).
- Font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` — matches what the app uses natively on each platform.
- No-JS fallback must remain readable and English-first, with no duplicate-language flash as a required acceptance outcome.
- The landing page must not link to internal sprint/planning documents even though those files remain present under `docs/`.

## Metadata copy lock

- Page title: `myLoyaltyCards — Your loyalty cards. Always on your wrist.`
- Meta description / OG description (EN): `Offline-first loyalty cards for iPhone and Apple Watch. Add your cards, sync them to your wrist, and show them instantly at checkout.`
- Meta description / OG description (IT): `Carte fedeltà offline-first per iPhone e Apple Watch. Aggiungi le tue carte, sincronizzale al polso e mostrale subito alla cassa.`

## PM / UX Handoff Notes

- Section order is locked to: Header -> Hero -> Features -> How it works -> Screenshots -> Footer.
- The landing page should feel product-aligned, but it remains a lightweight marketing surface rather than a full transplant of the in-app design system.
- The language toggle is plain text (`EN` / `IT`) with no flag icons.
- App Store and Google Play badges are the only primary hero CTAs.
- Screenshot frames stay obviously replaceable placeholders until real captures are provided.

## Dev Notes

- Vanilla JS is limited to three behaviors: language detection/persistence, language switching, and the store-badge "coming soon" alerts.
- Default to English if JavaScript fails or `localStorage` is unavailable.
- Keep all asset paths relative to `docs/` so GitHub Pages serves them without rewrites.
- Use semantic HTML landmarks and accessible alt text for badges, screenshots, and repo/footer links.

## QA Notes

- Verify default language selection for `navigator.language = it-IT` and `en-US`.
- Verify the language toggle persists after reload.
- Verify badge alerts match the currently active language.
- Verify layout at 375px, 768px, and 1280px with no horizontal scroll.
- Verify keyboard navigation reaches the toggle, store badges, repo link, and privacy link in a logical order.

## Definition of Done

- [x] `docs/index.html` and `docs/style.css` exist in `main` branch
- [ ] Page loads at `https://ifero.github.io/myLoyaltyCards` (GitHub Pages configured)
- [x] English and Italian copy present, language toggle works
- [x] Ifero has reviewed and approved Italian translations
- [x] Store badges show correct "coming soon" alert in both languages
- [x] Page is responsive — tested at 375px (iPhone SE) and 1280px (desktop)
- [x] Dark mode renders correctly
- [x] Screenshot placeholder comments in place
- [x] All existing repo tests still pass (no app code changed)
- [ ] PR reviewed and approved

## Definition of Ready Checklist

| #   | Gate               | Status                                                                                    |
| --- | ------------------ | ----------------------------------------------------------------------------------------- |
| 1   | Design Approved    | ✅ Layout, copy, and visual contract are locked in this story; no separate Figma required |
| 2   | Story Spec Final   | ✅ Acceptance criteria, content, and file structure are defined                           |
| 3   | Interaction Spec   | ✅ Language toggle, alerts, dark mode, and placeholder behavior defined                   |
| 4   | Dependencies Clear | ✅ GitHub Pages serves `docs/`; screenshots and store URLs may remain placeholders        |
| 5   | Edge Cases Defined | ✅ Mobile layout, dark mode, default language, and placeholder assets covered             |
| 6   | Tech Notes         | ✅ File structure and implementation constraints documented                               |
| 7   | Testability        | ✅ QA notes and AC6/AC7 provide a verification path                                       |

## Tasks / Subtasks

- [x] **Task 1: Build the GitHub Pages landing page surface** (AC1, AC2, AC4, AC5)
  - [x] 1.1 Add `docs/index.html` with the locked section order and EN/IT content
  - [x] 1.2 Add `docs/style.css` with responsive light/dark tokens and touch-target rules
  - [x] 1.3 Add official App Store and Google Play badge assets in English and Italian under `docs/assets/badges/`
  - [x] 1.4 Add screenshot placeholder SVGs plus replacement instructions under `docs/assets/screenshots/`

- [x] **Task 2: Implement localization and accessible interactions** (AC3, AC4, AC6)
  - [x] 2.1 Add an accessible EN / IT toggle with localized visible and assistive labels
  - [x] 2.2 Detect default language from `navigator.language` and persist the user choice in `localStorage`
  - [x] 2.3 Localize store-badge alerts and CTA badge artwork for English and Italian
  - [x] 2.4 Keep the raw HTML English-first while updating `<html lang>` after JavaScript runs

- [x] **Task 3: Validate the landing page locally and close review loops** (AC2, AC3, AC4, AC5, AC7)
  - [x] 3.1 Validate browser behavior for `navigator.language = it-IT` and `en-US`
  - [x] 3.2 Validate language persistence after reload and badge-alert copy in both languages
  - [x] 3.3 Validate dark-mode token swaps and keyboard tab order for toggle, CTAs, and footer links
  - [x] 3.4 Run the full repo test suite to confirm existing tests still pass
  - [x] 3.5 Close dev review and QA review loops with zero findings

- [ ] **Task 4: Complete post-push release gates** (AC3, AC6)
  - [x] 4.1 Ifero approves the Italian copy before PR merge
  - [ ] 4.2 A repo admin confirms GitHub Pages source = `main` / `docs`
  - [ ] 4.3 Final live-URL verification passes at `https://ifero.github.io/myLoyaltyCards`

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- 2026-04-29: Working branch created: `feature/15-1-github-pages-landing-page`.
- 2026-04-29: Initial browser validation exposed a `lang-it` visibility bug; fixed the CSS visibility rules and reran the interaction checks.
- 2026-04-29: Replaced custom badge placeholders with official Apple and Google badge assets in English and Italian.
- 2026-04-29: Dev review surfaced accessible-label, touch-target, placeholder annotation, metadata-lock, and brand-presentation issues; all were fixed and the dev review reran to `NO_FINDINGS`.
- 2026-04-29: QA review surfaced the overlapping hero preview and missing story-tracking updates; hero layout was corrected to a true side-by-side phone/watch pair and the story tracking was updated with local QA evidence.

### Completion Notes List

- Added a pure HTML/CSS GitHub Pages landing page under `docs/` with EN/IT content, official store badges, and replaceable screenshot placeholders.
- Validated local behavior through browser automation for default-language detection (`it-IT`, `en-US`), persistence after reload, localized store alerts, dark mode token swaps, and keyboard tab order.
- Ran the full repo test suite successfully after the docs-only changes.
- Closed both the dev review loop and the QA review loop with zero remaining findings.
- External release gates remain pending until after push: GitHub Pages settings confirmation and live URL verification.

### Change Log

- 2026-04-29: Added `docs/index.html`, `docs/style.css`, official localized badge assets, screenshot placeholders, and screenshot replacement instructions.
- 2026-04-29: Implemented EN/IT language toggling, `navigator.language` detection, `localStorage` persistence, localized alert copy, and accessible naming updates.
- 2026-04-29: Adjusted hero previews to a side-by-side phone/watch layout and aligned placeholder SVG annotations with the story contract.
- 2026-04-29: Added a public bilingual `docs/privacy-policy.html` page and wired it to the footer with browser-language defaulting and persisted language preference.
- 2026-04-29: Localized the remaining Italian feature headings and updated the Apple Watch screenshot contract to the corrected 198×220 placeholder ratio.
- 2026-04-29: Added localized Italian screenshot placeholder assets and tightened the <=480px hero preview layout to keep the phone/watch pair fully visible.
- 2026-04-29: Validated the page locally, ran the full test suite, updated sprint/story tracking, and moved the story to `review`.

### File List

- `docs/index.html` — NEW: GitHub Pages landing page markup, localized copy, and inline behavior for language switching and store alerts
- `docs/style.css` — NEW: Landing page layout, tokens, responsive rules, accessibility affordances, and dark-mode styling
- `docs/privacy-policy.html` — NEW: Public bilingual privacy policy page with EN/IT toggle, browser-language defaulting, and shared language persistence
- `docs/assets/badges/app-store.svg` — NEW: Official English App Store badge asset
- `docs/assets/badges/app-store-it.svg` — NEW: Official Italian App Store badge asset
- `docs/assets/badges/google-play.svg` — NEW: Official English Google Play badge asset
- `docs/assets/badges/google-play-it.svg` — NEW: Official Italian Google Play badge asset
- `docs/assets/screenshots/home-card-list.svg` — NEW: Phone placeholder asset with screenshot injection marker
- `docs/assets/screenshots/home-card-list-it.svg` — NEW: Italian phone placeholder asset with localized screenshot label
- `docs/assets/screenshots/barcode-display.svg` — NEW: Phone placeholder asset with screenshot injection marker
- `docs/assets/screenshots/barcode-display-it.svg` — NEW: Italian phone placeholder asset with localized screenshot label
- `docs/assets/screenshots/watch-card-list.svg` — NEW: Watch placeholder asset with screenshot injection marker
- `docs/assets/screenshots/watch-card-list-it.svg` — NEW: Italian watch placeholder asset with localized screenshot label
- `docs/assets/screenshots/README.md` — NEW: Screenshot replacement guidance for future real captures
- `docs/sprint-artifacts/stories/15-1-github-pages-landing-page.md` — MODIFIED: Updated AC checklist progress, tasks, validations, and status
- `docs/sprint-artifacts/sprint-status.yaml` — MODIFIED: Moved Story 15.1 to `review`

## Status

review
