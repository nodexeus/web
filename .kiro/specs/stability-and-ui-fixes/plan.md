# Stability & UI Improvement Plan

## Overview

This plan addresses three critical issues identified during a deep codebase analysis. These were selected as the highest-impact, most urgent items from a broader set of six proposals.

## Issue 1: MQTT Keep-Alive Bug & Stale Closures (Stab-1)

**Severity:** Critical — real-time updates are silently broken in production  
**Effort:** Small  
**Files to modify:**
- `web/modules/mqtt/hooks/useMqtt.ts`

### Problem Description

1. **Inverted guard condition** (line 149): `if (!keepAliveWorker.current) return;` exits early when the ref is `null` (its initial value), meaning the Web Worker is **never created**. Since MQTT `keepalive` is set to `0`, without ping packets the broker will disconnect the client after its idle timeout. Real-time node/org updates silently stop working.

2. **Stale closures in MQTT event handlers**: The `handleMessage` callback is memoized with `useCallback([], [])` (empty deps). When organization changes, `handleNodeUpdate` and `handleOrganizationUpdate` still reference old organization data. The `mqttUpdateSubscription` function called from the `connect` handler also closes over a stale `defaultOrganization`.

### Implementation Steps

#### Step 1: Fix the keep-alive worker guard
- **Line 149**: Change `if (!keepAliveWorker.current) return;` → `if (keepAliveWorker.current) return;`
- This ensures the worker is only created once (skip if already exists) and actually starts on first call.

#### Step 2: Add cleanup for the keep-alive worker
- In `manageKeepAliveWorker`, before creating a new worker, terminate any existing one.
- Add `keepAliveWorker.current?.terminate();` before the assignment.

#### Step 3: Fix stale closure on `handleMessage`
- Remove `useCallback` wrapper from `handleMessage` (or update its dependency array to include the update handlers).
- Use a `useRef` to hold the latest `handleNodeUpdate` and `handleOrganizationUpdate` references, so the message handler always calls the current version.

#### Step 4: Fix stale closure on `mqttUpdateSubscription`
- The `client.on('connect', ...)` handler in the `useEffect` at line 104 calls `mqttUpdateSubscription()`, which reads `defaultOrganization` from its closure.
- Add a separate `useEffect` that calls `mqttUpdateSubscription()` when `defaultOrganization` changes (and client is connected).

#### Step 5: Verify fix
- Manually test that MQTT connections stay alive past the broker's idle timeout (>30s).
- Verify that switching organizations properly resubscribes to new org topics.
- Check browser console for "keep-alive" ping messages.

---

## Issue 2: Error Handling Chain Bugs (Stab-2)

**Severity:** Critical — silent data corruption, auth failures, app crashes  
**Effort:** Medium  
**Files to modify:**
- `web/utils/checkForApiError.ts`
- `web/modules/auth/utils/Errors.ts`
- `web/modules/grpc/utils/utils.ts`
- `web/modules/grpc/clients/nodeClient.ts`
- `web/utils/checkForTokenError.ts`

### Problem Description

Five compounding bugs in the error handling chain:

1. **`checkForApiError` logic bug**: `response.code >= 1 || response.code <= 16` is always true — should be `&&`.
2. **`ApplicationError` doesn't extend `Error`**: Uses `implements` instead of `extends`, so no stack trace, `instanceof Error` fails.
3. **`getIdentity()` has no try/catch around `JSON.parse`**: Corrupted localStorage crashes the entire app on every gRPC request.
4. **Double token refresh in `nodeClient.getNode()`**: Calls `authClient.refreshToken()` explicitly, then `callWithTokenRefresh()` calls it again internally — race condition.
5. **Duplicate `checkForTokenError`**: Two different token-error handlers with different coverage.

### Implementation Steps

#### Step 1: Fix `checkForApiError` — change `||` to `&&`
**File:** `web/utils/checkForApiError.ts`
- Line 6: Change `if (response.code >= 1 || response.code <= 16)` → `if (response.code >= 1 && response.code <= 16)`

#### Step 2: Fix `ApplicationError` to extend `Error`
**File:** `web/modules/auth/utils/Errors.ts`
- Change `export class ApplicationError implements Error` → `export class ApplicationError extends Error`
- Call `super(message)` in the constructor
- Add `Object.setPrototypeOf(this, ApplicationError.prototype)` for correct prototype chain in transpiled code

#### Step 3: Add try/catch to `getIdentity()`
**File:** `web/modules/grpc/utils/utils.ts`
- Wrap `JSON.parse(window.localStorage.getItem('identity') || '{}')` in try/catch
- On parse failure, remove the corrupted localStorage entry and return empty string
- Log a warning (not the raw data) so the issue is debuggable

