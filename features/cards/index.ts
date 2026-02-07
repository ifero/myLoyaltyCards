/**
 * Cards Feature Module
 * Story 2.1: Display Card List
 * Story 2.2: Add Card Manually
 * Story 2.3: Scan Barcode with Camera
 * Story 2.4: Display Virtual Logo
 * Story 2.5: Display Barcode (Barcode Flash)
 * Story 2.6: View Card Details
 * Story 2.7: Edit Card
 * Story 2.8: Delete Card
 * Story 3.2: Browse Catalogue Grid
 * Story 3.4: Cache Catalogue for Offline
 *
 * Exports card-related components, hooks, and repositories.
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
export { CatalogueGrid } from './components/CatalogueGrid';

// Hooks
export { useCards } from './hooks/useCards';
export { useAddCard } from './hooks/useAddCard';
export type { AddCardInput } from './hooks/useAddCard';
export { useEditCard } from './hooks/useEditCard';
export type { EditCardInput } from './hooks/useEditCard';
export { useDeleteCard } from './hooks/useDeleteCard';
export type { UseDeleteCardReturn } from './hooks/useDeleteCard';
export { useBarcodeScanner } from './hooks/useBarcodeScanner';
export type { ScanResult } from './hooks/useBarcodeScanner';
export { useBrightness } from './hooks/useBrightness';
export type { UseBrightnessReturn } from './hooks/useBrightness';
export { useBrandLogo } from './hooks/useBrandLogo';

// Repositories
export { CatalogueRepository, catalogueRepository } from './repositories/catalogue-repository';

// Utils
export { generateInitials } from './utils/initials';
