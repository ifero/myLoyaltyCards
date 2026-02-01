/**
 * Cards Feature Module
 * Story 2.1: Display Card List
 * Story 2.2: Add Card Manually
 * Story 2.3: Scan Barcode with Camera
 * Story 2.4: Display Virtual Logo
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

// Hooks
export { useCards } from './hooks/useCards';
export { useAddCard } from './hooks/useAddCard';
export type { AddCardInput } from './hooks/useAddCard';
export { useBarcodeScanner } from './hooks/useBarcodeScanner';
export type { ScanResult } from './hooks/useBarcodeScanner';

// Utils
export { generateInitials } from './utils/initials';
