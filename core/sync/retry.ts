type RetryOptions = {
  maxRetries?: number;
  baseDelay?: number;
  onRetry: (attempt: number, delayMs: number, error: unknown) => void;
};

const sleep = (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> => {
  const { maxRetries = 3, baseDelay = 1000, onRetry } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delayMs = baseDelay * Math.pow(2, attempt);
      onRetry(attempt + 1, delayMs, error);

      await sleep(delayMs);
    }
  }

  throw new Error('Unreachable retry state');
};
