# Design Document

## Overview

The admin list filtering and pagination issues stem from race conditions in state management, improper useEffect dependencies, and inconsistent state synchronization between URL parameters, local component state, and persistent settings. The solution involves refactoring the state management flow to ensure proper sequencing of operations and reliable state synchronization.

## Architecture

### Current Issues Analysis

1. **Filter State Race Conditions**: The `handleFiltersChanged` function updates settings and triggers a re-fetch, but the useEffect dependencies create circular updates that can cause filters to be reset or not applied properly.

2. **Page Size State Inconsistency**: The page size is managed in multiple places (local state, settings, and URL) without proper synchronization, causing the selector to appear to work but not actually change the data fetching parameters.

3. **URL State Synchronization**: The URL parameters are not consistently synchronized with the actual filtering and pagination state, leading to bookmarking and navigation issues.

## Components and Interfaces

### Enhanced State Management

#### AdminList Component Refactoring

-   **Centralized State Management**: Create a single source of truth for all list state (filters, pagination, sorting)
-   **State Synchronization Layer**: Implement a state synchronization service that manages URL, settings, and component state
-   **Debounced Operations**: Add debouncing to prevent rapid successive API calls during filter changes

#### New State Interface

```typescript
interface AdminListState {
    search: string;
    page: number;
    pageSize: number;
    sortField: number;
    sortOrder: SortOrder;
    filters: Record<string, string[]>;
    isLoading: boolean;
}
```

#### State Synchronization Service

```typescript
interface AdminListStateManager {
    initializeState(
        urlParams: URLSearchParams,
        settings: AdminSettings,
    ): AdminListState;
    updateFilters(filters: Record<string, string[]>): void;
    updatePagination(page: number, pageSize: number): void;
    updateSort(field: number, order: SortOrder): void;
    syncToUrl(): void;
    syncToSettings(): void;
}
```

### Filter Management Enhancement

#### Filter State Normalization

-   Convert filter values to a normalized format that can be easily serialized to URL and settings
-   Implement proper filter merging logic to handle multiple simultaneous filter changes
-   Add filter validation to ensure only valid filter values are applied

#### Filter Application Flow

1. User selects filter option
2. Update normalized filter state
3. Debounce and batch multiple filter changes
4. Apply filters to API call
5. Update URL and settings simultaneously
6. Refresh data with new filters

### Pagination Enhancement

#### Page Size Management

-   Create a dedicated page size manager that handles all page size operations
-   Ensure page size changes trigger proper data refetch with correct parameters
-   Implement proper page boundary validation when page size changes

#### Pagination State Flow

1. User changes page size
2. Update page size in state manager
3. Reset to page 1 if current page would be out of bounds
4. Update settings persistence
5. Update URL parameters
6. Trigger data refetch with new pagination parameters

## Data Models

### Enhanced AdminListColumn Interface

```typescript
interface AdminListColumn {
    name: string;
    displayName?: string;
    width?: string;
    sortField?: number;
    isVisible: boolean;
    filterComponent?: React.ComponentType<AdminFilterControlProps>;
    filterSettings?: {
        values: string[];
        isActive: boolean;
        lastUpdated: number;
    };
    // ... existing properties
}
```

### URL Parameter Schema

```typescript
interface AdminListUrlParams {
    name: string;
    page?: number;
    pageSize?: number;
    search?: string;
    sortField?: number;
    sortOrder?: SortOrder;
    filters?: Record<string, string>;
}
```

### Settings Schema Enhancement

```typescript
interface AdminListSettings {
    columns: AdminListColumn[];
    sort: {
        field: number;
        order: SortOrder;
    };
    pageSize: number;
    defaultFilters?: Record<string, string[]>;
}
```

## Error Handling

### Filter Error Recovery

-   Implement try-catch blocks around filter operations
-   Provide fallback to previous known good filter state
-   Display user-friendly error messages for filter failures
-   Log detailed error information for debugging

### Pagination Error Handling

-   Validate page boundaries before navigation
-   Handle cases where page size changes result in empty pages
-   Provide graceful fallback to valid page numbers
-   Maintain user experience during error states

### Network Error Handling

-   Implement retry logic for failed API calls
-   Show loading states during filter/pagination operations
-   Provide offline state handling
-   Cache previous successful results for fallback

## Testing Strategy

### Unit Testing

-   Test state synchronization logic in isolation
-   Test filter normalization and validation functions
-   Test pagination boundary calculations
-   Test URL parameter serialization/deserialization

### Integration Testing

-   Test complete filter application flow
-   Test pagination state changes with data fetching
-   Test URL synchronization with browser navigation
-   Test settings persistence across sessions

### End-to-End Testing

-   Test user workflows for applying multiple filters
-   Test page size changes with various data sets
-   Test browser navigation and bookmarking
-   Test error recovery scenarios

### Performance Testing

-   Test filter debouncing effectiveness
-   Test large dataset pagination performance
-   Test memory usage during rapid filter changes
-   Test API call optimization

## Implementation Approach

### Phase 1: State Management Refactoring

1. Create centralized state management hook
2. Implement state synchronization service
3. Refactor AdminList component to use new state management
4. Add proper error boundaries and loading states

### Phase 2: Filter System Enhancement

1. Implement filter normalization and validation
2. Add debouncing to filter operations
3. Enhance filter UI feedback and error handling
4. Test filter combinations and edge cases

### Phase 3: Pagination System Fix

1. Implement dedicated page size management
2. Fix page boundary validation
3. Enhance pagination UI responsiveness
4. Test pagination with various data sizes

### Phase 4: URL and Settings Synchronization

1. Implement robust URL parameter handling
2. Enhance settings persistence logic
3. Add browser navigation support
4. Test bookmarking and sharing functionality

### Phase 5: Testing and Optimization

1. Comprehensive testing of all scenarios
2. Performance optimization
3. Error handling refinement
4. Documentation and code cleanup
