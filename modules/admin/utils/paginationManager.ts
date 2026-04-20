import { SortOrder } from '@modules/grpc/library/blockjoy/common/v1/search';

// Type imports
type AdminListState = import('../types/AdminListState').AdminListState;
type AdminListUrlParams = import('../types/AdminListState').AdminListUrlParams;
type AdminListSettingsData =
  import('../types/AdminListState').AdminListSettingsData;

/**
 * Enhanced pagination management utilities for admin lists
 * Provides dedicated page size management, boundary validation, and state synchronization
 */

/**
 * Configuration for pagination behavior
 */
export interface PaginationConfig {
  /** Default page size */
  defaultPageSize: number;
  /** Minimum allowed page size */
  minPageSize: number;
  /** Maximum allowed page size */
  maxPageSize: number;
  /** Available page size options */
  pageSizeOptions: number[];
  /** Whether to reset to page 1 when page size changes */
  resetPageOnSizeChange: boolean;
  /** Whether to validate page boundaries automatically */
  autoValidateBoundaries: boolean;
}

/**
 * Default pagination configuration
 */
export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  defaultPageSize: 24,
  minPageSize: 1,
  maxPageSize: 1000,
  pageSizeOptions: [12, 24, 48, 96, 192],
  resetPageOnSizeChange: true,
  autoValidateBoundaries: true,
};

/**
 * Pagination state information
 */
export interface PaginationState {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Start index of current page items (0-based) */
  startIndex: number;
  /** End index of current page items (0-based) */
  endIndex: number;
  /** Whether current page is valid */
  isValidPage: boolean;
}

/**
 * Page size validation result
 */
export interface PageSizeValidationResult {
  /** Whether the page size is valid */
  isValid: boolean;
  /** Corrected page size if invalid */
  correctedPageSize: number;
  /** Validation error message if invalid */
  error?: string;
}

/**
 * Page boundary validation result
 */
export interface PageBoundaryValidationResult {
  /** Whether the page is valid */
  isValid: boolean;
  /** Corrected page number if invalid */
  correctedPage: number;
  /** Validation error message if invalid */
  error?: string;
  /** Whether the page was corrected */
  wasCorrected: boolean;
}

/**
 * Pagination change event
 */
export interface PaginationChangeEvent {
  /** Type of change */
  type: 'page' | 'pageSize' | 'totalItems';
  /** Previous pagination state */
  previousState: PaginationState;
  /** New pagination state */
  newState: PaginationState;
  /** Whether the change was automatically corrected */
  wasAutoCorrected: boolean;
}

/**
 * Dedicated page size management utilities
 */
export class PageSizeManager {
  private config: PaginationConfig;
  private changeListeners: ((event: PaginationChangeEvent) => void)[] = [];

  constructor(config: Partial<PaginationConfig> = {}) {
    this.config = { ...DEFAULT_PAGINATION_CONFIG, ...config };
  }

  /**
   * Validates a page size value
   */
  validatePageSize(pageSize: number): PageSizeValidationResult {
    if (typeof pageSize !== 'number' || isNaN(pageSize)) {
      return {
        isValid: false,
        correctedPageSize: this.config.defaultPageSize,
        error: 'Page size must be a valid number',
      };
    }

    if (pageSize < this.config.minPageSize) {
      return {
        isValid: false,
        correctedPageSize: this.config.minPageSize,
        error: `Page size cannot be less than ${this.config.minPageSize}`,
      };
    }

    if (pageSize > this.config.maxPageSize) {
      return {
        isValid: false,
        correctedPageSize: this.config.maxPageSize,
        error: `Page size cannot be greater than ${this.config.maxPageSize}`,
      };
    }

    return {
      isValid: true,
      correctedPageSize: pageSize,
    };
  }

  /**
   * Gets the closest valid page size from available options
   */
  getClosestValidPageSize(requestedSize: number): number {
    const validation = this.validatePageSize(requestedSize);

    // Find the closest option from available page sizes
    const options = this.config.pageSizeOptions;
    if (options.length === 0) {
      return validation.correctedPageSize;
    }

    // Always find closest from options, even if requested size is technically valid
    let closest = options[0];
    let minDiff = Math.abs(requestedSize - closest);

    for (const option of options) {
      const diff = Math.abs(requestedSize - option);
      if (diff < minDiff) {
        minDiff = diff;
        closest = option;
      }
    }

    return closest;
  }

