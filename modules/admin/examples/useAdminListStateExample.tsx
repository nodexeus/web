/**
 * Example usage of the useAdminListState hook
 * This file demonstrates how to use the centralized admin list state management
 */

import React from 'react';
import { SortOrder } from '../../../generated/blockjoy/common/v1/search';
import { useAdminListState } from '../hooks/useAdminListState';

// Example configuration for a nodes list
const nodesListConfig = {
  defaultPageSize: 24,
  defaultSortField: 1, // Assuming field 1 is the name or ID
  defaultSortOrder: SortOrder.SORT_ORDER_ASCENDING,
  initialFilters: {
    // Could include default filters like active status
    // status: ['active']
  },
};

export const AdminNodesListExample: React.FC = () => {
  // Initialize the state management hook
  const { state, actions, helpers } = useAdminListState(
    'nodes', // List name for URL and settings persistence
    nodesListConfig,
    {
      syncToUrl: true, // Enable URL synchronization
      syncToSettings: true, // Enable settings persistence
      urlDebounceMs: 300, // Debounce URL updates
      settingsDebounceMs: 1000, // Debounce settings updates
    },
  );

  // Example handlers
  const handleSearchChange = (searchValue: string) => {
    actions.setSearch(searchValue);
  };

  const handlePageChange = (newPage: number) => {
    actions.setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    actions.setPageSize(newPageSize);
  };

  const handleSortChange = (field: number, order: SortOrder) => {
    actions.setSort(field, order);
  };

  const handleFilterChange = (columnName: string, values: string[]) => {
    actions.setFilters(columnName, values);
  };

  const handleClearAllFilters = () => {
    actions.clearFilters();
  };

  // Example of using helpers
  const activeFilterCount = helpers.getActiveFilterCount();
  const isStatusFilterActive = helpers.isFilterActive('status');

  return (
    <div>
      <h2>Admin Nodes List</h2>

      {/* Search Input */}
      <input
        type="text"
        value={state.search}
        onChange={(e) => handleSearchChange(e.target.value)}
        placeholder="Search nodes..."
      />

      {/* Filter Status */}
      <div>
        Active Filters: {activeFilterCount}
        {activeFilterCount > 0 && (
          <button onClick={handleClearAllFilters}>Clear All Filters</button>
        )}
      </div>

      {/* Loading State */}
      {state.isLoading && <div>Loading...</div>}

      {/* Error State */}
      {state.error && <div>Error: {state.error}</div>}

      {/* Example filter controls */}
      <div>
        <label>
          Status Filter:
          <select
            multiple
            onChange={(e) => {
              const values = Array.from(
                e.target.selectedOptions,
                (option) => option.value,
              );
              handleFilterChange('status', values);
            }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </label>
      </div>

      {/* Pagination Controls */}
      <div>
        <label>
          Page Size:
          <select
            value={state.pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
            <option value={96}>96</option>
          </select>
        </label>

        <span>Page: {state.page}</span>

        <button
          onClick={() => handlePageChange(state.page - 1)}
          disabled={state.page <= 1}
        >
          Previous
        </button>

        <button onClick={() => handlePageChange(state.page + 1)}>Next</button>
      </div>

      {/* Sort Controls */}
      <div>
        <button
          onClick={() => handleSortChange(1, SortOrder.SORT_ORDER_ASCENDING)}
        >
          Sort by Name (Asc)
        </button>
        <button
          onClick={() => handleSortChange(1, SortOrder.SORT_ORDER_DESCENDING)}
        >
          Sort by Name (Desc)
        </button>
      </div>

      {/* Current State Display (for debugging) */}
      <details>
        <summary>Current State</summary>
        <pre>{JSON.stringify(state, null, 2)}</pre>
      </details>

      {/* Query Parameters for API calls */}
      <details>
        <summary>API Query Parameters</summary>
        <pre>{JSON.stringify(helpers.getQueryParams(), null, 2)}</pre>
      </details>
    </div>
  );
};
