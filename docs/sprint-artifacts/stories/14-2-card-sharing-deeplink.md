# Story 14.2: Card Sharing via Deeplink

## Story Information

| Field          | Value                                |
| -------------- | ------------------------------------ |
| **Story ID**   | 14-2                                 |
| **Epic**       | 14 - Household Collaboration         |
| **Sprint**     | TBD (Phase A)                        |
| **Status**     | Backlog                              |
| **Priority**   | High                                 |
| **Estimate**   | 5 points                             |
| **Owners**     | PM: Ifero · Dev: — · QA: —           |
| **Depends on** | None (Phase A — no account required) |

---

## Story

As a user,
I want to share a loyalty card with someone via a link,
so that they can add it to their own myLoyaltyCards app without scanning the card manually.

## Context

This is a Phase A story — it works in both local mode and cloud mode, with no account required for either sender or recipient.

**How it works:**

1. Sender opens a card's detail screen and taps "Share card"
2. App encodes card data as a base64 JSON payload and constructs a `myloyaltycards://card/import?data=<base64>` deeplink
3. The native share sheet appears with two options: the deeplink URL (for direct app-to-app share) and a "Copy card code" plain-text fallback
4. Recipient taps the link → app opens → card preview screen shown → user confirms → card is created locally

The `myloyaltycards://` URI scheme is already registered in `app.json`. No HTTPS fallback is implemented for MVP; silent failure is accepted. The "Copy card code" fallback mitigates this.

## Payload Schema

```json
{
  "v": 1,
  "name": "string",
  "barcodeValue": "string",
  "barcodeFormat": "string",
  "brandId": "string | null",
  "color": "string | null"
}
```

- `v` (version) allows future schema evolution without breaking old links
- `brandId` is used to resolve the brand logo from the catalogue on import — no image data is encoded
- Payload must stay under ~800 bytes to survive URL truncation in SMS and messaging apps
- Images are **never** included in the payload

## Acceptance Criteria

- AC1 — Tapping "Share card" on a card detail screen opens the native share sheet with the deeplink URL and a "Copy card code" plain-text option.
- AC2 — The deeplink URL correctly encodes the card payload as base64 JSON following the schema above.
- AC3 — Opening the deeplink while the app is already running navigates to the card import preview screen.
- AC4 — Opening the deeplink from a cold start (app closed) navigates to the card import preview screen after launch.
- AC5 — The import preview screen shows the card name, barcode value, and brand logo (if `brandId` is present) before saving.
- AC6 — Tapping "Add to my cards" on the preview screen creates the card in local storage and navigates to the card detail or card list.
- AC7 — If the recipient already has a card with the same `barcodeValue`, a conflict UI is shown ("You already have this card — add anyway or cancel?"). Duplicate is only created on explicit confirmation.
- AC8 — A malformed, truncated, or tampered base64 payload shows a user-facing error ("This link is invalid or expired") and does not crash.
- AC9 — The feature works in local mode (no account) and cloud mode.
- AC10 — The "Copy card code" fallback copies the raw base64 payload string to the clipboard with a toast confirmation.

## Technical Notes

- Deeplink route: `app/card/import.tsx` (new screen) registered under `myloyaltycards://card/import?data=`
- Expo Router must handle both cold-start and in-app deeplink scenarios — validate with a real device, not just simulator
- Encode with `btoa(JSON.stringify(payload))`, decode with `JSON.parse(atob(data))` — wrap in try/catch for malformed input
- `barcodeFormat` must be validated against the set of known formats used by the app — reject unknown formats
- Android: deeplink handling requires `intentFilters` configuration — verify it is already present in `app.json`

## Tasks

- [ ] Create `app/card/import.tsx` screen with card preview UI and confirm/cancel actions
- [ ] Add "Share card" action to card detail screen (encode payload, invoke share sheet)
- [ ] Implement base64 encode/decode utility with schema validation and error handling
- [ ] Add "Copy card code" fallback to the share sheet action
- [ ] Handle cold-start deeplink routing in `app/_layout.tsx`
- [ ] Add duplicate barcodeValue detection and conflict UI
- [ ] Write unit tests: encode/decode, malformed input, duplicate detection
- [ ] **Prerequisite:** Validate `myloyaltycards://` deeplink routing end-to-end on a real iOS device before refinement _(moved from story 14-1)_
- [ ] Test cold-start deeplink on a real iOS device
