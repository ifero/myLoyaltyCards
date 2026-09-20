# Wear OS launcher icon — verification captures

Emulator captures backing **Story 21.4**'s AC5 and AC6, which require the Cardì mark to be checked
against Wear OS's **circular** launcher mask, at the smallest launcher size, on both a round and a
square device.

They are committed rather than described because the whole point of Story 21.4 is that a claim
nobody can re-check is worth nothing — that is how `colors.xml` came to assert a colour match it did
not have. "✅ verified" in a story file is the same kind of claim. These are the pixels.

> Story 21.3 described its watchOS captures instead of committing them, so this is a deliberate
> departure from that precedent rather than an oversight.

| file                                    | device                           | what it shows                           |
| --------------------------------------- | -------------------------------- | --------------------------------------- |
| `wear-os-3-round-384-launcher.png`      | `wearos30_arm64`, 384², API 30   | the launcher chip                       |
| `wear-os-3-round-384-48px-slot.png`     | same                             | the 48×48px "All apps" slot, 8× nearest |
| `wear-os-3-square-360-launcher.png`     | `wear_square_30`, 360², API 30   | the launcher chip                       |
| `wear-os-3-square-360-48px-slot.png`    | same                             | the 48×48px "All apps" slot, 8× nearest |
| `wear-os-5-round-384-grid-launcher.png` | `wearos5_round_34`, 384², API 34 | the Wear OS 5 GRID launcher             |
| `wear-os-5-round-384-96px-slot.png`     | same                             | the 96×96px grid slot, 5× nearest       |

The 48px crops are nearest-neighbour upscales of the real 48×48px launcher slot, not re-renders —
each source pixel becomes an 8×8 block, so what you are looking at is exactly what the launcher
drew. That is the smallest size AC5 asks about.

**The mask is circular on the square device too.** AC6 asks for both shapes "since Wear OS ships
both", which reads as though a square screen gives a square mask. It does not: the mask belongs to
the launcher, not to the screen. What the square device actually verifies is layout and density
selection.

## Wear OS 5, and what it settled

The API 30 devices cannot render a themed (`<monochrome>`) icon at all — that needs API 33+ — so a
Wear OS 5 AVD (`system-images;android-34;android-wear;arm64-v8a`) was added to close the gap. Two
results:

- **The mark renders correctly on the Wear OS 5 grid launcher**, at a larger 96×96px slot. Measured
  from the capture: the foreground reaches 41.5px from centre against the masked circle's 47.9px —
  contained, with 13 % to spare.
