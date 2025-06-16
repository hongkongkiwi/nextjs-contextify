import * as vscode from 'vscode';
import { Logger } from '../../utils/Logger';
import { SharedUtilities } from '../../utils/SharedUtilities';

export interface ErrorContext {
  operation: string;
  filePath?: string;
  userId?: string;
  timestamp: Date;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

export interface ErrorRecoveryStrategy {
  canRecover: (error: Error, context: ErrorContext) => boolean;
  recover: (error: Error, context: ErrorContext) => Promise<any>;
  fallback?: () => Promise<any>;
}

export interface ErrorHandlingOptions {
  showUserMessages?: boolean;
  logToFile?: boolean;
  reportToTelemetry?: boolean;
  enableRecovery?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorReport {
  error: Error;
  context: ErrorContext;
  severity: ErrorSeverity;
  isRecoverable: boolean;
  recoveryAttempted: boolean;
  recoverySuccessful?: boolean;
  userMessage?: string;
  technicalDetails: string;
}

export class EnhancedErrorHandler {
  private static recoveryStrategies: Map<string, ErrorRecoveryStrategy> = new Map();
  private static errorHistory: ErrorReport[] = [];
  private static readonly MAX_HISTORY = 100;

  // Initialize common recovery strategies
  static {
    this.registerRecoveryStrategy('FileNotFound', {
      canRecover: (error: Error) => error.message.includes('ENOENT') || error.message.includes('no such file'),
      recover: async (error: Error, context: ErrorContext) => {
        Logger.info(`Attempting to recover from file not found: ${context.filePath}`);
        // Try to find alternative files or create default content
        if (context.filePath) {
          return this.handleMissingFile(context.filePath);
        }
        throw error;
      },
      fallback: async () => {
        return { content: '// File not found - placeholder content', error: true };
      },
    });

    this.registerRecoveryStrategy('PermissionDenied', {
      canRecover: (error: Error) => error.message.includes('EACCES') || error.message.includes('permission denied'),
      recover: async (error: Error, context: ErrorContext) => {
        Logger.warn(`Permission denied for ${context.filePath}, trying alternative approach`);
        // Could try different access methods or suggest user actions
        return this.handlePermissionError(context.filePath);
      },
      fallback: async () => {
        vscode.window.showWarningMessage('Permission denied. Please check file permissions.');
        return null;
      },
    });

    this.registerRecoveryStrategy('OutOfMemory', {
      canRecover: (error: Error) => error.message.includes('out of memory') || error.message.includes('heap'),
      recover: async (error: Error, context: ErrorContext) => {
        Logger.warn('Out of memory detected, attempting memory cleanup');
        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
        // Reduce processing scope
        return this.handleMemoryError();
      },
      fallback: async () => {
        vscode.window.showErrorMessage('Operation failed due to memory constraints. Try processing fewer files.');
        return null;
      },
    });

    this.registerRecoveryStrategy('NetworkTimeout', {
      canRecover: (error: Error) => error.message.includes('timeout') || error.message.includes('ETIMEDOUT'),
      recover: async (error: Error, context: ErrorContext) => {
        Logger.info('Network timeout detected, retrying with exponential backoff');
        return this.retryWithBackoff(context);
      },
      fallback: async () => {
        vscode.window.showWarningMessage('Network operation timed out. Please check your connection.');
        return null;
      },
    });
  }

  static registerRecoveryStrategy(errorType: string, strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.set(errorType, strategy);
    Logger.info(`Registered recovery strategy for: ${errorType}`);
  }

  static async handleError(
    error: Error,
    context: {
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      operation: string;
      context?: any;
      recovery?: () => Promise<any>;
      showToUser?: boolean;
    }
  ): Promise<any> {
    try {
      // Log the error with context
      const errorMessage = `${context.operation} failed: ${error.message}`;
      
      switch (context.severity) {
        case 'LOW':
          Logger.info(errorMessage, error);
          break;
        case 'MEDIUM':
          Logger.warn(errorMessage, error);
          break;
        case 'HIGH':
        case 'CRITICAL':
          Logger.error(errorMessage, error);
          break;
      }

      // Show error to user if requested
      if (context.showToUser) {
        const userMessage = `${context.operation.replace(/-/g, ' ')} failed: ${error.message}`;
        
        switch (context.severity) {
          case 'LOW':
          case 'MEDIUM':
            vscode.window.showWarningMessage(userMessage);
            break;
          case 'HIGH':
          case 'CRITICAL':
            vscode.window.showErrorMessage(userMessage);
            break;
        }
      }

      // Attempt recovery if provided
      if (context.recovery) {
        try {
          Logger.info(`Attempting recovery for ${context.operation}`);
          return await context.recovery();
        } catch (recoveryError) {
          Logger.error(`Recovery failed for ${context.operation}:`, recoveryError as Error);
          return null;
        }
      }

      return null;
    } catch (handlingError) {
      Logger.error('Error in error handler:', handlingError as Error);
      return null;
    }
  }

