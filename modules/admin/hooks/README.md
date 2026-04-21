# Admin List State Management

## Overview

The `useAdminListState` hook provides centralized state management for admin list components, handling filtering, pagination, sorting, and state synchronization with URLs and persistent settings.

## Features

-   **Centralized State**: Single source of truth for all list state
-   **URL Synchronization**: Automatic sync with browser URL parameters
-   **Settings Persistence**: Save user preferences across sessions
-   **Debounced Updates**: Prevents excessive API calls and URL updates
-   **Type Safety**: Full TypeScript support with comprehensive type definitions
-   **Error Handling**: Built-in error state management
-   **Loading States**: Integrated loading state management

## Usage

```typescript
import { useAdminListState } from '@modules/admin/hooks';
import { SortOrder } from '../../../generated/blockjoy/common/v1/search';

// Configuration
const config = {
    defaultPageSize: 24,
    defaultSortField: 1,
    defaultSortOrder: SortOrder.SORT_ORDER_ASCENDING,
    initialFilters: {},
};

// In your component
const { state, actions, helpers } = useAdminListState('nodes', config);

// Use the state
console.log(state.search, state.page, state.filters);

// Update the state
actions.setSearch('query');
actions.setPage(2);
actions.setFilters('status', ['active']);
```

## State Structure

```typescript
type AdminListState = {
    search: string; // Current search query
    page: number; // Current page (1-based)
    pageSize: number; // Items per page
    sortField: number; // Sort field ID
    sortOrder: SortOrder; // Sort direction
    filters: Record<string, string[]>; // Active filters
    isLoading: boolean; // Loading state
    error: string | null; // Error state
};
```

## Actions

-   `setSearch(search: string)` - Update search query
-   `setPage(page: number)` - Change current page
-   `setPageSize(pageSize: number)` - Change page size
-   `setSort(field: number, order: SortOrder)` - Update sorting
-   `setFilters(column: string, values: string[])` - Set column filters
-   `setBulkFilters(filters: Record<string, string[]>)` - Set multiple filters
-   `clearFilters()` - Clear all filters
-   `clearColumnFilter(column: string)` - Clear specific column filter
-   `setLoading(isLoading: boolean)` - Set loading state
-   `setError(error: string | null)` - Set error state
-   `reset()` - Reset to initial state

## Helpers

-   `validatePage(totalItems: number)` - Validate and correct page number
-   `getActiveFilterCount()` - Get total number of active filters
-   `isFilterActive(column: string, value?: string)` - Check if filter is active
-   `getQueryParams()` - Get current state as API query parameters

## Configuration Options

```typescript
type AdminListStateConfig = {
    defaultPageSize: number;
    defaultSortField: number;
    defaultSortOrder: SortOrder;
    initialFilters?: Record<string, string[]>;
};

type AdminListSyncOptions = {
    syncToUrl: boolean; // Enable URL sync (default: true)
    syncToSettings: boolean; // Enable settings sync (default: true)
    urlDebounceMs: number; // URL update delay (default: 300ms)
    settingsDebounceMs: number; // Settings update delay (default: 1000ms)
};
```

## State Synchronization

The hook automatically synchronizes state with:

1. **URL Parameters**: Filters, pagination, and search are reflected in the URL
2. **User Settings**: Page size and sort preferences are persisted
3. **Component State**: All changes are immediately reflected in the UI

### URL Parameter Format

-   `page` - Current page number
-   `pageSize` - Items per page
-   `search` - Search query
-   `sortField` - Sort field ID
-   `sortOrder` - Sort order enum value
-   `filter_{columnName}` - Comma-separated filter values

Example: `/admin?name=nodes&page=2&pageSize=48&search=test&filter_status=active,pending`

## Error Handling

The hook includes built-in error handling:

-   State validation and normalization
-   Page boundary validation
-   Filter value sanitization
-   Graceful fallback to previous state on errors

## Performance Optimizations

-   **Debounced Updates**: URL and settings updates are debounced to prevent excessive calls
-   **State Comparison**: Only updates when state actually changes
-   **Memoized Helpers**: Helper functions are memoized for performance
-   **Shallow URL Updates**: URL updates use shallow routing to prevent full page reloads

## Migration from Existing Code

To migrate existing admin list components:

1. Replace existing state management with `useAdminListState`
2. Update filter handlers to use `actions.setFilters`
3. Replace pagination logic with `actions.setPage` and `actions.setPageSize`
4. Use `helpers.getQueryParams()` for API calls
5. Remove manual URL parameter handling

## Example Implementation

See `modules/admin/examples/useAdminListStateExample.tsx` for a complete implementation example.
