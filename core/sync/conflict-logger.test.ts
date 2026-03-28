import { logConflictResolution, type ConflictLogEntry } from './conflict-logger';

const makeEntry = (overrides: Partial<ConflictLogEntry> = {}): ConflictLogEntry => ({
  cardId: 'card-1',
  localUpdatedAt: '2026-03-20T10:00:00.000Z',
  cloudUpdatedAt: '2026-03-21T10:00:00.000Z',
  winner: 'cloud',
  reason: 'cloud-newer',
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('logConflictResolution', () => {
  it('logs conflict entry in dev mode', () => {
    const entry = makeEntry();
    logConflictResolution(entry);

    expect(console.log).toHaveBeenCalledWith('[sync:conflict]', {
      cardId: 'card-1',
      localUpdatedAt: '2026-03-20T10:00:00.000Z',
      cloudUpdatedAt: '2026-03-21T10:00:00.000Z',
      winner: 'cloud',
      reason: 'cloud-newer'
    });
  });

  it('logs local-wins conflict', () => {
    logConflictResolution(makeEntry({ winner: 'local', reason: 'local-newer' }));

    expect(console.log).toHaveBeenCalledWith(
      '[sync:conflict]',
      expect.objectContaining({ winner: 'local', reason: 'local-newer' })
    );
  });

  it('logs tie-break conflict', () => {
    const ts = '2026-03-21T10:00:00.000Z';
    logConflictResolution(
      makeEntry({
        localUpdatedAt: ts,
        cloudUpdatedAt: ts,
        winner: 'cloud',
        reason: 'tie-cloud-wins'
      })
    );

    expect(console.log).toHaveBeenCalledWith(
      '[sync:conflict]',
      expect.objectContaining({ reason: 'tie-cloud-wins' })
    );
  });

  it('logs deletion-conflict entries', () => {
    logConflictResolution(
      makeEntry({
        localUpdatedAt: null,
        winner: 'local',
        reason: 'local-delete-wins'
      })
    );

    expect(console.log).toHaveBeenCalledWith(
      '[sync:conflict]',
      expect.objectContaining({ localUpdatedAt: null, reason: 'local-delete-wins' })
    );
  });

  it('handles entry with null timestamps', () => {
    logConflictResolution(makeEntry({ localUpdatedAt: null, cloudUpdatedAt: null }));

    expect(console.log).toHaveBeenCalledWith(
      '[sync:conflict]',
      expect.objectContaining({ localUpdatedAt: null, cloudUpdatedAt: null })
    );
  });

  it('does not log when __DEV__ is false', () => {
    const original = (global as Record<string, unknown>).__DEV__;
    (global as Record<string, unknown>).__DEV__ = false;

    logConflictResolution(makeEntry());

    expect(console.log).not.toHaveBeenCalled();
    (global as Record<string, unknown>).__DEV__ = original;
  });
});
