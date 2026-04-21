import { vi } from 'vitest';
import { FilterStateManager } from '../filterStateManager';
import { StateSyncDebouncer } from '../stateSynchronization';
import {
  PerformanceMonitor,
  OperationBatcher,
} from '../performanceOptimization';

describe('Performance Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle rapid filter changes efficiently with FilterStateManager', async () => {
    const changeListener = vi.fn();
    const filterManager = new FilterStateManager({}, { debounceMs: 50 });

    filterManager.addChangeListener(changeListener);

    // Simulate rapid filter changes
    filterManager.setFilter('status', ['active']);
    filterManager.setFilter('status', ['active', 'pending']);
    filterManager.setFilter('type', ['user']);
    filterManager.setFilter('status', ['inactive']);

    // Wait for debounced operations to complete
    await filterManager.flush();

    // Verify final state
    const finalFilters = filterManager.getFilters();
    expect(finalFilters).toEqual({
      status: ['inactive'],
      type: ['user'],
    });

    // Verify change listener was called
    expect(changeListener).toHaveBeenCalled();

    // Get performance metrics
    const metrics = filterManager.getPerformanceMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.averageDurations).toBeDefined();
    expect(metrics.cacheStats).toBeDefined();

    filterManager.destroy();
  });

  it('should handle rapid state synchronization efficiently with StateSyncDebouncer', async () => {
    const debouncer = new StateSyncDebouncer();
    const syncFunction = vi.fn();

    // Simulate rapid sync operations
    debouncer.debounce('url-sync', syncFunction, 50);
    debouncer.debounce('url-sync', syncFunction, 50);
    debouncer.debounce('url-sync', syncFunction, 50);
    debouncer.debounce('url-sync', syncFunction, 50);

    // Wait for debounced operation to complete
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Should only be called once due to debouncing
    expect(syncFunction).toHaveBeenCalledTimes(1);

    // Get performance metrics
    const metrics = debouncer.getPerformanceMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.averageDurations).toBeDefined();
    expect(metrics.cacheStats).toBeDefined();

    debouncer.destroy();
  });

  it('should efficiently handle mixed operations with OperationBatcher', async () => {
    vi.useFakeTimers();

    const processor = vi.fn();
    const batcher = new OperationBatcher(processor, 50);

    // Simulate mixed rapid operations
    batcher.add({ type: 'setSearch', value: 'test query' });
    batcher.add({ type: 'setFilter', column: 'status', values: ['active'] });
    batcher.add({ type: 'setPage', value: 2 });
    batcher.add({ type: 'setSort', field: 2, order: 'desc' });

    expect(batcher.size()).toBe(4);

    // Fast-forward time to trigger batch processing
    vi.advanceTimersByTime(50);

    // Should process all operations in one batch
    expect(processor).toHaveBeenCalledTimes(1);
    expect(processor).toHaveBeenCalledWith([
      { type: 'setSearch', value: 'test query' },
      { type: 'setFilter', column: 'status', values: ['active'] },
      { type: 'setPage', value: 2 },
      { type: 'setSort', field: 2, order: 'desc' },
    ]);

    expect(batcher.size()).toBe(0);

    vi.useRealTimers();
  });

  it('should provide comprehensive performance monitoring', async () => {
    const monitor = new PerformanceMonitor({
      enableMonitoring: true,
      logMetrics: false,
      slowOperationThreshold: 10,
      maxMetricsHistory: 20,
    });

    // Simulate various operations
    monitor.timeOperation('filterUpdate', () => {
      // Simulate filter processing
      let result = 0;
      for (let i = 0; i < 100; i++) {
        result += i;
      }
      return result;
    });

    await monitor.timeAsyncOperation('apiCall', async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return 'api result';
    });

    monitor.timeOperation('stateSync', () => {
      // Simulate state synchronization
      return { synced: true };
    });

    // Verify metrics collection
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(3);

    const filterMetrics = monitor.getMetricsForOperation('filterUpdate');
    expect(filterMetrics).toHaveLength(1);

    const avgDuration = monitor.getAverageDuration('filterUpdate');
    expect(avgDuration).toBeGreaterThan(0);

    monitor.clearMetrics();
    expect(monitor.getMetrics()).toHaveLength(0);
  });

  it('should handle bulk filter operations efficiently', async () => {
    const filterManager = new FilterStateManager({}, { debounceMs: 25 });

    const changeListener = vi.fn();
    filterManager.addChangeListener(changeListener);

    // Test bulk filter operations
    filterManager.setBulkFilters({
      status: ['active', 'pending'],
      type: ['user', 'admin'],
      region: ['us-east', 'us-west'],
    });

    await filterManager.flush();

    const filters = filterManager.getFilters();
    expect(filters).toEqual({
      status: ['active', 'pending'],
      type: ['user', 'admin'],
      region: ['us-east', 'us-west'],
    });

    // Test clearing all filters
    filterManager.clearAllFilters();
    await filterManager.flush();

    const clearedFilters = filterManager.getFilters();
    expect(clearedFilters).toEqual({});

    // Verify change listener was called for both operations
    expect(changeListener).toHaveBeenCalledTimes(2);

    filterManager.destroy();
  });

  it('should demonstrate performance improvements with memoization', async () => {
    const debouncer = new StateSyncDebouncer();

    // Get memoized serializer
    const urlSerializer = debouncer.getMemoizedSerializer('urlSerialization');
    expect(urlSerializer).toBeDefined();

    // Test that memoization works by calling with same arguments
    if (urlSerializer) {
      const state1 = { page: 1, pageSize: 24, filters: { status: ['active'] } };
      const state2 = { page: 1, pageSize: 24, filters: { status: ['active'] } };

      const result1 = urlSerializer(state1, 'testList');
      const result2 = urlSerializer(state2, 'testList');

      // Results should be identical due to memoization
      expect(result1).toEqual(result2);

      // Cache should have entries
      expect(urlSerializer.size()).toBeGreaterThan(0);

      // Clear cache
      urlSerializer.clear();
      expect(urlSerializer.size()).toBe(0);
    }

    debouncer.destroy();
  });

  it('should handle error scenarios gracefully', async () => {
    const monitor = new PerformanceMonitor({
      enableMonitoring: true,
      logMetrics: false,
    });

    // Test error handling in synchronous operations
    expect(() => {
      monitor.timeOperation('errorOperation', () => {
        throw new Error('Test error');
      });
    }).toThrow('Test error');

    // Test error handling in asynchronous operations
    await expect(
      monitor.timeAsyncOperation('asyncErrorOperation', async () => {
        throw new Error('Async test error');
      }),
    ).rejects.toThrow('Async test error');

    // Verify errors are recorded in metrics
    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(2);
    expect(metrics[0].metadata?.error).toBe('Test error');
    expect(metrics[1].metadata?.error).toBe('Async test error');

    monitor.clearMetrics();
  });
});
