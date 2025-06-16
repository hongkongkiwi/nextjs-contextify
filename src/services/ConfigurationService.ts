import * as vscode from 'vscode';
import {
  ExtensionConfig,
  OutputFormat,
  TargetLLM,
  DEFAULT_CONFIG,
  PackageManager,
  ProjectStructureType,
  isValidOutputFormat,
  isValidTargetLLM,
  isValidPackageManager,
} from '../core/types';

export class ConfigurationService {
  private static instance: ConfigurationService;
  private config: vscode.WorkspaceConfiguration;

  private constructor() {
    this.config = vscode.workspace.getConfiguration('nextjsContextify');
  }

  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  public refresh(): void {
    this.config = vscode.workspace.getConfiguration('nextjsContextify');
  }

  public getConfig(): ExtensionConfig {
    return {
      defaultFormat: this.getOutputFormat(),
      defaultLLM: this.getTargetLLM(),
      includePrompts: this.getIncludePrompts(),
      autoOpenOutput: this.getAutoOpenOutput(),
      maxFileSize: this.getMaxFileSize(),
      customIgnorePatterns: this.getCustomIgnorePatterns(),
      includeTests: this.getIncludeTests(),
      includePrisma: this.getIncludePrisma(),
      includeZenStack: this.getIncludeZenStack(),
      includeEnvFiles: this.getIncludeEnvFiles(),
      includeUILibraries: this.getIncludeUILibraries(),
      includeAuthConfig: this.getIncludeAuthConfig(),
      includeDataFetching: this.getIncludeDataFetching(),
      detectProjectStructure: this.getDetectProjectStructure(),
      autoDetectPackageManager: this.getAutoDetectPackageManager(),
      respectWorkspaceConfig: this.getRespectWorkspaceConfig(),
    };
  }

  private getOutputFormat(): OutputFormat {
    const format = this.config.get<string>('defaultFormat');
    return format && isValidOutputFormat(format) ? format : DEFAULT_CONFIG.defaultFormat;
  }

  private getTargetLLM(): TargetLLM {
    const llm = this.config.get<string>('defaultLLM');
    return llm && isValidTargetLLM(llm) ? llm : DEFAULT_CONFIG.defaultLLM;
  }

  private getIncludePrompts(): boolean {
    const value = this.config.get<boolean>('includePrompts');
    return value !== undefined ? value : DEFAULT_CONFIG.includePrompts;
  }

  private getAutoOpenOutput(): boolean {
    const value = this.config.get<boolean>('autoOpenOutput');
    return value !== undefined ? value : DEFAULT_CONFIG.autoOpenOutput;
  }

  private getMaxFileSize(): number | undefined {
    return this.config.get<number>('maxFileSize') ?? DEFAULT_CONFIG.maxFileSize;
  }

  private getCustomIgnorePatterns(): string[] {
    const patterns =
      this.config.get<string[]>('customIgnorePatterns') ?? DEFAULT_CONFIG.customIgnorePatterns;
    return patterns ? [...patterns] : [];
  }

  private getIncludeTests(): boolean {
    return this.config.get<boolean>('includeTests') ?? false;
  }

  private getIncludePrisma(): boolean {
    return this.config.get<boolean>('includePrisma') ?? true;
  }

  private getIncludeZenStack(): boolean {
    return this.config.get<boolean>('includeZenStack') ?? true;
  }

  private getIncludeEnvFiles(): boolean {
    return this.config.get<boolean>('includeEnvFiles') ?? false;
  }

  private getIncludeUILibraries(): boolean {
    return this.config.get<boolean>('includeUILibraries') ?? true;
  }

  private getIncludeAuthConfig(): boolean {
    return this.config.get<boolean>('includeAuthConfig') ?? true;
  }

  private getIncludeDataFetching(): boolean {
    return this.config.get<boolean>('includeDataFetching') ?? true;
  }

  private getDetectProjectStructure(): boolean {
    return this.config.get<boolean>('detectProjectStructure') ?? true;
  }

  private getAutoDetectPackageManager(): boolean {
    return this.config.get<boolean>('autoDetectPackageManager') ?? true;
  }

  private getRespectWorkspaceConfig(): boolean {
    return this.config.get<boolean>('respectWorkspaceConfig') ?? true;
  }

  // Setters for configuration updates
  public async setOutputFormat(format: OutputFormat): Promise<void> {
    await this.config.update('defaultFormat', format, vscode.ConfigurationTarget.Global);
  }

