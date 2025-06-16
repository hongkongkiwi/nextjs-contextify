import * as vscode from 'vscode';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static outputChannel: vscode.OutputChannel;
  private static logLevel: LogLevel = LogLevel.INFO;

  static initialize(context: vscode.ExtensionContext): void {
    this.outputChannel = vscode.window.createOutputChannel('Next.js Contextify');
    context.subscriptions.push(this.outputChannel);

    // Set log level based on environment
    const isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  static debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  static info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  static warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  static error(message: string, error?: Error, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, error, ...args);

    // Show error notification for critical errors
    if (error) {
      vscode.window.showErrorMessage(`Next.js Contextify: ${message}`);
    }
  }

  private static log(level: LogLevel, message: string, ...args: any[]): void {
    if (level < this.logLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelStr = LogLevel[level].padEnd(5);
    const formattedMessage = `[${timestamp}] ${levelStr}: ${message}`;

    if (this.outputChannel) {
      this.outputChannel.appendLine(formattedMessage);

      if (args.length > 0) {
        args.forEach(arg => {
          if (typeof arg === 'object') {
            this.outputChannel.appendLine(JSON.stringify(arg, null, 2));
          } else {
            this.outputChannel.appendLine(String(arg));
          }
        });
      }
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formattedMessage, ...args);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage, ...args);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage, ...args);
          break;
        case LogLevel.ERROR:
          console.error(formattedMessage, ...args);
          break;
      }
    }
  }

  static show(): void {
    if (this.outputChannel) {
      this.outputChannel.show();
    }
  }

  static clear(): void {
    if (this.outputChannel) {
      this.outputChannel.clear();
    }
  }

  static dispose(): void {
    if (this.outputChannel) {
      this.outputChannel.dispose();
    }
  }
}

// Error handling utility
export class ErrorHandler {
  static async handleError(error: Error, context: string): Promise<void> {
    Logger.error(`Error in ${context}`, error);

    const choice = await vscode.window.showErrorMessage(
      `Next.js Contextify encountered an error: ${error.message}`,
      'Show Details',
      'Report Issue'
    );

    switch (choice) {
      case 'Show Details':
        Logger.show();
        break;
      case 'Report Issue': {
        const issueUrl = 'https://github.com/hongkongkiwi/nextjs-contextify/issues/new';
        vscode.env.openExternal(vscode.Uri.parse(issueUrl));
        break;
      }
    }
  }

  static async safeExecute<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      await this.handleError(error as Error, context);
      return fallback;
    }
  }
}
