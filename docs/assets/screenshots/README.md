# Screenshot placeholders

Replace placeholder SVGs with real screenshots at 390x844px (iPhone) / 198x220px (Apple Watch). Update the corresponding EN/IT `src` values in `index.html`.

They are drawn in the Cardì palette — ink `#181824` bezel, cream `#F0F0E8` screen, `#55555F`
dashed edge, ink label — since Story 21.5. They were the pre-rebrand blue `#1A73E8` until then:
Story 21.1's `docs/` sweep covered `index.html`, `privacy-policy.html`, `help.json` and
`style.css`, but not this folder.

⚠️ That blue is **still `--color-primary` in `style.css`**, so the page's own chrome has not been
migrated to Ink & Beam and no story owns doing it. These frames are therefore deliberately neutral
— ink on cream, which reads correctly against either palette — rather than matching a page that is
itself out of date.
