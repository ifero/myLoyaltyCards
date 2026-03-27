import { retryWithBackoff } from './retry';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns immediately when the first attempt succeeds', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const onRetry = jest.fn();

    const result = await retryWithBackoff(fn, { onRetry });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('retries and succeeds on a subsequent attempt', async () => {
    const error = new Error('temporary failure');
    const fn = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('ok');
    const onRetry = jest.fn();

    const pending = retryWithBackoff(fn, { onRetry });
    await jest.advanceTimersByTimeAsync(1000);
    const result = await pending;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, 1000, error);
  });

  it('throws final error after max retries', async () => {
    const error = new Error('still failing');
    const fn = jest.fn<Promise<string>, []>().mockRejectedValue(error);
    const onRetry = jest.fn();

    const assertion = expect(retryWithBackoff(fn, { onRetry })).rejects.toThrow('still failing');
    await jest.advanceTimersByTimeAsync(1000 + 2000 + 4000);
    await assertion;
    expect(fn).toHaveBeenCalledTimes(4);
    expect(onRetry).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 1000, error);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 2000, error);
    expect(onRetry).toHaveBeenNthCalledWith(3, 3, 4000, error);
  });

  it('respects custom maxRetries and baseDelay', async () => {
    const error = new Error('nope');
    const fn = jest.fn<Promise<string>, []>().mockRejectedValue(error);
    const onRetry = jest.fn();

    const assertion = expect(
      retryWithBackoff(fn, { maxRetries: 2, baseDelay: 500, onRetry })
    ).rejects.toThrow('nope');
    await jest.advanceTimersByTimeAsync(500 + 1000);
    await assertion;
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 500, error);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 1000, error);
  });
});
