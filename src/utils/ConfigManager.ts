import * as vscode from 'vscode';
import { Logger } from './Logger';

export interface ExtensionConfig {
  defaultFormat: 'xml' | 'markdown' | 'json';
  defaultLLM: string;
  includePrompts: boolean;
  autoOpenOutput: boolean;
  maxFileSize: number;
  customIgnorePatterns: string[];
  enableCaching: boolean;
  cacheTimeout: number;
  showProgressNotifications: boolean;
  includeFileMetadata: boolean;
  sortByPriority: boolean;
  debugMode: boolean;
  includeTests: boolean;
  includePrisma: boolean;
  includeEnvFiles: boolean;
  detectProjectStructure: boolean;
}

export class ConfigManager {
  private static readonly CONFIG_SECTION = 'nextjsContextify';
  private config: vscode.WorkspaceConfiguration;

  constructor() {
    this.config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
    this.setupConfigChangeListener();
  }

  private setupConfigChangeListener(): void {
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration(ConfigManager.CONFIG_SECTION)) {
        this.config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_SECTION);
        Logger.debug('Configuration updated');
      }
    });
  }

  getConfig(): ExtensionConfig {
    return {
      defaultFormat: this.config.get('defaultFormat', 'xml'),
      defaultLLM: this.config.get('defaultLLM', 'claude'),
      includePrompts: this.config.get('includePrompts', true),
      autoOpenOutput: this.config.get('autoOpenOutput', true),
      maxFileSize: this.config.get('maxFileSize', 1048576),
      customIgnorePatterns: this.config.get('customIgnorePatterns', []),
      enableCaching: this.config.get('enableCaching', true),
      cacheTimeout: this.config.get('cacheTimeout', 300000),
      showProgressNotifications: this.config.get('showProgressNotifications', true),
      includeFileMetadata: this.config.get('includeFileMetadata', true),
      sortByPriority: this.config.get('sortByPriority', true),
      debugMode: this.config.get('debugMode', false),
      includeTests: this.config.get('includeTests', false),
      includePrisma: this.config.get('includePrisma', true),
      includeEnvFiles: this.config.get('includeEnvFiles', false),
      detectProjectStructure: this.config.get('detectProjectStructure', true),
    };
  }

  get<T>(key: keyof ExtensionConfig, defaultValue: T): T {
    return this.config.get(key, defaultValue);
  }

  async set<T>(key: keyof ExtensionConfig, value: T, target?: vscode.ConfigurationTarget): Promise<void> {
    try {
      await this.config.update(key, value, target);
      Logger.debug(`Configuration updated: ${key} = ${value}`);
    } catch (error) {
      Logger.error(`Failed to update configuration ${key}:`, error as Error);
    }
  }

  isDebugMode(): boolean {
    return this.get('debugMode', false);
  }

  shouldIncludeTests(): boolean {
    return this.get('includeTests', false);
  }

  shouldIncludePrisma(): boolean {
    return this.get('includePrisma', true);
  }

  shouldIncludeEnvFiles(): boolean {
    return this.get('includeEnvFiles', false);
  }

  getMaxFileSize(): number {
    return this.get('maxFileSize', 1048576);
  }

  getCacheTimeout(): number {
    return this.get('cacheTimeout', 300000);
  }

  getCustomIgnorePatterns(): string[] {
    return this.get('customIgnorePatterns', []);
  }

  // Validation methods
  validateConfig(): { isValid: boolean; errors: string[] } {
    const config = this.getConfig();
    const errors: string[] = [];

    if (config.maxFileSize < 1024 || config.maxFileSize > 10485760) {
      errors.push('maxFileSize must be between 1KB and 10MB');
    }

    if (config.cacheTimeout < 60000 || config.cacheTimeout > 3600000) {
      errors.push('cacheTimeout must be between 1 minute and 1 hour');
    }

    if (!['xml', 'markdown', 'json'].includes(config.defaultFormat)) {
      errors.push('defaultFormat must be xml, markdown, or json');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Reset to defaults
  async resetToDefaults(): Promise<void> {
    const defaultConfig: Partial<ExtensionConfig> = {
      defaultFormat: 'xml',
      defaultLLM: 'claude',
      includePrompts: true,
      autoOpenOutput: true,
      maxFileSize: 1048576,
      customIgnorePatterns: [],
      enableCaching: true,
      cacheTimeout: 300000,
      showProgressNotifications: true,
      includeFileMetadata: true,
      sortByPriority: true,
      debugMode: false,
      includeTests: false,
      includePrisma: true,
      includeEnvFiles: false,
      detectProjectStructure: true,
    };

    for (const [key, value] of Object.entries(defaultConfig)) {
      await this.set(key as keyof ExtensionConfig, value);
    }

    Logger.info('Configuration reset to defaults');
  }
} 