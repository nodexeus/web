/**
 * Enhanced Filter Integration Utilities
 * Provides utilities to integrate enhanced filter components with the existing
 * admin list state management system
 */

import { FilterStateManager } from './filterStateManager';

/**
 * Configuration for enhanced filter integration
 */
export interface EnhancedFilterConfig {
  columnName: string;
  maxSelections?: number;
  allowedValues?: string[];
  requiredValues?: string[];
  customValidator?: (values: string[]) => string | null;
  debounceMs?: number;
  autoApply?: boolean;
  showValidationErrors?: boolean;
  enableBulkActions?: boolean;
}

/**
 * Enhanced filter state handler that integrates with FilterStateManager
 */
export class EnhancedFilterHandler {
  private filterManager: FilterStateManager;
  private config: EnhancedFilterConfig;
  private validationErrors: Map<string, string[]> = new Map();
  private operationCallbacks: Map<
    string,
    (success: boolean, error?: string) => void
  > = new Map();

  constructor(filterManager: FilterStateManager, config: EnhancedFilterConfig) {
    this.filterManager = filterManager;
    this.config = config;
  }

  /**
   * Handles filter change with enhanced validation and error handling
   */
  async handleFilterChange(
    item: AdminFilterDropdownItem,
    currentValues: string[],
    onSuccess?: (values: string[]) => void,
    onError?: (error: string) => void,
  ): Promise<void> {
    const itemId = item.id || '';
    const isCurrentlySelected = currentValues.includes(itemId);

    let newValues: string[];
    if (isCurrentlySelected) {
      newValues = currentValues.filter((value) => value !== itemId);
    } else {
      newValues = [...currentValues, itemId];
    }

    // Validate new values
    const validationResult = this.validateValues(newValues);

    if (validationResult.errors.length > 0 && !isCurrentlySelected) {
      // If adding a value and validation fails, don't proceed
      const errorMessage = validationResult.errors.join('; ');
      this.validationErrors.set(
        this.config.columnName,
        validationResult.errors,
      );
      if (onError) {
        onError(errorMessage);
      }
      return;
    }

    // Clear validation errors if validation passes
    this.validationErrors.delete(this.config.columnName);

    try {
      // Apply the filter using the filter manager
      this.filterManager.setFilter(this.config.columnName, newValues);

      if (onSuccess) {
        onSuccess(newValues);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to apply filter';
      if (onError) {
        onError(errorMessage);
      }
    }
  }

  /**
   * Handles filter reset with enhanced error handling
   */
  async handleFilterReset(
    onSuccess?: () => void,
    onError?: (error: string) => void,
  ): Promise<void> {
    try {
      this.filterManager.clearFilter(this.config.columnName);
      this.validationErrors.delete(this.config.columnName);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to reset filter';
      if (onError) {
        onError(errorMessage);
      }
    }
  }

  /**
   * Handles clearing all filters
   */
  async handleClearAllFilters(
    onSuccess?: () => void,
    onError?: (error: string) => void,
  ): Promise<void> {
    try {
      this.filterManager.clearAllFilters();
      this.validationErrors.clear();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to clear all filters';
      if (onError) {
        onError(errorMessage);
      }
    }
  }

  /**
   * Validates filter values according to the configuration
   */
  private validateValues(values: string[]): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check max selections
    if (
      this.config.maxSelections &&
      values.length > this.config.maxSelections
    ) {
      errors.push(`Maximum ${this.config.maxSelections} selections allowed`);
    }

    // Check allowed values
    if (this.config.allowedValues) {
      const invalidValues = values.filter(
        (value) => !this.config.allowedValues!.includes(value),
      );
      if (invalidValues.length > 0) {
        errors.push(`Invalid values: ${invalidValues.join(', ')}`);
      }
    }

    // Check required values
    if (this.config.requiredValues) {
      const missingValues = this.config.requiredValues.filter(
        (value) => !values.includes(value),
      );
      if (missingValues.length > 0) {
        errors.push(`Required values missing: ${missingValues.join(', ')}`);
      }
    }

    // Custom validation
    if (this.config.customValidator) {
      const customError = this.config.customValidator(values);
      if (customError) {
        if (customError.toLowerCase().includes('warn')) {
          warnings.push(customError);
        } else {
          errors.push(customError);
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Gets current validation errors for the column
   */
  getValidationErrors(): string[] {
    return this.validationErrors.get(this.config.columnName) || [];
  }

  /**
   * Gets current filter values from the filter manager
   */
  getCurrentValues(): string[] {
    const filters = this.filterManager.getFilters();
    return filters[this.config.columnName] || [];
  }

  /**
   * Updates the configuration
   */
  updateConfig(newConfig: Partial<EnhancedFilterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Factory function to create enhanced filter handlers
 */
export const createEnhancedFilterHandler = (
  filterManager: FilterStateManager,
  config: EnhancedFilterConfig,
): EnhancedFilterHandler => {
  return new EnhancedFilterHandler(filterManager, config);
};

/**
 * Hook-like utility to integrate enhanced filters with existing components
 */
export const useEnhancedFilterIntegration = (
  filterManager: FilterStateManager | null,
  config: EnhancedFilterConfig,
) => {
  if (!filterManager) {
    return null;
  }

  const handler = new EnhancedFilterHandler(filterManager, config);

  return {
    handleFilterChange: handler.handleFilterChange.bind(handler),
    handleFilterReset: handler.handleFilterReset.bind(handler),
    handleClearAllFilters: handler.handleClearAllFilters.bind(handler),
    getValidationErrors: handler.getValidationErrors.bind(handler),
    getCurrentValues: handler.getCurrentValues.bind(handler),
    updateConfig: handler.updateConfig.bind(handler),
  };
};

/**
 * Utility to create filter validation rules from common patterns
 */
export const createFilterValidationRules = (
  type: 'status' | 'region' | 'protocol' | 'user' | 'custom',
  options?: {
    maxSelections?: number;
    customValidator?: (values: string[]) => string | null;
    allowedValues?: string[];
  },
) => {
  const baseRules = {
    maxSelections: options?.maxSelections || 20,
    allowedValues: options?.allowedValues,
    customValidator: options?.customValidator,
  };

  switch (type) {
    case 'status':
      return {
        ...baseRules,
        maxSelections: options?.maxSelections || 10,
        customValidator:
          options?.customValidator ||
          ((values: string[]) => {
            if (values.length > 5) {
              return 'Selecting many statuses may slow down the query';
            }
            return null;
          }),
      };

    case 'region':
      return {
        ...baseRules,
        maxSelections: options?.maxSelections || 15,
        customValidator:
          options?.customValidator ||
          ((values: string[]) => {
            if (values.length > 8) {
              return 'Selecting many regions may impact query performance';
            }
            return null;
          }),
      };

    case 'protocol':
      return {
        ...baseRules,
        maxSelections: options?.maxSelections || 12,
        customValidator:
          options?.customValidator ||
          ((values: string[]) => {
            if (values.length > 6) {
              return 'Consider filtering by fewer protocols for better performance';
            }
            return null;
          }),
      };

    case 'user':
      return {
        ...baseRules,
        maxSelections: options?.maxSelections || 25,
        customValidator:
          options?.customValidator ||
          ((values: string[]) => {
            if (values.length > 15) {
              return 'Selecting many users may impact query performance';
            }
            return null;
          }),
      };

    case 'custom':
    default:
      return baseRules;
  }
};
