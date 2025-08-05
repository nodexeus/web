import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { AdminListFilterControl } from './AdminListFilterControl';
import { AdminFilterControlProps } from '@modules/admin/types/AdminFilterControlProps';

/**
 * Enhanced filter control wrapper that integrates with normalized filter state
 * and provides advanced error handling, validation, and user feedback
 */

interface AdminListFilterControlEnhancedProps extends AdminFilterControlProps {
  // Enhanced state management integration
  useNormalizedState?: boolean;
  onFilterStateChange?: (
    columnName: string,
    values: string[],
    metadata?: any,
  ) => void;
  filterValidationRules?: {
    maxSelections?: number;
    allowedValues?: string[];
    requiredValues?: string[];
    customValidator?: (values: string[]) => string | null;
  };

  // Advanced UI features
  showFilterCount?: boolean;
  showValidationErrors?: boolean;
  enableBulkActions?: boolean;
  autoApplyFilters?: boolean;
  debounceMs?: number;

  // Accessibility and UX
  ariaLabel?: string;
  helpText?: string;
  placeholder?: string;
}

export const AdminListFilterControlEnhanced: React.FC<
  AdminListFilterControlEnhancedProps
> = ({
  columnName,
  values = [],
  onFilterChange,
  onReset,
  filterValidationRules,
  showFilterCount = true,
  showValidationErrors = true,
  enableBulkActions = false,
  autoApplyFilters = true,
  debounceMs = 300,
  ariaLabel,
  helpText,
  placeholder,
  ...props
}) => {
  const [localValues, setLocalValues] = useState<string[]>(values);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isApplyingFilter, setIsApplyingFilter] = useState(false);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);

  // Sync local values with external values
  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  // Validation logic
  const validateFilterValues = useCallback(
    (newValues: string[]): string[] => {
      const errors: string[] = [];

      if (!filterValidationRules) return errors;

      const { maxSelections, allowedValues, requiredValues, customValidator } =
        filterValidationRules;

      // Check max selections
      if (maxSelections && newValues.length > maxSelections) {
        errors.push(`Maximum ${maxSelections} selections allowed`);
      }

      // Check allowed values
      if (allowedValues) {
        const invalidValues = newValues.filter(
          (value) => !allowedValues.includes(value),
        );
        if (invalidValues.length > 0) {
          errors.push(`Invalid values: ${invalidValues.join(', ')}`);
        }
      }

      // Check required values
      if (requiredValues) {
        const missingValues = requiredValues.filter(
          (value) => !newValues.includes(value),
        );
        if (missingValues.length > 0) {
          errors.push(`Required values missing: ${missingValues.join(', ')}`);
        }
      }

      // Custom validation
      if (customValidator) {
        const customError = customValidator(newValues);
        if (customError) {
          errors.push(customError);
        }
      }

      return errors;
    },
    [filterValidationRules],
  );

  // Enhanced filter change handler
  const handleFilterChange = useCallback(
    async (item: AdminFilterDropdownItem) => {
      const itemId = item.id || '';
      const isCurrentlySelected = localValues.includes(itemId);

      let newValues: string[];
      if (isCurrentlySelected) {
        newValues = localValues.filter((value) => value !== itemId);
      } else {
        newValues = [...localValues, itemId];
      }

      // Validate new values
      const errors = validateFilterValues(newValues);
      setValidationErrors(errors);

      // If validation fails and we're adding a value, don't proceed
      if (errors.length > 0 && !isCurrentlySelected) {
        return;
      }

      // Update local state immediately for responsive UI
      setLocalValues(newValues);

      // Apply filter if auto-apply is enabled and validation passes
      if (autoApplyFilters && errors.length === 0) {
        setIsApplyingFilter(true);
        const currentOperationId = `${columnName}-${Date.now()}`;
        setOperationId(currentOperationId);

        try {
          // Call the original filter change handler
          await new Promise<void>((resolve) => {
            onFilterChange(item);
            // Simulate async operation for demo purposes
            setTimeout(resolve, debounceMs);
          });

          // Show success feedback briefly
          setShowSuccessFeedback(true);
          setTimeout(() => setShowSuccessFeedback(false), 1500);
        } catch (error) {
          // Revert local state on error
          setLocalValues(values);
          console.error('Filter application failed:', error);
        } finally {
          setIsApplyingFilter(false);
          setOperationId(null);
        }
      } else if (!autoApplyFilters) {
        // Manual apply mode - just call the handler
        onFilterChange(item);
      }
    },
    [
      localValues,
      validateFilterValues,
      autoApplyFilters,
      debounceMs,
      columnName,
      onFilterChange,
      values,
    ],
  );

  // Enhanced reset handler
  const handleReset = useCallback(async () => {
    if (!onReset) return;

    setIsApplyingFilter(true);
    setValidationErrors([]);

    try {
      await new Promise<void>((resolve) => {
        onReset(columnName);
        setTimeout(resolve, 200);
      });

      setLocalValues([]);
      setShowSuccessFeedback(true);
      setTimeout(() => setShowSuccessFeedback(false), 1000);
    } catch (error) {
      console.error('Filter reset failed:', error);
    } finally {
      setIsApplyingFilter(false);
    }
  }, [onReset, columnName]);

  // Clear all filters handler
  const handleClearAll = useCallback(async () => {
    setIsApplyingFilter(true);
    setValidationErrors([]);

    try {
      // This would integrate with the filter state manager's clearAllFilters method
      if (onReset) {
        await new Promise<void>((resolve) => {
          onReset(columnName);
          setTimeout(resolve, 200);
        });
      }

      setLocalValues([]);
      setShowSuccessFeedback(true);
      setTimeout(() => setShowSuccessFeedback(false), 1000);
    } catch (error) {
      console.error('Clear all filters failed:', error);
    } finally {
      setIsApplyingFilter(false);
    }
  }, [onReset, columnName]);

  // Compute enhanced props
  const enhancedProps = useMemo(
    () => ({
      ...props,
      columnName,
      values: localValues,
      onFilterChange: handleFilterChange,
      onReset: handleReset,
      onClearAll: enableBulkActions ? handleClearAll : undefined,
      isApplyingFilter,
      filterOperationId: operationId,
      showSuccessFeedback,
      successMessage: showSuccessFeedback
        ? 'Filter applied successfully'
        : undefined,
      maxSelections: filterValidationRules?.maxSelections,
      allowedValues: filterValidationRules?.allowedValues,
      validationErrors: showValidationErrors ? validationErrors : [],
    }),
    [
      props,
      columnName,
      localValues,
      handleFilterChange,
      handleReset,
      enableBulkActions,
      handleClearAll,
      isApplyingFilter,
      operationId,
      showSuccessFeedback,
      filterValidationRules,
      showValidationErrors,
      validationErrors,
    ],
  );

  return <AdminListFilterControl {...enhancedProps} />;
};

export default AdminListFilterControlEnhanced;
