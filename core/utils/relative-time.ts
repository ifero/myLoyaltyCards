const ENGLISH_LOCALE = 'en-US';

export const formatRelativeTime = (isoString: string | null, locale = ENGLISH_LOCALE): string => {
  const isItalian = locale.toLowerCase().startsWith('it');

  if (!isoString) {
    return isItalian ? 'Mai' : 'Never';
  }

  const time = Date.parse(isoString);
  if (Number.isNaN(time)) {
    return isItalian ? 'Mai' : 'Never';
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - time);
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });

  if (diffSeconds < 60) {
    return isItalian ? 'Proprio adesso' : 'Just now';
  }

  if (diffMinutes < 60) {
    return isItalian ? formatter.format(-diffMinutes, 'minute') : `${diffMinutes} min ago`;
  }

  if (diffHours < 24) {
    return isItalian
      ? formatter.format(-diffHours, 'hour')
      : `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  return isItalian
    ? formatter.format(-diffDays, 'day')
    : `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};
