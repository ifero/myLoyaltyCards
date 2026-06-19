import { logger } from '@/core/utils/logger';

import { logConflictResolution, type ConflictLogEntry } from './conflict-logger';

const makeEntry = (overrides: Partial<ConflictLogEntry> = {}): ConflictLogEntry => ({
  cardId: 'card-1',
  localUpdatedAt: '2026-03-20T10:00:00.000Z',
  cloudUpdatedAt: '2026-03-21T10:00:00.000Z',
  winner: 'cloud',
  reason: 'cloud-newer',
  ...overrides
});

// The wrapper is the sanctioned sink; `logger.info` itself only logs in
// development (covered by core/utils/logger.test.ts), so here we just assert
// the conflict resolver delegates to it with the right payload.
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(logger, 'info').mockImplementation(() => {});
  jest.spyOn(logger, 'warn').mockImplementation(() => {});
  jest.spyOn(logger, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('logConflictResolution', () => {
  it('logs conflict entry', () => {
    const entry = makeEntry();
    logConflictResolution(entry);

    expect(logger.info).toHaveBeenCalledWith('[sync:conflict]', {
      cardId: 'card-1',
      localUpdatedAt: '2026-03-20T10:00:00.000Z',
      cloudUpdatedAt: '2026-03-21T10:00:00.000Z',
      winner: 'cloud',
      reason: 'cloud-newer'
    });
  });

  it('logs local-wins conflict', () => {
    logConflictResolution(makeEntry({ winner: 'local', reason: 'local-newer' }));

    expect(logger.info).toHaveBeenCalledWith(
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

    expect(logger.info).toHaveBeenCalledWith(
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

    expect(logger.info).toHaveBeenCalledWith(
      '[sync:conflict]',
      expect.objectContaining({ localUpdatedAt: null, reason: 'local-delete-wins' })
    );
  });

  it('handles entry with null timestamps', () => {
    logConflictResolution(makeEntry({ localUpdatedAt: null, cloudUpdatedAt: null }));

    expect(logger.info).toHaveBeenCalledWith(
      '[sync:conflict]',
      expect.objectContaining({ localUpdatedAt: null, cloudUpdatedAt: null })
    );
  });

  // Pins the sink level: conflict logging must stay dev-only telemetry. It routes
  // exclusively through `logger.info` (which suppresses in production — see
  // core/utils/logger.test.ts), never through the always-on `error`/`warn`.
  it('only uses logger.info — never warn/error (no production telemetry)', () => {
    logConflictResolution(makeEntry());

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });
});
