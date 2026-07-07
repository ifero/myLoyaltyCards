/**
 * Spacing and Layout Constants
 * Story 1.2: Implement Design System Foundation
 *
 * The SPACING (8px base grid), LAYOUT, and TOUCH_TARGET primitives are generated
 * from the DTCG token JSON under `tokens/` via Style Dictionary (Story 16.4) —
 * see `tokens.generated.ts`. Edit `tokens/spacing.json` and run `yarn tokens:build`
 * to change a value. Per-token documentation (grid units, touch-target rationale)
 * lives in the JSON `$description` fields.
 */
export { LAYOUT, SPACING, TOUCH_TARGET } from './tokens.generated';
