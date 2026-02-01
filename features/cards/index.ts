/**
 * Cards Feature Module
 * Story 2.1: Display Card List
 * Story 2.2: Add Card Manually
 * Story 2.3: Scan Barcode with Camera
 * Story 2.4: Display Virtual Logo
 * Story 2.5: Display Barcode (Barcode Flash)
 * Story 2.6: View Card Details
 *
 * Exports card-related components and hooks.
 */

// Components
export { CardList } from './components/CardList';
export { CardTile } from './components/CardTile';
export { EmptyState } from './components/EmptyState';
export { CardForm } from './components/CardForm';
export type { CardFormInput } from './components/CardForm';
export { ColorPicker } from './components/ColorPicker';
export { FormatPicker } from './components/FormatPicker';
export { BarcodeScanner } from './components/BarcodeScanner';
export { VirtualLogo } from './components/VirtualLogo';
export { BarcodeRenderer } from './components/BarcodeRenderer';
export type { BarcodeRendererProps } from './components/BarcodeRenderer';
export { BarcodeFlash } from './components/BarcodeFlash';
export type { BarcodeFlashProps } from './components/BarcodeFlash';
export { CardDetails } from './components/CardDetails';
export { DetailRow } from './components/DetailRow';

// Hooks
export { useCards } from './hooks/useCards';
export { useAddCard } from './hooks/useAddCard';
export type { AddCardInput } from './hooks/useAddCard';
export { useBarcodeScanner } from './hooks/useBarcodeScanner';
export type { ScanResult } from './hooks/useBarcodeScanner';
export { useBrightness } from './hooks/useBrightness';
export type { UseBrightnessReturn } from './hooks/useBrightness';

// Utils
export { generateInitials } from './utils/initials';
