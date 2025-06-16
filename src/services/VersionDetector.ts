import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/Logger';

export interface PackageVersions {
  nextjs: string;
  react: string;
  tailwind?: string;
  typescript?: string;
  prisma?: string;
  trpc?: string;
  zustand?: string;
  clerk?: string;
  supabase?: string;
  drizzle?: string;
  zenstack?: string;
  shadcnui?: string;
  radixui?: string;
  [key: string]: string | undefined;
}

export interface PackageJsonData {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  nextConfig?: any;
}

export class VersionDetector {
  private rootPath: string;
  private packageJsonData: PackageJsonData | null = null;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async detectVersions(): Promise<PackageVersions> {
    try {
      await this.loadPackageJson();

      const versions: PackageVersions = {
        nextjs: this.getNextJsVersion(),
        react: this.getPackageVersion('react') || 'unknown',
        tailwind: this.getTailwindVersion(),
        typescript: this.getTypeScriptVersion(),
        prisma: this.getPackageVersion('@prisma/client') || this.getPackageVersion('prisma'),
        trpc: this.getTrpcVersion(),
        zustand: this.getPackageVersion('zustand'),
        clerk: this.getClerkVersion(),
        supabase: this.getSupabaseVersion(),
        drizzle: this.getDrizzleVersion(),
        zenstack: this.getZenStackVersion(),
        shadcnui: this.getShadcnVersion(),
        radixui: this.getRadixVersion(),
      };

      // Remove undefined values
      Object.keys(versions).forEach(key => {
        if (versions[key] === undefined) {
          delete versions[key];
        }
      });

      return versions;
    } catch (error) {
      Logger.error(
        'Failed to detect versions:',
        error instanceof Error ? error : new Error(String(error))
      );
      return {
        nextjs: 'unknown',
        react: 'unknown',
      };
    }
  }

  private async loadPackageJson(): Promise<void> {
    const packageJsonPath = path.join(this.rootPath, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found');
    }

    const content = await fs.promises.readFile(packageJsonPath, 'utf8');
    this.packageJsonData = JSON.parse(content);
  }

  private getNextJsVersion(): string {
    const version = this.getPackageVersion('next');
    if (!version) return 'unknown';

    // Clean version string (remove ^ ~ >= etc.)
    const cleanVersion = version.replace(/[\^~>=<]/g, '');

    // Extract major.minor version
    const versionParts = cleanVersion.split('.');
    if (versionParts.length >= 2) {
      return `${versionParts[0]}.${versionParts[1]}`;
    }

    return cleanVersion;
  }

  private getTailwindVersion(): string | undefined {
    const version = this.getPackageVersion('tailwindcss');
    if (!version) return undefined;

    const cleanVersion = version.replace(/[\^~>=<]/g, '');
    const versionParts = cleanVersion.split('.');

    if (versionParts.length >= 1) {
      const major = parseInt(versionParts[0]);
      return major >= 4 ? 'v4' : 'v3';
    }

    return cleanVersion;
  }

  private getTypeScriptVersion(): string | undefined {
    return this.getPackageVersion('typescript') || this.getPackageVersion('@types/node');
  }

  private getTrpcVersion(): string | undefined {
    return (
      this.getPackageVersion('@trpc/server') ||
      this.getPackageVersion('@trpc/client') ||
      this.getPackageVersion('@trpc/next')
    );
  }

  private getClerkVersion(): string | undefined {
    return this.getPackageVersion('@clerk/nextjs') || this.getPackageVersion('@clerk/clerk-react');
  }

  private getSupabaseVersion(): string | undefined {
    return (
      this.getPackageVersion('@supabase/supabase-js') || this.getPackageVersion('@supabase/auth-js')
    );
  }

  private getDrizzleVersion(): string | undefined {
    return this.getPackageVersion('drizzle-orm') || this.getPackageVersion('drizzle-kit');
  }

  private getZenStackVersion(): string | undefined {
    return this.getPackageVersion('zenstack') || this.getPackageVersion('@zenstackhq/runtime');
  }

  private getShadcnVersion(): string | undefined {
    // shadcn/ui doesn't have a package, check for common shadcn dependencies
    const radixVersion = this.getRadixVersion();
    const classVarianceAuthority = this.getPackageVersion('class-variance-authority');
    const tailwindMerge = this.getPackageVersion('tailwind-merge');
    const clsx = this.getPackageVersion('clsx');

    if (radixVersion || classVarianceAuthority || tailwindMerge || clsx) {
      return 'detected';
    }
    return undefined;
  }

  private getRadixVersion(): string | undefined {
    const radixPackages = [
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-button',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-form',
      '@radix-ui/react-popover',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-toast',
    ];

    for (const pkg of radixPackages) {
      const version = this.getPackageVersion(pkg);
      if (version) return version;
    }
    return undefined;
  }

  private getPackageVersion(packageName: string): string | undefined {
    if (!this.packageJsonData) return undefined;

    return (
      this.packageJsonData.dependencies?.[packageName] ||
      this.packageJsonData.devDependencies?.[packageName] ||
      this.packageJsonData.peerDependencies?.[packageName]
    );
  }

  getPackageJson(): PackageJsonData | null {
    return this.packageJsonData;
  }

  isNextJs15OrLater(): boolean {
    const version = this.getNextJsVersion();
    if (version === 'unknown') return false;

    const majorVersion = parseInt(version.split('.')[0]);
    return majorVersion >= 15;
  }

  hasAppRouter(): boolean {
    const appDir = path.join(this.rootPath, 'app');
    const srcAppDir = path.join(this.rootPath, 'src', 'app');
    return fs.existsSync(appDir) || fs.existsSync(srcAppDir);
  }

  hasPagesRouter(): boolean {
    const pagesDir = path.join(this.rootPath, 'pages');
    const srcPagesDir = path.join(this.rootPath, 'src', 'pages');
    return fs.existsSync(pagesDir) || fs.existsSync(srcPagesDir);
  }

  hasSrcDirectory(): boolean {
    const srcDir = path.join(this.rootPath, 'src');
    return fs.existsSync(srcDir);
  }

  getRouterType(): 'app' | 'pages' | 'mixed' | 'unknown' {
    const hasApp = this.hasAppRouter();
    const hasPages = this.hasPagesRouter();

    if (hasApp && hasPages) return 'mixed';
    if (hasApp) return 'app';
    if (hasPages) return 'pages';
    return 'unknown';
  }

  getProjectStructureType(): string {
    const versions = this.detectVersions();
    const routerType = this.getRouterType();
    const isNext15 = this.isNextJs15OrLater();

    if (isNext15 && routerType === 'app') {
      return 'Next.js 15+ App Router';
    }

    if (routerType === 'app') {
      return 'Next.js App Router';
    }

    if (routerType === 'pages') {
      return 'Next.js Pages Router';
    }

    if (routerType === 'mixed') {
      return 'Next.js Mixed Router';
    }

    return 'Next.js Standard';
  }
}
