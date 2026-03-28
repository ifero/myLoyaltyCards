import { logger } from '@/core/utils/logger';

type RetryOptions = {
  maxRetries?: number;
  baseDelay?: number;
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
};

const sleep = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        const underlying = error instanceof Error ? error.message : String(error);
        const maxErr = new Error(`Sync failed after max retries: ${underlying}`);
        maxErr.name = 'SYNC_MAX_RETRIES';
        (maxErr as { details?: unknown }).details = error;
        throw maxErr;
      }

      const delayMs = baseDelay * Math.pow(2, attempt);
      if (onRetry) {
        onRetry(attempt + 1, delayMs, error);
      } else {
        logger.warn(`[retryWithBackoff] Retry ${attempt + 1}/${maxRetries} in ${delayMs}ms`, error);
      }

      await sleep(delayMs);
    }
  }

  throw new Error('Unreachable retry state');
};
