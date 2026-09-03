---
baseline_commit: 652f3c61442ab02841180e7bc837556721576165
---

# Story 16.32: Button's `destructive` variant is a solid red fill with no press feedback, and it is reached by fall-through

Status: ready-for-dev

Epic: 16 — Platform & Tech Debt

> **✅ THREE DEFECTS IN ELEVEN LINES, ALL CONFIRMED BY READING
> `shared/components/ui/Button.tsx` AT THE BASELINE ABOVE.** Found 2026-08-21 while specifying
> the Cardì capture and card-detail patterns. The word `destructive` appears **exactly once** in
> the whole file — on line 8, in the type union — and is handled nowhere by name.

## The code

```ts
type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';   // line 8

const getVariantColors = (variant, theme) => {
  if (variant === 'primary')   { … }
  if (variant === 'secondary') { … }
  if (variant === 'tertiary')  { … }

  return {                        // ← destructive lands HERE, unnamed
    backgroundColor: theme.error,
    pressedColor: theme.error,
    borderColor: theme.error,
    textColor: NEUTRAL_COLORS.white
  };
};
```

### Defect 1 — it contradicts the design system

`docs/design/cardi/cardi-design-system.md` specifies, under Components → Buttons:

> **Destructive:** borderless, `#C41E1E` text.

The component renders the opposite: a **solid `theme.error` fill with white text and a 1px
border** (`borderWidth: variant === 'tertiary' ? 0 : 1`). Text-only destructive is not
expressible through this component at all, which is why every Cardì spec that needs one —
card detail's "Delete card", settings' sign-out and delete-account rows — had to specify raw
type instead of a `Button`, and say so explicitly to stop a generator reaching for a red pill.

### Defect 2 — no press feedback

`pressedColor: theme.error` is **identical to** `backgroundColor: theme.error`. Every other
variant changes on press (`theme.primaryDark`, or `theme.primary + '14'`). The most dangerous
button in the app is the only one that does not acknowledge the touch.

### Defect 3 — the branch is implicit, so the next variant inherits red

There is no `variant === 'destructive'` check. The red block is a bare `return` at the end of a
chain of `if`s, so **any variant added to the union in future silently renders as destructive
red** until someone notices. The union is exhaustive today, which is exactly why the compiler
will not warn tomorrow.

## What is NOT claimed

- No screen currently renders a `Button variant="destructive"` that this story has verified by
  eye. The defects are in the component's contract, not in an observed screen. Grep before
  assuming a visual regression exists to fix.
- `theme.error` is a separate question. Whether it equals `#C41E1E` is part of the palette
  reconciliation, not this story.

## Acceptance criteria

- **AC1** — `destructive` is handled by an explicit `if (variant === 'destructive')` branch.
- **AC2** — The trailing bare `return` is gone. Either the function is exhaustive over the union
  with a `never`-typed default that fails the build on an unhandled variant, or every variant has
  its own named branch.
- **AC3** — `destructive` renders per the design system: **no fill, no border, `#C41E1E`
  label** — and `borderWidth` logic is updated so `destructive` joins `tertiary` at 0.
- **AC4** — `destructive` has a distinct `pressedColor` from its resting state, consistent with
  how the other three variants signal a press.
- **AC5** — A test per variant asserts fill, border width, label colour and pressed colour, plus
  a type-level test (or a `// @ts-expect-error` fixture) proving an unhandled variant fails to
  compile.
- **AC6** — `grep -rn 'variant="destructive"'` across the app is reported in the PR. If any call
  site is currently relying on the red pill, the change is visible there and needs a screenshot;
  if there are none, say so, and this becomes a pure contract fix.

## Notes for the implementer

The Cardì specs that route around this component are
`docs/design/cardi/stitch-prompts-card-detail.txt` (the MANAGE card: "'Delete card' is TEXT: no
red fill, no red or pink background, no border, no outline, no trash icon") and
`stitch-prompts-settings.txt`. Once AC3 lands, those screens can use the component rather than
raw type, which is the actual point of fixing it.
