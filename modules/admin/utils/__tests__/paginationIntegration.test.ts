import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PageSizeManager,
  PageBoundaryValidator,
  PaginationStateSynchronizer,
  calculatePaginationInfo,
  validatePageNumberEnhanced,
  validateAndCorrectPageSize,
  type PaginationState,
} from '../paginationManager';
import {
  serializeStateToUrlParams,
  deserializeUrlParamsToState,
  serializeStateToSettings,
  deserializeSettingsToState,
} from '../stateSynchronization';
import { SortOrder } from '../../../../generated/blockjoy/common/v1/search';

// Type imports
type AdminListState = import('../../types/AdminListState').AdminListState;
type AdminListStateConfig =
  import('../../types/AdminListState').AdminListStateConfig;

describe('Pagination Integration Tests', () => {
  const defaultConfig: AdminListStateConfig = {
    defaultPageSize: 24,
    defaultSortField: 1,
    defaultSortOrder: SortOrder.SORT_ORDER_ASC,
  };

  let pageSizeManager: PageSizeManager;
  let boundaryValidator: PageBoundaryValidator;
  let stateSynchronizer: PaginationStateSynchronizer;

  beforeEach(() => {
    pageSizeManager = new PageSizeManager();
    boundaryValidator = new PageBoundaryValidator();
    stateSynchronizer = new PaginationStateSynchronizer();
  });

  describe('Page size management integration', () => {
    it('should update page size and reset to page 1', () => {
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

      const { newState, wasChanged } = pageSizeManager.updatePageSize(
        currentState,
        48,
        100,
      );

      expect(wasChanged).toBe(true);
      expect(newState.pageSize).toBe(48);
      expect(newState.page).toBe(1); // Should reset to page 1
      expect(newState.totalPages).toBe(3); // Math.ceil(100/48)
    });

    it('should validate page size options', () => {
      const options = pageSizeManager.getPageSizeOptions();
      expect(options).toEqual([12, 24, 48, 96, 192]);
    });

    it('should validate page size input', () => {
      // Valid page size
      const validResult = pageSizeManager.validatePageSize(48);
      expect(validResult.isValid).toBe(true);
      expect(validResult.correctedPageSize).toBe(48);

      // Invalid page size (too small)
      const invalidResult = pageSizeManager.validatePageSize(0);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.correctedPageSize).toBe(1);
    });

    it('should get closest valid page size from options', () => {
      const closest = pageSizeManager.getClosestValidPageSize(30);
      expect(closest).toBe(24); // Closest to 30 from [12, 24, 48, 96, 192]
    });
  });

  describe('Page boundary validation integration', () => {
    it('should validate page boundaries with total items', () => {
      const validation = boundaryValidator.validatePageBoundaries(5, 50, 24);

      expect(validation.isValid).toBe(false);
      expect(validation.correctedPage).toBe(3); // Math.ceil(50/24) = 3
      expect(validation.wasCorrected).toBe(true);
      expect(validation.error).toContain('exceeds maximum page');
    });

    it('should handle empty result sets', () => {
      const validation = boundaryValidator.validatePageBoundaries(2, 0, 24);

      expect(validation.isValid).toBe(false);
      expect(validation.correctedPage).toBe(1);
      expect(validation.wasCorrected).toBe(true);
    });

    it('should calculate pagination info correctly', () => {
      const paginationInfo = boundaryValidator.calculatePaginationState(
        2,
        24,
        100,
      );

      expect(paginationInfo).toEqual({
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

    it('should provide navigation options', () => {
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

      const navigation = boundaryValidator.getNavigationOptions(currentState);

      expect(navigation).toEqual({
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
  });

  describe('State synchronization integration', () => {
    it('should serialize and deserialize pagination to URL', () => {
      // Serialize to URL
      const urlParams = stateSynchronizer.serializePaginationToUrl(
        3,
        48,
        'nodes',
      );

      expect(urlParams).toEqual({
        page: 3,
        pageSize: 48,
      });

      // Deserialize from URL
      const urlData = {
        page: '3',
        pageSize: '48',
      };

      const deserialized =
        stateSynchronizer.deserializePaginationFromUrl(urlData);

      expect(deserialized).toEqual({
        page: 3,
        pageSize: 48,
      });
    });

    it('should serialize and deserialize pagination to settings', () => {
      // Serialize to settings
      const settingsData = stateSynchronizer.serializePaginationToSettings(48);

      expect(settingsData).toEqual({
        pageSize: 48,
      });

      // Deserialize from settings
      const settings = {
        pageSize: 48,
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        columns: [],
      };

      const deserialized =
        stateSynchronizer.deserializePaginationFromSettings(settings);

      expect(deserialized).toEqual({
        pageSize: 48,
      });
    });

    it('should handle invalid URL parameters gracefully', () => {
      const urlData = {
        page: 'invalid',
        pageSize: '2000', // Too large
      };

      const deserialized =
        stateSynchronizer.deserializePaginationFromUrl(urlData);

      expect(deserialized).toEqual({}); // Both values rejected
    });
  });

  describe('Complete workflow integration', () => {
    it('should handle complete pagination workflow', () => {
      // Start with initial state
      const initialState: AdminListState = {
        search: '',
        page: 1,
        pageSize: 24,
        sortField: 1,
        sortOrder: SortOrder.SORT_ORDER_ASC,
        filters: {},
        isLoading: false,
        error: null,
      };

      // 1. Update page size using manager
      const currentPaginationState = calculatePaginationInfo(
        initialState.page,
        initialState.pageSize,
        100,
      );

      const { newState: updatedPaginationState } =
        pageSizeManager.updatePageSize(currentPaginationState, 48, 100);

      expect(updatedPaginationState.pageSize).toBe(48);
      expect(updatedPaginationState.page).toBe(1); // Reset to page 1

      // 2. Validate page boundaries
      const validation = boundaryValidator.validatePageBoundaries(
        updatedPaginationState.page,
        updatedPaginationState.totalItems,
        updatedPaginationState.pageSize,
      );

      expect(validation.isValid).toBe(true);

      // 3. Serialize to URL
      const urlParams = stateSynchronizer.serializePaginationToUrl(
        updatedPaginationState.page,
        updatedPaginationState.pageSize,
        'nodes',
      );

      expect(urlParams.pageSize).toBe(48);
      expect(urlParams.page).toBeUndefined(); // Page 1 is default, so omitted

      // 4. Serialize to settings
      const settingsData = stateSynchronizer.serializePaginationToSettings(
        updatedPaginationState.pageSize,
      );

      expect(settingsData.pageSize).toBe(48);
    });

    it('should handle edge cases in complete workflow', () => {
      // Test with edge case: very large page number
      const edgeCaseState = calculatePaginationInfo(100, 24, 50);

      // Should correct page to valid range
      expect(edgeCaseState.page).toBe(3); // Math.ceil(50/24) = 3
      expect(edgeCaseState.isValidPage).toBe(false); // Original page was invalid

      // Test page size validation
      const pageSizeValidation = validateAndCorrectPageSize(0);
      expect(pageSizeValidation.isValid).toBe(false);
      expect(pageSizeValidation.correctedPageSize).toBe(1);

      // Test enhanced page validation
      const enhancedValidation = validatePageNumberEnhanced(10, 50, 24);
      expect(enhancedValidation.isValid).toBe(false);
      expect(enhancedValidation.correctedPage).toBe(3);
      expect(enhancedValidation.wasCorrected).toBe(true);
    });
  });

  describe('Manager coordination', () => {
    it('should coordinate between managers for complex operations', () => {
      const mockChangeListener = vi.fn();
      pageSizeManager.addChangeListener(mockChangeListener);

      const currentState: PaginationState = {
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

      // Update page size - should trigger change listener
      const { newState } = pageSizeManager.updatePageSize(
        currentState,
        48,
        100,
      );

      expect(mockChangeListener).toHaveBeenCalledWith({
        type: 'pageSize',
        previousState: currentState,
        newState: expect.objectContaining({
          pageSize: 48,
          page: 1, // Reset to page 1
        }),
        wasAutoCorrected: true, // Page was reset
      });

      // Validate the new state with boundary validator
      const validation = boundaryValidator.validatePageBoundaries(
        newState.page,
        newState.totalItems,
        newState.pageSize,
      );

      expect(validation.isValid).toBe(true);

      // Clean up
      pageSizeManager.removeChangeListener(mockChangeListener);
    });

    it('should handle errors in change listeners gracefully', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      pageSizeManager.addChangeListener(errorListener);

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

      // Should not throw error despite listener error
      expect(() => {
        pageSizeManager.updatePageSize(currentState, 48, 100);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in pagination change listener:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
      pageSizeManager.removeChangeListener(errorListener);
    });
  });

  describe('Performance and optimization', () => {
    it('should not trigger changes for identical page size updates', () => {
      const mockChangeListener = vi.fn();
      pageSizeManager.addChangeListener(mockChangeListener);

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

      // Update with same page size - should not trigger change
      const { wasChanged } = pageSizeManager.updatePageSize(
        currentState,
        24,
        100,
      );

      expect(wasChanged).toBe(false);
      expect(mockChangeListener).not.toHaveBeenCalled();

      pageSizeManager.removeChangeListener(mockChangeListener);
    });

    it('should efficiently calculate pagination info for large datasets', () => {
      const largeDatasetInfo = calculatePaginationInfo(1, 100, 1000000);

      expect(largeDatasetInfo.totalPages).toBe(10000);
      expect(largeDatasetInfo.startIndex).toBe(0);
      expect(largeDatasetInfo.endIndex).toBe(99);
      expect(largeDatasetInfo.hasNextPage).toBe(true);
    });
  });
});
