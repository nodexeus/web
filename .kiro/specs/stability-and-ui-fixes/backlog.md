# Future Improvement Backlog

These three proposals were identified during the deep codebase analysis but deferred in favor of the more critical stability and error handling fixes. They should be tackled in a future sprint.

---

## Backlog Item 1: Accessibility Overhaul (UI-1)

**Severity:** Critical for compliance, Medium for functionality  
**Effort:** Large  
**Category:** UI Improvement

### Summary
The entire shared component library has zero ARIA attributes. Modal, Dropdown, Tabs, Alert, Tooltip, Search, Pagination — none have proper roles, labels, or live region annotations. Focus outlines are globally removed in `web/styles/global.styles.ts` with no `:focus-visible` replacement.

### Scope
- Add `role`, `aria-label`, `aria-expanded`, `aria-modal`, `aria-selected`, `aria-live`, `aria-describedby` across ~15 shared components
- Replace `outline: none` with `:focus-visible` styles
- Audit and fix `useAccessibleDropdown` stale closure bug (empty `useCallback` deps)
- Add `aria-current="page"` to pagination
- Add `role="search"` to Search component

### Key Files
- `web/shared/components/General/Modal/Modal.tsx`
- `web/shared/components/Buttons/Dropdown/Dropdown.tsx`
- `web/shared/components/General/Tabs/Tabs.tsx`
- `web/shared/components/General/Alert/Alert.tsx`
- `web/shared/components/General/Tooltip/Tooltip.tsx`
- `web/shared/components/General/Search/Search.tsx`
- `web/shared/components/Tables/Pagination/Pagination.tsx`
- `web/styles/global.styles.ts`
- `web/shared/hooks/useAccessibleDropdown.ts`

---

## Backlog Item 2: Dynamic Imports & Bundle Splitting (Perf-1)

**Severity:** High  
**Effort:** Medium  
**Category:** Performance Improvement

### Summary
Zero `next/dynamic` imports exist in the codebase. All pages eagerly import their full module trees. The admin panel, billing/Stripe components, and node launcher wizard are bundled into initial chunks even for users who never visit those routes. Barrel exports from `@modules/auth` in `_app.tsx` pull the entire auth module (all hooks, forms, password meters) into every page.

### Scope
- Add `next/dynamic` with `{ ssr: false }` for heavy page components: Admin, NodeLauncher, Billing (Subscription, BillingAddress, PaymentMethods, Invoices)
- Change `_app.tsx` import from `'@modules/auth'` barrel to direct subpath: `'@modules/auth/components/PrivateRoute/PrivateRoute'`
- Replace `react-device-detect` usage in `web/pages/organizations/index.tsx` with a CSS media query or custom hook
- Audit barrel exports in other modules for similar bloat

### Key Files
- `web/pages/_app.tsx`
- `web/pages/admin/index.tsx`
- `web/pages/launch-node/index.tsx`
- `web/pages/settings/subscription/index.tsx`
- `web/pages/settings/billing-address/index.tsx`
- `web/pages/settings/payment-methods/index.tsx`
- `web/pages/settings/invoices/index.tsx`
- `web/pages/organizations/index.tsx`
- `web/modules/auth/index.ts`

---

## Backlog Item 3: Reduce Cascading Re-renders (Perf-2)

**Severity:** High  
**Effort:** Large  
**Category:** Performance Improvement

### Summary
Core data hooks (`useNodeList`, `useHostList`, `useUpdates`) subscribe to 10+ Recoil atoms each, causing every MQTT message to trigger cascading re-renders. Functions like `loadNodes`, `loadHosts`, `getCommands` are recreated every render due to missing `useCallback`/`useMemo`. `loadGlobalNodes` fetches up to 1000 nodes into a single atom, and pagination appends without limit.

### Scope
- Split `useNodeList` into smaller focused hooks (e.g., `useNodeListData`, `useNodeListActions`, `useNodeListFilters`)
- Add `useCallback` to all action functions exposed by hooks
- Add `useMemo` to derived computations
- Implement virtual scrolling for large node/host lists (e.g., `react-window`)
- Cap pagination array growth or implement windowed pagination
- Consider moving MQTT update handlers to a Recoil `effect` to avoid component-level subscriptions

### Key Files
- `web/modules/node/hooks/useNodeList.tsx`
- `web/modules/node/hooks/useUpdates.tsx`
- `web/modules/node/hooks/useNodeView.tsx`
- `web/modules/host/hooks/useHostList.tsx`
- `web/modules/mqtt/hooks/useMqtt.ts`
- `web/modules/node/store/nodeAtoms.ts`
