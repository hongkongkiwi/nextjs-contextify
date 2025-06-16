import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';
import { VersionDetector, PackageVersions } from './VersionDetector';

export interface ProjectStructure {
  type: 'app-router' | 'pages-router' | 'mixed' | 'unknown';
  nextjsVersion: string;
  hasSrcDirectory: boolean;
  hasPublicDirectory: boolean;
  hasStylesDirectory: boolean;
  hasComponentsDirectory: boolean;
  hasLibDirectory: boolean;
  hasUtilsDirectory: boolean;
  hasHooksDirectory: boolean;
  hasTypesDirectory: boolean;
  configFiles: ConfigFile[];
  routerDirectories: RouterDirectory[];
  standardDirectories: StandardDirectory[];
  isNext15Structure: boolean;
  recommendations: string[];
}

export interface ConfigFile {
  name: string;
  path: string;
  exists: boolean;
  description: string;
  type: 'config' | 'style' | 'typescript' | 'build' | 'test' | 'lint';
}

export interface RouterDirectory {
  type: 'app' | 'pages';
  path: string;
  exists: boolean;
  hasLayout: boolean;
  hasPage: boolean;
  hasApiRoutes: boolean;
  specialFiles: string[];
}

export interface StandardDirectory {
  name: string;
  path: string;
  exists: boolean;
  description: string;
  isRecommended: boolean;
  next15Standard: boolean;
}

/**
 * Detects Next.js project structure according to the official documentation:
 * https://nextjs.org/docs/pages/getting-started/project-structure
 *
 * Handles both App Router and Pages Router structures
 * Supports Next.js v15 standardized project structure
 */