- **No themed-icon support was found in the Wear OS 5 launcher**, and the `<monochrome>` layer
  therefore appears to be unread on Wear today. The evidence, and its limits:
  - The APK scanned is the one that draws the grid in the capture above, confirmed rather than
    inferred: with the grid on screen, `dumpsys window` reports
    `mCurrentFocus=…com.google.android.wearable.sysui/…globallauncher.AllAppsLauncherActivity`, every
    node in the `uiautomator` tree reports `package="com.google.android.wearable.sysui"`, and
    `pm path` resolves that package to `/system/priv-app/ClockworkSysUiGoogle/ClockworkSysUiGoogle.apk`.
  - Its dex references `getForeground`, `getBackground`, `loadIcon`, `getApplicationIcon`,
    `setImageDrawable` and `AdaptiveIconDrawable`, and contains **no** reference to `getMonochrome`.
    Framework method names survive R8 minification, so the absence is evidence rather than an
    artefact — and the positive controls show the scan finds what is there.
  - It is not delegating the work either: `getForeground`/`getBackground` appear as exact strings,
    it bundles none of Launcher3's icon stack (`iconloaderlib`, `BaseIconFactory`, `LauncherIcons`
    are all absent), and its six `uses-library` entries are `androidx.window.extensions`,
    `androidx.window.sidecar`, `clockwork-ambient`, `clockwork-system`,
    `com.google.android.wearable` and `wear-sdk` — none an icon loader.
  - Corroborating, and checked the same way as the launcher rather than by eye: the Wear Settings
    app exposes no themed-icon affordance. `ClockworkSettings.apk`'s string table carries none of
    the themed-icon wording that the loop under [Reproducing them](#reproducing-them) searches for,
    and its dex has no `themed_icon`, `getMonochrome` or `THEMED`. It DOES reference
    `theme_customization` 11 times, so Wear has _some_ overlay-based theming plumbing — just
    nothing icon-specific. On the device,
    `settings get secure theme_customization_overlay_packages` returns `{}`.

    The search terms and their counts are deliberately NOT restated here. Three separate times in
    review, a list written out in prose and the loop meant to reproduce it drifted apart — so the
    loop is now the only copy of that list, and this paragraph points at it rather than
    paraphrasing it.

  **What this does not rule out.** A dex scan cannot prove a negative about the whole pipeline: if
  theming were ever applied platform-side, the launcher could receive an already-themed drawable
  through `loadIcon()`/`getApplicationIcon()` without naming `getMonochrome` at all. Android 13's
  themed icons are architected launcher-side, which makes that unlikely, but it is not closed out
  here. The scan is also of ONE build — `versionName 5.0.1.627519173`, the system image's own
  `/system/priv-app` copy with no Play update applied — and says nothing about third-party Wear
  launchers or Wear OS 6/7.

  The `<monochrome>` layer is kept for reasons that do not depend on any of this: it satisfies
  lint's `MonochromeLauncherIcon`, it matches what `app.json` declares for the phone, and it costs
  about 7 KB across four densities.

## Reproducing them

Both AVDs are API 30 (`system-images;android-30;android-wear;arm64-v8a`); the square one uses the
`wearos_square` device profile. From the repository root:

```bash
yarn icons:build && (cd watch-android && ./gradlew assembleDebug)
```

```bash
emulator -avd wearos30_arm64 -no-window -no-snapshot -no-audio -no-boot-anim -gpu swiftshader_indirect
```

Then install, open the launcher with the stem key, and capture:

```bash
adb install -r watch-android/app/build/outputs/apk/debug/app-debug.apk && adb shell input keyevent 264 && adb exec-out screencap -p > launcher.png
```

`adb shell uiautomator dump` gives the icon slot's exact `bounds` to crop against, which is more
reliable than measuring a screenshot by eye.

### Wear OS 5, and re-running the themed-icon scan

The Wear OS 5 device is a separate image and AVD, created once:

```bash
sdkmanager --install "system-images;android-34;android-wear;arm64-v8a"
```

```bash
avdmanager create avd -n wearos5_round_34 -k "system-images;android-34;android-wear;arm64-v8a" -d wearos_small_round
```

Boot, install and open the launcher exactly as above. Confirm that the package you are about to
scan is the one actually drawing the app grid, rather than trusting its name — on Wear the launcher
lives inside the SysUI package, which is not where phone Android puts it:

```bash
adb shell dumpsys window | grep mCurrentFocus
```

That reports `…com.google.android.wearable.sysui/…globallauncher.AllAppsLauncherActivity` while the
grid is on screen. Resolve that package to a file, pull it, and search its dex:

```bash
adb pull "$(adb shell pm path com.google.android.wearable.sysui | tr -d '\r' | sed 's/package://')" .
```

```bash
unzip -o -q ClockworkSysUiGoogle.apk '*.dex' -d dexall && strings -a dexall/*.dex | grep -c getMonochrome
```

Plain `unzip` + `strings` + `grep`, with no `apktool` or `dexdump` — dex string tables are MUTF-8, so
framework method names appear as contiguous ASCII and need no disassembly. **Always run the positive
controls in the same breath**, or a zero proves only that the search was broken:

```bash
for t in getForeground getBackground loadIcon getApplicationIcon setImageDrawable AdaptiveIconDrawable iconloaderlib BaseIconFactory LauncherIcons; do echo "$t: $(strings -a dexall/*.dex | grep -c "$t")"; done
```

The shared libraries it links, none of which is an icon loader:

```bash
aapt2 dump xmltree --file AndroidManifest.xml ClockworkSysUiGoogle.apk | grep -A3 "E: uses-library"
```

The corroborating Settings check, which is the same scan pointed at a different APK — and needs its
own controls for the same reason:

```bash
adb pull /system/priv-app/ClockworkSettings/ClockworkSettings.apk .
```

```bash
for t in Display Brightness Vibrat Battery Bluetooth "themed icon" Themed "icon pack" "Icon style" "App icons" "Wallpaper colors"; do echo "$t: $(aapt2 dump strings ClockworkSettings.apk | grep -ci "$t")"; done
```

The five controls must be non-zero (measured: 13, 10, 23, 29, 28) and the six themed-icon terms all
zero. ⚠️ Write the terms inline as above rather than collecting them into a variable: in `zsh`,
`for t in $SOME_VAR` does not word-split, so the loop runs once with the whole string as a single
term and reports a very convincing `0`. Then its dex, where a toggle would name the
framework key it flips:

```bash
unzip -o -q ClockworkSettings.apk '*.dex' -d dex && for t in Brightness theme_customization themed_icon getMonochrome THEMED; do echo "$t: $(strings -a dex/*.dex | grep -c "$t")"; done
```

`theme_customization` comes back non-zero (Wear has overlay-based theming); `themed_icon`,
`getMonochrome` and `THEMED` come back zero. And on the device itself:

```bash
adb shell settings get secure theme_customization_overlay_packages
```

Record which build you scanned — `adb shell dumpsys package com.google.android.wearable.sysui | grep -E "versionName|codePath"` — because the claim is about one build, not about Wear OS in general.
