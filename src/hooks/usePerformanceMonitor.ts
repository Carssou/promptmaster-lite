import { useEffect, useRef, useState, useCallback, createElement, Fragment, Profiler } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  keystrokeLatency: number;
  memoryUsage: number;
  componentReRenders: number;
}

interface PerformanceMonitorOptions {
  enabled: boolean;
  logToConsole: boolean;
  thresholds: {
    render: number; // ms
    keystroke: number; // ms
    memory: number; // MB
  };
}

const defaultOptions: PerformanceMonitorOptions = {
  enabled: process.env.NODE_ENV === 'development',
  logToConsole: true,
  thresholds: {
    render: 16, // 60fps = 16.67ms per frame
    keystroke: 50, // Noticeable delay threshold
    memory: 100 // MB
  }
};

/**
 * Hook for monitoring React component performance using accurate measurement techniques
 */
export function usePerformanceMonitor(
  componentName: string,
  options: Partial<PerformanceMonitorOptions> = {}
) {
  const config = { ...defaultOptions, ...options };
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    keystrokeLatency: 0,
    memoryUsage: 0,
    componentReRenders: 0
  });
  
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(0);

  // Initialize on mount
  useEffect(() => {
    if (!config.enabled) return;
    mountTimeRef.current = performance.now();
    console.log(`[Performance] Monitoring enabled for ${componentName}`);
  }, [config.enabled, componentName]);

  // Track component re-renders using a more accurate method
  useEffect(() => {
    if (!config.enabled) return;

    const renderStart = performance.now();
    renderCountRef.current++;
    
    // Use setTimeout to measure actual render time
    setTimeout(() => {
      const renderTime = performance.now() - renderStart;
      const timeSinceMount = performance.now() - mountTimeRef.current;
      
      if (config.logToConsole) {
        console.log(`[Performance] ${componentName} - Render #${renderCountRef.current}, took ${renderTime.toFixed(2)}ms (${timeSinceMount.toFixed(0)}ms since mount)`);
      }

      setMetrics(prev => ({
        ...prev,
        renderTime,
        componentReRenders: renderCountRef.current
      }));
    }, 0);
  }, [config.enabled, config.logToConsole, componentName]);

  // Track keystroke latency with more accurate measurement
  const trackKeystroke = useCallback((callback: () => void) => {
    if (!config.enabled) {
      callback();
      return;
    }

    const startTime = performance.now();
    
    // Execute the callback
    callback();
    
    // Measure after React has had a chance to update
    requestAnimationFrame(() => {
      const latency = performance.now() - startTime;
      
      setMetrics(prev => ({
        ...prev,
        keystrokeLatency: latency
      }));

      if (config.logToConsole) {
        if (latency > config.thresholds.keystroke) {
          console.warn(`[Performance] ${componentName} - Keystroke latency: ${latency.toFixed(2)}ms (>${config.thresholds.keystroke}ms threshold)`);
        } else {
          console.log(`[Performance] ${componentName} - Keystroke latency: ${latency.toFixed(2)}ms`);
        }
      }
    });
  }, [config, componentName]);

  // Track memory usage
  const trackMemoryUsage = useCallback(() => {
    if (!config.enabled || !('memory' in performance)) return;

    const memInfo = (performance as any).memory;
    const memoryUsage = memInfo.usedJSHeapSize / 1024 / 1024; // MB

    setMetrics(prev => ({
      ...prev,
      memoryUsage
    }));

    if (config.logToConsole && memoryUsage > config.thresholds.memory) {
      console.warn(`[Performance] ${componentName} - Memory usage: ${memoryUsage.toFixed(2)}MB (>${config.thresholds.memory}MB threshold)`);
    }

    return memoryUsage;
  }, [config, componentName]);

  // Periodic memory tracking
  useEffect(() => {
    if (!config.enabled) return;

    const interval = setInterval(() => {
      trackMemoryUsage();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [config.enabled, trackMemoryUsage]);

  // Measure actual render performance using React Profiler concept
  const measureRender = useCallback((phase: 'mount' | 'update', actualDuration: number) => {
    if (!config.enabled) return;

    setMetrics(prev => ({
      ...prev,
      renderTime: actualDuration
    }));

    if (config.logToConsole && actualDuration > config.thresholds.render) {
      console.warn(`[Performance] ${componentName} - ${phase} render: ${actualDuration.toFixed(2)}ms (>${config.thresholds.render}ms threshold)`);
    }
  }, [config, componentName]);

  return {
    metrics,
    trackKeystroke,
    trackMemoryUsage,
    measureRender
  };
}

/**
 * React Profiler wrapper component for accurate render time measurement
 */
export function PerformanceProfiler({ 
  id, 
  children, 
  onRender 
}: { 
  id: string; 
  children: React.ReactNode; 
  onRender?: (id: string, phase: 'mount' | 'update', actualDuration: number) => void;
}): JSX.Element {
  const handleRender = useCallback((
    id: string,
    phase: 'mount' | 'update' | 'nested-update',
    actualDuration: number,
    baseDuration: number,
    _startTime: number,
    _commitTime: number
  ) => {
    if (process.env.NODE_ENV === 'development' && actualDuration > 16) {
      console.warn(`[Performance] ${id} - ${phase} render: ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`);
    }
    
    onRender?.(id, phase === 'nested-update' ? 'update' : phase, actualDuration);
  }, [onRender]);

  // Only use Profiler in development
  if (process.env.NODE_ENV !== 'development') {
    return createElement(Fragment, null, children);
  }

  return createElement(Profiler, { id, onRender: handleRender }, children);
}

/**
 * Hook for monitoring overall app performance
 */
export function useAppPerformanceMonitor() {
  const [performanceData] = useState<{
    totalComponents: number;
    slowComponents: string[];
    avgKeystrokeLatency: number;
    memoryTrend: number[];
  }>({
    totalComponents: 0,
    slowComponents: [],
    avgKeystrokeLatency: 0,
    memoryTrend: []
  });

  // Global performance observer
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        if (entry.entryType === 'measure') {
          console.log(`[Performance] ${entry.name}: ${entry.duration.toFixed(2)}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, []);

  return performanceData;
}

/**
 * Utility function to measure operation performance
 */
export function measurePerformance<T>(
  name: string,
  operation: () => T
): T {
  const start = performance.now();
  const result = operation();
  const end = performance.now();
  
  // Create a performance mark
  performance.mark(`${name}-start`);
  performance.mark(`${name}-end`);
  performance.measure(name, `${name}-start`, `${name}-end`);
  
  console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  
  return result;
}