export class ProjectStructureDetector {
  private rootPath: string;
  private versionDetector: VersionDetector;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.versionDetector = new VersionDetector(rootPath);
  }

  async analyzeProjectStructure(): Promise<ProjectStructure> {
    try {
      await this.versionDetector.detectVersions();

      const versions = await this.versionDetector.detectVersions();
      const routerType = this.versionDetector.getRouterType();
      const isNext15 = this.versionDetector.isNextJs15OrLater();

      const configFiles = this.detectConfigFiles();
      const routerDirectories = this.detectRouterDirectories();
      const standardDirectories = this.detectStandardDirectories(isNext15);
      const recommendations = this.generateRecommendations(
        routerType,
        isNext15,
        standardDirectories
      );

      return {
        type: this.mapRouterType(routerType),
        nextjsVersion: versions.nextjs,
        hasSrcDirectory: this.versionDetector.hasSrcDirectory(),
        hasPublicDirectory: this.hasDirectory('public'),
        hasStylesDirectory: this.hasDirectory('styles') || this.hasDirectory('src/styles'),
        hasComponentsDirectory:
          this.hasDirectory('components') || this.hasDirectory('src/components'),
        hasLibDirectory: this.hasDirectory('lib') || this.hasDirectory('src/lib'),
        hasUtilsDirectory: this.hasDirectory('utils') || this.hasDirectory('src/utils'),
        hasHooksDirectory: this.hasDirectory('hooks') || this.hasDirectory('src/hooks'),
        hasTypesDirectory: this.hasDirectory('types') || this.hasDirectory('src/types'),
        configFiles,
        routerDirectories,
        standardDirectories,
        isNext15Structure: isNext15,
        recommendations,
      };
    } catch (error) {
      Logger.error(
        'Failed to analyze project structure:',
        error instanceof Error ? error : new Error(String(error))
      );
      return this.getEmptyStructure();
    }
  }

  private detectConfigFiles(): ConfigFile[] {
    const configFiles: ConfigFile[] = [
      // Next.js config files
      {
        name: 'next.config.js',
        path: path.join(this.rootPath, 'next.config.js'),
        exists: false,
        description: 'Next.js configuration file',
        type: 'config',
      },
      {
        name: 'next.config.mjs',
        path: path.join(this.rootPath, 'next.config.mjs'),
        exists: false,
        description: 'Next.js configuration file (ES modules)',
        type: 'config',
      },
      {
        name: 'next.config.ts',
        path: path.join(this.rootPath, 'next.config.ts'),
        exists: false,
        description: 'Next.js configuration file (TypeScript)',
        type: 'config',
      },

      // TypeScript config files
      {
        name: 'tsconfig.json',
        path: path.join(this.rootPath, 'tsconfig.json'),
        exists: false,
        description: 'TypeScript configuration',
        type: 'typescript',
      },
      {
        name: 'next-env.d.ts',
        path: path.join(this.rootPath, 'next-env.d.ts'),
        exists: false,
        description: 'Next.js TypeScript declarations',
        type: 'typescript',
      },

      // Style config files
      {
        name: 'tailwind.config.js',
        path: path.join(this.rootPath, 'tailwind.config.js'),
        exists: false,
        description: 'Tailwind CSS configuration',
        type: 'style',
      },
      {
        name: 'tailwind.config.ts',
        path: path.join(this.rootPath, 'tailwind.config.ts'),
        exists: false,
        description: 'Tailwind CSS configuration (TypeScript)',
        type: 'style',
      },
      {
        name: 'postcss.config.js',
        path: path.join(this.rootPath, 'postcss.config.js'),
        exists: false,
        description: 'PostCSS configuration',
        type: 'style',
      },

      // Build and package management
      {
        name: 'package.json',
        path: path.join(this.rootPath, 'package.json'),
        exists: false,
        description: 'Node.js package configuration',
        type: 'config',
      },
      {
        name: 'pnpm-lock.yaml',
        path: path.join(this.rootPath, 'pnpm-lock.yaml'),
        exists: false,
        description: 'PNPM lock file',
        type: 'build',
      },
      {
        name: 'yarn.lock',
        path: path.join(this.rootPath, 'yarn.lock'),
        exists: false,
        description: 'Yarn lock file',
        type: 'build',
      },
      {
        name: 'package-lock.json',
        path: path.join(this.rootPath, 'package-lock.json'),
        exists: false,
        description: 'NPM lock file',
        type: 'build',
      },

      // Linting and formatting
      {
        name: '.eslintrc.json',
        path: path.join(this.rootPath, '.eslintrc.json'),
        exists: false,
        description: 'ESLint configuration',
        type: 'lint',
      },
      {
        name: '.prettierrc',
        path: path.join(this.rootPath, '.prettierrc'),
        exists: false,
        description: 'Prettier configuration',
        type: 'lint',
      },

      // Instrumentation (Next.js v13.4+)
      {
        name: 'instrumentation.js',
        path: path.join(this.rootPath, 'instrumentation.js'),
        exists: false,
        description: 'Next.js instrumentation hooks',
        type: 'config',
      },
      {
        name: 'instrumentation.ts',
        path: path.join(this.rootPath, 'instrumentation.ts'),
        exists: false,
        description: 'Next.js instrumentation hooks (TypeScript)',
        type: 'config',
      },

      // Middleware
      {
        name: 'middleware.js',
        path: path.join(this.rootPath, 'middleware.js'),
        exists: false,
        description: 'Next.js middleware',
        type: 'config',
      },
      {
        name: 'middleware.ts',
        path: path.join(this.rootPath, 'middleware.ts'),
        exists: false,
        description: 'Next.js middleware (TypeScript)',
        type: 'config',
      },
    ];

    configFiles.forEach(file => {
      file.exists = fs.existsSync(file.path);
    });

    return configFiles.filter(f => f.exists);
  }

  private detectRouterDirectories(): RouterDirectory[] {
    const directories: RouterDirectory[] = [];

    // App Router detection
    const appDirs = ['app', 'src/app'];
    for (const dir of appDirs) {
      const appPath = path.join(this.rootPath, dir);
      if (fs.existsSync(appPath)) {
        directories.push({
          type: 'app',
          path: appPath,
          exists: true,
          hasLayout: this.hasFileInDirectory(appPath, [
            'layout.js',
            'layout.jsx',
            'layout.ts',
            'layout.tsx',
          ]),
          hasPage: this.hasFileInDirectory(appPath, ['page.js', 'page.jsx', 'page.ts', 'page.tsx']),
          hasApiRoutes: this.hasApiRoutesInApp(appPath),
          specialFiles: this.getAppRouterSpecialFiles(appPath),
        });
      }
    }

    // Pages Router detection
    const pagesDirs = ['pages', 'src/pages'];
    for (const dir of pagesDirs) {
      const pagesPath = path.join(this.rootPath, dir);
      if (fs.existsSync(pagesPath)) {
        directories.push({
          type: 'pages',
          path: pagesPath,
          exists: true,
          hasLayout: this.hasFileInDirectory(pagesPath, [
            '_app.js',
            '_app.jsx',
            '_app.ts',
            '_app.tsx',
          ]),
          hasPage: this.hasFileInDirectory(pagesPath, [
            'index.js',
            'index.jsx',
            'index.ts',
            'index.tsx',
          ]),
          hasApiRoutes: this.hasApiRoutesInPages(pagesPath),
          specialFiles: this.getPagesRouterSpecialFiles(pagesPath),
        });
      }
    }

    return directories;
  }

  private detectStandardDirectories(isNext15: boolean): StandardDirectory[] {
    const directories: StandardDirectory[] = [
      {
        name: 'components',
        path: this.findDirectory('components'),
        exists: false,
        description: 'Reusable UI components',
        isRecommended: true,
        next15Standard: true,
      },
      {
        name: 'lib',
        path: this.findDirectory('lib'),
        exists: false,
        description: 'Utility functions and configurations',
        isRecommended: true,
        next15Standard: true,
      },
      {
        name: 'utils',
        path: this.findDirectory('utils'),
        exists: false,
        description: 'Utility functions',
        isRecommended: true,
        next15Standard: false,
      },
      {
        name: 'hooks',
        path: this.findDirectory('hooks'),
        exists: false,
        description: 'Custom React hooks',
        isRecommended: true,
        next15Standard: false,
      },
      {
        name: 'types',
        path: this.findDirectory('types'),
        exists: false,
        description: 'TypeScript type definitions',
        isRecommended: true,
        next15Standard: false,
      },
      {
        name: 'styles',
        path: this.findDirectory('styles'),
        exists: false,
        description: 'Global styles and CSS files',
        isRecommended: true,
        next15Standard: false,
      },
      {
        name: 'public',
        path: path.join(this.rootPath, 'public'),
        exists: false,
        description: 'Static assets (images, icons, etc.)',
        isRecommended: true,
        next15Standard: true,
      },
      {
        name: 'constants',
        path: this.findDirectory('constants'),
        exists: false,
        description: 'Application constants',
        isRecommended: false,
        next15Standard: false,
      },
      {
        name: 'context',
        path: this.findDirectory('context'),
        exists: false,
        description: 'React context providers',
        isRecommended: false,
        next15Standard: false,
      },
      {
        name: 'store',
        path: this.findDirectory('store'),
        exists: false,
        description: 'State management store',
        isRecommended: false,
        next15Standard: false,
      },
    ];

    directories.forEach(dir => {
      dir.exists = fs.existsSync(dir.path);
    });

    return directories;
  }

  private findDirectory(name: string): string {
    const possiblePaths = [path.join(this.rootPath, name), path.join(this.rootPath, 'src', name)];

    for (const dirPath of possiblePaths) {
      if (fs.existsSync(dirPath)) {
        return dirPath;
      }
    }

    // Return the preferred path (with src if it exists)
    const hasSrc = this.versionDetector.hasSrcDirectory();
    return hasSrc ? possiblePaths[1] : possiblePaths[0];
  }

  private hasDirectory(relativePath: string): boolean {
    return fs.existsSync(path.join(this.rootPath, relativePath));
  }

  private hasFileInDirectory(dirPath: string, filenames: string[]): boolean {
    try {
      const files = fs.readdirSync(dirPath);
      return filenames.some(filename => files.includes(filename));
    } catch {
      return false;
    }
  }

  private hasApiRoutesInApp(appPath: string): boolean {
    const apiPath = path.join(appPath, 'api');
    if (!fs.existsSync(apiPath)) return false;

    try {
      const files = this.getAllFilesRecursive(apiPath);
      return files.some(file => /route\.(js|jsx|ts|tsx)$/.test(file));
    } catch {
      return false;
    }
  }

  private hasApiRoutesInPages(pagesPath: string): boolean {
    const apiPath = path.join(pagesPath, 'api');
    return fs.existsSync(apiPath);
  }

  private getAppRouterSpecialFiles(appPath: string): string[] {
    const specialFiles = [
      'layout.js',
      'layout.jsx',
      'layout.ts',
      'layout.tsx',
      'page.js',
      'page.jsx',
      'page.ts',
      'page.tsx',
      'loading.js',
      'loading.jsx',
      'loading.ts',
      'loading.tsx',
      'error.js',
      'error.jsx',
      'error.ts',
      'error.tsx',
      'not-found.js',
      'not-found.jsx',
      'not-found.ts',
      'not-found.tsx',
      'global-error.js',
      'global-error.jsx',
      'global-error.ts',
      'global-error.tsx',
      'route.js',
      'route.ts',
      'template.js',
      'template.jsx',
      'template.ts',
      'template.tsx',
      'default.js',
      'default.jsx',
      'default.ts',
      'default.tsx',
    ];

    const foundFiles: string[] = [];

    try {
      const allFiles = this.getAllFilesRecursive(appPath);
      specialFiles.forEach(file => {
        if (allFiles.some(f => f.endsWith(file))) {
          foundFiles.push(file);
        }
      });
    } catch {
      // Ignore errors
    }

    return foundFiles;
  }

  private getPagesRouterSpecialFiles(pagesPath: string): string[] {
    const specialFiles = [
      '_app.js',
      '_app.jsx',
      '_app.ts',
      '_app.tsx',
      '_document.js',
      '_document.jsx',
      '_document.ts',
      '_document.tsx',
      '_error.js',
      '_error.jsx',
      '_error.ts',
      '_error.tsx',
      '404.js',
      '404.jsx',
      '404.ts',
      '404.tsx',
      '500.js',
      '500.jsx',
      '500.ts',
      '500.tsx',
      'index.js',
      'index.jsx',
      'index.ts',
      'index.tsx',
    ];

    const foundFiles: string[] = [];

    try {
      const files = fs.readdirSync(pagesPath);
      specialFiles.forEach(file => {
        if (files.includes(file)) {
          foundFiles.push(file);
        }
      });
    } catch {
      // Ignore errors
    }

    return foundFiles;
  }

  private getAllFilesRecursive(dirPath: string): string[] {
    const files: string[] = [];

    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...this.getAllFilesRecursive(fullPath));
        } else {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }

    return files;
  }

  private mapRouterType(routerType: string): 'app-router' | 'pages-router' | 'mixed' | 'unknown' {
    switch (routerType) {
      case 'app':
        return 'app-router';
      case 'pages':
        return 'pages-router';
      case 'mixed':
        return 'mixed';
      default:
        return 'unknown';
    }
  }

  private generateRecommendations(
    routerType: string,
    isNext15: boolean,
    standardDirectories: StandardDirectory[]
  ): string[] {
    const recommendations: string[] = [];

    // Router recommendations
    if (routerType === 'unknown') {
      recommendations.push(
        'Consider setting up either App Router (recommended) or Pages Router structure'
      );
    }

    if (routerType === 'pages' && isNext15) {
      recommendations.push(
        'Consider migrating to App Router for Next.js 15+ features and better performance'
      );
    }

    // Directory structure recommendations
    const missingRecommended = standardDirectories.filter(d => d.isRecommended && !d.exists);
    if (missingRecommended.length > 0) {
      recommendations.push(
        `Consider creating recommended directories: ${missingRecommended.map(d => d.name).join(', ')}`
      );
    }

    // Next.js 15 specific recommendations
    if (isNext15) {
      const missingNext15 = standardDirectories.filter(d => d.next15Standard && !d.exists);
      if (missingNext15.length > 0) {
        recommendations.push(
          `For Next.js 15+ compliance, consider adding: ${missingNext15.map(d => d.name).join(', ')}`
        );
      }
    }

    // src directory recommendation
    if (!this.versionDetector.hasSrcDirectory() && routerType === 'app') {
      recommendations.push(
        'Consider using src/ directory for better organization in App Router projects'
      );
    }

    return recommendations;
  }

  private getEmptyStructure(): ProjectStructure {
    return {
      type: 'unknown',
      nextjsVersion: 'unknown',
      hasSrcDirectory: false,
      hasPublicDirectory: false,
      hasStylesDirectory: false,
      hasComponentsDirectory: false,
      hasLibDirectory: false,
      hasUtilsDirectory: false,
      hasHooksDirectory: false,
      hasTypesDirectory: false,
      configFiles: [],
      routerDirectories: [],
      standardDirectories: [],
      isNext15Structure: false,
      recommendations: [],
    };
  }
}
