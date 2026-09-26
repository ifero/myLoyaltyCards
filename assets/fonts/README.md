# Brand typefaces

Five static faces, embedded into both native apps at build time by the `expo-font` config plugin
in `app.json` (Story 21.6). They are **unmodified** upstream files — not subset, not converted —
so each remains an Original Version under the SIL Open Font License, and the fonts' own `name`
tables carry the copyright and licence notices wherever the app ships them.

| file                                      | family         | weight | bytes   | used by                             |
| ----------------------------------------- | -------------- | ------ | ------- | ----------------------------------- |
| `inter/Inter-Regular.ttf`                 | Inter          | 400    | 411,640 | body, rows, captions                |
| `inter/Inter-SemiBold.ttf`                | Inter          | 600    | 419,744 | buttons, labels, emphasis           |
| `inter/Inter-Bold.ttf`                    | Inter          | 700    | 420,428 | `headlineSm` (the barcode hero)     |
| `space-grotesk/SpaceGrotesk-Bold.ttf`     | Space Grotesk  | 700    | 116,056 | display, headlines, sheet titles    |
| `jetbrains-mono/JetBrainsMono-Medium.ttf` | JetBrains Mono | 500    | 273,860 | card numbers, the verification code |

**These weights, and no others.** They are exactly the (family, weight) pairs the tokens in
`shared/theme/typography.ts` name, and `test/brand-fonts.test.ts` fails if a token, the `app.json`
registration, `.storybook/brand-fonts.css` or these files disagree — including a file committed
here that nothing registers. Two absences are deliberate:

- **No Inter Medium (500).** No design-system token uses it; the only 500 in any frame is the
  scanner's camera-feed text, which moves up to semibold.
- **No Space Grotesk heavier than Bold.** The design system asks for `display-lg` at 800, but Space
  Grotesk's `wght` axis runs 300–700, so there is no 800 master to ship. Every frame renders 700.

## Cost, measured

**1,641,728 bytes** (1.57 MiB) added to each installed app — iOS stores bundle resources
uncompressed on the device. About **790 KB** compressed, as a proxy for the download delta, since
both an IPA and an AAB are zip archives: `zip -9` deflates the five files to 789,741 bytes. (An
archive's own size adds header bytes that depend on the file paths, and another deflate
implementation lands a little lower — zlib at level 9 gives 784,900 — so treat the figure as
approximate.)

## Provenance

| family         | source (official upstream)                      | pinned ref                                            | licence                            |
| -------------- | ----------------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| Inter          | `github.com/rsms/inter` release `Inter-4.1.zip` | `v4.1` — files from `extras/ttf/`, font version 4.001 | OFL 1.1 — `inter/LICENSE.txt`      |
| Space Grotesk  | `github.com/floriankarsten/space-grotesk`       | commit `03507d0` (the one Google Fonts pins), v2.000  | OFL 1.1 — `space-grotesk/OFL.txt`  |
| JetBrains Mono | `github.com/JetBrains/JetBrainsMono`            | tag `v2.304`, `fonts/ttf/`                            | OFL 1.1 — `jetbrains-mono/OFL.txt` |

SHA-256, to prove a file is the one recorded here:

```text
40d692fce188e4471e2b3cba937be967878f631ad3ebbbdcd587687c7ebe0c82  inter/Inter-Regular.ttf
78a843fade9d4612a5567302fb595b56976eb5fcebf4fea5a5912d638bafcde3  inter/Inter-SemiBold.ttf
288316099b1e0a47a4716d159098005eef7c0066921f34e3200393dbdb01947f  inter/Inter-Bold.ttf
7209bbb75fc0f5c546a5f5773b0db74ffc6abf04c2148c1105cace5765a96bdb  space-grotesk/SpaceGrotesk-Bold.ttf
31c92d01a8a08528b718a43addf0ad3df0af2ca4b7b3290a452f70f358e14d3d  jetbrains-mono/JetBrainsMono-Medium.ttf
```

Bundling within a program is explicitly permitted (OFL FAQ 1.4, 1.20), and the full licence text
need not ship inside the app when a font is bundled with software (FAQ 1.10). Subsetting any of
these files would make it a Modified Version (FAQ 2.6) — keep them whole.

## Adding a face or weight

Add the file and its licence here, register it for **both** platforms in `app.json` (Android's
object form under the family name, iOS's plain list), add a rule to `.storybook/brand-fonts.css`,
and name it from a token in `shared/theme/typography.ts`. The family name must be the one inside
the file's own `name` table (typographic family, ID 16, where present): iOS resolves `fontFamily`
against it, and its PostScript name must end in the weight (`-SemiBold`, `-Bold`, …) because that
is how React Native infers each face's weight on iOS. Read a candidate file's name table before
registering it — a static instance from another distribution can carry a different family name
than the one this app resolves, and `test/brand-fonts.test.ts` rejects it for exactly that.
