import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../../utils/Logger';

export interface TestCase {
  name: string;
  description: string;
  category: TestCategory;
  setup?: () => Promise<void>;
  test: () => Promise<void>;
  teardown?: () => Promise<void>;
  timeout?: number;
  skip?: boolean;
  tags?: string[];
}

export enum TestCategory {
  UNIT = 'unit',
  INTEGRATION = 'integration',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  UI = 'ui',
  END_TO_END = 'e2e',
}

export interface TestResult {
  name: string;
  category: TestCategory;
  passed: boolean;
  duration: number;
  error?: Error;
  memory?: {
    before: number;
    after: number;
    peak: number;
  };
  performance?: {
    operations: number;
    opsPerSecond: number;
  };
}

export interface TestSuite {
  name: string;
  description: string;
  tests: TestCase[];
  beforeAll?: () => Promise<void>;
  afterAll?: () => Promise<void>;
  beforeEach?: () => Promise<void>;
  afterEach?: () => Promise<void>;
}

export interface TestRunOptions {
  categories?: TestCategory[];
  tags?: string[];
  pattern?: string;
  timeout?: number;
  parallel?: boolean;
  maxParallel?: number;
  failFast?: boolean;
  verbose?: boolean;
  generateReport?: boolean;
}

export class TestRunner {
  private static suites: Map<string, TestSuite> = new Map();
  private static results: TestResult[] = [];
  private static currentSuite: string | null = null;

  static registerSuite(name: string, suite: TestSuite): void {
    this.suites.set(name, suite);
    Logger.info(`Registered test suite: ${name} (${suite.tests.length} tests)`);
  }

