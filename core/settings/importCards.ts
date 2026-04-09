import * as z from 'zod';

import { batchUpsertCards, getAllCards } from '@/core/database/card-repository';
import {
  type LoyaltyCard,
  barcodeFormatSchema,
  cardColorSchema,
  loyaltyCardSchema
} from '@/core/schemas/card';
import { markDirty } from '@/core/sync';

export const EXPORT_FORMAT_VERSION = '2.0';
const EMPTY_FILE_MESSAGE = 'This file contains no card data.';
const INVALID_FILE_MESSAGE =
  "This file doesn't contain valid card data. Please select a different file.";

const exportPayloadSchema = z.object({
  version: z.string().min(1),
  appVersion: z.string().min(1),
  exportDate: z.string().datetime(),
  cardCount: z.number().int().nonnegative(),
  cards: z.array(z.unknown())
});

const legacyCardSchema = z.object({
  storeName: z.string().max(50),
  cardNumber: z.string().min(1),
  barcodeFormat: z.string().min(1),
  color: cardColorSchema,
  createdAt: z.string().datetime()
});

export type ExportPayload = {
  version: string;
  appVersion: string;
  exportDate: string;
  cardCount: number;
  cards: LoyaltyCard[];
};

export type ImportPreview = {
  fileName: string;
  totalCards: number;
  newCardsCount: number;
  duplicateCount: number;
  invalidCount: number;
  importableCards: LoyaltyCard[];
};

export type ImportAnalysisResult =
  | { status: 'preview'; preview: ImportPreview }
  | { status: 'empty'; title: 'No Card Data'; message: string }
  | { status: 'invalid'; title: 'Invalid File'; message: string };

export type ImportCommitResult = {
  importedCount: number;
  duplicateCount: number;
  invalidCount: number;
};

const duplicateKeyFor = (card: Pick<LoyaltyCard, 'barcode' | 'brandId'>) =>
  `${card.brandId ?? 'null'}::${card.barcode}`;

const createSyntheticUuid = () => {
  const randomHex = (size: number) =>
    Array.from({ length: size }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-a${randomHex(3)}-${randomHex(12)}`;
};

const normalizeBarcodeFormat = (value: string) => {
  const normalized = value.trim().toUpperCase();

  if (normalized === 'QR_CODE') {
    return 'QR';
  }

  const parsed = barcodeFormatSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
};

const toLegacyCard = (record: z.infer<typeof legacyCardSchema>): LoyaltyCard | null => {
  const barcodeFormat = normalizeBarcodeFormat(record.barcodeFormat);
  if (!barcodeFormat) {
    return null;
  }

  const parsed = loyaltyCardSchema.safeParse({
    id: createSyntheticUuid(),
    name: record.storeName,
    barcode: record.cardNumber,
    barcodeFormat,
    brandId: null,
    color: record.color,
    isFavorite: false,
    lastUsedAt: null,
    usageCount: 0,
    createdAt: record.createdAt,
    updatedAt: record.createdAt
  });

  return parsed.success ? parsed.data : null;
};

export const createExportPayload = (cards: LoyaltyCard[], appVersion: string): ExportPayload => ({
  version: EXPORT_FORMAT_VERSION,
  appVersion,
  exportDate: new Date().toISOString(),
  cardCount: cards.length,
  cards
});

export const analyzeImportPayload = async (
  content: string,
  fileName: string,
  existingCards?: LoyaltyCard[]
): Promise<ImportAnalysisResult> => {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(content);
  } catch {
    return { status: 'invalid', title: 'Invalid File', message: INVALID_FILE_MESSAGE };
  }

  const envelope = exportPayloadSchema.safeParse(parsedJson);
  if (!envelope.success) {
    return { status: 'invalid', title: 'Invalid File', message: INVALID_FILE_MESSAGE };
  }

  if (envelope.data.cardCount !== envelope.data.cards.length) {
    return { status: 'invalid', title: 'Invalid File', message: INVALID_FILE_MESSAGE };
  }

  if (envelope.data.cards.length === 0) {
    return { status: 'empty', title: 'No Card Data', message: EMPTY_FILE_MESSAGE };
  }

  const validCards: LoyaltyCard[] = [];
  let invalidCount = 0;

  for (const rawCard of envelope.data.cards) {
    const fullCard = loyaltyCardSchema.safeParse(rawCard);
    if (fullCard.success) {
      validCards.push(fullCard.data);
      continue;
    }

    const legacyCard = legacyCardSchema.safeParse(rawCard);
    if (!legacyCard.success) {
      invalidCount += 1;
      continue;
    }

    const mappedLegacyCard = toLegacyCard(legacyCard.data);
    if (!mappedLegacyCard) {
      invalidCount += 1;
      continue;
    }

    validCards.push(mappedLegacyCard);
  }

  if (validCards.length === 0) {
    return { status: 'invalid', title: 'Invalid File', message: INVALID_FILE_MESSAGE };
  }

  const currentCards = existingCards ?? (await getAllCards());
  const existingKeys = new Set(currentCards.map(duplicateKeyFor));
  const seenImportKeys = new Set<string>();
  const importableCards: LoyaltyCard[] = [];
  let duplicateCount = 0;

  for (const card of validCards) {
    const key = duplicateKeyFor(card);

    if (existingKeys.has(key) || seenImportKeys.has(key)) {
      duplicateCount += 1;
      continue;
    }

    seenImportKeys.add(key);
    importableCards.push(card);
  }

  return {
    status: 'preview',
    preview: {
      fileName,
      totalCards: envelope.data.cards.length,
      newCardsCount: importableCards.length,
      duplicateCount,
      invalidCount,
      importableCards
    }
  };
};

export const importAnalyzedCards = async (preview: ImportPreview): Promise<ImportCommitResult> => {
  if (preview.importableCards.length > 0) {
    await batchUpsertCards(preview.importableCards);
    await markDirty();
  }

  return {
    importedCount: preview.importableCards.length,
    duplicateCount: preview.duplicateCount,
    invalidCount: preview.invalidCount
  };
};

export const _EMPTY_FILE_MESSAGE = EMPTY_FILE_MESSAGE;
export const _INVALID_FILE_MESSAGE = INVALID_FILE_MESSAGE;
