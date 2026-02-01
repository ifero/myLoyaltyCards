/**
 * BarcodeRenderer Component Tests
 * Story 2.5: Display Barcode (Barcode Flash)
 */

import { render } from '@testing-library/react-native';
import React from 'react';

import { BarcodeRenderer } from './BarcodeRenderer';

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return function QRCode(props: {
    value: string;
    size: number;
    color: string;
    backgroundColor: string;
  }) {
    return <View testID="qr-code" {...props} />;
  };
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    SvgXml: function SvgXml(props: { xml: string }) {
      return <View testID="svg-xml" {...props} />;
    }
  };
});

// Mock jsbarcode
jest.mock('jsbarcode', () => {
  return jest.fn((element, value, options) => {
    // Simulate adding children to the mock SVG element
    if (element && element._children) {
      element._children.push({
        tagName: 'rect',
        attributes: {
          x: '0',
          y: '0',
          width: '100',
          height: '100',
          fill: options?.lineColor || '#000000'
        }
      });
    }
    if (element && element.setAttribute) {
      element.setAttribute('width', '200');
      element.setAttribute('height', '100');
    }
  });
});

describe('BarcodeRenderer', () => {
  describe('QR Code rendering', () => {
    it('should render QR code for QR format', () => {
      const { getByTestId } = render(<BarcodeRenderer value="https://example.com" format="QR" />);

      expect(getByTestId('qr-code')).toBeTruthy();
    });

    it('should use default size of 200 for QR code', () => {
      const { getByTestId } = render(<BarcodeRenderer value="test-value" format="QR" />);

      const qrCode = getByTestId('qr-code');
      expect(qrCode.props.size).toBe(200);
    });

    it('should use custom size for QR code', () => {
      const { getByTestId } = render(
        <BarcodeRenderer value="test-value" format="QR" width={300} />
      );

      const qrCode = getByTestId('qr-code');
      expect(qrCode.props.size).toBe(300);
    });

    it('should use custom color for QR code', () => {
      const { getByTestId } = render(
        <BarcodeRenderer value="test-value" format="QR" color="#FF0000" />
      );

      const qrCode = getByTestId('qr-code');
      expect(qrCode.props.color).toBe('#FF0000');
    });

    it('should have accessibility label for QR code', () => {
      const { getByLabelText } = render(<BarcodeRenderer value="test-value" format="QR" />);

      expect(getByLabelText('QR code for test-value')).toBeTruthy();
    });
  });

  describe('Linear barcode rendering', () => {
    it('should render CODE128 barcode', () => {
      const { getByTestId } = render(<BarcodeRenderer value="ABC123" format="CODE128" />);

      expect(getByTestId('svg-xml')).toBeTruthy();
    });

    it('should render EAN13 barcode', () => {
      const { getByTestId } = render(<BarcodeRenderer value="5901234123457" format="EAN13" />);

      expect(getByTestId('svg-xml')).toBeTruthy();
    });

    it('should render EAN8 barcode', () => {
      const { getByTestId } = render(<BarcodeRenderer value="96385074" format="EAN8" />);

      expect(getByTestId('svg-xml')).toBeTruthy();
    });

    it('should render CODE39 barcode', () => {
      const { getByTestId } = render(<BarcodeRenderer value="CODE39" format="CODE39" />);

      expect(getByTestId('svg-xml')).toBeTruthy();
    });

    it('should render UPCA barcode', () => {
      const { getByTestId } = render(<BarcodeRenderer value="012345678905" format="UPCA" />);

      expect(getByTestId('svg-xml')).toBeTruthy();
    });

    it('should have accessibility label for linear barcode', () => {
      const { getByLabelText } = render(<BarcodeRenderer value="ABC123" format="CODE128" />);

      expect(getByLabelText('CODE128 barcode for ABC123')).toBeTruthy();
    });
  });

  describe('Props handling', () => {
    it('should use default color of #000000', () => {
      const { getByTestId } = render(<BarcodeRenderer value="test" format="QR" />);

      const qrCode = getByTestId('qr-code');
      expect(qrCode.props.color).toBe('#000000');
    });

    it('should use default background of transparent', () => {
      const { getByTestId } = render(<BarcodeRenderer value="test" format="QR" />);

      const qrCode = getByTestId('qr-code');
      expect(qrCode.props.backgroundColor).toBe('transparent');
    });

    it('should apply custom background color', () => {
      const { getByTestId } = render(
        <BarcodeRenderer value="test" format="QR" backgroundColor="#FFFFFF" />
      );

      const qrCode = getByTestId('qr-code');
      expect(qrCode.props.backgroundColor).toBe('#FFFFFF');
    });
  });
});
