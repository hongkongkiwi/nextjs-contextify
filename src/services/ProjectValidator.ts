import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';

export interface ProjectValidation {
  isValidProject: boolean;
  projectType: 'nextjs' | 'nodejs' | 'unknown';
  hasPackageJson: boolean;
  hasNextJs: boolean;
  nextjsVersion?: string;
  reason?: string;
  suggestions?: string[];
}

/**
 * Validates if the current workspace is a supported project type.
 * Only Next.js projects are fully supported, but we gracefully handle Node.js projects.
 */
export class ProjectValidator {
  private rootPath: string;
  private packageJsonData: any = null;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * Validates the current project and returns detailed information
   */
  async validateProject(): Promise<ProjectValidation> {
    try {
      const hasPackageJson = await this.hasPackageJson();
      
      if (!hasPackageJson) {
        return {
          isValidProject: false,
          projectType: 'unknown',
          hasPackageJson: false,
          hasNextJs: false,
          reason: 'No package.json found - this does not appear to be a Node.js project',
          suggestions: [
            'Make sure you\'re in the root directory of a Node.js project',
            'If this is a Next.js project, ensure package.json exists in the workspace root'
          ]
        };
      }

      await this.loadPackageJson();
      const nextjsInfo = this.detectNextJs();

      if (nextjsInfo.hasNextJs) {
        return {
          isValidProject: true,
          projectType: 'nextjs',
          hasPackageJson: true,
          hasNextJs: true,
          nextjsVersion: nextjsInfo.version
        };
      }

      // Check if it's at least a Node.js project
      const isNodeProject = this.isNodeProject();
      
      if (isNodeProject) {
        return {
          isValidProject: false,
          projectType: 'nodejs',
          hasPackageJson: true,
          hasNextJs: false,
          reason: 'This is a Node.js project but not a Next.js project',
          suggestions: [
            'This extension is specifically designed for Next.js projects',
            'To use this extension, you need a Next.js project with "next" as a dependency',
            'Run "npx create-next-app@latest" to create a new Next.js project'
          ]
        };
      }

      return {
        isValidProject: false,
        projectType: 'unknown',
        hasPackageJson: true,
        hasNextJs: false,
        reason: 'This project does not appear to be a Next.js project',
        suggestions: [
          'This extension only works with Next.js projects',
          'Ensure "next" is listed in your package.json dependencies',
          'Check that you\'re in the correct workspace folder'
        ]
      };

    } catch (error) {
      Logger.error('Error validating project:', error instanceof Error ? error : new Error(String(error)));
      
      return {
        isValidProject: false,
        projectType: 'unknown',
        hasPackageJson: false,
        hasNextJs: false,
        reason: `Failed to validate project: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: [
          'Check file permissions in the workspace',
          'Ensure you have read access to package.json'
        ]
      };
    }
  }

  /**
   * Quick check if this is a valid Next.js project
   */
  async isValidNextJsProject(): Promise<boolean> {
    const validation = await this.validateProject();
    return validation.isValidProject && validation.projectType === 'nextjs';
  }

  /**
   * Quick check if this is at least a Node.js project
   */
  async isNodeJsProject(): Promise<boolean> {
    const validation = await this.validateProject();
    return validation.hasPackageJson && (validation.projectType === 'nodejs' || validation.projectType === 'nextjs');
  }

  private async hasPackageJson(): Promise<boolean> {
    const packageJsonPath = path.join(this.rootPath, 'package.json');
    try {
      await fs.promises.access(packageJsonPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async loadPackageJson(): Promise<void> {
    const packageJsonPath = path.join(this.rootPath, 'package.json');
    
    try {
      const content = await fs.promises.readFile(packageJsonPath, 'utf8');
      this.packageJsonData = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to read or parse package.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private detectNextJs(): { hasNextJs: boolean; version?: string } {
    if (!this.packageJsonData) {
      return { hasNextJs: false };
    }

    const dependencies = {
      ...this.packageJsonData.dependencies,
      ...this.packageJsonData.devDependencies,
      ...this.packageJsonData.peerDependencies
    };

    const nextVersion = dependencies['next'];
    
    if (nextVersion) {
      // Clean up version string
      const cleanVersion = nextVersion.replace(/[\^~>=<]/g, '');
      return { hasNextJs: true, version: cleanVersion };
    }

    return { hasNextJs: false };
  }

  private isNodeProject(): boolean {
    if (!this.packageJsonData) {
      return false;
    }

    // Check for common Node.js indicators
    const hasNodeDependencies = !!(
      this.packageJsonData.dependencies ||
      this.packageJsonData.devDependencies ||
      this.packageJsonData.scripts
    );

    const hasNodeScripts = !!(
      this.packageJsonData.scripts?.start ||
      this.packageJsonData.scripts?.build ||
      this.packageJsonData.scripts?.dev ||
      this.packageJsonData.scripts?.test
    );

    return hasNodeDependencies || hasNodeScripts;
  }

  /**
   * Check for Next.js specific files and directories
   */
  async hasNextJsStructure(): Promise<boolean> {
    const nextjsIndicators = [
      'next.config.js',
      'next.config.mjs', 
      'next.config.ts',
      'next-env.d.ts',
      'app',
      'pages',
      'src/app',
      'src/pages'
    ];

    for (const indicator of nextjsIndicators) {
      const fullPath = path.join(this.rootPath, indicator);
      try {
        await fs.promises.access(fullPath, fs.constants.F_OK);
        return true;
      } catch {
        // Continue checking other indicators
      }
    }

    return false;
  }

  /**
   * Generate a user-friendly error message for non-supported projects
   */
  generateErrorMessage(validation: ProjectValidation): string {
    if (validation.isValidProject) {
      return '';
    }

    let message = `❌ **${validation.reason}**\n\n`;
    
    if (validation.suggestions && validation.suggestions.length > 0) {
      message += '**Suggestions:**\n';
      validation.suggestions.forEach(suggestion => {
        message += `• ${suggestion}\n`;
      });
    }

    message += '\n**About this extension:**\n';
    message += 'The Next.js LLM Context extension is specifically designed for Next.js projects and helps generate optimized context files for AI assistants like Claude, GPT, and others.';

    return message;
  }
} 