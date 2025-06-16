import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../../utils/Logger';
import { WorkspaceManager } from './WorkspaceManager';

export interface ConfigurationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    default: any;
    description: string;
    enum?: any[];
    minimum?: number;
    maximum?: number;
    required?: boolean;
    validator?: (value: any) => boolean;
  };
}

export interface ConfigurationMigration {
  fromVersion: string;
  toVersion: string;
  migrate: (config: any) => any;
}

export interface ConfigurationProfile {
  name: string;
  description: string;
  settings: Record<string, any>;
  targetLLM?: string;
  projectTypes?: string[];
}

export class EnhancedConfigManager {
  private static readonly CONFIG_VERSION = '2.0.0';
  private static readonly CONFIG_FILE_NAME = '.nextjs-llm-context.json';
  
  private static schema: ConfigurationSchema = {
    version: {
      type: 'string',
      default: EnhancedConfigManager.CONFIG_VERSION,
      description: 'Configuration version',
      required: true,
    },
    defaultFormat: {
      type: 'string',
      default: 'markdown',
      description: 'Default output format',
      enum: ['xml', 'markdown', 'json'],
    },
    defaultLLM: {
      type: 'string',
      default: 'claude',
      description: 'Default target LLM',
      enum: ['claude', 'gpt', 'gemini', 'deepseek', 'grok', 'custom'],
    },
    includePrompts: {
      type: 'boolean',
      default: true,
      description: 'Include expert prompt templates',
    },
    autoOpenOutput: {
      type: 'boolean',
      default: true,
      description: 'Automatically open generated output',
    },
    maxFileSize: {
      type: 'number',
      default: 1048576, // 1MB
      description: 'Maximum file size in bytes',
      minimum: 1024,
      maximum: 52428800, // 50MB
    },
    maxTokens: {
      type: 'number',
      default: 150000,
      description: 'Maximum total tokens',
      minimum: 1000,
      maximum: 500000,
    },
    customIgnorePatterns: {
      type: 'array',
      default: [],
      description: 'Custom patterns to ignore',
    },
    includeTests: {
      type: 'boolean',
      default: false,
      description: 'Include test files',
    },
    includePrisma: {
      type: 'boolean',
      default: true,
      description: 'Include Prisma schema files',
    },
    includeZenStack: {
      type: 'boolean',
      default: true,
      description: 'Include ZenStack schema files',
    },
    includeEnvFiles: {
      type: 'boolean',
      default: false,
      description: 'Include environment files',
    },
    includeUILibraries: {
      type: 'boolean',
      default: true,
      description: 'Include UI library components',
    },
    includeAuthConfig: {
      type: 'boolean',
      default: true,
      description: 'Include authentication configuration',
    },
    includeDataFetching: {
      type: 'boolean',
      default: true,
      description: 'Include data fetching patterns',
    },
    detectProjectStructure: {
      type: 'boolean',
      default: true,
      description: 'Automatically detect project structure',
    },
    autoDetectPackageManager: {
      type: 'boolean',
      default: true,
      description: 'Automatically detect package manager',
    },
    respectWorkspaceConfig: {
      type: 'boolean',
      default: true,
      description: 'Respect workspace-specific configuration',
    },
    enableTokenOptimization: {
      type: 'boolean',
      default: true,
      description: 'Enable token optimization features',
    },
    optimizationLevel: {
      type: 'string',
      default: 'balanced',
      description: 'Token optimization level',
      enum: ['light', 'balanced', 'maximum', 'custom'],
    },
    enableMemoryProtection: {
      type: 'boolean',
      default: true,
      description: 'Enable memory protection for large files',
    },
    enableSecurityValidation: {
      type: 'boolean',
      default: true,
      description: 'Enable security validation for files',
    },
    cacheEnabled: {
      type: 'boolean',
      default: true,
      description: 'Enable file content caching',
    },
    cacheTTL: {
      type: 'number',
      default: 3600000, // 1 hour
      description: 'Cache time-to-live in milliseconds',
      minimum: 60000, // 1 minute
      maximum: 86400000, // 24 hours
    },
    telemetryEnabled: {
      type: 'boolean',
      default: false,
      description: 'Enable anonymous telemetry',
    },
    debugMode: {
      type: 'boolean',
      default: false,
      description: 'Enable debug logging',
    },
  };

