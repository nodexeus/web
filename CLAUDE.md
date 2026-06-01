# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Nodexeus Web (a.k.a. BlockVisor) is a Next.js 14 (App Router) dashboard for deploying, managing, and monitoring Web3 / blockchain nodes, hosts, and organizations. It talks to a backend over **gRPC-Web** and receives real-time updates over **MQTT**.

## Commands

```bash
yarn dev              # Dev server on http://localhost:3000
yarn build            # Production build
yarn start            # Serve production build
yarn lint             # ESLint (next/core-web-vitals)

yarn test             # Vitest in watch mode
yarn test:run         # Vitest single run (CI)
yarn test:ui          # Vitest UI
yarn vitest run path/to/file.test.ts   # Run one test file
yarn vitest -t "test name"             # Run tests matching a name
```

- Node: **v20** (`.nvmrc`; the Dockerfile also builds on `node:20-alpine`).
- Setup: `cp .env.template .env.local` and fill in values before running.

## Environment Variables

`NEXT_PUBLIC_API_URL` (gRPC-Web endpoint, used by the browser), `API_URL` (server-side fallback for BFF auth routes), `NEXT_PUBLIC_MQTT_URL` (optional), `NEXT_PUBLIC_STRIPE_KEY` (optional, enables billing UI), `NEXT_PUBLIC_SHORT_SHA` (CI-injected), `ALLOWED_ORIGINS` (comma-separated origin hostnames for API-route CSRF protection behind a reverse proxy).

## Architecture

### Authentication — BFF (Backend-for-Frontend) pattern
This is the central, non-obvious design. Auth is split between server-side cookies and client-side gRPC calls:

- **`app/api/auth/{login,refresh,logout}/route.ts`** are server routes that call the backend's `AuthService` with a *server-side* gRPC client (it cannot reuse the browser client). On login they set two **httpOnly** cookies: `bv-token` (JWT access, 1h) and `bv-refresh` (refresh, 30d). The refresh token never reaches the browser/localStorage.
- These routes reject requests whose origin isn't in `ALLOWED_ORIGINS` via `lib/validate-origin.ts`.
- **`middleware.ts`** guards all non-public routes: it reads the `bv-token` cookie, checks JWT expiry, and redirects to `/login` (preserving a `redirect` param). If the access token is expired but `bv-refresh` exists, it lets the request through so the client can trigger `/api/auth/refresh`. The public-route allowlist lives at the top of this file.
- The browser keeps an `identity` object in `localStorage` containing only `accessToken` + user fields (set via `setTokenValue` in `modules/grpc/utils/utils.ts`). `lib/hooks/use-auth.ts` exposes it reactively via `useSyncExternalStore` — note its deliberate parse-caching to avoid an infinite render loop.

### gRPC layer (`modules/grpc/`)
- **`library/`** — auto-generated protobuf TypeScript from `blockjoy/*` definitions. **DO NOT EDIT** these by hand. They are generated **in-repo** (no longer out-of-band) from the **`proto/` git submodule** (`git@github.com:nodexeus/protobufs.git`, tracking `main`) via `yarn gen:proto`, which runs `grpc_tools_node_protoc` with `ts-proto`. To bump the proto contract: `git submodule update --remote proto` to pull the latest `protobufs` `main`, then `yarn gen:proto` to regenerate the bindings (commit the submodule pointer bump and the regenerated `library/` files together). After a fresh clone, run `git submodule update --init` before generating. The codegen toolchain (`grpc-tools`, `ts-proto`) and runtime deps (`long`, `protobufjs`) are pinned to match the `protobufs` repo so regenerating yields semantic deltas, not reformatting churn.
- **`clients/*.ts`** — one class per service (`nodeClient`, `hostClient`, `authClient`, `organizationClient`, etc.), each instantiated as a singleton and re-exported from `modules/grpc/index.ts`. Browser clients build their channel from `NEXT_PUBLIC_API_URL`. Clients translate UI-friendly shapes (e.g. `UINodeFilterCriteria`, `UIPagination`) into protobuf request messages.
- **`utils/utils.ts`** — `getOptions()` attaches the `Bearer` token as gRPC metadata; `callWithTokenRefresh()` wraps calls to retry after a token refresh; `handleError()` detects auth failures (`JWT`/`UNAUTHENTICATED`/expired), clears `identity`, redirects to `/login`, and rethrows a `friendlyError`. Route new gRPC calls through these helpers rather than calling clients raw.

### State management
- **TanStack Query** for all server state. The `QueryClient` is configured in `app/providers.tsx` (30s `staleTime`, 1 retry, no refetch on focus).
- **Zustand** for client-only state in `lib/stores/` (`notification-store.ts`, `theme-store.ts`).
- (Note: older docs or commits may reference a Recoil/SWR/Emotion/`pages/` stack — that has been **fully replaced** by the above. Trust the code.)

### Permissions / RBAC
`lib/hooks/use-permissions.ts` fetches the user's permission strings for the current org via `authClient.listPermissions` and exposes booleans (`canDeleteNode`, `canStartNode`, `isSuperUser`, …). UI is gated on these. Account for the org-loading chain: a disabled query reports `isLoading: false`, so `usePermissions` folds in org-loading state to avoid flashing "Access Denied".

### Real-time (MQTT)
`lib/hooks/use-mqtt.ts` + `components/layout/mqtt-provider.tsx` subscribe to `/orgs/{id}` and `/orgs/{id}/nodes` topics, invalidate the relevant TanStack Query caches, and push notifications into the Zustand notification store. It has a 5s warmup that suppresses the initial status-message flood, and `setExpectedNodeState()` lets action handlers pre-seed state to dedupe self-triggered events.

### Routing (`app/`)
App Router with route groups: **`(auth)/`** (login, register, invites, password reset — all public) and **`(dashboard)/`** (nodes, hosts, organizations, settings/billing, launch-node, and an **`admin/`** sub-area for users/orgs/hosts/nodes/protocols). Dynamic detail pages use `[id]`.

### Styling
Tailwind CSS + shadcn/ui primitives in `components/ui/` (Radix-based). Design tokens are CSS custom properties — see `colors.md` and `app/globals.css`. Use `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for conditional classes.

## Conventions

- **Path aliases** (`tsconfig.json`): `@/*` (root), `@/lib/*`, `@modules/*`, `@public/*`.
- TypeScript is `strict` but with `noImplicitAny: false` and `strictNullChecks: false` — the gRPC clients lean on non-null assertions (`!`) heavily as a result.
- Prettier: single quotes, trailing commas, `tabWidth: 2` for code files.
- SVGs imported from JS/TS become React components via `@svgr/webpack` (configured in `next.config.js`).
- Security headers (X-Frame-Options DENY, HSTS in prod, etc.) are set globally in `next.config.js`.

## CI/CD

Pushes to `develop` and `main` trigger `.github/workflows/bv-web-build.yml`, which builds and pushes Docker images for **demo**, **development**, and **production**. `NEXT_PUBLIC_*` values are baked in at build time as Docker build args.
