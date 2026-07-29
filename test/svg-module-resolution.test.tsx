/**
 * SVG module resolution — a `jest.config.js` invariant, not a component test.
 *
 * `moduleNameMapper` is ordered, and Jest applies only the FIRST pattern that
 * matches a request. For a long time `'^@/(.*)$'` sat ahead of `'\.svg$'`, so
 * every `@/assets/….svg` import in the repo — all ~50 brand logos in
 * `features/cards/utils/brandLogos.ts` — bypassed `__mocks__/svgMock.js`
 * entirely. It resolved to the real file and the react-native preset's asset
 * transformer returned a plain `{ testUri }` OBJECT.
 *
 * Nothing was red, which is exactly why it survived: it fails only when a test
 * actually renders one, and then it fails as an opaque "Element type is invalid".
 * The real damage was quieter. `BrandLogo` picks its branch with
 * `typeof source === 'function'`, so with every SVG arriving as an object its SVG
 * branch was unreachable from real data and tests rendered `<Image>` where the app
 * renders `<SvgLogo>` — the suite and the product disagreed, silently.
 *
 * These tests pin the resolution itself rather than any one consumer, because the
 * failure mode is a one-line reordering of a config file that no component test
 * would ever point at. There is deliberately a negative case too: `.png` must
 * KEEP resolving to an asset object, so a future "fix" cannot over-correct and
 * break every `<Image source={…}>` in the app.
 */
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import AliasedMark from '@/assets/images/app-icon-variant-aurora.svg';
import AliasedPng from '@/assets/images/brands/coin.png';

import { getBrandLogo } from '@/features/cards/utils/brandLogos';

import RelativeMark from '../assets/images/app-icon-variant-aurora.svg';

describe('SVG module resolution', () => {
  it('resolves an @/-aliased .svg to a renderable component, not an asset object', () => {
    // The regression this whole file exists for. `typeof 'object'` here means the
    // `\.svg$` mapper has fallen behind the `^@/` alias again.
    expect(typeof AliasedMark).toBe('function');
  });

  it('resolves a relative .svg to the same component', () => {
    // Relative specifiers never matched the alias, so they always worked. Pinned
    // so the two import styles cannot drift apart again.
    expect(typeof RelativeMark).toBe('function');
    expect(RelativeMark).toBe(AliasedMark);
  });

  it('actually renders, forwarding size and testID props', () => {
    render(<AliasedMark width={200} height={200} testID="resolution-probe" />);

    const mark = screen.getByTestId('resolution-probe');
    expect(mark).toHaveProp('width', 200);
    expect(mark).toHaveProp('height', 200);
  });

  it('still resolves an @/-aliased .png to an asset object', () => {
    // The guard against over-correcting: PNGs are consumed as `<Image source>`,
    // for which the asset object is the CORRECT shape. Only `.svg` changes.
    expect(typeof AliasedPng).toBe('object');
  });

  it('lets BrandLogo distinguish an SVG brand from a PNG brand', () => {
    // The consequence that actually matters in product code: `BrandLogo` branches
    // on `typeof source === 'function'`. Before the mapper reorder both of these
    // were objects, so the SVG branch could not be reached from real catalogue
    // data and the wrong element was rendered in every test that got that far.
    expect(typeof getBrandLogo('esselunga')).toBe('function');
    expect(typeof getBrandLogo('coin')).toBe('object');
  });
});
