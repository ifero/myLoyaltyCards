/**
 * Style Dictionary configuration (Story 16.4).
 *
 * Generates `shared/theme/tokens.generated.ts` from the DTCG token JSON in
 * `tokens/`. The custom format that reproduces the byte-stable primitive shapes
 * lives in `scripts/token-format.mjs` (importing it here registers the format so
 * it is covered by ESLint); this file only assembles the SD config. The runner
 * (`scripts/build-tokens.mjs`) prettier-formats the output before writing/diffing
 * so the committed file matches a fresh regeneration exactly.
 */
import { CUSTOM_TS_FORMAT } from './scripts/token-format.mjs';

export const OUTPUT_DIR = 'shared/theme';
export const OUTPUT_FILENAME = 'tokens.generated.ts';
export const OUTPUT_FILE = `${OUTPUT_DIR}/${OUTPUT_FILENAME}`;

// Explicit file order (not a glob) keeps the generated top-level order
// deterministic across platforms so the drift guard never false-positives.
// scripts/build-tokens.mjs also validates these files, so this is the single
// source of truth for the token inputs.
export const SOURCE_FILES = ['tokens/color.json', 'tokens/spacing.json'];

export const makeConfig = (buildPath) => ({
  source: SOURCE_FILES,
  platforms: {
    ts: {
      // No transformGroup: values pass through verbatim (byte-stable).
      buildPath: buildPath.endsWith('/') ? buildPath : `${buildPath}/`,
      files: [{ destination: OUTPUT_FILENAME, format: CUSTOM_TS_FORMAT }]
    }
  }
});
