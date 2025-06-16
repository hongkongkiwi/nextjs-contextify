import { Logger } from './Logger';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  fileCount?: number;
  memory?: NodeJS.MemoryUsage;
  timestamp: Date;
}

export class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static readonly MAX_METRICS = 100;

  static startTimer(operation: string): () => PerformanceMetrics {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    return (fileCount?: number): PerformanceMetrics => {
      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;

      const metric: PerformanceMetrics = {
        operation,
        duration,
        fileCount,
        memory: {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        },
        timestamp: new Date(),
      };

      this.addMetric(metric);
      this.logPerformance(metric);
      return metric;
    };
  }

  private static addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  private static logPerformance(metric: PerformanceMetrics): void {
    const { operation, duration, fileCount, memory } = metric;
    const filesPerSec = fileCount ? (fileCount / (duration / 1000)).toFixed(0) : 'N/A';

    Logger.debug(
      `Performance: ${operation} took ${duration.toFixed(2)}ms` +
        (fileCount ? ` (${fileCount} files, ${filesPerSec} files/sec)` : '') +
        (memory ? ` Memory: +${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB` : '')
    );

    // Warn on slow operations
    if (duration > 5000) {
      Logger.warn(`Slow operation detected: ${operation} took ${(duration / 1000).toFixed(2)}s`);
    }
  }

  static getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  static getAveragePerformance(operation: string): {
    avgDuration: number;
    avgFilesPerSec: number;
    totalOperations: number;
  } {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);

    if (operationMetrics.length === 0) {
      return { avgDuration: 0, avgFilesPerSec: 0, totalOperations: 0 };
    }

    const avgDuration =
      operationMetrics.reduce((sum, m) => sum + m.duration, 0) / operationMetrics.length;
    const totalFiles = operationMetrics.reduce((sum, m) => sum + (m.fileCount || 0), 0);
    const totalTime = operationMetrics.reduce((sum, m) => sum + m.duration, 0) / 1000;
    const avgFilesPerSec = totalFiles / totalTime;

    return {
      avgDuration,
      avgFilesPerSec,
      totalOperations: operationMetrics.length,
    };
  }

  static clearMetrics(): void {
    this.metrics = [];
    Logger.debug('Performance metrics cleared');
  }
}
