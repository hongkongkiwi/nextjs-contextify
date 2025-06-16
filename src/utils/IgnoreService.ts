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

  private createIgnoreFilter() {
    const ig = ignore();

    // Default patterns for VS Code extensions and common build artifacts
    const defaultIgnore = [
      'node_modules/**',
      '.next/**',
      '.swc/**',
      'out/**',
      'build/**',
      'dist/**',
      '.turbo/**',
      '.git/**',
      '.vscode/**',
      '.idea/**',
      '.cursor/**',
      '.windsurf/**',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'bun.lockb',
      // Media files
      '**/*.jpg',
      '**/*.jpeg',
      '**/*.png',
      '**/*.gif',
      '**/*.ico',
      '**/*.svg',
      '**/*.webp',
      '**/*.avif',
      '**/*.woff',
      '**/*.woff2',
      '**/*.ttf',
      '**/*.eot',
      '**/*.otf',
      '**/*.mp4',
      '**/*.webm',
      '**/*.ogg',
      '**/*.mp3',
      '**/*.wav',
      '**/*.avi',
      '**/*.mov',
      '**/*.pdf',
      '**/*.zip',
      '**/*.tar',
      '**/*.gz',
      '**/*.rar',
      '**/*.7z',
      // Logs and temp files
      '**/*.log',
      '**/*.tmp',
      '**/tmp/**',
      '**/temp/**',
      'coverage/**',
      '.nyc_output/**',
      '**/*.generated.*',
      '**/generated/**',
      // Additional patterns for modern Next.js projects
      '.vercel/**',
      '.netlify/**',
      '.firebase/**',
      '.supabase/**',
      'storybook-static/**',
      '.storybook/public/**',
      'playwright-report/**',
      'test-results/**',
      '.contentlayer/**',
      '.velite/**',
      '.astro/**',
      'android/**',
      'ios/**', // React Native files
      '.expo/**',
      '.eas/**', // Expo files
      'amplify/**',
      '.amplify/**', // AWS Amplify files
    ];
    ig.add(defaultIgnore);

    // Add .gitignore patterns
    this.addGitignorePatterns(ig);

    // Add custom ignore patterns from .nextjscollectorignore
    this.addCustomIgnorePatterns(ig);

    // Add user-configured ignore patterns from VS Code settings
    this.addVSCodeIgnorePatterns(ig);

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
      '.cursorignore',          // Cursor editor
      '.codiumignore',          // VSCodium
      '.clineignore',           // Cline AI assistant
      '.rooignore',             // Roo AI assistant
      '.windsurfignore',        // Windsurf editor
      '.claudeignore',          // Claude-specific patterns
      '.aiignore',              // Generic AI assistant ignore
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

  private addVSCodeIgnorePatterns(ig: ReturnType<typeof ignore>): void {
    try {
      // This would be called from VS Code context to get user settings
      // For now, we'll add some sensible defaults that can be overridden
      const vscodeIgnorePatterns: string[] = [
        // Add any patterns from VS Code settings if available
        // These would be read from vscode.workspace.getConfiguration('nextjsContextify').get('customIgnorePatterns')
      ];

      if (vscodeIgnorePatterns.length > 0) {
        ig.add(vscodeIgnorePatterns);
        Logger.debug('Added VS Code configuration ignore patterns');
      }
    } catch (error) {
      Logger.warn('Failed to read VS Code ignore patterns:', error);
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