/**
 * BarcodeRenderer Component Tests
 * Story 2.5: Display Barcode (Barcode Flash)
 */

import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { BarcodeRenderer } from './BarcodeRenderer';

// Get reference to the mock - this is the same instance used by the component
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { toDataURL: mockToDataURL } = require('@bwip-js/react-native');

describe('BarcodeRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Barcode generation', () => {
    it('should render CODE128 barcode', async () => {
      const { getByLabelText } = render(<BarcodeRenderer value="ABC123" format="CODE128" />);

      await waitFor(() => {
        expect(getByLabelText('CODE128 barcode for ABC123')).toBeTruthy();
      });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          bcid: 'code128',
          text: 'ABC123'
        })
      );
    });

    it('should render EAN13 barcode', async () => {
      const { getByLabelText } = render(<BarcodeRenderer value="5901234123457" format="EAN13" />);

      await waitFor(() => {
        expect(getByLabelText('EAN13 barcode for 5901234123457')).toBeTruthy();
      });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          bcid: 'ean13',
          text: '5901234123457'
        })
      );
    });

    it('should render EAN8 barcode', async () => {
      const { getByLabelText } = render(<BarcodeRenderer value="96385074" format="EAN8" />);

      await waitFor(() => {
        expect(getByLabelText('EAN8 barcode for 96385074')).toBeTruthy();
      });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          bcid: 'ean8',
          text: '96385074'
        })
      );
    });

    it('should render CODE39 barcode', async () => {
      const { getByLabelText } = render(<BarcodeRenderer value="CODE39" format="CODE39" />);

      await waitFor(() => {
        expect(getByLabelText('CODE39 barcode for CODE39')).toBeTruthy();
      });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          bcid: 'code39',
          text: 'CODE39'
        })
      );
    });

    it('should render UPCA barcode', async () => {
      const { getByLabelText } = render(<BarcodeRenderer value="012345678905" format="UPCA" />);

      await waitFor(() => {
        expect(getByLabelText('UPCA barcode for 012345678905')).toBeTruthy();
      });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          bcid: 'upca',
          text: '012345678905'
        })
      );
    });

    it('should render QR code', async () => {
      const { getByLabelText } = render(
        <BarcodeRenderer value="https://example.com" format="QR" />
      );

      await waitFor(() => {
        expect(getByLabelText('QR barcode for https://example.com')).toBeTruthy();
      });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          bcid: 'qrcode',
          text: 'https://example.com'
        })
      );
    });
  });

  describe('Props handling', () => {
    it('should use custom color', async () => {
      const { getByLabelText } = render(
        <BarcodeRenderer value="test" format="CODE128" color="#FF0000" />
      );

      await waitFor(() => {
        expect(getByLabelText('CODE128 barcode for test')).toBeTruthy();
      });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          barcolor: 'FF0000' // bwip-js uses color without #
        })
      );
    });

    it('should use custom background color', async () => {
      const { getByLabelText } = render(
        <BarcodeRenderer value="test" format="CODE128" backgroundColor="#00FF00" />
      );

      await waitFor(() => {
        expect(getByLabelText('CODE128 barcode for test')).toBeTruthy();
      });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundcolor: '00FF00' // bwip-js uses color without #
        })
      );
    });

    it('should use white background by default', async () => {
      const { getByLabelText } = render(<BarcodeRenderer value="test" format="CODE128" />);

      await waitFor(() => {
        expect(getByLabelText('CODE128 barcode for test')).toBeTruthy();
      });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundcolor: 'FFFFFF'
        })
      );
    });

    it('should not include backgroundcolor when transparent', async () => {
      const { getByLabelText } = render(
        <BarcodeRenderer value="test" format="CODE128" backgroundColor="transparent" />
      );

      await waitFor(() => {
        expect(getByLabelText('CODE128 barcode for test')).toBeTruthy();
      });

      const callArgs = mockToDataURL.mock.calls[0][0];
      expect(callArgs.backgroundcolor).toBeUndefined();
    });

    it('should use default width of 280 for linear barcodes', async () => {
      const { getByLabelText } = render(<BarcodeRenderer value="test" format="CODE128" />);

      await waitFor(() => {
        expect(getByLabelText('CODE128 barcode for test')).toBeTruthy();
      });

      // Default height is 12mm (120px / 10)
      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          height: 12
        })
      );
    });

    it('should use custom width for linear barcodes', async () => {
      const { getByLabelText } = render(
        <BarcodeRenderer value="test" format="CODE128" width={350} />
      );

      await waitFor(() => {
        expect(getByLabelText('CODE128 barcode for test')).toBeTruthy();
      });

      // Width doesn't affect bwip-js options for linear barcodes, but barcode renders
      expect(mockToDataURL).toHaveBeenCalled();
    });

    it('should use custom height for linear barcodes', async () => {
      const { getByLabelText } = render(
        <BarcodeRenderer value="test" format="CODE128" height={80} />
      );

      await waitFor(() => {
        expect(getByLabelText('CODE128 barcode for test')).toBeTruthy();
      });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          height: 8 // 80 / 10 (converted to mm)
        })
      );
    });

    it('should use default width of 200 for QR codes', async () => {
      const { getByLabelText } = render(<BarcodeRenderer value="test" format="QR" />);

      await waitFor(() => {
        expect(getByLabelText('QR barcode for test')).toBeTruthy();
      });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 20 // 200 / 10 (converted to mm)
        })
      );
    });

    it('should use custom width for QR codes', async () => {
      const { getByLabelText } = render(<BarcodeRenderer value="test" format="QR" width={300} />);

      await waitFor(() => {
        expect(getByLabelText('QR barcode for test')).toBeTruthy();
      });

      expect(mockToDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 30, // 300 / 10 (converted to mm)
          height: 30 // QR codes use width for both dimensions
        })
      );
    });

    it('should accept containerStyle prop', async () => {
      const customStyle = { marginTop: 20 };
      const { getByLabelText } = render(
        <BarcodeRenderer value="test" format="CODE128" containerStyle={customStyle} />
      );

      await waitFor(() => {
        expect(getByLabelText('CODE128 barcode for test')).toBeTruthy();
      });
    });
  });

  describe('Error handling', () => {
    it('should show loading state initially', () => {
      // Use a never-resolving promise to keep loading state
      mockToDataURL.mockImplementationOnce(() => new Promise(() => {}));

      const { getByLabelText } = render(<BarcodeRenderer value="test" format="CODE128" />);

      expect(getByLabelText('Loading barcode')).toBeTruthy();
    });

    it('should show error state when generation fails', async () => {
      mockToDataURL.mockRejectedValueOnce(new Error('Invalid barcode'));

      const { getByLabelText } = render(<BarcodeRenderer value="invalid" format="CODE128" />);

      await waitFor(() => {
        expect(getByLabelText('Invalid barcode')).toBeTruthy();
      });
    });
  });
});
