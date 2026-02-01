/**
 * Unit Tests for VirtualLogo Component
 * Story 2.4: Display Virtual Logo (AC1, AC3, AC4, AC5)
 *
 * Tests the VirtualLogo component in isolation.
 */

import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { CardColor } from '@/core/schemas';

import { CARD_COLORS } from '@/shared/theme/colors';

import { VirtualLogo } from './VirtualLogo';

describe('VirtualLogo', () => {
  describe('initials rendering (AC1)', () => {
    it('renders initials for two-word name', () => {
      render(<VirtualLogo name="Test Store" color="blue" />);
      expect(screen.getByText('TS')).toBeTruthy();
    });

    it('renders single initial for one-word name', () => {
      render(<VirtualLogo name="Esselunga" color="green" />);
      expect(screen.getByText('E')).toBeTruthy();
    });

    it('renders max 3 initials for long name', () => {
      render(<VirtualLogo name="Acqua e Sapone" color="orange" />);
      expect(screen.getByText('AES')).toBeTruthy();
    });

    it('renders "?" for empty name', () => {
      render(<VirtualLogo name="" color="blue" />);
      expect(screen.getByText('?')).toBeTruthy();
    });
  });

  describe('color backgrounds (AC3)', () => {
    const colors: CardColor[] = ['blue', 'green', 'orange', 'red', 'grey'];

    colors.forEach((color) => {
      it(`applies ${color} background color`, () => {
        render(<VirtualLogo name="Test" color={color} testID="virtual-logo" />);
        const container = screen.getByTestId('virtual-logo');
        const flattenedStyle = Array.isArray(container.props.style)
          ? Object.assign({}, ...container.props.style)
          : container.props.style;
        expect(flattenedStyle.backgroundColor).toBe(CARD_COLORS[color]);
      });
    });

    it('falls back to grey for invalid color', () => {
      render(<VirtualLogo name="Test" color={'invalid' as CardColor} testID="virtual-logo" />);
      const container = screen.getByTestId('virtual-logo');
      const flattenedStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(flattenedStyle.backgroundColor).toBe(CARD_COLORS.grey);
    });
  });

  describe('sizing (AC4)', () => {
    it('uses default size of 80', () => {
      render(<VirtualLogo name="Test" color="blue" testID="virtual-logo" />);
      const container = screen.getByTestId('virtual-logo');
      const flattenedStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(flattenedStyle.width).toBe(80);
      expect(flattenedStyle.height).toBe(80);
    });

    it('accepts custom size', () => {
      render(<VirtualLogo name="Test" color="blue" size={120} testID="virtual-logo" />);
      const container = screen.getByTestId('virtual-logo');
      const flattenedStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(flattenedStyle.width).toBe(120);
      expect(flattenedStyle.height).toBe(120);
    });

    it('applies 10% border radius', () => {
      render(<VirtualLogo name="Test" color="blue" size={100} testID="virtual-logo" />);
      const container = screen.getByTestId('virtual-logo');
      const flattenedStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(flattenedStyle.borderRadius).toBe(10); // 10% of 100
    });
  });

  describe('font sizing (AC5)', () => {
    it('uses 40% font size for single initial', () => {
      const { getByText } = render(<VirtualLogo name="Esselunga" color="blue" size={80} />);
      const text = getByText('E');
      const flattenedStyle = Array.isArray(text.props.style)
        ? Object.assign({}, ...text.props.style)
        : text.props.style;
      expect(flattenedStyle.fontSize).toBe(32); // 40% of 80
    });

    it('uses 30% font size for two initials', () => {
      const { getByText } = render(<VirtualLogo name="Test Store" color="blue" size={80} />);
      const text = getByText('TS');
      const flattenedStyle = Array.isArray(text.props.style)
        ? Object.assign({}, ...text.props.style)
        : text.props.style;
      expect(flattenedStyle.fontSize).toBe(24); // 30% of 80
    });

    it('uses 30% font size for three initials', () => {
      const { getByText } = render(<VirtualLogo name="Acqua e Sapone" color="blue" size={80} />);
      const text = getByText('AES');
      const flattenedStyle = Array.isArray(text.props.style)
        ? Object.assign({}, ...text.props.style)
        : text.props.style;
      expect(flattenedStyle.fontSize).toBe(24); // 30% of 80
    });
  });

  describe('accessibility', () => {
    it('has accessible label with card name', () => {
      render(<VirtualLogo name="Test Store" color="blue" testID="virtual-logo" />);
      const container = screen.getByTestId('virtual-logo');
      expect(container.props.accessibilityLabel).toBe('Test Store card logo');
    });
  });

  describe('custom styles', () => {
    it('accepts additional style prop', () => {
      const customStyle = { margin: 10 };
      render(<VirtualLogo name="Test" color="blue" style={customStyle} testID="virtual-logo" />);
      const container = screen.getByTestId('virtual-logo');
      const flattenedStyle = Array.isArray(container.props.style)
        ? Object.assign({}, ...container.props.style)
        : container.props.style;
      expect(flattenedStyle.margin).toBe(10);
    });
  });

  describe('testID prop', () => {
    it('applies testID for E2E testing', () => {
      render(<VirtualLogo name="Test" color="blue" testID="my-custom-test-id" />);
      expect(screen.getByTestId('my-custom-test-id')).toBeTruthy();
    });
  });
});
