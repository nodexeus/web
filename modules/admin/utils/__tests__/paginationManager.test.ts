import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PageSizeManager,
  PageBoundaryValidator,
  PaginationStateSynchronizer,
  DEFAULT_PAGINATION_CONFIG,
  validatePageNumberEnhanced,
  calculatePaginationInfo,
  getValidPageSizeOptions,
  validateAndCorrectPageSize,
  type PaginationConfig,
  type PaginationState,
  type PaginationChangeEvent,
} from '../paginationManager';

describe('PageSizeManager', () => {
  let manager: PageSizeManager;
  let mockChangeListener: vi.MockedFunction<
    (event: PaginationChangeEvent) => void
  >;

  beforeEach(() => {
    manager = new PageSizeManager();
    mockChangeListener = vi.fn();
  });

  describe('validatePageSize', () => {
    it('should validate valid page sizes', () => {
      const result = manager.validatePageSize(24);
      expect(result.isValid).toBe(true);
      expect(result.correctedPageSize).toBe(24);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid page sizes', () => {
      const result = manager.validatePageSize(0);
      expect(result.isValid).toBe(false);
      expect(result.correctedPageSize).toBe(
        DEFAULT_PAGINATION_CONFIG.minPageSize,
      );
      expect(result.error).toContain('cannot be less than');
    });

    it('should reject page sizes that are too large', () => {
      const result = manager.validatePageSize(2000);
      expect(result.isValid).toBe(false);
      expect(result.correctedPageSize).toBe(
        DEFAULT_PAGINATION_CONFIG.maxPageSize,
      );
      expect(result.error).toContain('cannot be greater than');
    });

    it('should reject non-numeric page sizes', () => {
      const result = manager.validatePageSize(NaN);
      expect(result.isValid).toBe(false);
      expect(result.correctedPageSize).toBe(
        DEFAULT_PAGINATION_CONFIG.defaultPageSize,
      );
      expect(result.error).toContain('must be a valid number');
    });
  });

  describe('getClosestValidPageSize', () => {
    it('should return the same size if valid', () => {
      const result = manager.getClosestValidPageSize(24);
      expect(result).toBe(24);
    });

    it('should return closest option for invalid sizes', () => {
      const result = manager.getClosestValidPageSize(30);
      expect(result).toBe(24); // Closest to 30 from default options [12, 24, 48, 96, 192]
    });

    it('should handle edge cases', () => {
      const result = manager.getClosestValidPageSize(0);
      expect(result).toBe(12); // Closest valid option
    });
  });

  describe('updatePageSize', () => {
    const mockCurrentState: PaginationState = {
      page: 2,
      pageSize: 24,
      totalItems: 100,
      totalPages: 5,
      hasPreviousPage: true,
      hasNextPage: true,
      startIndex: 24,
      endIndex: 47,
      isValidPage: true,
    };

    it('should update page size and reset to page 1 by default', () => {
      const result = manager.updatePageSize(mockCurrentState, 48, 100);

      expect(result.wasChanged).toBe(true);
      expect(result.newState.pageSize).toBe(48);
      expect(result.newState.page).toBe(1); // Reset to page 1
      expect(result.validationResult.isValid).toBe(true);
    });

    it('should validate page boundaries when not resetting page', () => {
      const customManager = new PageSizeManager({
        resetPageOnSizeChange: false,
        autoValidateBoundaries: true,
      });

      const result = customManager.updatePageSize(mockCurrentState, 48, 100);

      expect(result.wasChanged).toBe(true);
      expect(result.newState.pageSize).toBe(48);
      expect(result.newState.page).toBe(2); // Should validate and correct if needed
    });

    it('should handle invalid page sizes', () => {
      const result = manager.updatePageSize(mockCurrentState, 0, 100);

      expect(result.wasChanged).toBe(true);
      expect(result.newState.pageSize).toBe(
        DEFAULT_PAGINATION_CONFIG.minPageSize,
      );
      expect(result.validationResult.isValid).toBe(false);
    });

    it('should notify change listeners', () => {
      manager.addChangeListener(mockChangeListener);

      manager.updatePageSize(mockCurrentState, 48, 100);

      expect(mockChangeListener).toHaveBeenCalledWith({
        type: 'pageSize',
        previousState: mockCurrentState,
        newState: expect.any(Object),
        wasAutoCorrected: true, // Page was reset to 1, so it was auto-corrected
      });
    });

    it('should not notify listeners if no change occurred', () => {
      manager.addChangeListener(mockChangeListener);

      manager.updatePageSize(mockCurrentState, 24, 100); // Same page size

      expect(mockChangeListener).not.toHaveBeenCalled();
    });
  });

  describe('change listeners', () => {
    it('should add and remove change listeners', () => {
      manager.addChangeListener(mockChangeListener);
      manager.removeChangeListener(mockChangeListener);

      const mockCurrentState: PaginationState = {
        page: 1,
        pageSize: 24,
        totalItems: 100,
        totalPages: 5,
        hasPreviousPage: false,
        hasNextPage: true,
        startIndex: 0,
        endIndex: 23,
        isValidPage: true,
      };

      manager.updatePageSize(mockCurrentState, 48, 100);

      expect(mockChangeListener).not.toHaveBeenCalled();
    });

    it('should handle errors in change listeners gracefully', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      manager.addChangeListener(errorListener);

      const mockCurrentState: PaginationState = {
        page: 1,
        pageSize: 24,
        totalItems: 100,
        totalPages: 5,
        hasPreviousPage: false,
        hasNextPage: true,
        startIndex: 0,
        endIndex: 23,
        isValidPage: true,
      };

      manager.updatePageSize(mockCurrentState, 48, 100);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in pagination change listener:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getPageSizeOptions', () => {
    it('should return available page size options', () => {
      const options = manager.getPageSizeOptions();
      expect(options).toEqual(DEFAULT_PAGINATION_CONFIG.pageSizeOptions);
    });

    it('should return a copy of options (not reference)', () => {
      const options1 = manager.getPageSizeOptions();
      const options2 = manager.getPageSizeOptions();

      expect(options1).toEqual(options2);
      expect(options1).not.toBe(options2);
    });
  });
});

describe('PageBoundaryValidator', () => {
  let validator: PageBoundaryValidator;

  beforeEach(() => {
    validator = new PageBoundaryValidator();
  });

  describe('validatePageBoundaries', () => {
    it('should validate valid page numbers', () => {
      const result = validator.validatePageBoundaries(2, 100, 24);

      expect(result.isValid).toBe(true);
      expect(result.correctedPage).toBe(2);
      expect(result.wasCorrected).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should correct page numbers that are too low', () => {
      const result = validator.validatePageBoundaries(0, 100, 24);

      expect(result.isValid).toBe(false);
      expect(result.correctedPage).toBe(1);
      expect(result.wasCorrected).toBe(true);
      expect(result.error).toContain('must be at least 1');
    });

    it('should correct page numbers that are too high', () => {
      const result = validator.validatePageBoundaries(10, 100, 24);

      expect(result.isValid).toBe(false);
      expect(result.correctedPage).toBe(5); // Math.ceil(100/24) = 5
      expect(result.wasCorrected).toBe(true);
      expect(result.error).toContain('exceeds maximum page');
    });

    it('should handle edge cases with zero total items', () => {
      const result = validator.validatePageBoundaries(2, 0, 24);

      expect(result.isValid).toBe(false);
      expect(result.correctedPage).toBe(1); // Should default to page 1
      expect(result.wasCorrected).toBe(true);
    });

    it('should handle invalid inputs gracefully', () => {
      const result = validator.validatePageBoundaries(2, -1, 24);

      expect(result.isValid).toBe(true);
      expect(result.correctedPage).toBe(2);
      expect(result.wasCorrected).toBe(false);
    });
  });

  describe('calculatePaginationState', () => {
    it('should calculate correct pagination state', () => {
      const state = validator.calculatePaginationState(2, 24, 100);

      expect(state).toEqual({
        page: 2,
        pageSize: 24,
        totalItems: 100,
        totalPages: 5, // Math.ceil(100/24)
        hasPreviousPage: true,
        hasNextPage: true,
        startIndex: 24, // (2-1) * 24
        endIndex: 47, // 24 + 24 - 1
        isValidPage: true,
      });
    });

    it('should handle last page correctly', () => {
      const state = validator.calculatePaginationState(5, 24, 100);

      expect(state).toEqual({
        page: 5,
        pageSize: 24,
        totalItems: 100,
        totalPages: 5,
        hasPreviousPage: true,
        hasNextPage: false,
        startIndex: 96, // (5-1) * 24
        endIndex: 99, // Last item index
        isValidPage: true,
      });
    });

    it('should correct invalid page numbers', () => {
      const state = validator.calculatePaginationState(10, 24, 100);

      expect(state.page).toBe(5); // Corrected to max page
      expect(state.isValidPage).toBe(false); // Original page was invalid
    });

    it('should handle single page scenarios', () => {
      const state = validator.calculatePaginationState(1, 24, 10);

      expect(state).toEqual({
        page: 1,
        pageSize: 24,
        totalItems: 10,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
        startIndex: 0,
        endIndex: 9,
        isValidPage: true,
      });
    });

    it('should handle empty result sets', () => {
      const state = validator.calculatePaginationState(1, 24, 0);

      expect(state).toEqual({
        page: 1,
        pageSize: 24,
        totalItems: 0,
        totalPages: 1, // Always at least 1 page
        hasPreviousPage: false,
        hasNextPage: false,
        startIndex: 0,
        endIndex: 0,
        isValidPage: true,
      });
    });
  });

  describe('getNavigationOptions', () => {
    it('should provide correct navigation options for middle page', () => {
      const currentState: PaginationState = {
        page: 3,
        pageSize: 24,
        totalItems: 100,
        totalPages: 5,
        hasPreviousPage: true,
        hasNextPage: true,
        startIndex: 48,
        endIndex: 71,
        isValidPage: true,
      };

      const options = validator.getNavigationOptions(currentState);

      expect(options).toEqual({
        canGoFirst: true,
        canGoPrevious: true,
        canGoNext: true,
        canGoLast: true,
        firstPage: 1,
        previousPage: 2,
        nextPage: 4,
        lastPage: 5,
      });
    });

    it('should provide correct navigation options for first page', () => {
      const currentState: PaginationState = {
        page: 1,
        pageSize: 24,
        totalItems: 100,
        totalPages: 5,
        hasPreviousPage: false,
        hasNextPage: true,
        startIndex: 0,
        endIndex: 23,
        isValidPage: true,
      };

      const options = validator.getNavigationOptions(currentState);

      expect(options).toEqual({
        canGoFirst: false,
        canGoPrevious: false,
        canGoNext: true,
        canGoLast: true,
        firstPage: 1,
        previousPage: 1,
        nextPage: 2,
        lastPage: 5,
      });
    });

    it('should provide correct navigation options for last page', () => {
      const currentState: PaginationState = {
        page: 5,
        pageSize: 24,
        totalItems: 100,
        totalPages: 5,
        hasPreviousPage: true,
        hasNextPage: false,
        startIndex: 96,
        endIndex: 99,
        isValidPage: true,
      };

      const options = validator.getNavigationOptions(currentState);

      expect(options).toEqual({
        canGoFirst: true,
        canGoPrevious: true,
        canGoNext: false,
        canGoLast: false,
        firstPage: 1,
        previousPage: 4,
        nextPage: 5,
        lastPage: 5,
      });
    });
  });
});

describe('PaginationStateSynchronizer', () => {
  let synchronizer: PaginationStateSynchronizer;

  beforeEach(() => {
    synchronizer = new PaginationStateSynchronizer();
  });

  describe('serializePaginationToUrl', () => {
    it('should serialize pagination state to URL parameters', () => {
      const params = synchronizer.serializePaginationToUrl(2, 48, 'nodes');

      expect(params).toEqual({
        page: 2,
        pageSize: 48,
      });
    });

    it('should omit default values to keep URLs clean', () => {
      const params = synchronizer.serializePaginationToUrl(1, 24, 'nodes');

      expect(params).toEqual({}); // Both are default values
    });

    it('should include only non-default values', () => {
      const params = synchronizer.serializePaginationToUrl(1, 48, 'nodes');

      expect(params).toEqual({
        pageSize: 48, // Only pageSize is non-default
      });
    });
  });

  describe('deserializePaginationFromUrl', () => {
    it('should deserialize valid URL parameters', () => {
      const urlParams = {
        page: '2',
        pageSize: '48',
      };

      const result = synchronizer.deserializePaginationFromUrl(urlParams);

      expect(result).toEqual({
        page: 2,
        pageSize: 48,
      });
    });

    it('should handle array values from URL parameters', () => {
      const urlParams = {
        page: ['2', '3'], // Multiple values, should take first
        pageSize: ['48'],
      };

      const result = synchronizer.deserializePaginationFromUrl(urlParams);

      expect(result).toEqual({
        page: 2,
        pageSize: 48,
      });
    });

    it('should validate and reject invalid values', () => {
      const urlParams = {
        page: 'invalid',
        pageSize: '2000', // Too large
      };

      const result = synchronizer.deserializePaginationFromUrl(urlParams);

      expect(result).toEqual({}); // Both values rejected
    });

    it('should handle edge cases', () => {
      const urlParams = {
        page: '0', // Too small
        pageSize: '0', // Too small
      };

      const result = synchronizer.deserializePaginationFromUrl(urlParams);

      expect(result).toEqual({}); // Both values rejected
    });

    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate error by passing invalid object
      const result = synchronizer.deserializePaginationFromUrl(null as any);

      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error deserializing pagination from URL:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('serializePaginationToSettings', () => {
    it('should serialize pagination to settings format', () => {
      const result = synchronizer.serializePaginationToSettings(48);

      expect(result).toEqual({
        pageSize: 48,
      });
    });

    it('should validate and correct page size', () => {
      const result = synchronizer.serializePaginationToSettings(2000);

      expect(result).toEqual({
        pageSize: DEFAULT_PAGINATION_CONFIG.maxPageSize,
      });
    });

    it('should handle minimum page size', () => {
      const result = synchronizer.serializePaginationToSettings(0);

      expect(result).toEqual({
        pageSize: DEFAULT_PAGINATION_CONFIG.minPageSize,
      });
    });
  });

  describe('deserializePaginationFromSettings', () => {
    it('should deserialize valid settings', () => {
      const settings = {
        pageSize: 48,
        sortField: 1,
        sortOrder: 1,
        columns: [],
      };

      const result = synchronizer.deserializePaginationFromSettings(settings);

      expect(result).toEqual({
        pageSize: 48,
      });
    });

    it('should handle missing settings', () => {
      const result = synchronizer.deserializePaginationFromSettings(undefined);

      expect(result).toEqual({});
    });

    it('should validate page size from settings', () => {
      const settings = {
        pageSize: 2000, // Too large
        sortField: 1,
        sortOrder: 1,
        columns: [],
      };

      const result = synchronizer.deserializePaginationFromSettings(settings);

      expect(result).toEqual({}); // Invalid page size rejected
    });

    it('should handle invalid settings structure', () => {
      const settings = {
        pageSize: 'invalid',
        sortField: 1,
        sortOrder: 1,
        columns: [],
      } as any;

      const result = synchronizer.deserializePaginationFromSettings(settings);

      expect(result).toEqual({});
    });
  });
});

describe('Enhanced pagination utilities', () => {
  describe('validatePageNumberEnhanced', () => {
    it('should provide enhanced validation with detailed results', () => {
      const result = validatePageNumberEnhanced(10, 100, 24);

      expect(result.isValid).toBe(false);
      expect(result.correctedPage).toBe(5); // Math.ceil(100/24)
      expect(result.wasCorrected).toBe(true);
      expect(result.error).toContain('exceeds maximum page');
    });

    it('should handle valid page numbers', () => {
      const result = validatePageNumberEnhanced(2, 100, 24);

      expect(result.isValid).toBe(true);
      expect(result.correctedPage).toBe(2);
      expect(result.wasCorrected).toBe(false);
      expect(result.error).toBeUndefined();
    });
  });

  describe('calculatePaginationInfo', () => {
    it('should calculate complete pagination information', () => {
      const info = calculatePaginationInfo(2, 24, 100);

      expect(info).toEqual({
        page: 2,
        pageSize: 24,
        totalItems: 100,
        totalPages: 5,
        hasPreviousPage: true,
        hasNextPage: true,
        startIndex: 24,
        endIndex: 47,
        isValidPage: true,
      });
    });
  });

  describe('getValidPageSizeOptions', () => {
    it('should return default page size options', () => {
      const options = getValidPageSizeOptions();

      expect(options).toEqual(DEFAULT_PAGINATION_CONFIG.pageSizeOptions);
    });

    it('should return custom page size options', () => {
      const customConfig: Partial<PaginationConfig> = {
        pageSizeOptions: [10, 20, 50],
      };

      const options = getValidPageSizeOptions(customConfig);

      expect(options).toEqual([10, 20, 50]);
    });
  });

  describe('validateAndCorrectPageSize', () => {
    it('should validate correct page sizes', () => {
      const result = validateAndCorrectPageSize(24);

      expect(result.isValid).toBe(true);
      expect(result.correctedPageSize).toBe(24);
      expect(result.error).toBeUndefined();
    });

    it('should correct invalid page sizes', () => {
      const result = validateAndCorrectPageSize(0);

      expect(result.isValid).toBe(false);
      expect(result.correctedPageSize).toBe(
        DEFAULT_PAGINATION_CONFIG.minPageSize,
      );
      expect(result.error).toContain('cannot be less than');
    });

    it('should work with custom configuration', () => {
      const customConfig: Partial<PaginationConfig> = {
        minPageSize: 5,
        maxPageSize: 100,
        defaultPageSize: 10,
      };

      const result = validateAndCorrectPageSize(0, customConfig);

      expect(result.isValid).toBe(false);
      expect(result.correctedPageSize).toBe(5); // Custom min page size
    });
  });
});

describe('Integration tests', () => {
  it('should work together for complete pagination management', () => {
    const manager = new PageSizeManager();
    const validator = new PageBoundaryValidator();
    const synchronizer = new PaginationStateSynchronizer();

    // Start with initial state
    const initialState = validator.calculatePaginationState(1, 24, 100);

    // Update page size
    const { newState } = manager.updatePageSize(initialState, 48, 100);

    // Validate the new state
    const validation = validator.validatePageBoundaries(
      newState.page,
      newState.totalItems,
      newState.pageSize,
    );
    expect(validation.isValid).toBe(true);

    // Serialize to URL
    const urlParams = synchronizer.serializePaginationToUrl(
      newState.page,
      newState.pageSize,
      'nodes',
    );
    expect(urlParams.pageSize).toBe(48);

    // Serialize to settings
    const settingsData = synchronizer.serializePaginationToSettings(
      newState.pageSize,
    );
    expect(settingsData.pageSize).toBe(48);
  });

  it('should handle complex pagination scenarios', () => {
    const validator = new PageBoundaryValidator();

    // Test with various total item counts
    const scenarios = [
      { totalItems: 0, expectedPages: 1 },
      { totalItems: 1, expectedPages: 1 },
      { totalItems: 24, expectedPages: 1 },
      { totalItems: 25, expectedPages: 2 },
      { totalItems: 100, expectedPages: 5 },
    ];

    scenarios.forEach(({ totalItems, expectedPages }) => {
      const state = validator.calculatePaginationState(1, 24, totalItems);
      expect(state.totalPages).toBe(expectedPages);
      expect(state.isValidPage).toBe(true);
    });
  });
});