  /**
   * Updates page size with validation and boundary correction
   */
  updatePageSize(
    currentState: PaginationState,
    newPageSize: number,
    totalItems: number,
  ): {
    newState: PaginationState;
    wasChanged: boolean;
    validationResult: PageSizeValidationResult;
  } {
    const validation = this.validatePageSize(newPageSize);
    const correctedPageSize = validation.correctedPageSize;

    let newPage = currentState.page;

    // Reset to page 1 if configured to do so
    if (
      this.config.resetPageOnSizeChange &&
      correctedPageSize !== currentState.pageSize
    ) {
      newPage = 1;
    } else if (this.config.autoValidateBoundaries) {
      // Validate page boundaries with new page size
      const boundaryValidation = this.validatePageBoundaries(
        newPage,
        totalItems,
        correctedPageSize,
      );
      newPage = boundaryValidation.correctedPage;
    }

    const newState = this.calculatePaginationState(
      newPage,
      correctedPageSize,
      totalItems,
    );
    const wasChanged =
      correctedPageSize !== currentState.pageSize ||
      newPage !== currentState.page;

    if (wasChanged) {
      this.notifyChangeListeners({
        type: 'pageSize',
        previousState: currentState,
        newState,
        wasAutoCorrected: !validation.isValid || newPage !== currentState.page,
      });
    }

    return {
      newState,
      wasChanged,
      validationResult: validation,
    };
  }

  /**
   * Gets available page size options
   */
  getPageSizeOptions(): number[] {
    return [...this.config.pageSizeOptions];
  }

  /**
   * Adds a change listener
   */
  addChangeListener(listener: (event: PaginationChangeEvent) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Removes a change listener
   */
  removeChangeListener(listener: (event: PaginationChangeEvent) => void): void {
    const index = this.changeListeners.indexOf(listener);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * Notifies all change listeners
   */
  private notifyChangeListeners(event: PaginationChangeEvent): void {
    this.changeListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in pagination change listener:', error);
      }
    });
  }

  /**
   * Validates page boundaries
   */
  private validatePageBoundaries(
    page: number,
    totalItems: number,
    pageSize: number,
  ): PageBoundaryValidationResult {
    if (typeof page !== 'number' || page < 1) {
      return {
        isValid: false,
        correctedPage: 1,
        error: 'Page number must be at least 1',
        wasCorrected: true,
      };
    }

    if (typeof totalItems !== 'number' || totalItems < 0) {
      return {
        isValid: true,
        correctedPage: page,
        wasCorrected: false,
      };
    }

    if (typeof pageSize !== 'number' || pageSize < 1) {
      return {
        isValid: true,
        correctedPage: page,
        wasCorrected: false,
      };
    }

    const maxPage = Math.max(1, Math.ceil(totalItems / pageSize));

    if (page > maxPage) {
      return {
        isValid: false,
        correctedPage: maxPage,
        error: `Page ${page} exceeds maximum page ${maxPage}`,
        wasCorrected: true,
      };
    }

    return {
      isValid: true,
      correctedPage: page,
      wasCorrected: false,
    };
  }

  /**
   * Calculates complete pagination state
   */
  private calculatePaginationState(
    page: number,
    pageSize: number,
    totalItems: number,
  ): PaginationState {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const validPage = Math.max(1, Math.min(page, totalPages));

    const startIndex = (validPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);

    return {
      page: validPage,
      pageSize,
      totalItems,
      totalPages,
      hasPreviousPage: validPage > 1,
      hasNextPage: validPage < totalPages,
      startIndex,
      endIndex: Math.max(startIndex, endIndex),
      isValidPage: validPage === page,
    };
  }
}

/**
 * Page boundary validation and correction logic
 */
export class PageBoundaryValidator {
  private config: PaginationConfig;

  constructor(config: Partial<PaginationConfig> = {}) {
    this.config = { ...DEFAULT_PAGINATION_CONFIG, ...config };
  }

  /**
   * Validates page boundaries and provides correction
   */
  validatePageBoundaries(
    page: number,
    totalItems: number,
    pageSize: number,
  ): PageBoundaryValidationResult {
    if (typeof page !== 'number' || page < 1) {
      return {
        isValid: false,
        correctedPage: 1,
        error: 'Page number must be at least 1',
        wasCorrected: true,
      };
    }

    if (typeof totalItems !== 'number' || totalItems < 0) {
      return {
        isValid: true,
        correctedPage: page,
        wasCorrected: false,
      };
    }

    if (typeof pageSize !== 'number' || pageSize < 1) {
      return {
        isValid: true,
        correctedPage: page,
        wasCorrected: false,
      };
    }

    const maxPage = Math.max(1, Math.ceil(totalItems / pageSize));

    if (page > maxPage) {
      return {
        isValid: false,
        correctedPage: maxPage,
        error: `Page ${page} exceeds maximum page ${maxPage}`,
        wasCorrected: true,
      };
    }

    return {
      isValid: true,
      correctedPage: page,
      wasCorrected: false,
    };
  }

  /**
   * Calculates pagination metadata
   */
  calculatePaginationState(
    page: number,
    pageSize: number,
    totalItems: number,
  ): PaginationState {
    const validation = this.validatePageBoundaries(page, totalItems, pageSize);
    const validPage = validation.correctedPage;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const startIndex = (validPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);

    return {
      page: validPage,
      pageSize,
      totalItems,
      totalPages,
      hasPreviousPage: validPage > 1,
      hasNextPage: validPage < totalPages,
      startIndex,
      endIndex: Math.max(startIndex, endIndex),
      isValidPage: validation.isValid,
    };
  }

