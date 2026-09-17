/**
 * The card-colour LABELS, in both locales — Story 21.2a, AC5.
 *
 * These labels carry more weight than most copy, because the five `CardColor` keys
 * are frozen wire identifiers and two of them are deliberately misnamed: the
 * `orange` key renders the beam yellow `#FCCC0C` and the `grey` key renders the
 * azure `#0C84CC`. The label is the ONLY place a key reaches a person, and for a
 * screen-reader user it is the whole of what they get — so announcing a yellow
 * swatch as "Orange" would not be a cosmetic slip, it would be wrong.
 *
 * AC5 says "both locale files", and until this file existed only English had any
 * executable coverage: every ColorPicker test runs under the default locale, and
 * `italian-rendering.test.tsx` exercised five unrelated keys. The Italian strings
 * were correct, but nothing would have caught a typo, a swap or a deletion.
 */

import { en } from './en';
import { it as itLocale } from './it';

/** Every leaf key path in a locale object, e.g. `cards.colors.blue`. */
const leafPaths = (value: unknown, prefix = ''): string[] => {
  if (typeof value !== 'object' || value === null) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  );
};

describe('locale key parity', () => {
  /**
   * `it.ts` is a plain object literal with no `satisfies typeof en` constraint, so
   * nothing in the type system ties the two shapes together. A key deleted from one
   * side surfaces at runtime as i18next echoing the raw key path at the user —
   * which, for an accessibility label, means a screen reader reading out
   * "cards.colors.grey".
   */
  it('en and it declare exactly the same keys', () => {
    const english = leafPaths(en);
    const italian = leafPaths(itLocale);

    expect([...italian].sort()).toEqual([...english].sort());
  });

  it('no locale leaves a string empty', () => {
    for (const locale of [en, itLocale]) {
      for (const path of leafPaths(locale)) {
        const value = path
          .split('.')
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], locale);

        expect(typeof value).toBe('string');
        expect((value as string).trim()).not.toBe('');
      }
    }
  });
});

describe('card colour labels describe the swatch, not the frozen key (AC5)', () => {
  it('names the two deliberately misnamed keys by what they actually render', () => {
    // `orange` is the beam yellow; `grey` is the azure.
    expect(en.cards.colors.orange).toBe('Yellow');
    expect(en.cards.colors.grey).toBe('Azure');
    expect(itLocale.cards.colors.orange).toBe('Giallo');
    expect(itLocale.cards.colors.grey).toBe('Azzurro');
  });

  it('qualifies blue, because the picker now shows two blues side by side', () => {
    // `blue` is the deep navy and `grey` is the azure. "Blue" alone would leave a
    // screen-reader user unable to tell which swatch they were selecting.
    expect(en.cards.colors.blue).toBe('Deep blue');
    expect(itLocale.cards.colors.blue).toBe('Blu scuro');
  });

  it('never announces a colour this design system bans', () => {
    // Orange, coral, salmon and terracotta are forbidden outright, and the `orange`
    // KEY survives only as a wire identifier — no label may say it out loud.
    const banned = /orange|arancione|coral|corallo|salmon|salmone|terracotta/i;

    // The KEY is literally `orange`; only the LABEL is under test.
    for (const locale of [en, itLocale]) {
      for (const label of Object.values(locale.cards.colors)) {
        expect(label).not.toMatch(banned);
      }
    }
  });

  it('gives all five keys a distinct label in each locale', () => {
    for (const locale of [en, itLocale]) {
      const labels = (['blue', 'red', 'green', 'orange', 'grey'] as const).map(
        (key) => locale.cards.colors[key]
      );

      expect(new Set(labels).size).toBe(labels.length);
    }
  });
});
