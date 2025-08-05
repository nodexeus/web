import { useCallback, useRef, useMemo, useEffect } from 'react';
import { debounce } from '../../../shared/utils/debounce';

/**
 * Performance optimization utilities for admin list components
 * Provides debouncing, memoization, and performance monitoring
 */

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  /** Enable performance monitoring */
  enableMonitoring: boolean;
  /** Log performance metrics to console */
  logMetrics: boolean;
  /** Threshold for slow operations (ms) */
  slowOperationThreshold: number;
  /** Maximum number of metrics to keep in memory */
  maxMetricsHistory: number;
}

/**
 * Default performance configuration
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  enableMonitoring: process.env.NODE_ENV === 'development',
  logMetrics: process.env.NODE_ENV === 'development',
  slowOperationThreshold: 100,
  maxMetricsHistory: 100,
};

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Performance monitoring class
 */
export class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetric[] = [];
  private activeOperations: Map<string, number> = new Map();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_PERFORMANCE_CONFIG, ...config };
  }

  /**
   * Starts timing an operation
   */
  startOperation(operationId: string, operationName: string): void {
    if (!this.config.enableMonitoring) return;

    this.activeOperations.set(operationId, performance.now());
  }

  /**
   * Ends timing an operation and records the metric
   */
  endOperation(
    operationId: string,
    operationName: string,
    metadata?: Record<string, any>,
  ): PerformanceMetric | null {
    if (!this.config.enableMonitoring) return null;

    const startTime = this.activeOperations.get(operationId);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationId}`);
      return null;
    }

    const duration = performance.now() - startTime;
    const metric: PerformanceMetric = {
      operation: operationName,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.activeOperations.delete(operationId);
    this.addMetric(metric);

    return metric;
  }

  /**
   * Times a synchronous operation
   */
  timeOperation<T>(
    operationName: string,
    operation: () => T,
    metadata?: Record<string, any>,
  ): T {
    if (!this.config.enableMonitoring) {
      return operation();
    }

    const operationId = `${operationName}-${Date.now()}-${Math.random()}`;
    this.startOperation(operationId, operationName);

    try {
      const result = operation();
      this.endOperation(operationId, operationName, metadata);
      return result;
    } catch (error) {
      this.endOperation(operationId, operationName, {
        ...metadata,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Times an asynchronous operation
   */
  async timeAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    if (!this.config.enableMonitoring) {
      return operation();
    }

    const operationId = `${operationName}-${Date.now()}-${Math.random()}`;
    this.startOperation(operationId, operationName);

    try {
      const result = await operation();
      this.endOperation(operationId, operationName, metadata);
      return result;
    } catch (error) {
      this.endOperation(operationId, operationName, {
        ...metadata,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Adds a metric to the history
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.config.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.config.maxMetricsHistory);
    }

    // Log slow operations
    if (
      this.config.logMetrics &&
      metric.duration > this.config.slowOperationThreshold
    ) {
      console.warn(`🐌 Slow operation detected:`, {
        operation: metric.operation,
        duration: `${metric.duration.toFixed(2)}ms`,
        metadata: metric.metadata,
        timestamp: new Date(metric.timestamp).toISOString(),
      });
    } else if (this.config.logMetrics) {
      console.log(`⚡ Operation completed:`, {
        operation: metric.operation,
        duration: `${metric.duration.toFixed(2)}ms`,
        metadata: metric.metadata,
      });
    }
  }

  /**
   * Gets performance metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Gets metrics for a specific operation
   */
  getMetricsForOperation(operationName: string): PerformanceMetric[] {
    return this.metrics.filter((metric) => metric.operation === operationName);
  }

  /**
   * Gets average duration for an operation
   */
  getAverageDuration(operationName: string): number {
    const operationMetrics = this.getMetricsForOperation(operationName);
    if (operationMetrics.length === 0) return 0;

    const totalDuration = operationMetrics.reduce(
      (sum, metric) => sum + metric.duration,
      0,
    );
    return totalDuration / operationMetrics.length;
  }

  /**
   * Clears all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.activeOperations.clear();
  }

  /**
   * Updates configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Enhanced debouncing utilities
 */
export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): Promise<ReturnType<T>>;
  cancel(): void;
  flush(): Promise<ReturnType<T> | undefined>;
  pending(): boolean;
}

/**
 * Creates an enhanced debounced function with additional utilities
 */
export function createEnhancedDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {},
): DebouncedFunction<T> {
  const { leading = false, trailing = true, maxWait } = options;

  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | undefined;
  let lastThis: any;
  let result: ReturnType<T>;
  let pendingPromises: {
    resolve: (value: ReturnType<T>) => void;
    reject: (error: any) => void;
  }[] = [];

  function invokeFunc(time: number): ReturnType<T> {
    const args = lastArgs!;
    const thisArg = lastThis;

    lastArgs = undefined;
    lastThis = undefined;
    lastInvokeTime = time;

    try {
      result = func.apply(thisArg, args);

      // Resolve all pending promises
      pendingPromises.forEach(({ resolve }) => resolve(result));
      pendingPromises = [];

      return result;
    } catch (error) {
      // Reject all pending promises
      pendingPromises.forEach(({ reject }) => reject(error));
      pendingPromises = [];
      throw error;
    }
  }

  function leadingEdge(time: number): ReturnType<T> {
    lastInvokeTime = time;
    timeoutId = setTimeout(timerExpired, delay);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired(): ReturnType<T> | void {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timeoutId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number): ReturnType<T> {
    timeoutId = null;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = undefined;
    lastThis = undefined;
    return result;
  }

  function cancel(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId);
    }

    // Reject all pending promises
    pendingPromises.forEach(({ reject }) =>
      reject(new Error('Debounced function was cancelled')),
    );
    pendingPromises = [];

    lastInvokeTime = 0;
    lastCallTime = 0;
    lastArgs = undefined;
    lastThis = undefined;
    timeoutId = null;
    maxTimeoutId = null;
  }

  function flush(): Promise<ReturnType<T> | undefined> {
    return new Promise((resolve, reject) => {
      if (timeoutId === null) {
        resolve(result);
        return;
      }

      try {
        const time = Date.now();
        const invokeResult = trailingEdge(time);
        resolve(invokeResult);
      } catch (error) {
        reject(error);
      }
    });
  }

  function pending(): boolean {
    return timeoutId !== null;
  }

  function debounced(
    this: any,
    ...args: Parameters<T>
  ): Promise<ReturnType<T>> {
    return new Promise((resolve, reject) => {
      const time = Date.now();
      const isInvoking = shouldInvoke(time);

      lastArgs = args;
      lastThis = this;
      lastCallTime = time;

      // Add to pending promises
      pendingPromises.push({ resolve, reject });

      if (isInvoking) {
        if (timeoutId === null) {
          try {
            const leadingResult = leadingEdge(lastCallTime);
            if (leading) {
              // If leading edge was executed, resolve immediately
              resolve(leadingResult);
              return;
            }
          } catch (error) {
            reject(error);
            return;
          }
        }
      }

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(timerExpired, delay);

      if (maxWait !== undefined && maxTimeoutId === null) {
        maxTimeoutId = setTimeout(() => {
          const time = Date.now();
          try {
            const maxWaitResult = trailingEdge(time);
            // Promises will be resolved in trailingEdge -> invokeFunc
          } catch (error) {
            pendingPromises.forEach(({ reject }) => reject(error));
            pendingPromises = [];
          }
        }, maxWait);
      }
    });
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced;
}

/**
 * Memoization utilities for expensive calculations
 */
export interface MemoizedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  cache: Map<string, { result: ReturnType<T>; timestamp: number }>;
  clear(): void;
  delete(key: string): boolean;
  has(key: string): boolean;
  size(): number;
}

/**
 * Creates a memoized function with TTL support
 */
export function createMemoizedFunction<T extends (...args: any[]) => any>(
  func: T,
  options: {
    maxSize?: number;
    ttl?: number; // Time to live in milliseconds
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {},
): MemoizedFunction<T> {
  const { maxSize = 100, ttl, keyGenerator } = options;
  const cache = new Map<string, { result: ReturnType<T>; timestamp: number }>();

  const defaultKeyGenerator = (...args: Parameters<T>): string => {
    return JSON.stringify(args);
  };

  const generateKey = keyGenerator || defaultKeyGenerator;

  function memoized(...args: Parameters<T>): ReturnType<T> {
    const key = generateKey(...args);
    const now = Date.now();

    // Check if we have a cached result
    const cached = cache.get(key);
    if (cached) {
      // Check TTL if specified
      if (ttl && now - cached.timestamp > ttl) {
        cache.delete(key);
      } else {
        return cached.result;
      }
    }

    // Compute new result
    const result = func(...args);

    // Store in cache
    cache.set(key, { result, timestamp: now });

    // Enforce max size by removing oldest entries
    if (cache.size > maxSize) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest entries until we're under the limit
      const toRemove = entries.slice(0, cache.size - maxSize);
      toRemove.forEach(([key]) => cache.delete(key));
    }

    return result;
  }

  memoized.cache = cache;
  memoized.clear = () => cache.clear();
  memoized.delete = (key: string) => cache.delete(key);
  memoized.has = (key: string) => cache.has(key);
  memoized.size = () => cache.size;

  return memoized;
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor(
  config: Partial<PerformanceConfig> = {},
): PerformanceMonitor {
  const monitorRef = useRef<PerformanceMonitor | null>(null);

  if (!monitorRef.current) {
    monitorRef.current = new PerformanceMonitor(config);
  }

  // Update config if it changes
  useEffect(() => {
    if (monitorRef.current) {
      monitorRef.current.updateConfig(config);
    }
  }, [config]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (monitorRef.current) {
        monitorRef.current.clearMetrics();
      }
    };
  }, []);

  return monitorRef.current;
}

/**
 * React hook for enhanced debouncing
 */
export function useEnhancedDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {},
): DebouncedFunction<T> {
  const debouncedFuncRef = useRef<DebouncedFunction<T> | null>(null);

  // Create debounced function
  const debouncedFunc = useMemo(() => {
    if (debouncedFuncRef.current) {
      debouncedFuncRef.current.cancel();
    }

    const newDebouncedFunc = createEnhancedDebounce(func, delay, options);
    debouncedFuncRef.current = newDebouncedFunc;
    return newDebouncedFunc;
  }, [func, delay, options.leading, options.trailing, options.maxWait]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debouncedFuncRef.current) {
        debouncedFuncRef.current.cancel();
      }
    };
  }, []);

  return debouncedFunc;
}

/**
 * React hook for memoized expensive calculations
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  func: T,
  deps: React.DependencyList,
  options: {
    maxSize?: number;
    ttl?: number;
    keyGenerator?: (...args: Parameters<T>) => string;
  } = {},
): MemoizedFunction<T> {
  const memoizedFuncRef = useRef<MemoizedFunction<T> | null>(null);

  const memoizedFunc = useMemo(() => {
    if (memoizedFuncRef.current) {
      memoizedFuncRef.current.clear();
    }

    const newMemoizedFunc = createMemoizedFunction(func, options);
    memoizedFuncRef.current = newMemoizedFunc;
    return newMemoizedFunc;
  }, [...deps, options.maxSize, options.ttl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (memoizedFuncRef.current) {
        memoizedFuncRef.current.clear();
      }
    };
  }, []);

  return memoizedFunc;
}

/**
 * Utility for batching multiple operations
 */
export class OperationBatcher<T> {
  private operations: T[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private processor: (operations: T[]) => void | Promise<void>;
  private delay: number;

  constructor(
    processor: (operations: T[]) => void | Promise<void>,
    delay: number = 100,
  ) {
    this.processor = processor;
    this.delay = delay;
  }

  /**
   * Adds an operation to the batch
   */
  add(operation: T): void {
    this.operations.push(operation);
    this.scheduleProcessing();
  }

  /**
   * Immediately processes all pending operations
   */
  async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.operations.length > 0) {
      const operationsToProcess = [...this.operations];
      this.operations = [];
      await this.processor(operationsToProcess);
    }
  }

  /**
   * Clears all pending operations without processing them
   */
  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.operations = [];
  }

  /**
   * Gets the number of pending operations
   */
  size(): number {
    return this.operations.length;
  }

  private scheduleProcessing(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(async () => {
      await this.flush();
    }, this.delay);
  }
}

/**
 * React hook for operation batching
 */
export function useOperationBatcher<T>(
  processor: (operations: T[]) => void | Promise<void>,
  delay: number = 100,
): OperationBatcher<T> {
  const batcherRef = useRef<OperationBatcher<T> | null>(null);

  if (!batcherRef.current) {
    batcherRef.current = new OperationBatcher(processor, delay);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batcherRef.current) {
        batcherRef.current.clear();
      }
    };
  }, []);

  return batcherRef.current;
}
