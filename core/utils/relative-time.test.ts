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
});