  /**
   * Gets safe page navigation options
   */
  getNavigationOptions(currentState: PaginationState): {
    canGoFirst: boolean;
    canGoPrevious: boolean;
    canGoNext: boolean;
    canGoLast: boolean;
    firstPage: number;
    previousPage: number;
    nextPage: number;
    lastPage: number;
  } {
    return {
      canGoFirst: currentState.page > 1,
      canGoPrevious: currentState.hasPreviousPage,
      canGoNext: currentState.hasNextPage,
      canGoLast: currentState.page < currentState.totalPages,
      firstPage: 1,
      previousPage: Math.max(1, currentState.page - 1),
      nextPage: Math.min(currentState.totalPages, currentState.page + 1),
      lastPage: currentState.totalPages,
    };
  }
}

/**
 * Pagination state synchronization with URL and settings
 */
export class PaginationStateSynchronizer {
  private config: PaginationConfig;

  constructor(config: Partial<PaginationConfig> = {}) {
    this.config = { ...DEFAULT_PAGINATION_CONFIG, ...config };
  }

  /**
   * Serializes pagination state to URL parameters
   */
  serializePaginationToUrl(
    page: number,
    pageSize: number,
    listName: string,
  ): Partial<AdminListUrlParams> {
    const params: Partial<AdminListUrlParams> = {};

    // Only include non-default values to keep URLs clean
    if (page > 1) {
      params.page = page;
    }

    if (pageSize !== this.config.defaultPageSize) {
      params.pageSize = pageSize;
    }

    return params;
  }

  /**
   * Deserializes URL parameters to pagination state
   */
  deserializePaginationFromUrl(urlParams: Record<string, string | string[]>): {
    page?: number;
    pageSize?: number;
  } {
    const result: { page?: number; pageSize?: number } = {};

    try {
      // Parse and validate page number
      if (urlParams.page) {
        const pageStr = Array.isArray(urlParams.page)
          ? urlParams.page[0]
          : urlParams.page;
        const page = parseInt(pageStr, 10);
        if (!isNaN(page) && page > 0 && page <= 10000) {
          result.page = page;
        }
      }

      // Parse and validate page size
      if (urlParams.pageSize) {
        const pageSizeStr = Array.isArray(urlParams.pageSize)
          ? urlParams.pageSize[0]
          : urlParams.pageSize;
        const pageSize = parseInt(pageSizeStr, 10);
        if (
          !isNaN(pageSize) &&
          pageSize >= this.config.minPageSize &&
          pageSize <= this.config.maxPageSize
        ) {
          result.pageSize = pageSize;
        }
      }
    } catch (error) {
      console.warn('Error deserializing pagination from URL:', error);
    }

    return result;
  }

  /**
   * Serializes pagination state to settings
   */
  serializePaginationToSettings(
    pageSize: number,
  ): Partial<AdminListSettingsData> {
    return {
      pageSize: Math.max(
        this.config.minPageSize,
        Math.min(this.config.maxPageSize, pageSize),
      ),
    };
  }

  /**
   * Deserializes settings to pagination state
   */
  deserializePaginationFromSettings(
    settings: AdminListSettingsData | undefined,
  ): { pageSize?: number } {
    if (!settings || typeof settings.pageSize !== 'number') {
      return {};
    }

    const pageSize = settings.pageSize;
    if (
      pageSize >= this.config.minPageSize &&
      pageSize <= this.config.maxPageSize
    ) {
      return { pageSize };
    }

    return {};
  }
}

/**
 * Enhanced pagination utilities (backward compatibility)
 */

/**
 * Enhanced version of validatePageNumber with more comprehensive validation
 */
export const validatePageNumberEnhanced = (
  page: number,
  totalItems: number,
  pageSize: number,
): PageBoundaryValidationResult => {
  const validator = new PageBoundaryValidator();
  return validator.validatePageBoundaries(page, totalItems, pageSize);
};

/**
 * Calculates complete pagination information
 */
export const calculatePaginationInfo = (
  page: number,
  pageSize: number,
  totalItems: number,
): PaginationState => {
  const validator = new PageBoundaryValidator();
  return validator.calculatePaginationState(page, pageSize, totalItems);
};

/**
 * Gets page size options with validation
 */
export const getValidPageSizeOptions = (
  config: Partial<PaginationConfig> = {},
): number[] => {
  const manager = new PageSizeManager(config);
  return manager.getPageSizeOptions();
};

/**
 * Validates and corrects page size
 */
export const validateAndCorrectPageSize = (
  pageSize: number,
  config: Partial<PaginationConfig> = {},
): PageSizeValidationResult => {
  const manager = new PageSizeManager(config);
  return manager.validatePageSize(pageSize);
};
