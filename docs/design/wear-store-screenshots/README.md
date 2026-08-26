# Wear OS store-listing screenshots — PLACEHOLDERS

⚠️ **These are placeholders. Replace them before the listing goes public.**

Captured 2026-08-26 from the **debug** build on a round Wear OS emulator so that Story 16.35's Play
Console setup (Advanced settings → Form factors → Wear OS) is not blocked waiting on real assets.

## Why they are placeholders, specifically

The card data is the **DEBUG sample seeder**, not real content — the list shows fixtures named
`Aztec (unsupported)` and `Bad Checksum (invalid)`, which exist to exercise error paths and have no
business on a store page. The release build strips the seeder entirely, so a real capture needs a
signed build with cards synced from a paired phone.

| File               | Screen              | Notes                                                           |
| ------------------ | ------------------- | --------------------------------------------------------------- |
| `01-card-list.png` | Card list           | Shows the sort control and two rows; sample data is visible     |
| `02-barcode.png`   | Barcode (Esselunga) | The strongest of the two — real EAN-13 render, no fixture names |

If only one can be used, use `02-barcode.png`: it shows the app's actual purpose and contains no
test-fixture text.

## Play's requirements for Wear OS screenshots

- **1:1 aspect ratio**, 384–3840 px per side. These are exactly **384 × 384** (the round emulator's
  native framebuffer), which is the minimum — acceptable, but a larger capture will look better.
- PNG or JPEG. These are PNG.

## Regenerating

Round emulator, per [`watch-android/README.md`](../../../watch-android/README.md):

```bash
emulator -avd wearos30_arm64 -no-snapshot-load -no-boot-anim -no-audio
```

```bash
cd watch-android && ./gradlew installDebug
```

```bash
adb shell am start -n com.iferoporefi.myloyaltycards/com.iferoporefi.myloyaltycards.wear.MainActivity
```

```bash
adb exec-out screencap -p > docs/design/wear-store-screenshots/01-card-list.png
```

Use `adb shell uiautomator dump /sdcard/ui.xml` + `adb shell cat /sdcard/ui.xml` to find a row's
`bounds` before tapping — the coordinates shift as the list scrolls, so do not hardcode them.

**For the real assets**, capture from a release build on a device with genuine synced cards, and
consider a larger square device profile so the images exceed Play's 384 px floor.