  private static migrations: ConfigurationMigration[] = [
    {
      fromVersion: '1.0.0',
      toVersion: '2.0.0',
      migrate: (config: any) => {
        // Migration logic from v1 to v2
        const migrated = { ...config };
        
        // Rename old properties
        if ('includeNodeModules' in migrated) {
          delete migrated.includeNodeModules;
        }
        
        // Add new default values
        migrated.enableTokenOptimization = true;
        migrated.optimizationLevel = 'balanced';
        migrated.enableMemoryProtection = true;
        migrated.enableSecurityValidation = true;
        
        migrated.version = '2.0.0';
        return migrated;
      },
    },
  ];

  private static builtinProfiles: ConfigurationProfile[] = [
    {
      name: 'claude-optimized',
      description: 'Optimized for Claude (Anthropic)',
      targetLLM: 'claude',
      settings: {
        defaultFormat: 'xml',
        maxTokens: 180000,
        includePrompts: true,
        optimizationLevel: 'balanced',
      },
    },
    {
      name: 'gpt-optimized',
      description: 'Optimized for GPT-4 (OpenAI)',
      targetLLM: 'gpt',
      settings: {
        defaultFormat: 'markdown',
        maxTokens: 120000,
        includePrompts: true,
        optimizationLevel: 'balanced',
      },
    },
    {
      name: 'gemini-optimized',
      description: 'Optimized for Gemini (Google)',
      targetLLM: 'gemini',
      settings: {
        defaultFormat: 'json',
        maxTokens: 30000,
        includePrompts: false,
        optimizationLevel: 'maximum',
      },
    },
    {
      name: 'minimal-context',
      description: 'Minimal context for quick analysis',
      settings: {
        maxTokens: 50000,
        includeTests: false,
        includePrisma: false,
        includeZenStack: false,
        includeEnvFiles: false,
        optimizationLevel: 'maximum',
      },
    },
    {
      name: 'comprehensive-analysis',
      description: 'Comprehensive context for detailed analysis',
      settings: {
        maxTokens: 300000,
        includeTests: true,
        includePrisma: true,
        includeZenStack: true,
        includeEnvFiles: true,
        includeUILibraries: true,
        includeAuthConfig: true,
        includeDataFetching: true,
        optimizationLevel: 'light',
      },
    },
  ];

  private static activeProfile: string | null = null;
  private static workspaceConfigs: Map<string, any> = new Map();

  static async initialize(): Promise<void> {
    Logger.info('Initializing EnhancedConfigManager');
    
    // Load workspace-specific configurations
    await this.loadWorkspaceConfigurations();
    
    // Set up configuration change listeners
    this.setupConfigurationListeners();
    
    Logger.info('EnhancedConfigManager initialized');
  }

  private static async loadWorkspaceConfigurations(): Promise<void> {
    const workspaces = WorkspaceManager.getWorkspaces();
    
    for (const workspace of workspaces) {
      try {
        const configPath = path.join(workspace.rootPath, this.CONFIG_FILE_NAME);
        let config: any = {};
        
        // Load local config file if it exists
        if (fs.existsSync(configPath)) {
          const configContent = await fs.promises.readFile(configPath, 'utf8');
          config = JSON.parse(configContent);
          
          // Migrate if necessary
          config = await this.migrateConfiguration(config);
        } else {
          // Create default configuration
          config = this.getDefaultConfiguration();
        }
        
        // Validate configuration
        const validation = this.validateConfiguration(config);
        if (!validation.isValid) {
          Logger.warn(`Invalid configuration for workspace ${workspace.name}:`, validation.errors);
          config = this.getDefaultConfiguration();
        }
        
        this.workspaceConfigs.set(workspace.rootPath, config);
        
        // Save back to file if it was migrated or created
        await this.saveWorkspaceConfiguration(workspace.rootPath, config);
        
      } catch (error) {
        Logger.error(`Failed to load configuration for workspace ${workspace.name}:`, error as Error);
        // Use default configuration as fallback
        this.workspaceConfigs.set(workspace.rootPath, this.getDefaultConfiguration());
      }
    }
  }

