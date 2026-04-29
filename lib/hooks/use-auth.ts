import { useSyncExternalStore } from 'react';

type Identity = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  accessToken: string;
};

// Cache the last raw string and parsed result so useSyncExternalStore
// always receives the same object reference when the underlying data
// hasn't changed. JSON.parse() creates a new object every call, which
// would cause useSyncExternalStore to think the store changed on every
// render — triggering an infinite re-render loop.
let cachedRaw: string | null = null;
let cachedIdentity: Identity | null = null;

function getIdentitySnapshot(): Identity | null {
  try {
    const raw = window.localStorage.getItem('identity');
    if (!raw) {
      cachedRaw = null;
      cachedIdentity = null;
      return null;
    }
    // Only re-parse if the raw string actually changed
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedIdentity = JSON.parse(raw);
    }
    return cachedIdentity;
  } catch {
    cachedRaw = null;
    cachedIdentity = null;
    return null;
  }
}

function getServerSnapshot(): Identity | null {
  return null;
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export function useAuth() {
  const identity = useSyncExternalStore(
    subscribe,
    getIdentitySnapshot,
    getServerSnapshot,
  );

  return {
    isLoggedIn: Boolean(identity?.accessToken),
    user: identity,
    accessToken: identity?.accessToken ?? null,
  };
}
