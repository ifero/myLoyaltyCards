/**
 * ColorPicker Component Tests
 * Story 2.2: Add Card Manually - AC6
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { LIGHT_THEME } from '@/shared/theme/colors';
import { TOUCH_TARGET } from '@/shared/theme/spacing';

import { ColorPicker } from './ColorPicker';

describe('ColorPicker', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all 5 color options', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      expect(screen.getByTestId('color-option-blue')).toBeTruthy();
      expect(screen.getByTestId('color-option-red')).toBeTruthy();
      expect(screen.getByTestId('color-option-green')).toBeTruthy();
      expect(screen.getByTestId('color-option-orange')).toBeTruthy();
      expect(screen.getByTestId('color-option-grey')).toBeTruthy();
    });

    it('renders the "Card Color" label', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      expect(screen.getByText('Card Color')).toBeTruthy();
    });

    // Story 22.1 (16.33 AC2/AC3): the swatch was a literal 44, beside the token. At 48 a fixed 16pt
    // gap needs 304pt, more than the edit form's 32pt margins leave on a 360dp Android (296), so
    // the row spreads the swatches across its width rather than overflowing.
    it('sizes every swatch to the touch target and spreads them across the width', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} testID="picker" />);

      expect(StyleSheet.flatten(screen.getByTestId('color-option-red').props.style)).toMatchObject({
        width: TOUCH_TARGET.min,
        height: TOUCH_TARGET.min
      });

      // The swatches' row: the nearest ancestor that lays its children out horizontally.
      let row = screen.getByTestId('color-option-red').parent;
      while (row && StyleSheet.flatten(row.props.style)?.flexDirection !== 'row') {
        row = row.parent;
      }
      const rowStyle = StyleSheet.flatten(row?.props.style);
      expect(rowStyle.justifyContent).toBe('space-between');
      expect(rowStyle.gap).toBeUndefined();
    });

    // Story 22.1 (AC6, AC7): the edit form renders this label beside TextField's, so it takes the
    // same shared label idiom rather than its own hardcoded #6B7280 sentence case.
    it('sets its label in the shared uppercase form-label idiom', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      expect(StyleSheet.flatten(screen.getByText('Card Color').props.style)).toMatchObject({
        textTransform: 'uppercase',
        fontSize: 13,
        fontWeight: '600',
        color: LIGHT_THEME.textPrimary
      });
    });

    it('shows checkmark on selected color', () => {
      render(<ColorPicker value="blue" onChange={mockOnChange} />);

      const blueOption = screen.getByTestId('color-option-blue');
      expect(blueOption).toHaveTextContent('check');
    });

    it('does not show checkmark on unselected colors', () => {
      render(<ColorPicker value="blue" onChange={mockOnChange} />);

      const redOption = screen.getByTestId('color-option-red');
      expect(redOption).not.toHaveTextContent('check');
    });
  });

  describe('Selection', () => {
    it('calls onChange when a color is pressed', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      fireEvent.press(screen.getByTestId('color-option-blue'));

      expect(mockOnChange).toHaveBeenCalledWith('blue');
    });

    it('calls onChange with correct color for each option', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      fireEvent.press(screen.getByTestId('color-option-red'));
      expect(mockOnChange).toHaveBeenCalledWith('red');

      fireEvent.press(screen.getByTestId('color-option-green'));
      expect(mockOnChange).toHaveBeenCalledWith('green');

      fireEvent.press(screen.getByTestId('color-option-orange'));
      expect(mockOnChange).toHaveBeenCalledWith('orange');
    });

    it('allows selecting the currently selected color', () => {
      render(<ColorPicker value="blue" onChange={mockOnChange} />);

      fireEvent.press(screen.getByTestId('color-option-blue'));

      expect(mockOnChange).toHaveBeenCalledWith('blue');
    });
  });

  describe('Accessibility', () => {
    /**
     * Story 21.2a — the selection affordance must stay visible on ALL five accents.
     *
     * The ring and the checkmark used to be a hard-coded white, which is 1.52:1 on
     * the beam yellow this story makes pickable. Deriving the foreground is what
     * keeps "which colour did I pick?" answerable on the brand's own signature hue.
     */
    it('draws the selection ring and checkmark in a foreground legible on the swatch', () => {
      render(<ColorPicker value="orange" onChange={jest.fn()} />);

      const swatch = screen.getByTestId('color-option-orange');
      const style = Array.isArray(swatch.props.style)
        ? Object.assign({}, ...swatch.props.style)
        : swatch.props.style;

      // Beam yellow is a LIGHT field, so the ring is ink — never white.
      expect(style.borderColor).toBe('#181824');
      expect(style.borderColor).not.toBe('white');
    });

    it('keeps a white ring on the four dark accents', () => {
      render(<ColorPicker value="blue" onChange={jest.fn()} />);

      const swatch = screen.getByTestId('color-option-blue');
      const style = Array.isArray(swatch.props.style)
        ? Object.assign({}, ...swatch.props.style)
        : swatch.props.style;

      expect(style.borderColor).toBe('#FFFFFF');
    });

    it('has accessible labels for each color option', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      // The labels describe the SWATCH, not the frozen key behind it (Story
      // 21.2a): the `orange` key renders beam yellow and the `grey` key renders
      // azure, so announcing them by key name would mislead a screen-reader user.
      expect(screen.getByLabelText('Deep blue color')).toBeTruthy();
      expect(screen.getByLabelText('Red color')).toBeTruthy();
      expect(screen.getByLabelText('Green color')).toBeTruthy();
      expect(screen.getByLabelText('Yellow color')).toBeTruthy();
      expect(screen.getByLabelText(/Azure color/)).toBeTruthy();
    });

    it('indicates selected state in accessibility label', () => {
      render(<ColorPicker value="blue" onChange={mockOnChange} />);

      expect(screen.getByLabelText('Deep blue color, selected')).toBeTruthy();
    });

    it('has button accessibility role', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} />);

      const blueOption = screen.getByTestId('color-option-blue');
      expect(blueOption).toHaveProp('accessibilityRole', 'button');
    });
  });

  describe('testID prop', () => {
    it('applies testID to container when provided', () => {
      render(<ColorPicker value="grey" onChange={mockOnChange} testID="custom-color-picker" />);

      expect(screen.getByTestId('custom-color-picker')).toBeTruthy();
    });
  });
});