  public async setTargetLLM(llm: TargetLLM): Promise<void> {
    await this.config.update('defaultLLM', llm, vscode.ConfigurationTarget.Global);
  }

  public async setIncludePrompts(include: boolean): Promise<void> {
    await this.config.update('includePrompts', include, vscode.ConfigurationTarget.Global);
  }

  public async setAutoOpenOutput(auto: boolean): Promise<void> {
    await this.config.update('autoOpenOutput', auto, vscode.ConfigurationTarget.Global);
  }

  public async setMaxFileSize(size: number): Promise<void> {
    await this.config.update('maxFileSize', size, vscode.ConfigurationTarget.Global);
  }

  public async setCustomIgnorePatterns(patterns: string[]): Promise<void> {
    await this.config.update('customIgnorePatterns', patterns, vscode.ConfigurationTarget.Global);
  }

  public async setIncludeTests(include: boolean): Promise<void> {
    await this.config.update('includeTests', include, vscode.ConfigurationTarget.Global);
  }

  public async setIncludePrisma(include: boolean): Promise<void> {
    await this.config.update('includePrisma', include, vscode.ConfigurationTarget.Global);
  }

  public async setIncludeZenStack(include: boolean): Promise<void> {
    await this.config.update('includeZenStack', include, vscode.ConfigurationTarget.Global);
  }

  public async setIncludeEnvFiles(include: boolean): Promise<void> {
    await this.config.update('includeEnvFiles', include, vscode.ConfigurationTarget.Global);
  }

  public async setIncludeUILibraries(include: boolean): Promise<void> {
    await this.config.update('includeUILibraries', include, vscode.ConfigurationTarget.Global);
  }

  public async setIncludeAuthConfig(include: boolean): Promise<void> {
    await this.config.update('includeAuthConfig', include, vscode.ConfigurationTarget.Global);
  }

  public async setIncludeDataFetching(include: boolean): Promise<void> {
    await this.config.update('includeDataFetching', include, vscode.ConfigurationTarget.Global);
  }

  public async setDetectProjectStructure(detect: boolean): Promise<void> {
    await this.config.update('detectProjectStructure', detect, vscode.ConfigurationTarget.Global);
  }

  public async setAutoDetectPackageManager(detect: boolean): Promise<void> {
    await this.config.update('autoDetectPackageManager', detect, vscode.ConfigurationTarget.Global);
  }

  public async setRespectWorkspaceConfig(respect: boolean): Promise<void> {
    await this.config.update('respectWorkspaceConfig', respect, vscode.ConfigurationTarget.Global);
  }

  // Validation methods
  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate format
    const format = this.config.get<string>('defaultFormat');
    if (format && !isValidOutputFormat(format)) {
      errors.push('Invalid output format specified');
    }

    // Validate LLM
    const llm = this.config.get<string>('defaultLLM');
    if (llm && !isValidTargetLLM(llm)) {
      errors.push('Invalid target LLM specified');
    }

    // Validate max file size
    const maxFileSize = this.config.get<number>('maxFileSize');
    if (maxFileSize !== undefined && maxFileSize <= 0) {
      errors.push('Max file size must be a positive number');
    }

