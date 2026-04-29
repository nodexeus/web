/**
 * Validates that a request originates from an allowed origin.
 * Returns true if the origin is valid or cannot be determined (e.g., same-origin requests
 * without an Origin header, such as direct navigation).
 *
 * Checks in order:
 * 1. No Origin header → allow (same-origin / non-browser request)
 * 2. Development localhost → allow
 * 3. ALLOWED_ORIGINS env var → allow if origin hostname is listed
 * 4. x-forwarded-host / host header match → allow
 */
export function isValidOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  // If no Origin header, this is likely a same-origin or non-browser request — allow
  if (!origin) return true;

  let originHostname: string;
  try {
    originHostname = new URL(origin).hostname;
  } catch {
    return false;
  }

  // In development, allow localhost origins
  if (process.env.NODE_ENV === 'development') {
    if (originHostname === 'localhost' || originHostname === '127.0.0.1') {
      return true;
    }
  }

  // Check against explicitly allowed origins (comma-separated hostnames).
  // This is the most reliable check when running behind proxies like
  // Cloudflare Tunnels where forwarded headers may not be predictable.
  const allowed = process.env.ALLOWED_ORIGINS;
  if (allowed) {
    const allowedList = allowed.split(',').map((h) => h.trim().toLowerCase());
    if (allowedList.includes(originHostname.toLowerCase())) {
      return true;
    }
  }

  // Fallback: compare against the forwarded or direct host header
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) return true;

  return originHostname === host.split(':')[0];
}
