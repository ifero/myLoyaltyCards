# `docs/design/` — versionable design sources

This folder is the home for **design artifacts that live in git** and change via PR, in
keeping with the project's [design-in-code](CONTRIBUTING-DESIGN.md) approach (the repo is
canonical; Figma/Penpot are ideation-only).

> **New here?** Read [`CONTRIBUTING-DESIGN.md`](CONTRIBUTING-DESIGN.md) first — it explains
> the three design layers and how to propose a change to each.

## What lives here

| Path                                               | Contents                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`CONTRIBUTING-DESIGN.md`](CONTRIBUTING-DESIGN.md) | How to contribute design changes by PR (the guide).                                   |
| [`wireframes/`](wireframes/)                       | Wireframes as **Excalidraw** — `.excalidraw` JSON source **plus** an exported `.svg`. |
| [`flows/`](flows/)                                 | User/screen flows as **Mermaid-in-markdown** (`.md` with `mermaid` blocks).           |

## Formats & why

- **Excalidraw** (`wireframes/`): the `.excalidraw` JSON is the editable source (open at
  [excalidraw.com](https://excalidraw.com) or the VS Code extension); commit an exported
  `.svg` alongside it so the wireframe renders directly in GitHub and PR diffs without a
  viewer. Keep the two in sync in the same commit.
- **Mermaid** (`flows/`): flows are authored as fenced `mermaid` blocks inside
  markdown so they render natively on GitHub and diff as text — ideal for review.

## Not here

- **Existing UX specs** stay where they are: [`docs/ux-designs/`](../ux-designs/) and
  [`docs/ux-design-specification.md`](../ux-design-specification.md) are unchanged by the
  move to this folder.
- **Tokens** live in [`shared/theme/`](../../shared/theme/) (Layer 1), not here.
- **Components** live in [`shared/components/`](../../shared/components/) and
  [`features/**/components/`](../../features/) (Layer 2), not here.
