import { render, screen } from '@testing-library/react-native';

import { CardShell } from './CardShell';

const mockUseTheme = jest.fn();

jest.mock('@/shared/theme', () => ({
  useTheme: () => mockUseTheme()
}));

const baseTheme = {
  surfaceElevated: '#2C2C2E',
  borderStrong: '#66666B'
};

describe('CardShell', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: baseTheme, isDark: true });
  });

  it('renders catalogue variant with logo slot', () => {
    render(<CardShell type="catalogue" size="grid" brandColor="#0058AB" testID="shell" />);

    expect(screen.getByTestId('shell-logo-slot')).toBeTruthy();
  });

  it('renders custom variant with avatar fallback', () => {
    render(<CardShell type="custom" size="hero" cardName="Lidl" testID="shell" />);

    expect(screen.getByTestId('shell-avatar')).toBeTruthy();
    expect(screen.getByText('L')).toBeTruthy();
  });

  it('applies dark-mode border for black brand color', () => {
    const { getByTestId } = render(
      <CardShell type="catalogue" size="grid" brandColor="#000000" testID="shell" />
    );

    const shell = getByTestId('shell');
    const flattened = Array.isArray(shell.props.style)
      ? Object.assign({}, ...shell.props.style)
      : shell.props.style;

    expect(flattened.borderWidth).toBe(1);
  });

  it('does not apply black-brand border in light mode', () => {
    mockUseTheme.mockReturnValue({ theme: baseTheme, isDark: false });

    const { getByTestId } = render(
      <CardShell type="catalogue" size="hero" brandColor="#000000" testID="shell" />
    );

    const shell = getByTestId('shell');
    const flattened = Array.isArray(shell.props.style)
      ? Object.assign({}, ...shell.props.style)
      : shell.props.style;

    expect(flattened.borderWidth).toBe(0);
  });

  it('supports grid and hero sizes', () => {
    const grid = render(
      <CardShell type="custom" size="grid" cardName="Conad" testID="grid-shell" />
    );
    const hero = render(
      <CardShell type="custom" size="hero" cardName="Conad" testID="hero-shell" />
    );

    expect(grid.getByTestId('grid-shell')).toBeTruthy();
    expect(hero.getByTestId('hero-shell')).toBeTruthy();
  });
});
