import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../../utils/Logger';
import { SecurityService } from '../../utils/SecurityService';

export interface WorkspaceInfo {
  uri: vscode.Uri;
  name: string;
  rootPath: string;
  isMultiRoot: boolean;
  projectType: string;
  packageManager: string;
  hasNextJsConfig: boolean;
  nextJsVersion?: string;
  workspaceConfig?: any;
  lastScanned?: Date;
  fileCount?: number;
}

export interface WorkspaceConfiguration {
  enabledProjects?: string[];
  excludePatterns?: string[];
  includePatterns?: string[];
  maxFileSize?: number;
  scanDepth?: number;
  autoDetectChanges?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

export class WorkspaceManager {
  private static workspaces: Map<string, WorkspaceInfo> = new Map();
  private static activeWorkspace: string | null = null;
  private static configurations: Map<string, WorkspaceConfiguration> = new Map();
  private static watchers: Map<string, vscode.FileSystemWatcher[]> = new Map();

  static async initialize(): Promise<void> {
    Logger.info('Initializing WorkspaceManager');
    
    // Clear existing state
    this.cleanup();
    
    // Detect current workspaces
    await this.detectWorkspaces();
    
    // Set up workspace change listeners
    this.setupWorkspaceListeners();
    
    // Load configurations
    await this.loadWorkspaceConfigurations();
    
    Logger.info(`Initialized with ${this.workspaces.size} workspace(s)`);
  }

  private static async detectWorkspaces(): Promise<void> {
    if (vscode.workspace.workspaceFolders) {
      for (const folder of vscode.workspace.workspaceFolders) {
        await this.addWorkspace(folder);
      }
    }

    // Set active workspace
    if (this.workspaces.size === 1) {
      this.activeWorkspace = Array.from(this.workspaces.keys())[0];
    } else if (vscode.window.activeTextEditor) {
      const activeFile = vscode.window.activeTextEditor.document.uri;
      this.activeWorkspace = this.getWorkspaceForFile(activeFile)?.uri.fsPath || null;
    }
  }

  private static async addWorkspace(folder: vscode.WorkspaceFolder): Promise<void> {
    const workspaceId = folder.uri.fsPath;
    
    try {
      // Security validation
      SecurityService.setWorkspaceRoot(workspaceId);
      await SecurityService.validateFileAccess(workspaceId);

      const workspaceInfo: WorkspaceInfo = {
        uri: folder.uri,
        name: folder.name,
        rootPath: folder.uri.fsPath,
        isMultiRoot: (vscode.workspace.workspaceFolders?.length || 0) > 1,
        projectType: await this.detectProjectType(folder.uri.fsPath),
        packageManager: await this.detectPackageManager(folder.uri.fsPath),
        hasNextJsConfig: await this.hasNextJsConfiguration(folder.uri.fsPath),
        lastScanned: new Date(),
      };

      // Detect Next.js version if applicable
      if (workspaceInfo.hasNextJsConfig) {
        workspaceInfo.nextJsVersion = await this.detectNextJsVersion(folder.uri.fsPath);
      }

      // Count files
      workspaceInfo.fileCount = await this.countFiles(folder.uri.fsPath);

      this.workspaces.set(workspaceId, workspaceInfo);
      
      // Set up file watchers for this workspace
      await this.setupWorkspaceWatchers(workspaceId);
      
      Logger.info(`Added workspace: ${workspaceInfo.name} (${workspaceInfo.projectType})`);
    } catch (error) {
      Logger.error(`Failed to add workspace ${folder.name}:`, error as Error);
    }
  }

  private static setupWorkspaceListeners(): void {
    // Listen for workspace folder changes
    vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
      Logger.info('Workspace folders changed');
      
      // Remove deleted folders
      for (const removed of event.removed) {
        await this.removeWorkspace(removed.uri.fsPath);
      }
      
      // Add new folders
      for (const added of event.added) {
        await this.addWorkspace(added);
      }
    });

