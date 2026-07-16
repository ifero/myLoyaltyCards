import { formatRelativeTime } from './relative-time';

describe('formatRelativeTime', () => {
  it('returns Never for null', () => {
    expect(formatRelativeTime(null)).toBe('Never');
  });

  it('returns Just now for timestamp within 1 minute', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  it('returns minutes ago for timestamp 5 minutes ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 min ago');
  });

  it('returns hours ago for timestamp 2 hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
  });

  it('returns days ago for timestamp 1 day ago', () => {
    const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
  });

  describe('Italian locale', () => {
    it('returns Mai for null', () => {
      expect(formatRelativeTime(null, 'it-IT')).toBe('Mai');
    });

    it('returns Proprio adesso for timestamp within 1 minute', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now, 'it-IT')).toBe('Proprio adesso');
    });

    it('pluralises minutes (minuti) beyond 1', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
      expect(formatRelativeTime(fiveMinutesAgo, 'it-IT')).toBe('5 minuti fa');
    });

    it('uses the singular (minuto) at exactly 1 minute', () => {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      expect(formatRelativeTime(oneMinuteAgo, 'it-IT')).toBe('1 minuto fa');
    });

    it('pluralises hours (ore) beyond 1', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
      expect(formatRelativeTime(twoHoursAgo, 'it-IT')).toBe('2 ore fa');
    });

    it('uses the singular (ora) at exactly 1 hour', () => {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      expect(formatRelativeTime(oneHourAgo, 'it-IT')).toBe('1 ora fa');
    });

    it('uses the singular (giorno) at exactly 1 day', () => {
      const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
      expect(formatRelativeTime(oneDayAgo, 'it-IT')).toBe('1 giorno fa');
    });

    it('pluralises days (giorni) beyond 1', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600000).toISOString();
      expect(formatRelativeTime(threeDaysAgo, 'it-IT')).toBe('3 giorni fa');
    });
  });
});
