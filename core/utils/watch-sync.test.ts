import { NativeModules } from 'react-native';
import { syncCardUpsert, syncCardDelete } from './watch-sync';
import { LoyaltyCard } from '@/core/schemas';

const mockSend = jest.fn().mockResolvedValue(true);

beforeEach(() => {
  jest.clearAllMocks();
  (NativeModules as unknown as { RNWatchConnectivity?: { sendSyncPayload?: jest.Mock } }).RNWatchConnectivity = { sendSyncPayload: mockSend };
});

afterEach(() => {
  delete (NativeModules as unknown as { RNWatchConnectivity?: { sendSyncPayload?: jest.Mock } }).RNWatchConnectivity;
});

test('syncCardUpsert calls native sendSyncPayload with upsert payload', async () => {
  const card: LoyaltyCard = {    id: '1',
    name: 'Test',
    barcode: '123',
    barcodeFormat: 'CODE128',
    brandId: null,
    color: 'blue',
    isFavorite: false,
    lastUsedAt: null,
    usageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await syncCardUpsert(card);

  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledWith({ version: '1.0.0', upserts: [card] });
});

test('syncCardDelete calls native sendSyncPayload with deletes payload', async () => {
  await syncCardDelete('abc');

  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledWith({ version: '1.0.0', deletes: ['abc'] });
});