  static async runAll(options: TestRunOptions = {}): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    results: TestResult[];
  }> {
    const startTime = Date.now();
    this.results = [];

    Logger.info('Starting test run');

    const suitesToRun = this.filterSuites(options);
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const [suiteName, suite] of suitesToRun) {
      this.currentSuite = suiteName;
      
             if (options.verbose === true) {
         Logger.info(`Running suite: ${suiteName}`);
       }

      try {
        // Run suite setup
        if (suite.beforeAll) {
          await suite.beforeAll();
        }

        const testsToRun = this.filterTests(suite.tests, options);

        if (options.parallel) {
          await this.runTestsParallel(testsToRun, suite, options);
        } else {
          await this.runTestsSequential(testsToRun, suite, options);
        }

        // Run suite teardown
        if (suite.afterAll) {
          await suite.afterAll();
        }

      } catch (error) {
        Logger.error(`Suite ${suiteName} setup/teardown failed:`, error as Error);
        failed++;
      }
    }

    // Count results
    for (const result of this.results) {
      if (result.passed) {
        passed++;
      } else {
        failed++;
      }
    }

    const duration = Date.now() - startTime;

    const summary = {
      passed,
      failed,
      skipped,
      duration,
      results: this.results,
    };

    if (options.generateReport) {
      await this.generateReport(summary);
    }

    this.logSummary(summary, options.verbose || false);

    return summary;
  }

  private static filterSuites(options: TestRunOptions): Map<string, TestSuite> {
    const filtered = new Map<string, TestSuite>();

    for (const [name, suite] of this.suites) {
      if (options.pattern && !name.includes(options.pattern)) {
        continue;
      }

      // Check if suite has any tests that match criteria
      const matchingTests = this.filterTests(suite.tests, options);
      if (matchingTests.length > 0) {
        filtered.set(name, { ...suite, tests: matchingTests });
      }
    }

    return filtered;
  }

  private static filterTests(tests: TestCase[], options: TestRunOptions): TestCase[] {
    return tests.filter(test => {
      if (test.skip) return false;

      if (options.categories && !options.categories.includes(test.category)) {
        return false;
      }

      if (options.tags && test.tags) {
        const hasMatchingTag = options.tags.some(tag => test.tags!.includes(tag));
        if (!hasMatchingTag) return false;
      }

      if (options.pattern && !test.name.includes(options.pattern)) {
        return false;
      }

      return true;
    });
  }

  private static async runTestsSequential(
    tests: TestCase[],
    suite: TestSuite,
    options: TestRunOptions
  ): Promise<void> {
    for (const test of tests) {
      if (options.failFast && this.hasFailures()) {
        break;
      }

      await this.runSingleTest(test, suite, options);
    }
  }

  private static async runTestsParallel(
    tests: TestCase[],
    suite: TestSuite,
    options: TestRunOptions
  ): Promise<void> {
    const maxParallel = options.maxParallel || 4;
    const chunks = this.chunkArray(tests, maxParallel);

    for (const chunk of chunks) {
      if (options.failFast && this.hasFailures()) {
        break;
      }

      const promises = chunk.map(test => this.runSingleTest(test, suite, options));
      await Promise.all(promises);
    }
  }

  private static async runSingleTest(
    test: TestCase,
    suite: TestSuite,
    options: TestRunOptions
  ): Promise<void> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    let peakMemory = startMemory;

    const result: TestResult = {
      name: test.name,
      category: test.category,
      passed: false,
      duration: 0,
    };

    try {
      if (options.verbose) {
        Logger.info(`  Running: ${test.name}`);
      }

      // Memory monitoring for performance tests
      let memoryInterval: NodeJS.Timeout | undefined;
      if (test.category === TestCategory.PERFORMANCE) {
        memoryInterval = setInterval(() => {
          const current = process.memoryUsage().heapUsed;
          if (current > peakMemory) {
            peakMemory = current;
          }
        }, 10);
      }

      // Setup
      if (suite.beforeEach) {
        await suite.beforeEach();
      }
      if (test.setup) {
        await test.setup();
      }

      // Run test with timeout
      const timeout = test.timeout || options.timeout || 30000;
      await this.runWithTimeout(test.test, timeout);

      // Teardown
      if (test.teardown) {
        await test.teardown();
      }
      if (suite.afterEach) {
        await suite.afterEach();
      }

      if (memoryInterval) {
        clearInterval(memoryInterval);
      }

      result.passed = true;

      if (options.verbose) {
        Logger.info(`  ✓ ${test.name}`);
      }

    } catch (error) {
      result.error = error as Error;
      result.passed = false;

      if (options.verbose) {
        Logger.error(`  ✗ ${test.name}: ${result.error.message}`);
      }
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    result.duration = endTime - startTime;

    if (test.category === TestCategory.PERFORMANCE) {
      result.memory = {
        before: startMemory,
        after: endMemory,
        peak: peakMemory,
      };
    }

    this.results.push(result);
  }

  private static async runWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private static hasFailures(): boolean {
    return this.results.some(result => !result.passed);
  }

  private static logSummary(summary: any, verbose: boolean): void {
    Logger.info(`Test run completed in ${summary.duration}ms`);
    Logger.info(`Results: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped`);

    if (summary.failed > 0) {
      Logger.error('Failed tests:');
      for (const result of summary.results) {
        if (!result.passed) {
          Logger.error(`  - ${result.name}: ${result.error?.message}`);
        }
      }
    }

    if (verbose) {
      this.logPerformanceStats(summary.results);
    }
  }

  private static logPerformanceStats(results: TestResult[]): void {
    const perfTests = results.filter(r => r.category === TestCategory.PERFORMANCE);
    
    if (perfTests.length > 0) {
      Logger.info('Performance test results:');
      for (const test of perfTests) {
        if (test.memory) {
          const memoryUsed = test.memory.after - test.memory.before;
          const peakIncrease = test.memory.peak - test.memory.before;
          Logger.info(`  ${test.name}: ${test.duration}ms, Memory: +${this.formatBytes(memoryUsed)} (peak: +${this.formatBytes(peakIncrease)})`);
        } else {
          Logger.info(`  ${test.name}: ${test.duration}ms`);
        }
      }
    }
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  private static async generateReport(summary: any): Promise<void> {
    try {
      const reportDir = path.join(process.cwd(), 'test-reports');
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(reportDir, `test-report-${timestamp}.json`);

      const report = {
        timestamp: new Date().toISOString(),
        summary,
        environment: {
          node: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: process.memoryUsage(),
        },
        suites: Array.from(this.suites.keys()),
      };

      await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
      Logger.info(`Test report generated: ${reportPath}`);

      // Also generate HTML report
      await this.generateHTMLReport(report, reportDir, timestamp);

    } catch (error) {
      Logger.error('Failed to generate test report:', error as Error);
    }
  }

  private static async generateHTMLReport(
    report: any,
    reportDir: string,
    timestamp: string
  ): Promise<void> {
    const htmlContent = this.generateHTMLContent(report);
    const htmlPath = path.join(reportDir, `test-report-${timestamp}.html`);
    
    await fs.promises.writeFile(htmlPath, htmlContent);
    Logger.info(`HTML test report generated: ${htmlPath}`);
  }

  private static generateHTMLContent(report: any): string {
    const { summary, environment } = report;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Next.js LLM Context - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .metric { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
        .metric.passed { border-color: #4caf50; }
        .metric.failed { border-color: #f44336; }
        .metric.skipped { border-color: #ff9800; }
        .test-list { margin-top: 20px; }
        .test-item { padding: 10px; border-bottom: 1px solid #eee; }
        .test-item.passed { background: #f1f8e9; }
        .test-item.failed { background: #ffebee; }
        .error { color: #d32f2f; font-size: 0.9em; margin-top: 5px; }
        .performance { color: #1976d2; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Next.js LLM Context - Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Duration: ${summary.duration}ms</p>
        <p>Environment: Node ${environment.node} on ${environment.platform}</p>
    </div>

    <div class="summary">
        <div class="metric passed">
            <h3>${summary.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="metric failed">
            <h3>${summary.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric skipped">
            <h3>${summary.skipped}</h3>
            <p>Skipped</p>
        </div>
    </div>

    <div class="test-list">
        <h2>Test Results</h2>
        ${summary.results.map((result: TestResult) => `
            <div class="test-item ${result.passed ? 'passed' : 'failed'}">
                <strong>${result.name}</strong> 
                <span class="performance">(${result.duration}ms, ${result.category})</span>
                ${result.error ? `<div class="error">Error: ${result.error.message}</div>` : ''}
                ${result.memory ? `
                    <div class="performance">
                        Memory: ${this.formatBytes(result.memory.after - result.memory.before)} used, 
                        peak: ${this.formatBytes(result.memory.peak - result.memory.before)}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  // Utility methods for creating tests
  static createUnitTest(name: string, testFn: () => Promise<void>): TestCase {
    return {
      name,
      description: `Unit test: ${name}`,
      category: TestCategory.UNIT,
      test: testFn,
    };
  }

  static createIntegrationTest(name: string, testFn: () => Promise<void>): TestCase {
    return {
      name,
      description: `Integration test: ${name}`,
      category: TestCategory.INTEGRATION,
      test: testFn,
    };
  }

  static createPerformanceTest(
    name: string,
    testFn: () => Promise<void>,
    timeout: number = 60000
  ): TestCase {
    return {
      name,
      description: `Performance test: ${name}`,
      category: TestCategory.PERFORMANCE,
      test: testFn,
      timeout,
    };
  }

  static createSecurityTest(name: string, testFn: () => Promise<void>): TestCase {
    return {
      name,
      description: `Security test: ${name}`,
      category: TestCategory.SECURITY,
      test: testFn,
    };
  }

  // Assertion helpers
  static assertEqual<T>(actual: T, expected: T, message?: string): void {
    assert.strictEqual(actual, expected, message);
  }

  static assertTrue(condition: boolean, message?: string): void {
    assert.ok(condition, message);
  }

  static assertFalse(condition: boolean, message?: string): void {
    assert.ok(!condition, message);
  }

  static assertThrows(fn: () => void, message?: string): void {
    assert.throws(fn, message);
  }

  static async assertThrowsAsync(fn: () => Promise<void>, message?: string): Promise<void> {
    let thrown = false;
    try {
      await fn();
    } catch {
      thrown = true;
    }
    assert.ok(thrown, message);
  }

  static assertArrayEqual<T>(actual: T[], expected: T[], message?: string): void {
    assert.deepStrictEqual(actual, expected, message);
  }

  static assertContains<T>(array: T[], item: T, message?: string): void {
    assert.ok(array.includes(item), message);
  }

  static assertObjectEqual(actual: any, expected: any, message?: string): void {
    assert.deepStrictEqual(actual, expected, message);
  }

  static async measurePerformance<T>(
    name: string,
    operation: () => Promise<T>,
    iterations: number = 1
  ): Promise<{ result: T; avgTime: number; totalTime: number; opsPerSecond: number }> {
    const startTime = Date.now();
    let result: T;

    for (let i = 0; i < iterations; i++) {
      result = await operation();
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    const opsPerSecond = Math.round((iterations / totalTime) * 1000);

    Logger.info(`Performance [${name}]: ${avgTime.toFixed(2)}ms avg, ${opsPerSecond} ops/sec`);

    return {
      result: result!,
      avgTime,
      totalTime,
      opsPerSecond,
    };
  }

  static cleanup(): void {
    this.suites.clear();
    this.results = [];
    this.currentSuite = null;
    Logger.info('TestRunner cleaned up');
  }
} 