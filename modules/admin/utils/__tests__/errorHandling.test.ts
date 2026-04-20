import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import {
  createAdminListError,
  logAdminListError,
  showErrorToast,
  withRetry,
  withErrorHandling,
  AdminListErrorType,
  ErrorSeverity,
  AdminListErrorRecovery,
  DEFAULT_RETRY_CONFIG,
} from '../errorHandling';

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock console methods
const originalConsole = { ...console };
beforeEach(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();
  console.group = vi.fn();
  console.groupEnd = vi.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
  vi.clearAllMocks();
});

describe('errorHandling', () => {
  describe('createAdminListError', () => {
    it('should create error from Error instance', () => {
      const originalError = new Error('Test error message');
      const error = createAdminListError(
        originalError,
        AdminListErrorType.API_ERROR,
        { testContext: 'value' },
      );

      expect(error.type).toBe(AdminListErrorType.API_ERROR);
      expect(error.message).toBe('Test error message');
      expect(error.originalError).toBe(originalError);
      expect(error.context).toEqual({ testContext: 'value' });
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.retryable).toBe(true);
      expect(error.userMessage).toContain('error occurred while loading data');
    });

    it('should create error from string', () => {
      const error = createAdminListError(
        'String error message',
        AdminListErrorType.VALIDATION_ERROR,
      );

      expect(error.type).toBe(AdminListErrorType.VALIDATION_ERROR);
      expect(error.message).toBe('String error message');
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.retryable).toBe(false);
      expect(error.userMessage).toContain('provided data is invalid');
    });

    it('should create error from object', () => {
      const errorObj = {
        message: 'Object error message',
        status: 404,
        details: 'Not found details',
      };

      const error = createAdminListError(
        errorObj,
        AdminListErrorType.API_ERROR,
      );

      expect(error.message).toBe('Object error message');
      expect(error.context).toEqual({ status: 404 });
      expect(error.userMessage).toContain('could not be found');
    });

    it('should handle network errors correctly', () => {
      const error = createAdminListError(
        new Error('Network error'),
        AdminListErrorType.NETWORK_ERROR,
      );

      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.retryable).toBe(true);
      expect(error.userMessage).toContain('check your internet connection');
    });

    it('should handle filter errors correctly', () => {
      const error = createAdminListError(
        new Error('Filter error'),
        AdminListErrorType.FILTER_ERROR,
      );

      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.retryable).toBe(true);
      expect(error.userMessage).toContain('applying filters');
    });
  });

  describe('logAdminListError', () => {
    it('should log critical errors with console.error', () => {
      const error = createAdminListError(
        new Error('Critical error'),
        AdminListErrorType.API_ERROR,
      );
      error.severity = ErrorSeverity.CRITICAL;

      logAdminListError(error);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('🚨 CRITICAL Admin List Error:'),
        expect.any(Object),
      );
    });

    it('should log medium errors with console.warn', () => {
      const error = createAdminListError(
        new Error('Medium error'),
        AdminListErrorType.VALIDATION_ERROR,
      );

      logAdminListError(error);

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ MEDIUM Admin List Error:'),
        expect.any(Object),
      );
    });

    it('should log low errors with console.info', () => {
      const error = createAdminListError(
        new Error('Low error'),
        AdminListErrorType.FILTER_ERROR,
      );

      logAdminListError(error);

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️ LOW Admin List Error:'),
        expect.any(Object),
      );
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation, 'testOperation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, 'testOperation', {
        maxAttempts: 2,
        baseDelay: 10,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should return fallback value when provided', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'));

      const result = await withRetry(
        operation,
        'testOperation',
        DEFAULT_RETRY_CONFIG,
        { fallbackValue: 'fallback' },
      );

      expect(result).toBe('fallback');
    });

    it('should call retry callback', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      const onRetry = vi.fn();

      await withRetry(
        operation,
        'testOperation',
        { maxAttempts: 2, baseDelay: 10 },
        { onRetry },
      );

      expect(onRetry).toHaveBeenCalledWith(1);
    });
  });

  describe('withErrorHandling', () => {
    it('should handle successful operations', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withErrorHandling(
        operation,
        AdminListErrorType.API_ERROR,
      );

      expect(result).toBe('success');
    });

    it('should handle errors and return fallback', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'));

      const result = await withErrorHandling(
        operation,
        AdminListErrorType.API_ERROR,
        {},
        { fallbackValue: 'fallback' },
      );

      expect(result).toBe('fallback');
    });

    it('should call custom error handler', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Test error'));
      const onError = vi.fn();

      await withErrorHandling(
        operation,
        AdminListErrorType.API_ERROR,
        {},
        { onError, fallbackValue: null },
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AdminListErrorType.API_ERROR,
          message: 'Test error',
        }),
      );
    });
  });

  describe('AdminListErrorRecovery', () => {
    describe('handleFilterError', () => {
      it('should handle successful filter operations', async () => {
        const operation = vi.fn().mockResolvedValue('filter success');

        const result = await AdminListErrorRecovery.handleFilterError(
          operation,
        );

        expect(result).toBe('filter success');
      });

      it('should handle filter errors gracefully', async () => {
        const operation = vi.fn().mockRejectedValue(new Error('Filter error'));

        const result = await AdminListErrorRecovery.handleFilterError(
          operation,
        );

        expect(result).toBeUndefined();
      });
    });

    describe('handlePaginationError', () => {
      it('should handle successful pagination operations', async () => {
        const operation = vi.fn().mockResolvedValue('pagination success');

        const result = await AdminListErrorRecovery.handlePaginationError(
          operation,
        );

        expect(result).toBe('pagination success');
      });

      it('should handle pagination errors gracefully', async () => {
        const operation = vi
          .fn()
          .mockRejectedValue(new Error('Pagination error'));

        const result = await AdminListErrorRecovery.handlePaginationError(
          operation,
        );

        expect(result).toBeUndefined();
      });
    });

    describe('handleApiCall', () => {
      it('should handle successful API calls', async () => {
        const operation = vi.fn().mockResolvedValue('api success');

        const result = await AdminListErrorRecovery.handleApiCall(
          operation,
          'testApiCall',
        );

        expect(result).toBe('api success');
      });

      it('should retry failed API calls', async () => {
        const operation = vi
          .fn()
          .mockRejectedValueOnce(new Error('API error'))
          .mockResolvedValue('api success');

        const result = await AdminListErrorRecovery.handleApiCall(
          operation,
          'testApiCall',
        );

        expect(result).toBe('api success');
        expect(operation).toHaveBeenCalledTimes(2);
      });
    });

    describe('handleStateSyncError', () => {
      it('should handle successful state sync operations', async () => {
        const operation = vi.fn().mockResolvedValue('sync success');

        const result = await AdminListErrorRecovery.handleStateSyncError(
          operation,
        );

        expect(result).toBe('sync success');
      });

      it('should handle state sync errors without showing toasts', async () => {
        const operation = vi.fn().mockRejectedValue(new Error('Sync error'));

        const result = await AdminListErrorRecovery.handleStateSyncError(
          operation,
        );

        expect(result).toBeUndefined();
        // Should not show toast for sync errors
        const { toast } = await import('react-toastify');
        expect(toast.error).not.toHaveBeenCalled();
      });
    });
  });
});