    // Validate custom ignore patterns
    const customIgnorePatterns = this.config.get<string[]>('customIgnorePatterns');
    if (customIgnorePatterns && !Array.isArray(customIgnorePatterns)) {
      errors.push('Custom ignore patterns must be an array of strings');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Helper methods for specific configurations
  public getPackageManagerOverride(): PackageManager | undefined {
    const pm = this.config.get<string>('packageManagerOverride');
    return pm && isValidPackageManager(pm) ? pm : undefined;
  }

  public getProjectStructureOverride(): ProjectStructureType | undefined {
    const structure = this.config.get<string>('projectStructureOverride');
    return Object.values(ProjectStructureType).includes(structure as ProjectStructureType)
      ? (structure as ProjectStructureType)
      : undefined;
  }

  public getCustomDatabaseSchemaPaths(): string[] {
    return this.config.get<string[]>('customDatabaseSchemaPaths') ?? [];
  }

  public getCustomConfigPaths(): Record<string, string> {
    return this.config.get<Record<string, string>>('customConfigPaths') ?? {};
  }

  public getLibraryOverrides(): Record<string, boolean> {
    return this.config.get<Record<string, boolean>>('libraryOverrides') ?? {};
  }

  public getMonorepoSettings(): {
    enabled: boolean;
    detectAutomatically: boolean;
    includedWorkspaces: string[];
  } {
    return {
      enabled: this.config.get<boolean>('monorepo.enabled') ?? false,
      detectAutomatically: this.config.get<boolean>('monorepo.detectAutomatically') ?? true,
      includedWorkspaces: this.config.get<string[]>('monorepo.includedWorkspaces') ?? [],
    };
  }

  public getPerformanceSettings(): {
    maxFilesPerScan: number;
    enableParallelScanning: boolean;
    cacheResults: boolean;
    cacheTTL: number;
  } {
    return {
      maxFilesPerScan: this.config.get<number>('performance.maxFilesPerScan') ?? 10000,
      enableParallelScanning:
        this.config.get<boolean>('performance.enableParallelScanning') ?? true,
      cacheResults: this.config.get<boolean>('performance.cacheResults') ?? true,
      cacheTTL: this.config.get<number>('performance.cacheTTL') ?? 300000, // 5 minutes
    };
  }

  public getAdvancedSettings(): {
    enableExperimentalFeatures: boolean;
    debugMode: boolean;
    verboseLogging: boolean;
    enableTelemetry: boolean;
  } {
    return {
      enableExperimentalFeatures:
        this.config.get<boolean>('advanced.enableExperimentalFeatures') ?? false,
      debugMode: this.config.get<boolean>('advanced.debugMode') ?? false,
      verboseLogging: this.config.get<boolean>('advanced.verboseLogging') ?? false,
      enableTelemetry: this.config.get<boolean>('advanced.enableTelemetry') ?? true,
    };
  }

  // Reset to defaults
  public async resetToDefaults(): Promise<void> {
    const config = this.config;

    await Promise.all([
      config.update('defaultFormat', undefined, vscode.ConfigurationTarget.Global),
      config.update('defaultLLM', undefined, vscode.ConfigurationTarget.Global),
      config.update('includePrompts', undefined, vscode.ConfigurationTarget.Global),
      config.update('autoOpenOutput', undefined, vscode.ConfigurationTarget.Global),
      config.update('maxFileSize', undefined, vscode.ConfigurationTarget.Global),
      config.update('customIgnorePatterns', undefined, vscode.ConfigurationTarget.Global),
      config.update('includeTests', undefined, vscode.ConfigurationTarget.Global),
      config.update('includePrisma', undefined, vscode.ConfigurationTarget.Global),
      config.update('includeZenStack', undefined, vscode.ConfigurationTarget.Global),
      config.update('includeEnvFiles', undefined, vscode.ConfigurationTarget.Global),
      config.update('includeUILibraries', undefined, vscode.ConfigurationTarget.Global),
      config.update('includeAuthConfig', undefined, vscode.ConfigurationTarget.Global),
      config.update('includeDataFetching', undefined, vscode.ConfigurationTarget.Global),
      config.update('detectProjectStructure', undefined, vscode.ConfigurationTarget.Global),
      config.update('autoDetectPackageManager', undefined, vscode.ConfigurationTarget.Global),
      config.update('respectWorkspaceConfig', undefined, vscode.ConfigurationTarget.Global),
    ]);
  }

  // Get current configuration as display-friendly object
  public getConfigForDisplay(): Record<string, any> {
    const config = this.getConfig();
    return {
      'Output Format': config.defaultFormat,
      'Target LLM': config.defaultLLM,
      'Include Prompts': config.includePrompts,
      'Auto Open Output': config.autoOpenOutput,
      'Max File Size': config.maxFileSize ? `${config.maxFileSize} bytes` : 'No limit',
      'Include Tests': config.includeTests,
      'Include Prisma': config.includePrisma,
      'Include ZenStack': config.includeZenStack,
      'Include Environment Files': config.includeEnvFiles,
      'Include UI Libraries': config.includeUILibraries,
      'Include Auth Config': config.includeAuthConfig,
      'Include Data Fetching': config.includeDataFetching,
      'Detect Project Structure': config.detectProjectStructure,
      'Auto Detect Package Manager': config.autoDetectPackageManager,
      'Respect Workspace Config': config.respectWorkspaceConfig,
      'Custom Ignore Patterns': config.customIgnorePatterns?.length ?? 0,
    };
  }
}