  private static setupConfigurationListeners(): void {
    // Listen for VS Code configuration changes
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('nextjs-llm-context')) {
        Logger.info('VS Code configuration changed');
        this.handleConfigurationChange();
      }
    });
  }

  private static async handleConfigurationChange(): Promise<void> {
    // Reload configurations when VS Code settings change
    await this.loadWorkspaceConfigurations();
  }

  static getConfiguration(workspaceId?: string): any {
    const activeWorkspace = WorkspaceManager.getActiveWorkspace();
    const targetWorkspace = workspaceId || activeWorkspace?.rootPath;
    
    if (targetWorkspace && this.workspaceConfigs.has(targetWorkspace)) {
      return this.workspaceConfigs.get(targetWorkspace);
    }
    
    // Fallback to default configuration
    return this.getDefaultConfiguration();
  }

  static async updateConfiguration(
    updates: Record<string, any>,
    workspaceId?: string
  ): Promise<void> {
    const activeWorkspace = WorkspaceManager.getActiveWorkspace();
    const targetWorkspace = workspaceId || activeWorkspace?.rootPath;
    
    if (!targetWorkspace) {
      throw new Error('No workspace available for configuration update');
    }
    
    const currentConfig = this.getConfiguration(targetWorkspace);
    const newConfig = { ...currentConfig, ...updates };
    
    // Validate the new configuration
    const validation = this.validateConfiguration(newConfig);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    // Update in memory
    this.workspaceConfigs.set(targetWorkspace, newConfig);
    
    // Save to file
    await this.saveWorkspaceConfiguration(targetWorkspace, newConfig);
    
    // Update VS Code settings for UI reflection
    await this.syncToVSCodeSettings(targetWorkspace, updates);
    
    Logger.info(`Configuration updated for workspace: ${targetWorkspace}`);
  }

  private static async saveWorkspaceConfiguration(
    workspaceId: string,
    config: any
  ): Promise<void> {
    try {
      const configPath = path.join(workspaceId, this.CONFIG_FILE_NAME);
      await fs.promises.writeFile(
        configPath,
        JSON.stringify(config, null, 2),
        'utf8'
      );
    } catch (error) {
      Logger.error(`Failed to save configuration for workspace ${workspaceId}:`, error as Error);
    }
  }

  private static async syncToVSCodeSettings(
    workspaceId: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      const workspace = WorkspaceManager.getWorkspaces().find(w => w.rootPath === workspaceId);
      if (!workspace) return;
      
      const config = vscode.workspace.getConfiguration('nextjs-llm-context', workspace.uri);
      
      for (const [key, value] of Object.entries(updates)) {
        if (key in this.schema) {
          await config.update(key, value, vscode.ConfigurationTarget.Workspace);
        }
      }
    } catch (error) {
      Logger.warn(`Failed to sync to VS Code settings:`, error);
    }
  }

  static validateConfiguration(config: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    for (const [key, schema] of Object.entries(this.schema)) {
      if (schema.required && !(key in config)) {
        errors.push(`Missing required field: ${key}`);
        continue;
      }
      
      if (key in config) {
        const value = config[key];
        
        // Type validation
        if (!this.validateType(value, schema.type)) {
          errors.push(`Invalid type for ${key}: expected ${schema.type}, got ${typeof value}`);
          continue;
        }
        
        // Enum validation
        if (schema.enum && !schema.enum.includes(value)) {
          errors.push(`Invalid value for ${key}: must be one of ${schema.enum.join(', ')}`);
          continue;
        }
        
        // Range validation
        if (schema.type === 'number') {
          if (schema.minimum !== undefined && value < schema.minimum) {
            errors.push(`Value for ${key} is below minimum: ${schema.minimum}`);
            continue;
          }
          if (schema.maximum !== undefined && value > schema.maximum) {
            errors.push(`Value for ${key} is above maximum: ${schema.maximum}`);
            continue;
          }
        }
        
        // Custom validation
        if (schema.validator && !schema.validator(value)) {
          errors.push(`Custom validation failed for ${key}`);
          continue;
        }
      }
    }
    
    // Check for unknown fields
    for (const key of Object.keys(config)) {
      if (!(key in this.schema)) {
        warnings.push(`Unknown configuration field: ${key}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }

  private static async migrateConfiguration(config: any): Promise<any> {
    let currentConfig = { ...config };
    const currentVersion = currentConfig.version || '1.0.0';
    
    for (const migration of this.migrations) {
      if (currentVersion === migration.fromVersion) {
        Logger.info(`Migrating configuration from ${migration.fromVersion} to ${migration.toVersion}`);
        currentConfig = migration.migrate(currentConfig);
      }
    }
    
    return currentConfig;
  }

  static getDefaultConfiguration(): any {
    const config: any = {};
    
    for (const [key, schema] of Object.entries(this.schema)) {
      config[key] = schema.default;
    }
    
    return config;
  }

  static getConfigurationSchema(): ConfigurationSchema {
    return { ...this.schema };
  }

  static getAvailableProfiles(): ConfigurationProfile[] {
    return [...this.builtinProfiles];
  }

  static async applyProfile(profileName: string, workspaceId?: string): Promise<void> {
    const profile = this.builtinProfiles.find(p => p.name === profileName);
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }
    
    Logger.info(`Applying configuration profile: ${profileName}`);
    
    await this.updateConfiguration(profile.settings, workspaceId);
    this.activeProfile = profileName;
    
    Logger.info(`Applied profile: ${profileName}`);
  }

  static getActiveProfile(): string | null {
    return this.activeProfile;
  }

  static async createCustomProfile(
    name: string,
    description: string,
    settings: Record<string, any>
  ): Promise<void> {
    // Validate settings
    const validation = this.validateConfiguration({ ...this.getDefaultConfiguration(), ...settings });
    if (!validation.isValid) {
      throw new Error(`Invalid profile settings: ${validation.errors.join(', ')}`);
    }
    
    const profile: ConfigurationProfile = {
      name,
      description,
      settings,
    };
    
    // Save custom profile (could be stored in workspace or globally)
    // For now, just add to memory
    this.builtinProfiles.push(profile);
    
    Logger.info(`Created custom profile: ${name}`);
  }

  static exportConfiguration(workspaceId?: string): any {
    const config = this.getConfiguration(workspaceId);
    return {
      version: this.CONFIG_VERSION,
      exportedAt: new Date().toISOString(),
      config,
    };
  }

  static async importConfiguration(
    importedConfig: any,
    workspaceId?: string
  ): Promise<void> {
    if (!importedConfig.config) {
      throw new Error('Invalid import format: missing config object');
    }
    
    let config = importedConfig.config;
    
    // Migrate if necessary
    if (importedConfig.version !== this.CONFIG_VERSION) {
      config = await this.migrateConfiguration(config);
    }
    
    // Validate
    const validation = this.validateConfiguration(config);
    if (!validation.isValid) {
      throw new Error(`Invalid imported configuration: ${validation.errors.join(', ')}`);
    }
    
    // Apply
    await this.updateConfiguration(config, workspaceId);
    
    Logger.info('Configuration imported successfully');
  }

  static resetToDefaults(workspaceId?: string): Promise<void> {
    const defaultConfig = this.getDefaultConfiguration();
    return this.updateConfiguration(defaultConfig, workspaceId);
  }

  static getConfigurationSummary(): {
    version: string;
    activeProfile: string | null;
    workspaceCount: number;
    commonSettings: Record<string, any>;
    variations: Record<string, string[]>;
  } {
    const workspaces = Array.from(this.workspaceConfigs.entries());
    const commonSettings: Record<string, any> = {};
    const variations: Record<string, string[]> = {};
    
    // Find common settings across all workspaces
    for (const [key] of Object.entries(this.schema)) {
      const values = workspaces.map(([, config]) => config[key]);
      const uniqueValues = [...new Set(values.map(v => JSON.stringify(v)))];
      
      if (uniqueValues.length === 1) {
        commonSettings[key] = JSON.parse(uniqueValues[0]);
      } else {
        variations[key] = uniqueValues.map(v => JSON.parse(v));
      }
    }
    
    return {
      version: this.CONFIG_VERSION,
      activeProfile: this.activeProfile,
      workspaceCount: workspaces.length,
      commonSettings,
      variations,
    };
  }

  static cleanup(): void {
    this.workspaceConfigs.clear();
    this.activeProfile = null;
    Logger.info('EnhancedConfigManager cleaned up');
  }
} 