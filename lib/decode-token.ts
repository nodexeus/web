/**
 * Decodes the payload of a JWT token (base64url → JSON).
 *
 * ⚠️ WARNING: This performs NO signature verification. It is a client-side
 * convenience for extracting claims from tokens whose authenticity has
 * already been established by the server. Never use the output to make
 * security decisions without server-side validation.
 */
export function decodeToken(token: string): Record<string, any> | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}
