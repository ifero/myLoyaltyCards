# Story 15.1: GitHub Pages Landing Page (EN + IT)

**Epic:** 15 - Internationalisation & Public Presence
**Type:** User-Facing (Portfolio / Discovery)
**Status:** ready-for-dev

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

- [ ] `docs/index.html` — single HTML file, the entire page
- [ ] `docs/style.css` — all styles, no inline styles
- [ ] `docs/assets/` — folder for images and icons
- [ ] `docs/assets/screenshots/` — placeholder SVG device frames (phone + watch)
- [ ] `docs/assets/badges/` — official App Store and Google Play badge SVGs (sourced from Apple/Google press kits)
- [ ] No JavaScript frameworks, no build tools, no `node_modules`
- [ ] No CDN dependencies — all assets self-hosted in `docs/assets/`

### AC2: Page sections (in order)

- [ ] **Header** — app name, language toggle (EN / IT), no other navigation
- [ ] **Hero** — app name, tagline, hero image (phone + watch device frame placeholders side by side), two CTA buttons: App Store badge + Google Play badge
- [ ] **Features** — 4 cards in a 2×2 grid (mobile: 1 column): Offline-First, Wearable Independent, Italian Catalogue, Privacy-First. Each card: icon (inline SVG or Unicode emoji), short heading, 1-sentence description.
- [ ] **How it works** — numbered 3-step flow: (1) Add your cards — scan or browse the catalogue; (2) Sync to your wrist — cards appear automatically on Apple Watch; (3) Show at checkout — raise wrist, tap, done.
- [ ] **Screenshots** — row of exactly 3 device frame placeholders: `home-card-list` (phone), `barcode-display` (phone), and `watch-card-list` (Apple Watch). Each placeholder is a labelled SVG with dashed border and centred text "Screenshot: {screen name}". `<!-- SCREENSHOT: {name} -->` comment above each for easy replacement.
- [ ] **Footer** — GitHub repo link, "Open Source — MIT License" badge/text, privacy policy link (placeholder `#` until a public destination is available; must not point to a broken absolute path)

### AC3: Language toggle (EN / IT)

- [ ] Toggle button in header: "EN" / "IT" — switches active language
- [ ] All user-visible text on the page has both an English and Italian version
- [ ] Toggle implemented with pure JS: elements with `class="lang-en"` shown when EN active, `class="lang-it"` shown when IT active
- [ ] Default language is detected from `navigator.language` — Italian if `it`, English otherwise
- [ ] Language preference persisted in `localStorage` so returning visitors get their last choice
- [ ] English is the default rendered state in raw HTML/CSS before JavaScript executes; JavaScript may switch to Italian after load
- [ ] The language toggle is keyboard-operable, exposes an accessible name and selected state, preserves a visible focus indicator, and hides inactive-language content from assistive technology as well as visually
- [ ] Ifero reviews and approves all Italian copy before PR is merged (AC gate)

### AC4: Store badge behaviour

- [ ] App Store badge uses official Apple badge SVG (`docs/assets/badges/app-store.svg`)
- [ ] Google Play badge uses official Google badge SVG (`docs/assets/badges/google-play.svg`)
- [ ] Both badges link to `href="javascript:void(0)"` (or `href="#"`) with an `onclick` that calls `alert()`
- [ ] English alert: `"Coming soon on the App Store / Google Play. Stay tuned!"`
- [ ] Italian alert: `"Prossimamente sull'App Store / Google Play. Resta aggiornato!"`
- [ ] Alert text matches the currently active language

### AC5: Visual design

- [ ] Pure CSS — no framework, no CDN
- [ ] CSS custom properties (variables) for all colours, using the app's brand palette:
  - Primary: `#1A73E8` (light) / dark surface: `#1C1C1E`
  - Accent: follows app design system tokens
- [ ] Responsive: single-column on mobile (≤768px), multi-column on desktop
- [ ] System font stack — no web font dependencies
- [ ] Dark mode via `@media (prefers-color-scheme: dark)` — CSS variables swap automatically
- [ ] No horizontal scroll at any viewport width
- [ ] Minimum touch target 44px for all interactive elements

### AC6: GitHub Pages configuration

- [ ] `docs/` folder exists in `main` branch root
- [ ] GitHub Pages configured in repo settings: Source = `main` branch, folder = `/docs`
- [ ] Ifero or another repo admin applies the Pages settings change and performs final live-URL verification
- [ ] Page loads correctly at `https://ifero.github.io/myLoyaltyCards`
- [ ] `<html lang="en">` default (JS updates to `"it"` when Italian active)
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">` present
- [ ] Open Graph tags for social sharing: `og:title`, `og:description`, `og:url`
- [ ] Final metadata copy is locked in the story: page title, meta description, and OG description use approved public-facing wording

### AC7: Screenshot injection points

- [ ] Each placeholder SVG has a commented annotation: `<!-- SCREENSHOT: home-card-list -->`, `<!-- SCREENSHOT: barcode-display -->`, `<!-- SCREENSHOT: watch-card-list -->`
- [ ] `docs/assets/screenshots/README.md` — brief note explaining: "Replace placeholder SVGs with real screenshots at 390×844px (iPhone) / 198×242px (Apple Watch). Update `src` in `index.html`."
- [ ] File names match the comment names: `home-card-list.svg`, `barcode-display.svg`, `watch-card-list.svg`

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

- [ ] `docs/index.html` and `docs/style.css` exist in `main` branch
- [ ] Page loads at `https://ifero.github.io/myLoyaltyCards` (GitHub Pages configured)
- [ ] English and Italian copy present, language toggle works
- [ ] Ifero has reviewed and approved Italian translations
- [ ] Store badges show correct "coming soon" alert in both languages
- [ ] Page is responsive — tested at 375px (iPhone SE) and 1280px (desktop)
- [ ] Dark mode renders correctly
- [ ] Screenshot placeholder comments in place
- [ ] All existing repo tests still pass (no app code changed)
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
