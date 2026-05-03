/**
 * Debug utilities for useImageScan barcode detection
 * Helps diagnose why scanFromURLAsync fails in certain environments
 */

export interface ScanDebugResult {
  uri: string;
  timestamp: number;
  environment: 'simulator' | 'device' | 'unknown';
  supportedTypes: string[];
  scannedCount: number;
  scannedDetails: Array<{ data: string; type: string }>;
  error?: string;
  durationMs: number;
}

let debugHistory: ScanDebugResult[] = [];

/**
 * Detect if running on simulator or device
 * Note: This is a heuristic; not 100% reliable in all cases
 */
export function detectEnvironment(): 'simulator' | 'device' | 'unknown' {
  try {
    // On Android simulator, certain hardware features return specific values
    // On iOS simulator, certain APIs behave differently
    // This is best-effort detection
    if (__DEV__) {
      // In development, we can't reliably detect simulator vs device
      // User should manually verify or check device logs
      return 'unknown';
    }
    return 'device';
  } catch {
    return 'unknown';
  }
}

/**
 * Log a barcode scan attempt for debugging
 */
export function logScanDebug(
  uri: string,
  supportedTypes: string[],
  scannedCount: number,
  scannedDetails: Array<{ data: string; type: string }>,
  durationMs: number,
  error?: string
): ScanDebugResult {
  const result: ScanDebugResult = {
    uri,
    timestamp: Date.now(),
    environment: detectEnvironment(),
    supportedTypes,
    scannedCount,
    scannedDetails,
    error,
    durationMs
  };

  debugHistory.push(result);
  // Keep last 50 scans
  if (debugHistory.length > 50) {
    debugHistory.shift();
  }

  return result;
}

/**
 * Get all debug history
 */
export function getDebugHistory(): ScanDebugResult[] {
  return [...debugHistory];
}

/**
 * Clear debug history
 */
export function clearDebugHistory(): void {
  debugHistory = [];
}

/**
 * Export debug data as JSON for sharing
 */
export function exportDebugData(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      history: debugHistory
    },
    null,
    2
  );
}

/**
 * Log commonly seen error patterns
 */
export function analyzeFailurePattern(): string {
  if (debugHistory.length === 0) {
    return 'No scan attempts recorded';
  }

  const failures = debugHistory.filter((r) => r.scannedCount === 0);
  const errors = debugHistory.filter((r) => r.error !== undefined);

  if (failures.length === debugHistory.length) {
    return `ALL ${failures.length} scan attempts returned 0 barcodes. Likely causes:
1. iOS Simulator: scanFromURLAsync has known limitations with photo library URIs
2. Image format: Try JPEG instead of PNG, or vice versa
3. Image quality: Ensure barcode is clear (>100px in smallest dimension)
4. URI encoding: Some photo library URIs may not be accessible to native scanner`;
  }

  if (errors.length > 0) {
    const errorMessages = errors.map((e) => `${e.timestamp}: ${e.error}`).join('\n');
    return `${errors.length} scan attempts threw errors:\n${errorMessages}`;
  }

  const successRate = ((1 - failures.length / debugHistory.length) * 100).toFixed(1);
  return `Success rate: ${successRate}% (${debugHistory.length - failures.length}/${debugHistory.length})`;
}
