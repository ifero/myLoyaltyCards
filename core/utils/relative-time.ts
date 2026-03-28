export const formatRelativeTime = (isoString: string | null): string => {
  if (!isoString) {
    return 'Never';
  }

  const time = Date.parse(isoString);
  if (Number.isNaN(time)) {
    return 'Never';
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - time);
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSeconds < 60) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};
