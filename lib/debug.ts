/**
 * Development-only debug logger.
 * In production builds, these calls are no-ops.
 */
export function debugLog(label: string, ...args: unknown[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${label}`, ...args);
  }
}
