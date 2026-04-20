/**
 * Check for token-related errors and force re-authentication if detected.
 *
 * Note: The canonical error handler is `handleError` in `@modules/grpc/utils/utils.ts`.
 * This utility is used in places that call gRPC clients which may return error-like
 * responses rather than throwing (e.g., `organizationClient.getOrganization`).
 */
export const checkForTokenError = (response: any) => {
  if (
    response?.message?.includes('JWT') ||
    response?.message?.includes('TOKEN_EXPIRED') ||
    ['UserService', 'NOT_FOUND'].every((msg) =>
      response?.message?.includes(msg),
    )
  ) {
    localStorage.removeItem('identity');
    window.location.href = '/';
  }
};
