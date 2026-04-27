/**
 * Validates that a request originates from the same origin.
 * Returns true if the origin is valid or cannot be determined (e.g., same-origin requests
 * without an Origin header, such as direct navigation).
 */
export function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  // If no Origin header, this is likely a same-origin or non-browser request — allow
  if (!origin) return true;

  // In development, allow localhost origins
  if (process.env.NODE_ENV === 'development') {
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return true;
    }
  }

  // In production, validate against the app's own host
  const host = request.headers.get('host');
  if (!host) return true;

  try {
    const originUrl = new URL(origin);
    // Compare just the hostname (ignore port differences for flexibility)
    return originUrl.hostname === host.split(':')[0];
  } catch {
    return false;
  }
}
