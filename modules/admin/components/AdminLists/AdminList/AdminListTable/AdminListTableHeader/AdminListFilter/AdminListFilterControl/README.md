# Enhanced Admin List Filter Control

This directory contains enhanced filter components that provide better state handling, validation, error recovery, and user feedback for admin list filtering operations.

## Components

### AdminListFilterControl

The base filter control component with enhanced state handling capabilities:

-   Loading states during filter operations
-   Error handling and user feedback
-   Filter reset functionality with immediate state updates
-   Validation error display
-   Success feedback
-   Maximum selection limits
-   Allowed values validation

### AdminListFilterControlEnhanced

A wrapper component that provides advanced filter state management:

-   Normalized filter state integration
-   Advanced validation rules
-   Debounced filter operations
-   Bulk filter actions
-   Custom validation functions
-   Auto-apply filters with user feedback

## Usage Examples

### Basic Enhanced Filter Control

```tsx
import { AdminListFilterControlEnhanced } from '@modules/admin';

const MyFilterComponent = ({
    columnName,
    values,
    items,
    onFilterChange,
    onReset,
}) => {
    const filterValidationRules = {
        maxSelections: 10,
        allowedValues: items?.map((item) => item.id) || [],
        customValidator: (values: string[]) => {
            if (values.length > 5) {
                return 'Selecting many options may slow down the query';
            }
            return null;
        },
    };

    return (
        <AdminListFilterControlEnhanced
            columnName={columnName}
            items={items}
            values={values}
            onFilterChange={onFilterChange}
            onReset={onReset}
            filterValidationRules={filterValidationRules}
            showFilterCount={true}
            showValidationErrors={true}
            enableBulkActions={true}
            autoApplyFilters={true}
            debounceMs={300}
            ariaLabel={`Filter by ${columnName}`}
            helpText="Select one or more options to filter the list"
        />
    );
};
```

### Integration with useAdminListState

```tsx
import { useAdminListState, createFilterValidationRules } from '@modules/admin';

const MyAdminList = () => {
    const { state, actions } = useAdminListState('nodes', {
        defaultPageSize: 24,
        syncToUrl: true,
        syncToSettings: true,
    });

    const statusFilterRules = createFilterValidationRules('status', {
        maxSelections: 8,
    });

    return (
        <AdminListFilterControlEnhanced
            columnName="status"
            items={statusItems}
            values={state.filters.status || []}
            onFilterChange={(item) => {
                const currentValues = state.filters.status || [];
                const isSelected = currentValues.includes(item.id || '');
                const newValues = isSelected
                    ? currentValues.filter((v) => v !== item.id)
                    : [...currentValues, item.id || ''];

                actions.setFilters('status', newValues);
            }}
            onReset={() => actions.clearColumnFilter('status')}
            filterValidationRules={statusFilterRules}
            isLoading={state.isLoading}
            error={state.error}
            showFilterCount={true}
            showValidationErrors={true}
            enableBulkActions={true}
            autoApplyFilters={true}
        />
    );
};
```

## Features

### Enhanced State Handling

-   **Normalized Filter State**: Integrates with the FilterStateManager for consistent state management
-   **Debounced Operations**: Prevents race conditions during rapid filter changes
-   **State Synchronization**: Automatically syncs with URL parameters and settings
-   **Error Recovery**: Graceful handling of filter operation failures

### Validation and Feedback

-   **Max Selections**: Limit the number of filter values that can be selected
-   **Allowed Values**: Restrict selections to predefined valid values
-   **Custom Validation**: Implement custom validation logic with user-friendly messages
-   **Real-time Feedback**: Show validation errors and success messages immediately

### User Experience

-   **Loading States**: Visual feedback during filter operations
-   **Error Handling**: Clear error messages with retry options
-   **Success Feedback**: Confirmation when filters are applied successfully
-   **Bulk Actions**: Clear individual filters or all filters at once

### Accessibility

-   **ARIA Labels**: Proper labeling for screen readers
-   **Help Text**: Contextual help for complex filter operations
-   **Keyboard Navigation**: Full keyboard accessibility support

## Validation Rules

The `createFilterValidationRules` utility provides pre-configured validation rules for common filter types:

```tsx
// Status filters - optimized for node status filtering
const statusRules = createFilterValidationRules('status', {
    maxSelections: 10,
    customValidator: (values) =>
        values.length > 5 ? 'Warning: Many statuses selected' : null,
});

// Region filters - optimized for geographic filtering
const regionRules = createFilterValidationRules('region', {
    maxSelections: 15,
    customValidator: (values) =>
        values.length > 8 ? 'Performance warning' : null,
});

// Protocol filters - optimized for protocol filtering
const protocolRules = createFilterValidationRules('protocol', {
    maxSelections: 12,
    customValidator: (values) =>
        values.length > 6 ? 'Consider fewer protocols' : null,
});

// User filters - optimized for user filtering
const userRules = createFilterValidationRules('user', {
    maxSelections: 25,
    customValidator: (values) =>
        values.length > 15 ? 'Performance warning' : null,
});

// Custom rules
const customRules = createFilterValidationRules('custom', {
    maxSelections: 5,
    allowedValues: ['option1', 'option2', 'option3'],
    customValidator: (values) => {
        if (values.includes('option1') && values.includes('option2')) {
            return 'Option1 and Option2 cannot be selected together';
        }
        return null;
    },
});
```

## Error Handling

The enhanced filter components provide comprehensive error handling:

1. **Validation Errors**: Shown immediately when invalid selections are made
2. **Network Errors**: Retry functionality for failed filter operations
3. **State Errors**: Graceful fallback when state management fails
4. **User Feedback**: Clear error messages with actionable solutions

## Performance Considerations

-   **Debouncing**: Filter operations are debounced to prevent excessive API calls
-   **Memoization**: Expensive calculations are memoized for better performance
-   **Validation Warnings**: Users are warned when selections may impact performance
-   **Optimistic Updates**: UI updates immediately while operations are processed in the background

## Testing

The enhanced filter components include comprehensive test coverage:

-   Unit tests for validation logic
-   Integration tests with FilterStateManager
-   Error handling scenarios
-   Performance optimization verification

Run tests with:

```bash
npm test -- modules/admin/utils/__tests__/enhancedFilterIntegration.test.ts
```
