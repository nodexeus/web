import { Metadata } from 'nice-grpc-web';
import { authClient } from '../clients/authClient';
import { UIPagination } from '../clients/nodeClient';
import { friendlyError } from '@/lib/friendly-error';

// Inline readToken to remove @shared dependency
function readToken(token: string) {
  try {
    const middle = token.split('.')[1];
    return JSON.parse(Buffer.from(middle, 'base64').toString());
  } catch (err) {
    console.error('readToken: failed to parse token');
  }
}

export const getIdentity = () => {
  try {
    const raw = window.localStorage.getItem('identity');
    if (!raw) return '';
    return JSON.parse(raw);
  } catch (err) {
    console.warn(
      'Failed to parse identity from localStorage, clearing corrupted data.',
    );
    window.localStorage.removeItem('identity');
    return '';
  }
};

export const getOptions = (token?: string) => {
  return {
    metadata: Metadata({
      authorization: `Bearer ${token || getIdentity().accessToken}`,
    }),
  };
};

export const handleError = (error: any, shouldRedirect: boolean = true) => {
  const msg = error?.message || '';

  // Detect authentication failures — redirect to login so the user can re-authenticate
  const isAuthError =
    msg.includes('JWT') ||
    msg.includes('TOKEN_EXPIRED') ||
    msg.includes('UNAUTHENTICATED') ||
    ['UserService', 'NOT_FOUND'].every((s) => msg.includes(s));

  if (isAuthError) {
    localStorage.removeItem('identity');
    if (shouldRedirect) {
      window.location.href = '/login';
    }
  }

  throw new Error(friendlyError(error));
};

export const setTokenValue = (token: string, _refreshToken?: string) => {
  const identity = getIdentity() || {}; // Use empty object if no identity exists

  identity.accessToken = token;
  // Refresh token is stored in httpOnly cookie only — never in localStorage
  delete identity.refreshToken;

  const updatedIdentityString = JSON.stringify(identity);
  window.localStorage.setItem('identity', updatedIdentityString);
};

export const callWithTokenRefresh = async (
  method: (...args: any[]) => Promise<any>,
  ...args: any[]
): Promise<any> => {
  try {
    await authClient.refreshToken();
    return await method(...args, getOptions());
  } catch (err) {
    return handleError(err);
  }
};

export const getPaginationOffset = (pagination?: UIPagination) => {
  return !pagination
    ? 0
    : pagination?.currentPage! === 0
      ? 0
      : pagination?.currentPage! * pagination?.itemsPerPage!;
};

export const createSearch = (keyword: string) => `%${keyword}%`;
