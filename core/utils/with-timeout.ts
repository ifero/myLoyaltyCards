/**
 * withTimeout
 * Story 16.10: Fix offline cold-start hang
 *
 * Bounds a promise so it can never block a critical path indefinitely. If
 * `promise` does not settle within `timeoutMs`, the returned promise rejects
 * with a timeout error; otherwise it mirrors the original promise's settlement.
 *
 * The original promise keeps its own settlement handlers attached, so a late
 * rejection (after the timeout has already fired) is consumed here and never
 * surfaces as an unhandled promise rejection.
 *
 * Motivation: `Updates.checkForUpdateAsync()` has no JS-level timeout and can
 * stall app boot on a flaky (connected-but-no-internet) network. Wrapping it
 * guarantees boot proceeds within a bounded time (AC1).
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = `Operation timed out after ${timeoutMs}ms`
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
};