  // Instance method for compatibility
  async handleError(
    error: Error | unknown,
    context: {
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      operation: string;
      context?: any;
      recovery?: () => Promise<any>;
    }
  ): Promise<any> {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    return EnhancedErrorHandler.handleError(errorObj, context);
  }

  private static async attemptRecovery(
    error: Error,
    context: ErrorContext,
    report: ErrorReport
  ): Promise<any> {
    // Try specific recovery strategies
    for (const [strategyName, strategy] of this.recoveryStrategies) {
      if (strategy.canRecover(error, context)) {
        Logger.info(`Attempting recovery with strategy: ${strategyName}`);
        report.isRecoverable = true;
        
        try {
          const result = await strategy.recover(error, context);
          return result;
        } catch (recoveryError) {
          Logger.warn(`Recovery strategy ${strategyName} failed:`, recoveryError);
          
          // Try fallback if available
          if (strategy.fallback) {
            try {
              const fallbackResult = await strategy.fallback();
              Logger.info(`Fallback strategy ${strategyName} succeeded`);
              return fallbackResult;
            } catch (fallbackError) {
              Logger.warn(`Fallback strategy ${strategyName} also failed:`, fallbackError);
            }
          }
        }
      }
    }

    return null;
  }

  private static determineSeverity(error: Error, context: ErrorContext): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    // Critical errors
    if (message.includes('out of memory') || 
        message.includes('segmentation fault') ||
        message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity
    if (message.includes('permission denied') ||
        message.includes('access denied') ||
        message.includes('invalid workspace')) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity
    if (message.includes('file not found') ||
        message.includes('timeout') ||
        message.includes('network')) {
      return ErrorSeverity.MEDIUM;
    }

    // Default to low
    return ErrorSeverity.LOW;
  }

  private static logError(report: ErrorReport, options: ErrorHandlingOptions): void {
    const logLevel = report.severity === ErrorSeverity.CRITICAL ? 'error' :
                    report.severity === ErrorSeverity.HIGH ? 'error' :
                    report.severity === ErrorSeverity.MEDIUM ? 'warn' : 'info';

    Logger[logLevel](`[${report.severity.toUpperCase()}] ${report.context.operation}:`, report.error);
    
    if (options.logToFile) {
      // Additional file logging could be implemented here
      Logger.info('Error logged to file', {
        operation: report.context.operation,
        severity: report.severity,
        timestamp: report.context.timestamp.toISOString(),
      });
    }
  }

  private static showUserMessage(report: ErrorReport): void {
    const userMessage = this.generateUserMessage(report);
    
    switch (report.severity) {
      case ErrorSeverity.CRITICAL:
        vscode.window.showErrorMessage(userMessage, 'View Details').then(selection => {
          if (selection === 'View Details') {
            this.showErrorDetails(report);
          }
        });
        break;
        
      case ErrorSeverity.HIGH:
        vscode.window.showErrorMessage(userMessage);
        break;
        
      case ErrorSeverity.MEDIUM:
        vscode.window.showWarningMessage(userMessage);
        break;
        
      case ErrorSeverity.LOW:
        // Only show in output channel for low severity
        Logger.info(userMessage);
        break;
    }
  }

  private static generateUserMessage(report: ErrorReport): string {
    const operation = report.context.operation.toLowerCase();
    
    switch (report.severity) {
      case ErrorSeverity.CRITICAL:
        return `Critical error during ${operation}. The extension may need to be restarted.`;
        
      case ErrorSeverity.HIGH:
        return `Unable to complete ${operation}. Please check the error details and try again.`;
        
      case ErrorSeverity.MEDIUM:
        if (report.recoveryAttempted && report.recoverySuccessful) {
          return `${operation} completed with warnings. Some issues were automatically resolved.`;
        }
        return `Warning during ${operation}. The operation was partially completed.`;
        
      case ErrorSeverity.LOW:
        return `Minor issue during ${operation}. Operation completed successfully.`;
        
      default:
        return `An issue occurred during ${operation}.`;
    }
  }

  private static formatTechnicalDetails(error: Error, context: ErrorContext): string {
    return `
Operation: ${context.operation}
File: ${context.filePath || 'N/A'}
Timestamp: ${context.timestamp.toISOString()}
Error: ${error.name}: ${error.message}
Stack: ${error.stack || 'No stack trace available'}
Metadata: ${context.metadata ? JSON.stringify(context.metadata, null, 2) : 'None'}
    `.trim();
  }

  private static showErrorDetails(report: ErrorReport): void {
    const panel = vscode.window.createWebviewPanel(
      'errorDetails',
      'Error Details',
      vscode.ViewColumn.One,
      {
        enableScripts: false,
        retainContextWhenHidden: true,
      }
    );

    panel.webview.html = this.generateErrorDetailsHTML(report);
  }

