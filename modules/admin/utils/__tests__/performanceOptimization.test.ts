import { vi } from 'vitest';
import {
  PerformanceMonitor,
  createMemoizedFunction,
  OperationBatcher,
} from '../performanceOptimization';

describe('PerformanceOptimization', () => {
  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor({
        enableMonitoring: true,
        logMetrics: false, // Disable logging in tests
        slowOperationThreshold: 50,
        maxMetricsHistory: 10,
      });
    });

    afterEach(() => {
      monitor.clearMetrics();
    });

    it('should track synchronous operations', () => {
      const result = monitor.timeOperation(
        'testOperation',
        () => {
          // Simulate some work
          let sum = 0;
          for (let i = 0; i < 1000; i++) {
            sum += i;
          }
          return sum;
        },
        { testMetadata: 'value' },
      );

      expect(result).toBe(499500); // Sum of 0 to 999

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].operation).toBe('testOperation');
      expect(metrics[0].duration).toBeGreaterThan(0);
      expect(metrics[0].metadata).toEqual({ testMetadata: 'value' });
    });

    it('should track asynchronous operations', async () => {
      const result = await monitor.timeAsyncOperation(
        'asyncTestOperation',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'async result';
        },
        { async: true },
      );

      expect(result).toBe('async result');

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].operation).toBe('asyncTestOperation');
      expect(metrics[0].duration).toBeGreaterThanOrEqual(10);
      expect(metrics[0].metadata).toEqual({ async: true });
    });

    it('should calculate average durations', () => {
      // Add multiple metrics for the same operation
      monitor.timeOperation('repeatedOperation', () => 'result1');
      monitor.timeOperation('repeatedOperation', () => 'result2');
      monitor.timeOperation('repeatedOperation', () => 'result3');

      const average = monitor.getAverageDuration('repeatedOperation');
      expect(average).toBeGreaterThan(0);

      const metrics = monitor.getMetricsForOperation('repeatedOperation');
      expect(metrics).toHaveLength(3);
    });

    it('should limit metrics history', () => {
      // Add more metrics than the limit
      for (let i = 0; i < 15; i++) {
        monitor.timeOperation(`operation${i}`, () => i);
      }

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(10); // Should be limited to maxMetricsHistory
    });

    it('should handle errors in timed operations', () => {
      expect(() => {
        monitor.timeOperation('errorOperation', () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metadata?.error).toBe('Test error');
    });
  });

  describe('createMemoizedFunction', () => {
    it('should memoize function results', () => {
      const mockFn = vi.fn((x: number, y: number) => x + y);
      const memoizedFn = createMemoizedFunction(mockFn);

      const result1 = memoizedFn(1, 2);
      const result2 = memoizedFn(1, 2); // Should use cache
      const result3 = memoizedFn(2, 3); // Different args, should call function

      expect(result1).toBe(3);
      expect(result2).toBe(3);
      expect(result3).toBe(5);

      expect(mockFn).toHaveBeenCalledTimes(2); // Only called for unique argument sets
    });

    it('should respect maxSize limit', () => {
      const mockFn = vi.fn((x: number) => x * 2);
      const memoizedFn = createMemoizedFunction(mockFn, { maxSize: 2 });

      memoizedFn(1);
      memoizedFn(2);
      memoizedFn(3); // Should evict oldest entry

      expect(memoizedFn.size()).toBe(2);
      expect(memoizedFn.has(JSON.stringify([1]))).toBe(false); // Oldest entry should be evicted
      expect(memoizedFn.has(JSON.stringify([2]))).toBe(true);
      expect(memoizedFn.has(JSON.stringify([3]))).toBe(true);
    });

    it('should support cache management methods', () => {
      const mockFn = vi.fn((x: number) => x * 2);
      const memoizedFn = createMemoizedFunction(mockFn);

      memoizedFn(1);
      memoizedFn(2);

      expect(memoizedFn.size()).toBe(2);
      expect(memoizedFn.has(JSON.stringify([1]))).toBe(true);

      memoizedFn.delete(JSON.stringify([1]));
      expect(memoizedFn.size()).toBe(1);
      expect(memoizedFn.has(JSON.stringify([1]))).toBe(false);

      memoizedFn.clear();
      expect(memoizedFn.size()).toBe(0);
    });
  });

  describe('OperationBatcher', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should batch operations', async () => {
      const processor = vi.fn();
      const batcher = new OperationBatcher(processor, 100);

      batcher.add('op1');
      batcher.add('op2');
      batcher.add('op3');

      expect(processor).not.toHaveBeenCalled();
      expect(batcher.size()).toBe(3);

      vi.advanceTimersByTime(100);

      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith(['op1', 'op2', 'op3']);
      expect(batcher.size()).toBe(0);
    });

    it('should support immediate flushing', async () => {
      const processor = vi.fn();
      const batcher = new OperationBatcher(processor, 100);

      batcher.add('op1');
      batcher.add('op2');

      await batcher.flush();

      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith(['op1', 'op2']);
      expect(batcher.size()).toBe(0);
    });

    it('should support clearing operations', () => {
      const processor = vi.fn();
      const batcher = new OperationBatcher(processor, 100);

      batcher.add('op1');
      batcher.add('op2');

      batcher.clear();

      vi.advanceTimersByTime(100);

      expect(processor).not.toHaveBeenCalled();
      expect(batcher.size()).toBe(0);
    });
  });
});
