import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';
import { Logger } from './Logger';

export class IgnoreService {
  private ignoreFilter: ReturnType<typeof ignore>;
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.ignoreFilter = this.createIgnoreFilter();
  }

  private createIgnoreFilter(): ReturnType<typeof ignore> {
    const ig = ignore();

    // Always ignore common build/cache directories
    ig.add([
      'node_modules/',
      '.git/',
      '.next/',
      'dist/',
      'build/',
      '.turbo/',
      '.cache/',
      'coverage/',
      '.nyc_output/',
      '.swc/',
      '.tsbuildinfo',
      '*.log',
    ]);

    // Always ignore AI assistant ignore files themselves
    ig.add([
      '.gitignore',
      '.cursorignore',
      '.codiumignore',
      '.clineignore',
      '.rooignore',
      '.windsurfignore',
      '.claudeignore',
      '.aiignore',
      '.nextjscollectorignore',
    ]);

    // Add patterns from .gitignore
    this.addGitignorePatterns(ig);

    // Add patterns from custom ignore files (AI assistants)
    this.addCustomIgnorePatterns(ig);

    // Add patterns from global gitignore files
    this.addGlobalGitignorePatterns(ig);

    return ig;
  }

  private addGitignorePatterns(ig: ReturnType<typeof ignore>): void {
    const gitignorePath = path.join(this.rootPath, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      try {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        ig.add(gitignoreContent);
        Logger.debug('Added .gitignore patterns to ignore filter');
      } catch (error) {
        Logger.warn('Failed to read .gitignore:', error);
      }
    }

    // Also check for global .gitignore (commonly in ~/.gitignore_global)
    const globalGitignorePaths = [
      path.join(process.env.HOME || '~', '.gitignore_global'),
      path.join(process.env.HOME || '~', '.config/git/ignore'),
    ];

    for (const globalPath of globalGitignorePaths) {
      if (fs.existsSync(globalPath)) {
        try {
          const globalGitignoreContent = fs.readFileSync(globalPath, 'utf8');
          ig.add(globalGitignoreContent);
          Logger.debug(`Added global .gitignore patterns from ${globalPath}`);
          break; // Only use the first one found
        } catch (error) {
          Logger.warn(`Failed to read global .gitignore from ${globalPath}:`, error);
        }
      }
    }
  }

  private addCustomIgnorePatterns(ig: ReturnType<typeof ignore>): void {
    // Support for various AI coding assistants and editors
    const customIgnoreFiles = [
      '.nextjscollectorignore', // Our custom ignore file
      '.cursorignore', // Cursor editor
      '.codiumignore', // VSCodium
      '.clineignore', // Cline AI assistant
      '.rooignore', // Roo AI assistant
      '.windsurfignore', // Windsurf editor
      '.claudeignore', // Claude-specific patterns
      '.aiignore', // Generic AI assistant ignore
    ];

    for (const ignoreFile of customIgnoreFiles) {
      const ignorePath = path.join(this.rootPath, ignoreFile);
      if (fs.existsSync(ignorePath)) {
        try {
          const ignoreContent = fs.readFileSync(ignorePath, 'utf8');
          ig.add(ignoreContent);
          Logger.debug(`Added ${ignoreFile} patterns to ignore filter`);
        } catch (error) {
          Logger.warn(`Failed to read ${ignoreFile}:`, error);
        }
      }
    }
  }

  private addGlobalGitignorePatterns(ig: ReturnType<typeof ignore>): void {
    // Check for global gitignore files
    const globalIgnoreFiles = [
      path.join(require('os').homedir(), '.gitignore_global'),
      path.join(require('os').homedir(), '.config', 'git', 'ignore'),
    ];

    for (const globalIgnorePath of globalIgnoreFiles) {
      if (fs.existsSync(globalIgnorePath)) {
        try {
          const globalIgnoreContent = fs.readFileSync(globalIgnorePath, 'utf8');
          ig.add(globalIgnoreContent);
          Logger.debug(`Added global gitignore patterns from ${globalIgnorePath}`);
        } catch (error) {
          Logger.warn(`Failed to read global gitignore from ${globalIgnorePath}:`, error);
        }
      }
    }
  }

  public shouldIgnore(relativePath: string): boolean {
    return this.ignoreFilter.ignores(relativePath);
  }

  public getIgnoreFilter(): ReturnType<typeof ignore> {
    return this.ignoreFilter;
  }

  public refreshIgnoreFilter(): void {
    this.ignoreFilter = this.createIgnoreFilter();
    Logger.debug('Refreshed ignore filter with latest patterns');
  }

  public getIgnoreStats(): {
    hasGitignore: boolean;
    hasCustomIgnore: boolean;
    supportedIgnoreFiles: string[];
    foundIgnoreFiles: string[];
    totalPatterns: number;
  } {
    const gitignorePath = path.join(this.rootPath, '.gitignore');

    const customIgnoreFiles = [
      '.nextjscollectorignore',
      '.cursorignore',
      '.codiumignore',
      '.clineignore',
      '.rooignore',
      '.windsurfignore',
      '.claudeignore',
      '.aiignore',
    ];

    const foundIgnoreFiles = customIgnoreFiles.filter(file =>
      fs.existsSync(path.join(this.rootPath, file))
    );

    // Get pattern count by converting to string and counting lines
    const rulesString = this.ignoreFilter.toString();
    const totalPatterns = rulesString.split('\n').filter(line => line.trim().length > 0).length;

    return {
      hasGitignore: fs.existsSync(gitignorePath),
      hasCustomIgnore: foundIgnoreFiles.length > 0,
      supportedIgnoreFiles: customIgnoreFiles,
      foundIgnoreFiles,
      totalPatterns,
    };
  }
}
