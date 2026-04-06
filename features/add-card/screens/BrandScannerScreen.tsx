/**
 * BrandScannerScreen
 * Story 13.4: Restyle Add Card Flow (AC3, AC4, T3)
 *
 * Full-bleed camera scanner with brand pill, viewfinder corners, and scan line.
 * Reuses useBarcodeScanner hook. On scan → auto-navigate to CardSetupScreen.
 * "Enter card number manually" → CardSetupScreen without scan data.
 */

import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { AccessibilityInfo } from 'react-native';

import { CatalogueRepository } from '@/core/catalogue/catalogue-repository';

import { ScanResult } from '@/features/cards/hooks/useBarcodeScanner';

import { CatalogueBrand } from '@/catalogue/types';

import { BrandPill } from '../components/BrandPill';
import { ScannerOverlay } from '../components/ScannerOverlay';

type ScanParams = {
  brandId?: string;
  brandName?: string;
  brandColor?: string;
  brandLogo?: string;
  returnToSetup?: string;
};

export const BrandScannerScreen: React.FC = () => {
  const params = useLocalSearchParams<ScanParams>();
  const shouldReturnToSetup = params.returnToSetup === 'true';

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility?.('Barcode scanner screen');
  }, []);

  // Reconstruct brand from params (or look up from catalogue)
  const brand = useMemo<CatalogueBrand | undefined>(() => {
    if (!params.brandId) return undefined;

    // Try catalogue first
    const catalogueBrand = CatalogueRepository.getInstance().getBrandById(params.brandId);
    if (catalogueBrand) return catalogueBrand;

    // Fallback: reconstruct from params
    if (params.brandName && params.brandColor) {
      return {
        id: params.brandId,
        name: params.brandName,
        color: params.brandColor,
        logo: params.brandLogo ?? '',
        aliases: []
      };
    }

    return undefined;
  }, [params.brandId, params.brandName, params.brandColor, params.brandLogo]);

  const handleScan = useCallback(
    (result: ScanResult) => {
      // Auto-navigate to setup with scanned data
      const navigate = shouldReturnToSetup ? router.replace : router.push;
      navigate({
        pathname: '/add-card/setup',
        params: {
          mode: brand ? 'catalogue' : 'custom',
          brandId: brand?.id ?? '',
          brandName: brand?.name ?? '',
          brandColor: brand?.color ?? '',
          brandLogo: brand?.logo ?? '',
          barcode: result.barcode,
          barcodeFormat: result.format
        }
      });
    },
    [brand, shouldReturnToSetup]
  );

  const handleManualEntry = useCallback(() => {
    const navigate = shouldReturnToSetup ? router.replace : router.push;
    navigate({
      pathname: '/add-card/setup',
      params: {
        mode: brand ? 'catalogue' : 'custom',
        brandId: brand?.id ?? '',
        brandName: brand?.name ?? '',
        brandColor: brand?.color ?? '',
        brandLogo: brand?.logo ?? ''
      }
    });
  }, [brand, shouldReturnToSetup]);

  const handleBack = useCallback(() => {
    router.back();
  }, []);

  return (
    <ScannerOverlay
      onScan={handleScan}
      onManualEntry={handleManualEntry}
      onBack={handleBack}
      brandPill={brand ? <BrandPill brand={brand} /> : undefined}
      testID="brand-scanner-screen"
    />
  );
};
