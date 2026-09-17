/**
 * ColorPicker Component Tests
 * Story 2.2: Add Card Manually - AC6
 */

import { render, screen, fireEvent } from '@testing-library/react-native';

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
