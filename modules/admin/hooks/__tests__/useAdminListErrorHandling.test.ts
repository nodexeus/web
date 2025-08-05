import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminListErrorHandling } from '../useAdminListErrorHandling';
import { AdminListErrorType } from '../../utils/errorHandling';

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
});

afterEach(() => {
  Object.assign(console, originalConsole);
  vi.clearAllMocks();
});

describe('useAdminListErrorHandling', () => {
  it('should initialize with empty error state', () => {
    const { result } = renderHook(() => useAdminListErrorHandling());

    expect(result.current.errors).toEqual([]);
    expect(result.current.lastError).toBeNull();
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.hasErrors).toBe(false);
  });

  it('should handle filter errors', async () => {
    const { result } = renderHook(() => useAdminListErrorHandling());

    const operation = vi.fn().mockResolvedValue('success');

    await act(async () => {
      const response = await result.current.handleFilterError(operation);
      expect(response).toBe('success');
    });

    expect(operation).toHaveBeenCalled();
    expect(result.current.hasErrors).toBe(false);
  });

  it('should handle filter errors and add to error state', async () => {
    const { result } = renderHook(() => useAdminListErrorHandling());

    const operation = vi.fn().mockRejectedValue(new Error('Filter failed'));

    await act(async () => {
      const response = await result.current.handleFilterError(operation);
      expect(response).toBeNull();
    });

    expect(result.current.hasErrors).toBe(true);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.errors[0].type).toBe(AdminListErrorType.FILTER_ERROR);
    expect(result.current.lastError?.message).toBe('Filter failed');
  });

  it('should handle pagination errors', async () => {
    const { result } = renderHook(() => useAdminListErrorHandling());

    const operation = vi.fn().mockRejectedValue(new Error('Pagination failed'));

    await act(async () => {
      const response = await result.current.handlePaginationError(operation);
      expect(response).toBeNull();
    });

    expect(result.current.hasErrors).toBe(true);
    expect(result.current.errors[0].type).toBe(
      AdminListErrorType.PAGINATION_ERROR,
    );
  });

  it('should handle API calls with retry logic', async () => {
    const { result } = renderHook(() => useAdminListErrorHandling());

    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('API failed'))
      .mockResolvedValue('success');

    await act(async () => {
      const response = await result.current.handleApiCall(operation, 'testAPI');
      expect(response).toBe('success');
    });

    expect(operation).toHaveBeenCalledTimes(2);
    expect(result.current.hasErrors).toBe(false);
  });

  it('should handle API call failures after retries', async () => {
    const { result } = renderHook(() => useAdminListErrorHandling());

    const operation = vi.fn().mockRejectedValue(new Error('API failed'));

    await act(async () => {
      const response = await result.current.handleApiCall(operation, 'testAPI');
      expect(response).toBeNull();
    });

    expect(result.current.hasErrors).toBe(true);
    expect(result.current.errors[0].type).toBe(AdminListErrorType.API_ERROR);
  });

  it('should clear all errors', async () => {
    const { result } = renderHook(() => useAdminListErrorHandling());

    // Add some errors first
    const operation = vi.fn().mockRejectedValue(new Error('Test error'));

    await act(async () => {
      await result.current.handleFilterError(operation);
      await result.current.handlePaginationError(operation);
    });

    expect(result.current.hasErrors).toBe(true);
    expect(result.current.errors).toHaveLength(2);

    // Clear errors
    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.hasErrors).toBe(false);
    expect(result.current.errors).toHaveLength(0);
    expect(result.current.lastError).toBeNull();
  });

  it('should provide error statistics', async () => {
    const { result } = renderHook(() => useAdminListErrorHandling());

    // Add different types of errors
    const filterOperation = vi
      .fn()
      .mockRejectedValue(new Error('Filter error'));
    const paginationOperation = vi
      .fn()
      .mockRejectedValue(new Error('Pagination error'));

    await act(async () => {
      await result.current.handleFilterError(filterOperation);
      await result.current.handlePaginationError(paginationOperation);
    });

    const stats = result.current.getErrorStats();

    expect(stats.total).toBe(2);
    expect(stats.byType[AdminListErrorType.FILTER_ERROR]).toBe(1);
    expect(stats.byType[AdminListErrorType.PAGINATION_ERROR]).toBe(1);
    expect(stats.retryable).toBe(2); // Both filter and pagination errors are retryable
  });

  it('should export error data for debugging', async () => {
    const { result } = renderHook(() => useAdminListErrorHandling());

    const operation = vi.fn().mockRejectedValue(new Error('Test error'));

    await act(async () => {
      await result.current.handleFilterError(operation);
    });

    const exportData = result.current.exportErrorData();
    const parsedData = JSON.parse(exportData);

    expect(parsedData).toHaveProperty('timestamp');
    expect(parsedData).toHaveProperty('userAgent');
    expect(parsedData).toHaveProperty('url');
    expect(parsedData).toHaveProperty('errors');
    expect(parsedData.errors).toHaveLength(1);
    expect(parsedData.errors[0]).toHaveProperty('id');
    expect(parsedData.errors[0]).toHaveProperty('type');
    expect(parsedData.errors[0]).toHaveProperty('message');
  });

  it('should limit error queue size', async () => {
    const { result } = renderHook(() =>
      useAdminListErrorHandling({ maxErrors: 2 }),
    );

    const operation = vi.fn().mockRejectedValue(new Error('Test error'));

    await act(async () => {
      // Add 3 errors, but only 2 should be kept
      await result.current.handleFilterError(operation);
      await result.current.handleFilterError(operation);
      await result.current.handleFilterError(operation);
    });

    expect(result.current.errors).toHaveLength(2);
  });
});
