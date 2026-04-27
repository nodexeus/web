/**
 * Translates raw gRPC / network error messages into user-friendly strings.
 *
 * gRPC errors from the server typically look like:
 *   "ClientError: /blockjoy.v1.AuthService/Login PERMISSION_DENIED: Invalid email or password."
 *
 * When the server provides a meaningful message after the status code, we
 * extract and return that directly. We only fall back to generic messages
 * when the server message is missing or is just the status code itself.
 */
export function friendlyError(error: Error | null | unknown): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const msg = error instanceof Error ? error.message : String(error);

  // Try to extract the human-readable portion after the gRPC status code.
  // Pattern: "ClientError: /some.Service/Method STATUS_CODE: Actual message here."
  const grpcMatch = msg.match(
    /\b(PERMISSION_DENIED|UNAUTHENTICATED|NOT_FOUND|ALREADY_EXISTS|INVALID_ARGUMENT|DEADLINE_EXCEEDED|RESOURCE_EXHAUSTED|UNAVAILABLE|INTERNAL|FAILED_PRECONDITION|ABORTED|UNIMPLEMENTED|DATA_LOSS|CANCELLED|OUT_OF_RANGE):\s*(.+)/,
  );

  if (grpcMatch) {
    const statusCode = grpcMatch[1];
    const serverMessage = grpcMatch[2].trim();

    // If the server included a meaningful message, return it directly.
    // "Meaningful" = not empty, not just the status code repeated, and
    // not a generic "Missing permission: xyz" that leaks internal names.
    if (serverMessage && serverMessage !== statusCode) {
      // For permission errors that leak internal permission names like
      // "Missing permission: host-admin-list-hosts", replace with a
      // friendly message. But if the server says something descriptive
      // like "Invalid email or password", keep it.
      if (
        statusCode === 'PERMISSION_DENIED' &&
        serverMessage.match(/^Missing permission:\s*\S+$/)
      ) {
        return "You don't have permission to access this resource.";
      }

      // Return the server's own message — it's already human-readable.
      return serverMessage;
    }
  }

  // Fallback: no parseable server message — use generic friendly strings.
  if (msg.includes('PERMISSION_DENIED'))
    return "You don't have permission to access this resource.";
  if (msg.includes('UNAUTHENTICATED'))
    return 'Your session has expired. Please sign in again.';
  if (msg.includes('UNAVAILABLE') || msg.includes('Failed to fetch'))
    return 'Unable to reach the server. Please check your connection and try again.';
  if (msg.includes('NOT_FOUND')) return 'The requested resource was not found.';
  if (msg.includes('ALREADY_EXISTS')) return 'This resource already exists.';
  if (msg.includes('INVALID_ARGUMENT'))
    return 'Invalid input. Please check your data and try again.';
  if (msg.includes('DEADLINE_EXCEEDED'))
    return 'The request took too long. Please try again.';
  if (msg.includes('RESOURCE_EXHAUSTED'))
    return 'Too many requests. Please wait a moment and try again.';
  if (msg.includes('INTERNAL'))
    return 'A server error occurred. Please try again later.';
  return 'An unexpected error occurred. Please try again.';
}