    // Listen for active editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        const workspace = this.getWorkspaceForFile(editor.document.uri);
        if (workspace) {
          this.setActiveWorkspace(workspace.uri.fsPath);
        }
      }
    });
  }

  private static async setupWorkspaceWatchers(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return;

    const watchers: vscode.FileSystemWatcher[] = [];

    // Watch for package.json changes
    const packageWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace.uri, '**/package.json')
    );
    
    packageWatcher.onDidChange(() => this.handlePackageJsonChange(workspaceId));
    packageWatcher.onDidCreate(() => this.handlePackageJsonChange(workspaceId));
    packageWatcher.onDidDelete(() => this.handlePackageJsonChange(workspaceId));
    watchers.push(packageWatcher);

    // Watch for Next.js config changes
    const nextConfigWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace.uri, 'next.config.{js,mjs,ts}')
    );
    
    nextConfigWatcher.onDidChange(() => this.handleNextConfigChange(workspaceId));
    nextConfigWatcher.onDidCreate(() => this.handleNextConfigChange(workspaceId));
    nextConfigWatcher.onDidDelete(() => this.handleNextConfigChange(workspaceId));
    watchers.push(nextConfigWatcher);

    // Watch for TypeScript config changes
    const tsConfigWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspace.uri, '**/tsconfig.json')
    );
    
    tsConfigWatcher.onDidChange(() => this.handleTsConfigChange(workspaceId));
    watchers.push(tsConfigWatcher);

    this.watchers.set(workspaceId, watchers);
  }

  private static async removeWorkspace(workspaceId: string): Promise<void> {
    // Clean up watchers
    const watchers = this.watchers.get(workspaceId);
    if (watchers) {
      watchers.forEach(watcher => watcher.dispose());
      this.watchers.delete(workspaceId);
    }

    // Remove workspace
    this.workspaces.delete(workspaceId);
    this.configurations.delete(workspaceId);

    // Update active workspace if needed
    if (this.activeWorkspace === workspaceId) {
      this.activeWorkspace = this.workspaces.size > 0 ? 
        Array.from(this.workspaces.keys())[0] : null;
    }

    Logger.info(`Removed workspace: ${workspaceId}`);
  }

  private static async handlePackageJsonChange(workspaceId: string): Promise<void> {
    Logger.info(`Package.json changed in workspace: ${workspaceId}`);
    
    const workspace = this.workspaces.get(workspaceId);
    if (workspace) {
      // Re-detect project type and package manager
      workspace.projectType = await this.detectProjectType(workspace.rootPath);
      workspace.packageManager = await this.detectPackageManager(workspace.rootPath);
      workspace.nextJsVersion = await this.detectNextJsVersion(workspace.rootPath);
      workspace.lastScanned = new Date();
    }
  }

  private static async handleNextConfigChange(workspaceId: string): Promise<void> {
    Logger.info(`Next.js config changed in workspace: ${workspaceId}`);
    
    const workspace = this.workspaces.get(workspaceId);
    if (workspace) {
      workspace.hasNextJsConfig = await this.hasNextJsConfiguration(workspace.rootPath);
      workspace.lastScanned = new Date();
    }
  }

  private static async handleTsConfigChange(workspaceId: string): Promise<void> {
    Logger.info(`TypeScript config changed in workspace: ${workspaceId}`);
    // Could trigger re-analysis of TypeScript configuration
  }

  private static async detectProjectType(rootPath: string): Promise<string> {
    try {
      const packageJsonPath = path.join(rootPath, 'package.json');
      if (await this.fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
        
        if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
          // Check for specific stack patterns
          if (packageJson.dependencies?.['@prisma/client'] || packageJson.devDependencies?.prisma) {
            return 'nextjs-prisma';
          }
          if (packageJson.dependencies?.['@trpc/server'] || packageJson.dependencies?.['@trpc/client']) {
            return 'nextjs-trpc';
          }
          if (packageJson.dependencies?.['@supabase/supabase-js']) {
            return 'nextjs-supabase';
          }
          return 'nextjs';
        }
        
        if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
          return 'react';
        }
        
        if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
          return 'vue';
        }
        
        return 'nodejs';
      }
      
      return 'unknown';
    } catch (error) {
      Logger.warn(`Failed to detect project type for ${rootPath}:`, error);
      return 'unknown';
    }
  }

  private static async detectPackageManager(rootPath: string): Promise<string> {
    try {
      if (await this.fileExists(path.join(rootPath, 'pnpm-lock.yaml'))) {
        return 'pnpm';
      }
      if (await this.fileExists(path.join(rootPath, 'yarn.lock'))) {
        return 'yarn';
      }
      if (await this.fileExists(path.join(rootPath, 'bun.lockb'))) {
        return 'bun';
      }
      if (await this.fileExists(path.join(rootPath, 'package-lock.json'))) {
        return 'npm';
      }
      return 'npm'; // Default
    } catch (error) {
      Logger.warn(`Failed to detect package manager for ${rootPath}:`, error);
      return 'npm';
    }
  }

  private static async hasNextJsConfiguration(rootPath: string): Promise<boolean> {
    const configFiles = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
    
    for (const configFile of configFiles) {
      if (await this.fileExists(path.join(rootPath, configFile))) {
        return true;
      }
    }
    
    return false;
  }

  private static async detectNextJsVersion(rootPath: string): Promise<string | undefined> {
    try {
      const packageJsonPath = path.join(rootPath, 'package.json');
      if (await this.fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
        return packageJson.dependencies?.next || packageJson.devDependencies?.next;
      }
    } catch (error) {
      Logger.warn(`Failed to detect Next.js version for ${rootPath}:`, error);
    }
    return undefined;
  }

  private static async countFiles(rootPath: string): Promise<number> {
    try {
      let count = 0;
      const countFilesRecursive = async (dirPath: string, depth: number = 0): Promise<void> => {
        if (depth > 10) return; // Prevent infinite recursion
        
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue; // Skip hidden files and node_modules
          }
          
          const fullPath = path.join(dirPath, entry.name);
          
          if (entry.isFile()) {
            count++;
          } else if (entry.isDirectory()) {
            await countFilesRecursive(fullPath, depth + 1);
          }
        }
      };

      await countFilesRecursive(rootPath);
      return count;
    } catch (error) {
      Logger.warn(`Failed to count files in ${rootPath}:`, error);
      return 0;
    }
  }

  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private static async loadWorkspaceConfigurations(): Promise<void> {
    for (const [workspaceId, workspace] of this.workspaces) {
      try {
        const config = vscode.workspace.getConfiguration('nextjs-llm-context', workspace.uri);
        const workspaceConfig: WorkspaceConfiguration = {
          enabledProjects: config.get('enabledProjects'),
          excludePatterns: config.get('excludePatterns'),
          includePatterns: config.get('includePatterns'),
          maxFileSize: config.get('maxFileSize'),
          scanDepth: config.get('scanDepth'),
          autoDetectChanges: config.get('autoDetectChanges'),
          cacheEnabled: config.get('cacheEnabled'),
          cacheTTL: config.get('cacheTTL'),
        };
        
        this.configurations.set(workspaceId, workspaceConfig);
      } catch (error) {
        Logger.warn(`Failed to load configuration for workspace ${workspaceId}:`, error);
      }
    }
  }

  static getWorkspaces(): WorkspaceInfo[] {
    return Array.from(this.workspaces.values());
  }

  static getActiveWorkspace(): WorkspaceInfo | null {
    return this.activeWorkspace ? this.workspaces.get(this.activeWorkspace) || null : null;
  }

  static setActiveWorkspace(workspaceId: string): boolean {
    if (this.workspaces.has(workspaceId)) {
      this.activeWorkspace = workspaceId;
      Logger.info(`Set active workspace: ${workspaceId}`);
      return true;
    }
    return false;
  }

  static getWorkspaceForFile(fileUri: vscode.Uri): WorkspaceInfo | null {
    const filePath = fileUri.fsPath;
    
    for (const workspace of this.workspaces.values()) {
      if (filePath.startsWith(workspace.rootPath)) {
        return workspace;
      }
    }
    
    return null;
  }

  static getWorkspaceConfiguration(workspaceId: string): WorkspaceConfiguration | null {
    return this.configurations.get(workspaceId) || null;
  }

  static async updateWorkspaceConfiguration(
    workspaceId: string, 
    config: Partial<WorkspaceConfiguration>
  ): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return;

    const existingConfig = this.configurations.get(workspaceId) || {};
    const newConfig = { ...existingConfig, ...config };
    
    this.configurations.set(workspaceId, newConfig);
    
    // Save to VS Code settings
    const vscodeConfig = vscode.workspace.getConfiguration('nextjs-llm-context', workspace.uri);
    for (const [key, value] of Object.entries(config)) {
      await vscodeConfig.update(key, value, vscode.ConfigurationTarget.Workspace);
    }
    
    Logger.info(`Updated configuration for workspace: ${workspaceId}`);
  }

  static getWorkspaceSummary(): {
    totalWorkspaces: number;
    activeWorkspace: string | null;
    projectTypes: Record<string, number>;
    packageManagers: Record<string, number>;
    totalFiles: number;
  } {
    const projectTypes: Record<string, number> = {};
    const packageManagers: Record<string, number> = {};
    let totalFiles = 0;

    for (const workspace of this.workspaces.values()) {
      projectTypes[workspace.projectType] = (projectTypes[workspace.projectType] || 0) + 1;
      packageManagers[workspace.packageManager] = (packageManagers[workspace.packageManager] || 0) + 1;
      totalFiles += workspace.fileCount || 0;
    }

    return {
      totalWorkspaces: this.workspaces.size,
      activeWorkspace: this.activeWorkspace,
      projectTypes,
      packageManagers,
      totalFiles,
    };
  }

  static async refreshWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) return;

    Logger.info(`Refreshing workspace: ${workspaceId}`);

    // Re-detect project information
    workspace.projectType = await this.detectProjectType(workspace.rootPath);
    workspace.packageManager = await this.detectPackageManager(workspace.rootPath);
    workspace.hasNextJsConfig = await this.hasNextJsConfiguration(workspace.rootPath);
    workspace.nextJsVersion = await this.detectNextJsVersion(workspace.rootPath);
    workspace.fileCount = await this.countFiles(workspace.rootPath);
    workspace.lastScanned = new Date();

    Logger.info(`Refreshed workspace: ${workspace.name}`);
  }

  static async refreshAllWorkspaces(): Promise<void> {
    Logger.info('Refreshing all workspaces');
    
    const refreshPromises = Array.from(this.workspaces.keys()).map(workspaceId => 
      this.refreshWorkspace(workspaceId)
    );
    
    await Promise.all(refreshPromises);
    Logger.info('All workspaces refreshed');
  }

  static cleanup(): void {
    // Dispose all watchers
    for (const watchers of this.watchers.values()) {
      watchers.forEach(watcher => watcher.dispose());
    }
    
    // Clear all state
    this.watchers.clear();
    this.workspaces.clear();
    this.configurations.clear();
    this.activeWorkspace = null;
    
    Logger.info('WorkspaceManager cleaned up');
  }

  static validateWorkspace(workspaceId: string): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const workspace = this.workspaces.get(workspaceId);
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!workspace) {
      issues.push('Workspace not found');
      return { isValid: false, issues, recommendations };
    }

    // Check if workspace still exists
    if (!fs.existsSync(workspace.rootPath)) {
      issues.push('Workspace directory no longer exists');
    }

    // Check project type detection
    if (workspace.projectType === 'unknown') {
      issues.push('Could not detect project type');
      recommendations.push('Ensure package.json exists and is properly formatted');
    }

    // Check for Next.js projects without config
    if (workspace.projectType.includes('nextjs') && !workspace.hasNextJsConfig) {
      recommendations.push('Consider adding a next.config.js file for better project detection');
    }

    // Check file count
    if (workspace.fileCount && workspace.fileCount > 10000) {
      recommendations.push('Large project detected - consider using file filters for better performance');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }
} 