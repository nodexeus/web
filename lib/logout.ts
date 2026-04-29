/**
 * Centralized logout utility. Clears all auth state and redirects to login.
 * Must be called from client-side code only.
 */
export async function performLogout() {
  try {
    // Call server-side logout endpoint to clear httpOnly auth cookies
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {
    // Best effort — clear client state regardless
  }
  // Clear all stored data (tokens, settings, etc.)
  localStorage.clear();
  // Hard navigate to login (resets all React state)
  window.location.href = '/login';
}