  private static generateErrorDetailsHTML(report: ErrorReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Error Details</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .error-header { color: #d73a49; font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .error-section { margin-bottom: 15px; }
        .error-label { font-weight: bold; color: #586069; }
        .error-content { background: #f6f8fa; padding: 10px; border-left: 3px solid #d1d5da; margin: 5px 0; }
        pre { background: #f6f8fa; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="error-header">Error Details</div>
    
    <div class="error-section">
        <div class="error-label">Operation:</div>
        <div class="error-content">${report.context.operation}</div>
    </div>
    
    <div class="error-section">
        <div class="error-label">Severity:</div>
        <div class="error-content">${report.severity.toUpperCase()}</div>
    </div>
    
    <div class="error-section">
        <div class="error-label">File:</div>
        <div class="error-content">${report.context.filePath || 'N/A'}</div>
    </div>
    
    <div class="error-section">
        <div class="error-label">Error Message:</div>
        <div class="error-content">${report.error.message}</div>
    </div>
    
    <div class="error-section">
        <div class="error-label">Stack Trace:</div>
        <pre>${report.error.stack || 'No stack trace available'}</pre>
    </div>
    
    <div class="error-section">
        <div class="error-label">Recovery Status:</div>
        <div class="error-content">
            Recoverable: ${report.isRecoverable ? 'Yes' : 'No'}<br>
            Recovery Attempted: ${report.recoveryAttempted ? 'Yes' : 'No'}<br>
            ${report.recoveryAttempted ? `Recovery Successful: ${report.recoverySuccessful ? 'Yes' : 'No'}` : ''}
        </div>
    </div>
</body>
</html>`;
  }

  private static addToHistory(report: ErrorReport): void {
    this.errorHistory.unshift(report);
    
    // Keep only recent errors
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, this.MAX_HISTORY);
    }
  }

  static getErrorHistory(): ErrorReport[] {
    return [...this.errorHistory];
  }

  static getErrorStatistics(): {
    totalErrors: number;
    errorsBySeverity: Record<ErrorSeverity, number>;
    recoveryRate: number;
    mostCommonErrors: Array<{ error: string; count: number }>;
  } {
    const errorsBySeverity = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    const errorCounts = new Map<string, number>();
    let recoveredCount = 0;

    for (const report of this.errorHistory) {
      errorsBySeverity[report.severity]++;
      
      if (report.recoverySuccessful) {
        recoveredCount++;
      }

      const errorKey = report.error.name + ': ' + report.error.message;
      errorCounts.set(errorKey, (errorCounts.get(errorKey) || 0) + 1);
    }

    const mostCommonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalErrors: this.errorHistory.length,
      errorsBySeverity,
      recoveryRate: this.errorHistory.length > 0 ? (recoveredCount / this.errorHistory.length) * 100 : 0,
      mostCommonErrors,
    };
  }

  // Helper methods for specific recovery scenarios
  private static async handleMissingFile(filePath?: string): Promise<any> {
    if (!filePath) return null;

    // Try to find similar files
    const directory = require('path').dirname(filePath);
    const filename = require('path').basename(filePath);
    
    try {
      const fs = require('fs');
      const files = await fs.promises.readdir(directory);
      const similarFile = files.find((f: string) => 
        f.toLowerCase().includes(filename.toLowerCase().split('.')[0])
      );

      if (similarFile) {
        Logger.info(`Found similar file: ${similarFile}`);
        const similarPath = require('path').join(directory, similarFile);
        return fs.promises.readFile(similarPath, 'utf8');
      }
    } catch (error) {
      Logger.warn('Could not find alternative file', error);
    }

    return null;
  }

  private static async handlePermissionError(filePath?: string): Promise<any> {
    // Log the permission issue for user awareness
    Logger.warn(`Permission denied for file: ${filePath}`);
    
    // Could implement user notification or alternative access methods
    return {
      content: `// Permission denied for file: ${filePath}`,
      error: true,
      permission_issue: true,
    };
  }

  private static async handleMemoryError(): Promise<any> {
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    // Return instructions for reduced scope processing
    return {
      recommendation: 'reduce_scope',
      message: 'Process fewer files or use optimization settings',
    };
  }

  private static async retryWithBackoff(context: ErrorContext): Promise<any> {
    // Simple retry logic with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await SharedUtilities.sleep(Math.pow(2, attempt) * 1000); // 2s, 4s, 8s
        Logger.info(`Retry attempt ${attempt} for ${context.operation}`);
        
        // The actual retry would need to be implemented by the calling code
        // This is just a placeholder
        return { retried: true, attempts: attempt };
      } catch (error) {
        if (attempt === 3) {
          throw error;
        }
      }
    }

    return null;
  }
} 