#### Step 4: Fix double token refresh in `nodeClient.getNode()`
**File:** `web/modules/grpc/clients/nodeClient.ts`
- Line 192: Remove the standalone `await authClient.refreshToken();` call before `callWithTokenRefresh()`
- `callWithTokenRefresh` already handles the refresh internally

#### Step 5: Unify token error checking
**File:** `web/utils/checkForTokenError.ts`
- Update to match the more comprehensive checks from `web/modules/grpc/utils/utils.ts` (also check for `TOKEN_EXPIRED` and `UserService/NOT_FOUND`)
- Add a code comment referencing the canonical implementation in `handleError`

#### Step 6: Verify fixes
- Test with corrupted localStorage (manually set `identity` to invalid JSON in DevTools)
- Test API error responses with various gRPC status codes
- Verify `ApplicationError` has proper stack traces in the console
- Test concurrent API calls to verify no double-refresh race conditions

---

## Issue 3: React Error Boundaries (UI-2)

**Severity:** Critical — any render error causes full white-screen crash  
**Effort:** Medium  
**Files to create:**
- `web/shared/components/General/ErrorBoundary/ErrorBoundary.tsx`
- `web/shared/components/General/ErrorBoundary/ErrorBoundary.styles.ts`
- `web/shared/components/General/ErrorBoundary/index.ts`

**Files to modify:**
- `web/shared/components/General/index.ts` (add export)
- `web/shared/components/index.ts` (verify re-export)
- `web/pages/_app.tsx` (wrap layout in ErrorBoundary)
- `web/modules/layout/components/AppLayout.tsx` (wrap page content in ErrorBoundary)

### Problem Description

There are zero React ErrorBoundary components in the entire component tree. If any component throws during rendering — malformed API response, null dereference, protobuf decode failure — the entire app crashes to a white screen with no recovery path. This is compounded by several render-path hazards already in the code (direct `window` access in render, `?.` followed by `!`, `NaN` from undefined arithmetic).

### Implementation Steps

#### Step 1: Create `ErrorBoundary` component
**File:** `web/shared/components/General/ErrorBoundary/ErrorBoundary.tsx`
- Class component (required for error boundaries — hooks can't catch render errors)
- Props: `children`, `fallback?` (optional custom fallback), `onError?` (optional error callback), `level` ('page' | 'section' | 'widget')
- State: `hasError`, `error`, `errorInfo`
- Implement `static getDerivedStateFromError()` and `componentDidCatch()`
- Default fallback UI varies by `level`:
  - `page`: Full-page error with "Something went wrong" message and "Reload" button
  - `section`: Card-style error with "Retry" button that resets the boundary
  - `widget`: Inline minimal error with "Retry" link
- "Retry" resets `hasError` to false, re-rendering children
- Log error details to console in development only

#### Step 2: Create styles
**File:** `web/shared/components/General/ErrorBoundary/ErrorBoundary.styles.ts`
- Use Emotion CSS-in-JS (consistent with the rest of the project)
- Style the three fallback levels (page, section, widget)
- Use theme tokens for colors

#### Step 3: Create barrel export
**File:** `web/shared/components/General/ErrorBoundary/index.ts`
- `export * from './ErrorBoundary';`

#### Step 4: Add to shared component exports
**File:** `web/shared/components/General/index.ts`
- Add `export * from './ErrorBoundary';`

#### Step 5: Add page-level ErrorBoundary in `_app.tsx`
**File:** `web/pages/_app.tsx`
- Import `ErrorBoundary` from `@shared/components`
- Wrap `{getLayout(<Component {...pageProps} />)}` with `<ErrorBoundary level="page">`
- This catches any unhandled error from any page

#### Step 6: Add section-level ErrorBoundary in AppLayout
**File:** `web/modules/layout/components/AppLayout/AppLayout.tsx`
- Read the file first to understand the layout structure
- Wrap the main content area (where `{children}` is rendered) with `<ErrorBoundary level="section">`
- This catches errors in page content while keeping the sidebar/nav functional

#### Step 7: Verify
- Create a temporary component that throws on render and verify the boundary catches it
- Test the "Retry" button resets the boundary
- Verify the sidebar/navigation remains functional when a section-level error occurs
- Remove the temporary test component

---

## Execution Order

Recommended order of implementation:
1. **Stab-1 (MQTT)** first — smallest change, biggest immediate impact
2. **Stab-2 (Error Handling)** second — fixes multiple compounding bugs
3. **UI-2 (Error Boundaries)** third — adds resilience layer on top of the other fixes

## Testing Strategy

- **Manual testing** for MQTT keep-alive (observe connections staying alive)
- **Manual testing** for error handling (corrupt localStorage, check stack traces)
- **Visual testing** for error boundaries (force render errors, verify fallback UI)
- Consider adding unit tests for `checkForApiError`, `ApplicationError`, and `getIdentity` as part of Stab-2