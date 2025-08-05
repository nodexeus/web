import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EnhancedFilterHandler,
  createEnhancedFilterHandler,
  createFilterValidationRules,
  useEnhancedFilterIntegration,
} from '../enhancedFilterIntegration';
import {
  FilterStateManager,
  DEFAULT_FILTER_CONFIG,
} from '../filterStateManager';

describe('EnhancedFilterIntegration', () => {
  let filterManager: FilterStateManager;
  let handler: EnhancedFilterHandler;

  beforeEach(() => {
    filterManager = new FilterStateManager({}, DEFAULT_FILTER_CONFIG);
    handler = createEnhancedFilterHandler(filterManager, {
      columnName: 'status',
      maxSelections: 5,
      allowedValues: ['active', 'inactive', 'pending', 'error'],
      debounceMs: 100,
      autoApply: true,
    });
  });

  describe('EnhancedFilterHandler', () => {
    it('should handle filter change with valid values', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      await handler.handleFilterChange(
        { id: 'active', name: 'Active' },
        [],
        onSuccess,
        onError,
      );

      // Flush the filter manager to apply changes immediately
      filterManager.flush();

      expect(onSuccess).toHaveBeenCalledWith(['active']);
      expect(onError).not.toHaveBeenCalled();
      expect(handler.getCurrentValues()).toEqual(['active']);
    });

    it('should handle filter change with toggle behavior', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      // First add a value
      await handler.handleFilterChange(
        { id: 'active', name: 'Active' },
        [],
        onSuccess,
        onError,
      );

      filterManager.flush();
      expect(handler.getCurrentValues()).toEqual(['active']);

      // Then remove it
      await handler.handleFilterChange(
        { id: 'active', name: 'Active' },
        ['active'],
        onSuccess,
        onError,
      );

      filterManager.flush();
      expect(handler.getCurrentValues()).toEqual([]);
    });

    it('should validate max selections', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      // Create a handler with max 2 selections for easier testing
      const testHandler = createEnhancedFilterHandler(filterManager, {
        columnName: 'status',
        maxSelections: 2,
        allowedValues: ['active', 'inactive', 'pending', 'error'],
      });

      // Try to add more than max selections
      const currentValues = ['active', 'inactive']; // Already at max

      await testHandler.handleFilterChange(
        { id: 'pending', name: 'Pending' }, // Try to add another valid value
        currentValues,
        onSuccess,
        onError,
      );

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Maximum 2 selections allowed'),
      );
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should validate allowed values', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      await handler.handleFilterChange(
        { id: 'invalid', name: 'Invalid' },
        [],
        onSuccess,
        onError,
      );

      expect(onError).toHaveBeenCalledWith('Invalid values: invalid');
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should handle filter reset', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      // First add some values
      await handler.handleFilterChange(
        { id: 'active', name: 'Active' },
        [],
        vi.fn(),
        vi.fn(),
      );

      filterManager.flush();
      expect(handler.getCurrentValues()).toEqual(['active']);

      // Then reset
      await handler.handleFilterReset(onSuccess, onError);

      filterManager.flush();
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(handler.getCurrentValues()).toEqual([]);
    });

    it('should handle clear all filters', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      // First add some values to multiple columns
      filterManager.setFilter('status', ['active']);
      filterManager.setFilter('region', ['us-east-1']);

      // Then clear all
      await handler.handleClearAllFilters(onSuccess, onError);

      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
      expect(filterManager.getFilters()).toEqual({});
    });

    it('should track validation errors', async () => {
      const onError = vi.fn();

      await handler.handleFilterChange(
        { id: 'invalid', name: 'Invalid' },
        [],
        vi.fn(),
        onError,
      );

      const errors = handler.getValidationErrors();
      expect(errors).toContain('Invalid values: invalid');
    });

    it('should clear validation errors on successful operation', async () => {
      const onError = vi.fn();

      // First create an error
      await handler.handleFilterChange(
        { id: 'invalid', name: 'Invalid' },
        [],
        vi.fn(),
        onError,
      );

      expect(handler.getValidationErrors().length).toBeGreaterThan(0);

      // Then perform a successful operation
      await handler.handleFilterChange(
        { id: 'active', name: 'Active' },
        [],
        vi.fn(),
        vi.fn(),
      );

      expect(handler.getValidationErrors()).toEqual([]);
    });
  });

  describe('createFilterValidationRules', () => {
    it('should create status validation rules', () => {
      const rules = createFilterValidationRules('status');

      expect(rules.maxSelections).toBe(10);
      expect(rules.customValidator).toBeDefined();

      const validator = rules.customValidator!;
      expect(validator(['a', 'b', 'c', 'd', 'e', 'f'])).toBe(
        'Selecting many statuses may slow down the query',
      );
      expect(validator(['a', 'b', 'c'])).toBeNull();
    });

    it('should create region validation rules', () => {
      const rules = createFilterValidationRules('region');

      expect(rules.maxSelections).toBe(15);
      expect(rules.customValidator).toBeDefined();

      const validator = rules.customValidator!;
      expect(validator(Array(10).fill('region'))).toBe(
        'Selecting many regions may impact query performance',
      );
      expect(validator(['region1', 'region2'])).toBeNull();
    });

    it('should create protocol validation rules', () => {
      const rules = createFilterValidationRules('protocol');

      expect(rules.maxSelections).toBe(12);
      expect(rules.customValidator).toBeDefined();

      const validator = rules.customValidator!;
      expect(validator(Array(8).fill('protocol'))).toBe(
        'Consider filtering by fewer protocols for better performance',
      );
      expect(validator(['protocol1'])).toBeNull();
    });

    it('should create user validation rules', () => {
      const rules = createFilterValidationRules('user');

      expect(rules.maxSelections).toBe(25);
      expect(rules.customValidator).toBeDefined();

      const validator = rules.customValidator!;
      expect(validator(Array(20).fill('user'))).toBe(
        'Selecting many users may impact query performance',
      );
      expect(validator(['user1', 'user2'])).toBeNull();
    });

    it('should accept custom options', () => {
      const customValidator = vi.fn().mockReturnValue('custom error');
      const rules = createFilterValidationRules('status', {
        maxSelections: 3,
        customValidator,
        allowedValues: ['a', 'b', 'c'],
      });

      expect(rules.maxSelections).toBe(3);
      expect(rules.allowedValues).toEqual(['a', 'b', 'c']);
      expect(rules.customValidator).toBe(customValidator);
    });
  });

  describe('useEnhancedFilterIntegration', () => {
    it('should return null when filterManager is null', () => {
      const result = useEnhancedFilterIntegration(null, {
        columnName: 'test',
      });

      expect(result).toBeNull();
    });

    it('should return handler methods when filterManager is provided', () => {
      const result = useEnhancedFilterIntegration(filterManager, {
        columnName: 'test',
      });

      expect(result).toBeDefined();
      expect(result!.handleFilterChange).toBeDefined();
      expect(result!.handleFilterReset).toBeDefined();
      expect(result!.handleClearAllFilters).toBeDefined();
      expect(result!.getValidationErrors).toBeDefined();
      expect(result!.getCurrentValues).toBeDefined();
      expect(result!.updateConfig).toBeDefined();
    });

    it('should handle filter operations through the utility', async () => {
      const result = useEnhancedFilterIntegration(filterManager, {
        columnName: 'test',
        maxSelections: 2,
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      await result!.handleFilterChange(
        { id: 'value1', name: 'Value 1' },
        [],
        onSuccess,
        onError,
      );

      filterManager.flush();
      expect(onSuccess).toHaveBeenCalledWith(['value1']);
      expect(result!.getCurrentValues()).toEqual(['value1']);
    });
  });

  describe('Error Handling', () => {
    it('should handle filter manager errors gracefully', async () => {
      const mockFilterManager = {
        setFilter: vi.fn().mockImplementation(() => {
          throw new Error('Filter manager error');
        }),
        clearFilter: vi.fn(),
        clearAllFilters: vi.fn(),
        getFilters: vi.fn().mockReturnValue({}),
      } as any;

      const errorHandler = new EnhancedFilterHandler(mockFilterManager, {
        columnName: 'test',
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      await errorHandler.handleFilterChange(
        { id: 'test', name: 'Test' },
        [],
        onSuccess,
        onError,
      );

      expect(onError).toHaveBeenCalledWith('Filter manager error');
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should handle custom validator errors', async () => {
      const customHandler = createEnhancedFilterHandler(filterManager, {
        columnName: 'test',
        customValidator: () => 'Custom validation error',
      });

      const onSuccess = vi.fn();
      const onError = vi.fn();

      await customHandler.handleFilterChange(
        { id: 'test', name: 'Test' },
        [],
        onSuccess,
        onError,
      );

      expect(onError).toHaveBeenCalledWith('Custom validation error');
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });
});
