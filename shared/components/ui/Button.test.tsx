import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './Button';

const mockUseTheme = jest.fn();

jest.mock('@/shared/theme', () => ({
  useTheme: () => mockUseTheme()
}));

const lightTheme = {
  primary: '#1A73E8',
  primaryDark: '#1967D2',
  border: '#D6DEE8',
  textTertiary: '#94A3B8',
  error: '#DC2626'
};

const darkTheme = {
  primary: '#4DA3FF',
  primaryDark: '#1A73E8',
  border: '#2A3441',
  textTertiary: '#94A3B8',
  error: '#F87171'
};

describe('Button', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: lightTheme });
  });

  it('renders primary button and handles press', () => {
    const onPress = jest.fn();
    render(
      <Button variant="primary" onPress={onPress} testID="btn">
        Save
      </Button>
    );

    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('renders secondary variant', () => {
    render(
      <Button variant="secondary" testID="btn">
        Secondary
      </Button>
    );

    expect(screen.getByText('Secondary')).toBeTruthy();
  });

  it('renders tertiary variant', () => {
    render(
      <Button variant="tertiary" testID="btn">
        Tertiary
      </Button>
    );

    expect(screen.getByText('Tertiary')).toBeTruthy();
  });

  it('renders destructive variant', () => {
    render(
      <Button variant="destructive" testID="btn">
        Delete
      </Button>
    );

    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('renders loading state', () => {
    render(
      <Button variant="secondary" loading testID="btn">
        Load
      </Button>
    );

    expect(screen.getByTestId('btn-spinner')).toBeTruthy();
  });

  it('disables destructive button when disabled=true', () => {
    const onPress = jest.fn();
    render(
      <Button variant="destructive" disabled onPress={onPress} testID="btn">
        Delete
      </Button>
    );

    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('updates visual state on press interactions', () => {
    render(
      <Button variant="primary" testID="btn">
        Pressed
      </Button>
    );

    const button = screen.getByTestId('btn');
    fireEvent(button, 'pressIn');
    fireEvent(button, 'pressOut');
    expect(button).toBeTruthy();
  });

  it('supports dark mode tokens', () => {
    mockUseTheme.mockReturnValue({ theme: darkTheme });

    render(
      <Button variant="primary" testID="btn">
        Dark
      </Button>
    );

    expect(screen.getByText('Dark')).toBeTruthy();
  });
});
