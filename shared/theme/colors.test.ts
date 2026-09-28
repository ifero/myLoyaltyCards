import { IDENTITY_COLORS, toRgbChannels } from './colors';

describe('toRgbChannels', () => {
  it('splits a #RRGGBB token into the r, g, b an rgba() takes', () => {
    expect(toRgbChannels('#181824')).toBe('24, 24, 36');
    expect(toRgbChannels('#FFFFFF')).toBe('255, 255, 255');
  });

  it('reads either case of hex digit', () => {
    expect(toRgbChannels('#0c843c')).toBe(toRgbChannels('#0C843C'));
  });

  // The sheet's scrim and the tile's highlight ring are built from these two.
  it('splits the identity ink and beam', () => {
    const channels = (hex: string) => hex.match(/[0-9a-f]{2}/gi)!.map((pair) => parseInt(pair, 16));
    expect(toRgbChannels(IDENTITY_COLORS.ink)).toBe(channels(IDENTITY_COLORS.ink).join(', '));
    expect(toRgbChannels(IDENTITY_COLORS.beam)).toBe(channels(IDENTITY_COLORS.beam).join(', '));
  });
});
