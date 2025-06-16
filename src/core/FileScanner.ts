import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { IgnoreService } from '../utils/IgnoreService';
import { SharedUtilities } from '../utils/SharedUtilities';
import {
  FileInfo,
  ContextStats,
  FileCategory,
  ProjectStructureType,
  ProjectDetectionResult,
  ProjectLibraries,
  ProjectCustomConfig,
  PackageManager,
  AuthLibrary,
  UILibrary,
  DatabaseProvider,
  APIPattern,
  TestingFramework,
  StateLibrary,
  RouterType,
  TailwindVersion,
  LIBRARY_PATTERNS,
  PACKAGE_MANAGERS,
} from './types';

export class FileScanner {
  private rootPath: string;
  private ignoreService: IgnoreService;
  private detectedProject?: ProjectDetectionResult;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.ignoreService = new IgnoreService(rootPath);
  }

  async scanAndProcessFiles(
    progress?: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<{ files: FileInfo[]; stats: ContextStats }> {
    const startTime = Date.now();

    progress?.report({
      increment: 5,
      message: 'Detecting project structure, router type, and libraries...',
    });
    this.detectedProject = await this.detectProjectStructure();

    progress?.report({ increment: 10, message: 'Scanning files...' });
    const files: FileInfo[] = [];
    await this.scanDirectory(this.rootPath, this.rootPath, files);

    progress?.report({ increment: 50, message: 'Processing and categorizing files...' });

    // Process files with enhanced categorization
    const processedFiles = files.map(file => {
      const { priority, category } = this.categorizeFile(file.path, file.content);
      const tokens = SharedUtilities.estimateTokens(file.content);
      const size = Buffer.byteLength(file.content, 'utf8');

      return {
        ...file,
        priority,
        category,
        tokens,
        size,
        projectStructure: this.detectedProject?.structureType,
        detectedLibraries: this.getFileRelevantLibraries(file.path),
      };
    });

    progress?.report({ increment: 30, message: 'Generating statistics...' });

    const stats = this.generateStats(processedFiles, startTime);

    progress?.report({ increment: 5, message: 'Complete!' });

    return {
      files: processedFiles.sort((a, b) => b.priority - a.priority),
      stats,
    };
  }

  private async detectProjectStructure(): Promise<ProjectDetectionResult> {
    const packageManager = this.detectPackageManager();
    const packageJson = this.parsePackageJson();
    const nextjsVersion = this.extractNextjsVersion(packageJson);

    const detectedLibraries = this.detectLibraries(packageJson);
    const customConfig = this.detectCustomConfig(packageJson);
    const structureType = this.determineStructureType(detectedLibraries, customConfig);
    const confidence = this.calculateConfidence(detectedLibraries, structureType);
    const recommendations = this.generateRecommendations(detectedLibraries, structureType);

    return {
      packageManager,
      nextjsVersion,
      structureType,
      confidence,
      detectedLibraries,
      customConfig,
      recommendations,
    };
  }

  private detectPackageManager(): PackageManager {
    for (const pm of PACKAGE_MANAGERS) {
      if (fs.existsSync(path.join(this.rootPath, pm.lockFile))) {
        return pm.type;
      }
    }
    return PackageManager.UNKNOWN;
  }

  private parsePackageJson(): any {
    const packageJsonPath = path.join(this.rootPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return {};
    }

    try {
      const content = fs.readFileSync(packageJsonPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Failed to parse package.json:', error);
      return {};
    }
  }

  private extractNextjsVersion(packageJson: any): string {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    return deps['next'] || 'unknown';
  }

  private detectLibraries(packageJson: any): ProjectLibraries {
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const depNames = Object.keys(allDeps);

    const auth: AuthLibrary[] = [];
    const ui: UILibrary[] = [];
    const database: DatabaseProvider[] = [];
    const api: APIPattern[] = [];
    const dataFetching: string[] = [];
    const styling: string[] = [];
    const testing: TestingFramework[] = [];
    const state: StateLibrary[] = [];
    const utilities: string[] = [];

    // Detect libraries based on patterns
    for (const pattern of LIBRARY_PATTERNS) {
      const hasDepMatch = pattern.dependencies.some(dep => depNames.includes(dep));
      const hasFileMatch = pattern.files.some(file =>
        fs.existsSync(path.join(this.rootPath, file))
      );
      const hasDirMatch = pattern.directories.some(dir =>
        fs.existsSync(path.join(this.rootPath, dir))
      );

      if (hasDepMatch || hasFileMatch || hasDirMatch) {
        switch (pattern.category) {
          case 'auth':
            this.addAuthLibrary(auth, pattern.name);
            break;
          case 'ui':
            this.addUILibrary(ui, pattern.name);
            break;
          case 'database':
            this.addDatabaseProvider(database, pattern.name);
            break;
          case 'api':
            this.addAPIPattern(api, pattern.name);
            break;
          case 'testing':
            this.addTestingFramework(testing, pattern.name);
            break;
          case 'utility':
            if (this.isStateLibrary(pattern.name)) {
              this.addStateLibrary(state, pattern.name);
            } else if (pattern.name.includes('Query') || pattern.name.includes('SWR')) {
              dataFetching.push(pattern.name);
            } else {
              utilities.push(pattern.name);
            }
            break;
          case 'styling':
            styling.push(pattern.name);
            break;
        }
      }
    }

    // Additional detection for specific libraries
    this.detectAdditionalLibraries(depNames, { dataFetching, styling, testing, utilities });

    return {
      auth,
      ui,
      database,
      api,
      dataFetching,
      styling,
      testing,
      state,
      utilities,
    };
  }

  private isStateLibrary(libraryName: string): boolean {
    const stateLibraries = ['Zustand', 'Redux Toolkit', 'Jotai', 'Valtio', 'Recoil', 'MobX'];
    return stateLibraries.includes(libraryName);
  }

  private addTestingFramework(testing: TestingFramework[], name: string): void {
    const testingMap: Record<string, TestingFramework> = {
      Jest: TestingFramework.JEST,
      Vitest: TestingFramework.VITEST,
      Playwright: TestingFramework.PLAYWRIGHT,
      Cypress: TestingFramework.CYPRESS,
      'Testing Library': TestingFramework.TESTING_LIBRARY,
      Storybook: TestingFramework.STORYBOOK,
    };

    const testingFramework = testingMap[name];
    if (testingFramework && !testing.includes(testingFramework)) {
      testing.push(testingFramework);
    }
  }

  private addStateLibrary(state: StateLibrary[], name: string): void {
    const stateMap: Record<string, StateLibrary> = {
      Zustand: StateLibrary.ZUSTAND,
      'Redux Toolkit': StateLibrary.REDUX_TOOLKIT,
      Jotai: StateLibrary.JOTAI,
      Valtio: StateLibrary.VALTIO,
      Recoil: StateLibrary.RECOIL,
      MobX: StateLibrary.MOBX,
    };

    const stateLibrary = stateMap[name];
    if (stateLibrary && !state.includes(stateLibrary)) {
      state.push(stateLibrary);
    }
  }

  private addAuthLibrary(auth: AuthLibrary[], name: string): void {
    const mapping: Record<string, AuthLibrary> = {
      'NextAuth.js': AuthLibrary.NEXTAUTH,
      Clerk: AuthLibrary.CLERK,
      'Better Auth': AuthLibrary.BETTER_AUTH,
      'Stack Auth': AuthLibrary.STACK_AUTH,
      Lucia: AuthLibrary.LUCIA,
    };

    const library = mapping[name];
    if (library && !auth.includes(library)) {
      auth.push(library);
    }
  }

  private addUILibrary(ui: UILibrary[], name: string): void {
    const mapping: Record<string, UILibrary> = {
      'shadcn/ui': UILibrary.SHADCN_UI,
      'Radix UI': UILibrary.RADIX_UI,
      'Headless UI': UILibrary.HEADLESS_UI,
      'Chakra UI': UILibrary.CHAKRA_UI,
      Mantine: UILibrary.MANTINE,
      'Ant Design': UILibrary.ANTD,
      'Material-UI': UILibrary.MATERIAL_UI,
      NextUI: UILibrary.NEXTUI,
    };

    const library = mapping[name];
    if (library && !ui.includes(library)) {
      ui.push(library);
    }
  }

  private addDatabaseProvider(database: DatabaseProvider[], name: string): void {
    const mapping: Record<string, DatabaseProvider> = {
      Prisma: DatabaseProvider.PRISMA,
      ZenStack: DatabaseProvider.ZENSTACK,
      Drizzle: DatabaseProvider.DRIZZLE,
      Supabase: DatabaseProvider.SUPABASE,
    };

    const provider = mapping[name];
    if (provider && !database.includes(provider)) {
      database.push(provider);
    }
  }

  private addAPIPattern(api: APIPattern[], name: string): void {
    const mapping: Record<string, APIPattern> = {
      tRPC: APIPattern.TRPC,
      GraphQL: APIPattern.GRAPHQL,
    };

    const pattern = mapping[name];
    if (pattern && !api.includes(pattern)) {
      api.push(pattern);
    }
  }

  private detectAdditionalLibraries(
    depNames: string[],
    collections: {
      dataFetching: string[];
      styling: string[];
      testing: TestingFramework[];
      utilities: string[];
    }
  ): void {
    // Data fetching libraries
    const dataFetchingPatterns = [
      { deps: ['swr'], name: 'SWR' },
      { deps: ['apollo-client', '@apollo/client'], name: 'Apollo Client' },
      { deps: ['relay-runtime'], name: 'Relay' },
      { deps: ['@tanstack/react-query-devtools'], name: 'React Query DevTools' },
    ];

    // Styling libraries
    const stylingPatterns = [
      { deps: ['styled-components'], name: 'Styled Components' },
      { deps: ['@emotion/react'], name: 'Emotion' },
      { deps: ['stitches', '@stitches/react'], name: 'Stitches' },
      { deps: ['vanilla-extract'], name: 'Vanilla Extract' },
      { deps: ['@tailwindcss/forms', '@tailwindcss/typography'], name: 'Tailwind Plugins' },
      { deps: ['postcss-preset-env'], name: 'PostCSS Preset Env' },
      { deps: ['autoprefixer'], name: 'Autoprefixer' },
    ];

    // Testing libraries
    const testingPatterns = [
      { deps: ['jest', '@jest/core'], name: 'Jest' },
      { deps: ['vitest'], name: 'Vitest' },
      { deps: ['@testing-library/react'], name: 'React Testing Library' },
      { deps: ['cypress'], name: 'Cypress' },
      { deps: ['playwright', '@playwright/test'], name: 'Playwright' },
      { deps: ['storybook', '@storybook/react'], name: 'Storybook' },
      { deps: ['chromatic'], name: 'Chromatic' },
    ];

    // Utility libraries
    const utilityPatterns = [
      { deps: ['zod'], name: 'Zod' },
      { deps: ['yup'], name: 'Yup' },
      { deps: ['react-hook-form'], name: 'React Hook Form' },
      { deps: ['formik'], name: 'Formik' },
      { deps: ['date-fns'], name: 'date-fns' },
      { deps: ['dayjs'], name: 'Day.js' },
      { deps: ['moment'], name: 'Moment.js' },
      { deps: ['lodash'], name: 'Lodash' },
      { deps: ['ramda'], name: 'Ramda' },
      { deps: ['clsx', 'classnames'], name: 'Class Utilities' },
      { deps: ['framer-motion'], name: 'Framer Motion' },
      { deps: ['lottie-react'], name: 'Lottie React' },
    ];

    const allPatterns = [
      { patterns: dataFetchingPatterns, collection: collections.dataFetching },
      { patterns: stylingPatterns, collection: collections.styling },
      { patterns: testingPatterns, collection: collections.testing },
      { patterns: utilityPatterns, collection: collections.utilities },
    ];

    for (const { patterns, collection } of allPatterns) {
      for (const pattern of patterns) {
        if (pattern.deps.some(dep => depNames.includes(dep))) {
          if (!collection.includes(pattern.name)) {
            collection.push(pattern.name);
          }
        }
      }
    }
  }

  private detectCustomConfig(packageJson: any): ProjectCustomConfig {
    // Detect router type
    const routerType = this.detectRouterType();

    // Detect Tailwind version
    const tailwindVersion = this.detectTailwindVersion(packageJson);

    // Detect Supabase
    const supabaseDetected = this.detectSupabase(packageJson);

    // Detect custom paths
    const prismaSchemaPath = this.findPrismaSchema();
    const zenstackSchemaPath = this.findZenStackSchema();
    const tailwindConfigPath = this.findTailwindConfig();

    return {
      prismaSchemaPath,
      zenstackSchemaPath,
      tailwindConfigPath,
      tailwindVersion,
      routerType,
      customPaths: {},
      workspaceRoot: this.rootPath,
      supabaseDetected,
      hasAppRouter: routerType === RouterType.APP_ROUTER || routerType === RouterType.MIXED,
      hasPagesRouter: routerType === RouterType.PAGES_ROUTER || routerType === RouterType.MIXED,
    };
  }

  private detectRouterType(): RouterType {
    const hasAppDir = fs.existsSync(path.join(this.rootPath, 'app'));
    const hasPagesDir = fs.existsSync(path.join(this.rootPath, 'pages'));

    if (hasAppDir && hasPagesDir) {
      return RouterType.MIXED;
    } else if (hasAppDir) {
      return RouterType.APP_ROUTER;
    } else if (hasPagesDir) {
      return RouterType.PAGES_ROUTER;
    }

    return RouterType.UNKNOWN;
  }

  private detectTailwindVersion(packageJson: any): TailwindVersion {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const tailwindVersion = deps['tailwindcss'];

    if (!tailwindVersion) {
      return TailwindVersion.UNKNOWN;
    }

    // Parse version string to detect v3 vs v4
    if (tailwindVersion.includes('4.') || tailwindVersion.includes('^4.')) {
      return TailwindVersion.V4;
    } else if (tailwindVersion.includes('3.') || tailwindVersion.includes('^3.')) {
      return TailwindVersion.V3;
    }

    return TailwindVersion.UNKNOWN;
  }

  private detectSupabase(packageJson: any): boolean {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    return Object.keys(deps).some(dep => dep.includes('supabase'));
  }

  private findPrismaSchema(): string | undefined {
    const possiblePaths = ['prisma/schema.prisma', 'schema.prisma', 'src/prisma/schema.prisma'];

    for (const schemaPath of possiblePaths) {
      if (fs.existsSync(path.join(this.rootPath, schemaPath))) {
        return schemaPath;
      }
    }

    return undefined;
  }

  private findZenStackSchema(): string | undefined {
    const possiblePaths = ['schema.zmodel', 'prisma/schema.zmodel', 'src/schema.zmodel'];

    for (const schemaPath of possiblePaths) {
      if (fs.existsSync(path.join(this.rootPath, schemaPath))) {
        return schemaPath;
      }
    }

    return undefined;
  }

  private findTailwindConfig(): string | undefined {
    const possiblePaths = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs'];

    for (const configPath of possiblePaths) {
      if (fs.existsSync(path.join(this.rootPath, configPath))) {
        return configPath;
      }
    }

    return undefined;
  }

  private determineStructureType(
    libraries: ProjectLibraries,
    config: ProjectCustomConfig
  ): ProjectStructureType {
    // T3 Stack detection
    if (
      libraries.api.includes(APIPattern.TRPC) &&
      libraries.database.includes(DatabaseProvider.PRISMA) &&
      libraries.auth.includes(AuthLibrary.NEXTAUTH)
    ) {
      return ProjectStructureType.T3_STACK;
    }

    // ZenStack detection
    if (libraries.database.includes(DatabaseProvider.ZENSTACK)) {
      return ProjectStructureType.NEXTJS_WITH_ZENSTACK;
    }

    // Supabase detection
    if (libraries.database.includes(DatabaseProvider.SUPABASE)) {
      return ProjectStructureType.NEXTJS_WITH_SUPABASE;
    }

    // tRPC detection
    if (libraries.api.includes(APIPattern.TRPC)) {
      return ProjectStructureType.NEXTJS_WITH_TRPC;
    }

    // Prisma detection
    if (libraries.database.includes(DatabaseProvider.PRISMA)) {
      return ProjectStructureType.NEXTJS_WITH_PRISMA;
    }

    // Enterprise detection (multiple auth, UI, database solutions)
    if (
      libraries.auth.length > 1 ||
      libraries.ui.length > 2 ||
      libraries.database.length > 1 ||
      config.monorepoType
    ) {
      return ProjectStructureType.ENTERPRISE_NEXTJS;
    }

    return ProjectStructureType.STANDARD_NEXTJS;
  }

  private calculateConfidence(
    libraries: ProjectLibraries,
    structureType: ProjectStructureType
  ): number {
    let confidence = 50; // Base confidence

    // Add confidence based on detected libraries
    confidence += libraries.auth.length * 10;
    confidence += libraries.ui.length * 8;
    confidence += libraries.database.length * 15;
    confidence += libraries.api.length * 12;
    confidence += libraries.dataFetching.length * 5;

    // Adjust based on structure type
    switch (structureType) {
      case ProjectStructureType.T3_STACK:
        confidence += 20;
        break;
      case ProjectStructureType.NEXTJS_WITH_ZENSTACK:
        confidence += 15;
        break;
      case ProjectStructureType.ENTERPRISE_NEXTJS:
        confidence += 10;
        break;
    }

    return Math.min(confidence, 100);
  }

  private generateRecommendations(
    libraries: ProjectLibraries,
    structureType: ProjectStructureType
  ): string[] {
    const recommendations: string[] = [];

    if (structureType === ProjectStructureType.T3_STACK) {
      recommendations.push('Focus on tRPC procedures, Prisma schema, and NextAuth configuration');
      recommendations.push('Include T3 environment configuration and server setup');
    }

    if (libraries.database.includes(DatabaseProvider.ZENSTACK)) {
      recommendations.push('Include ZenStack schema files and generated types');
      recommendations.push('Consider access control policies and data model definitions');
    }

    if (libraries.database.includes(DatabaseProvider.PRISMA)) {
      recommendations.push('Include Prisma schema and migration files');
    }

    if (libraries.ui.includes(UILibrary.SHADCN_UI)) {
      recommendations.push('Include shadcn/ui components and configuration');
    }

    if (libraries.auth.includes(AuthLibrary.CLERK)) {
      recommendations.push('Include Clerk authentication setup and middleware');
    }

    if (libraries.dataFetching.includes('TanStack Query')) {
      recommendations.push('Include query client configuration and query definitions');
    }

    if (libraries.styling.includes('Tailwind CSS')) {
      recommendations.push('Include Tailwind configuration and custom styles');
    }

    return recommendations;
  }

  private getFileRelevantLibraries(filePath: string): string[] {
    const libraries: string[] = [];
    const lowerPath = filePath.toLowerCase();

    // Check which libraries are relevant to this file
    if (lowerPath.includes('prisma/')) {
      libraries.push('Prisma');
    }
    if (lowerPath.includes('schema.zmodel')) {
      libraries.push('ZenStack');
    }
    if (lowerPath.includes('trpc') || lowerPath.includes('api/')) {
      libraries.push('tRPC');
    }
    if (lowerPath.includes('auth')) {
      libraries.push('Authentication');
    }
    if (lowerPath.includes('ui/') || lowerPath.includes('components/')) {
      libraries.push('UI Components');
    }
    if (lowerPath.includes('tailwind')) {
      libraries.push('Tailwind CSS');
    }
    if (lowerPath.includes('query') || lowerPath.includes('mutation')) {
      libraries.push('Data Fetching');
    }

    return libraries;
  }

  private async scanDirectory(dirPath: string, rootPath: string, files: FileInfo[]): Promise<void> {
    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);

        if (this.ignoreService.shouldIgnore(relativePath)) {
          continue;
        }

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, rootPath, files);
        } else if (entry.isFile() && this.shouldIncludeFile(entry.name, relativePath)) {
          try {
            const content = await fs.promises.readFile(fullPath, 'utf8');
            const stats = await fs.promises.stat(fullPath);

            files.push({
              path: relativePath,
              content,
              priority: 0, // Will be set during categorization
              category: FileCategory.OTHER_FILES, // Will be set during categorization
              tokens: 0, // Will be calculated during processing
              size: 0, // Will be calculated during processing
              lastModified: stats.mtime,
              isClientComponent:
                content.includes("'use client'") || content.includes('"use client"'),
            });
          } catch (error) {
            console.warn(`Failed to read file ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dirPath}:`, error);
    }
  }

  private shouldIncludeFile(fileName: string, _relativePath: string): boolean {
    const ext = SharedUtilities.getFileExtension(fileName);
    const allowedExtensions = [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.mjs',
      '.cjs',
      '.json',
      '.md',
      '.mdx',
      '.css',
      '.scss',
      '.sass',
      '.less',
      '.prisma',
      '.zmodel',
      '.sql',
      '.env.example',
      '.env.local.example',
      '.yml',
      '.yaml',
      '.toml',
      '.lock',
    ];

    // Special files to include
    const specialFiles = [
      // Next.js configs
      'next.config.js',
      'next.config.mjs',
      'next.config.ts',
      // Styling configs
      'tailwind.config.js',
      'tailwind.config.ts',
      'tailwind.config.mjs',
      'postcss.config.js',
      'postcss.config.mjs',
      'postcss.config.cjs',
      // Build configs
      'middleware.ts',
      'middleware.js',
      'instrumentation.ts',
      'instrumentation.js',
      // Database configs
      'drizzle.config.ts',
      'drizzle.config.js',
      'schema.prisma',
      'schema.zmodel',
      // Package manager configs
      'pnpm-workspace.yaml',
      '.yarnrc.yml',
      'bunfig.toml',
      // UI library configs
      'components.json',
      'theme.ts',
      'theme.js',
      // Other configs
      'turbo.json',
      'lerna.json',
      'rush.json',
    ];

    if (specialFiles.includes(fileName)) {
      return true;
    }

    return allowedExtensions.includes(ext);
  }

  private categorizeFile(
    relativePath: string,
    content: string
  ): { priority: number; category: FileCategory } {
    const lowerPath = relativePath.toLowerCase();
    const fileName = path.basename(relativePath);
    const isClientComponent = content.includes("'use client'") || content.includes('"use client"');

    // Get detected router type to avoid confusion
    const routerType = this.detectedProject?.customConfig?.routerType || RouterType.UNKNOWN;

    // A: Core Configurations (Priority 80-100)
    if (lowerPath.includes('next.config.')) {
      return { priority: 100, category: FileCategory.CORE_CONFIGURATIONS };
    }
    if (fileName === 'package.json') {
      return { priority: 95, category: FileCategory.CORE_CONFIGURATIONS };
    }
    if (lowerPath.includes('tsconfig.json') || lowerPath.includes('jsconfig.json')) {
      return { priority: 90, category: FileCategory.CORE_CONFIGURATIONS };
    }
    if (lowerPath.includes('middleware.')) {
      return { priority: 88, category: FileCategory.CORE_CONFIGURATIONS };
    }
    if (lowerPath.includes('instrumentation.')) {
      return { priority: 85, category: FileCategory.CORE_CONFIGURATIONS };
    }

    // T3 Stack and modern Next.js patterns (Priority 82-87)
    if (lowerPath.includes('src/env.') || fileName === 'env.mjs' || fileName === 'env.js') {
      return { priority: 87, category: FileCategory.CORE_CONFIGURATIONS };
    }

    // Database configurations (Priority 75-85)
    if (lowerPath.includes('schema.zmodel') || lowerPath.includes('.zmodel')) {
      return { priority: 85, category: FileCategory.ZENSTACK_SCHEMA };
    }
    if (lowerPath.includes('prisma/schema.prisma') || fileName === 'schema.prisma') {
      return { priority: 83, category: FileCategory.DATABASE_SCHEMA };
    }
    if (lowerPath.includes('drizzle.config.')) {
      return { priority: 81, category: FileCategory.DATABASE_SCHEMA };
    }

    // Authentication configurations (Priority 75-82)
    if (lowerPath.includes('src/server/auth.') || lowerPath.includes('src/lib/auth.')) {
      return { priority: 82, category: FileCategory.NEXTAUTH_CONFIG };
    }
    if (
      lowerPath.includes('clerk') &&
      (lowerPath.includes('middleware') || lowerPath.includes('config'))
    ) {
      return { priority: 80, category: FileCategory.CLERK_CONFIG };
    }
    if (lowerPath.includes('supabase') && lowerPath.includes('auth')) {
      return { priority: 78, category: FileCategory.SUPABASE_AUTH };
    }
    if (lowerPath.includes('pages/api/auth/') || lowerPath.includes('app/api/auth/')) {
      return { priority: 76, category: FileCategory.NEXTAUTH_CONFIG };
    }

    // API Layer configurations (Priority 70-80)
    if (lowerPath.includes('src/server/api/trpc.')) {
      return { priority: 80, category: FileCategory.TRPC_PROCEDURES };
    }
    if (lowerPath.includes('src/server/api/routers/')) {
      return { priority: 78, category: FileCategory.TRPC_PROCEDURES };
    }
    if (lowerPath.includes('src/server/api/root.')) {
      return { priority: 76, category: FileCategory.TRPC_PROCEDURES };
    }
    if (lowerPath.includes('graphql/schema') || lowerPath.includes('schema.graphql')) {
      return { priority: 75, category: FileCategory.GRAPHQL_SCHEMA };
    }
    if (lowerPath.includes('src/utils/api.') || lowerPath.includes('src/lib/api.')) {
      return { priority: 72, category: FileCategory.TRPC_PROCEDURES };
    }

    // UI & Styling configurations (Priority 65-75)
    if (lowerPath.includes('tailwind.config.') || lowerPath.includes('postcss.config.')) {
      return { priority: 75, category: FileCategory.TAILWIND_CONFIG };
    }
    if (fileName === 'components.json' || lowerPath.includes('ui.config')) {
      return { priority: 73, category: FileCategory.UI_COMPONENTS };
    }
    if (lowerPath.includes('theme.') && (lowerPath.includes('.ts') || lowerPath.includes('.js'))) {
      return { priority: 70, category: FileCategory.DESIGN_SYSTEM };
    }

    // Router-specific categorization (avoid showing both app and pages categories)
    // App Router Structure (Priority 60-75) - Only if app router is detected
    if (routerType === RouterType.APP_ROUTER || routerType === RouterType.MIXED) {
      if (
        lowerPath.includes('app/') &&
        (lowerPath.includes('layout.') || lowerPath.includes('page.'))
      ) {
        return { priority: 74, category: FileCategory.APP_ROUTER_STRUCTURE };
      }
      if (
        lowerPath.includes('app/') &&
        (lowerPath.includes('loading.') ||
          lowerPath.includes('error.') ||
          lowerPath.includes('not-found.'))
      ) {
        return { priority: 72, category: FileCategory.APP_ROUTER_STRUCTURE };
      }
      if (lowerPath.includes('app/') && lowerPath.includes('route.')) {
        return { priority: 70, category: FileCategory.APP_ROUTER_STRUCTURE };
      }
      if (
        lowerPath.includes('app/') &&
        (lowerPath.includes('template.') || lowerPath.includes('global-error.'))
      ) {
        return { priority: 68, category: FileCategory.APP_ROUTER_STRUCTURE };
      }
    }

    // Pages Router Structure (Priority 65-72) - Only if pages router is detected
    if (routerType === RouterType.PAGES_ROUTER || routerType === RouterType.MIXED) {
      if (lowerPath.includes('pages/_app.') || lowerPath.includes('pages/_document.')) {
        return { priority: 72, category: FileCategory.PAGES_ROUTER_STRUCTURE };
      }
      if (lowerPath.includes('pages/api/') && !lowerPath.includes('auth/')) {
        return { priority: 70, category: FileCategory.REST_API_ROUTES };
      }
      if (lowerPath.includes('pages/')) {
        return { priority: 65, category: FileCategory.PAGES_ROUTER_STRUCTURE };
      }
    }

    // Fallback for unknown router type - detect based on file paths
    if (routerType === RouterType.UNKNOWN) {
      if (
        lowerPath.includes('app/') &&
        (lowerPath.includes('layout.') || lowerPath.includes('page.'))
      ) {
        return { priority: 74, category: FileCategory.APP_ROUTER_STRUCTURE };
      }
      if (lowerPath.includes('pages/') && !lowerPath.includes('api/')) {
        return { priority: 65, category: FileCategory.PAGES_ROUTER_STRUCTURE };
      }
    }

    // Database & Data Layer (Priority 55-70)
    if (
      lowerPath.includes('prisma/') &&
      (lowerPath.includes('seed') || lowerPath.includes('migration'))
    ) {
      return { priority: 68, category: FileCategory.DATABASE_SCHEMA };
    }
    if (lowerPath.includes('src/server/db.') || lowerPath.includes('src/lib/db.')) {
      return { priority: 65, category: FileCategory.DATABASE_SCHEMA };
    }
    if (lowerPath.includes('drizzle/') || lowerPath.includes('migrations/')) {
      return { priority: 62, category: FileCategory.DATABASE_SCHEMA };
    }

    // Data Fetching (Priority 55-60)
    if (
      lowerPath.includes('query') ||
      lowerPath.includes('mutation') ||
      lowerPath.includes('react-query')
    ) {
      return { priority: 58, category: FileCategory.DATA_FETCHING };
    }
    if (lowerPath.includes('swr') || lowerPath.includes('apollo')) {
      return { priority: 55, category: FileCategory.DATA_FETCHING };
    }

    // API Services (Priority 50-58)
    if (lowerPath.includes('src/server/') && !lowerPath.includes('api/')) {
      return { priority: 58, category: FileCategory.API_LAYER };
    }
    if (lowerPath.includes('services/') || lowerPath.includes('api/')) {
      return { priority: 55, category: FileCategory.API_LAYER };
    }

    // Tests (Priority 25-30) - Check BEFORE components to avoid conflicts
    if (
      lowerPath.includes('.test.') ||
      lowerPath.includes('.spec.') ||
      lowerPath.includes('__tests__/')
    ) {
      return { priority: 28, category: FileCategory.TESTS };
    }
    if (
      lowerPath.includes('cypress/') ||
      lowerPath.includes('playwright/') ||
      lowerPath.includes('e2e/')
    ) {
      return { priority: 25, category: FileCategory.TESTS };
    }

    // Components (Priority 48-55)
    if (lowerPath.includes('components/ui/') || lowerPath.includes('src/components/ui/')) {
      return {
        priority: isClientComponent ? 55 : 52,
        category: isClientComponent
          ? FileCategory.CLIENT_COMPONENTS
          : FileCategory.SERVER_COMPONENTS,
      };
    }
    if (
      lowerPath.includes('component') ||
      lowerPath.includes('/ui/') ||
      lowerPath.includes('src/components/')
    ) {
      return {
        priority: isClientComponent ? 52 : 50,
        category: isClientComponent
          ? FileCategory.CLIENT_COMPONENTS
          : FileCategory.SERVER_COMPONENTS,
      };
    }

    // Hooks & Utilities (Priority 45-50)
    if (
      lowerPath.includes('hook') ||
      (fileName.startsWith('use') && (fileName.endsWith('.ts') || fileName.endsWith('.tsx')))
    ) {
      return { priority: 50, category: FileCategory.HOOKS_UTILITIES };
    }
    if (
      lowerPath.includes('util') ||
      lowerPath.includes('helper') ||
      lowerPath.includes('src/lib/')
    ) {
      return { priority: 45, category: FileCategory.HOOKS_UTILITIES };
    }

    // State Management (Priority 40-45) - Enhanced detection
    if (
      lowerPath.includes('store') ||
      lowerPath.includes('context') ||
      lowerPath.includes('reducer')
    ) {
      return { priority: 42, category: FileCategory.STATE_MANAGEMENT };
    }
    if (
      lowerPath.includes('zustand') ||
      lowerPath.includes('redux') ||
      lowerPath.includes('jotai') ||
      lowerPath.includes('valtio') ||
      lowerPath.includes('recoil') ||
      lowerPath.includes('mobx')
    ) {
      return { priority: 40, category: FileCategory.STATE_MANAGEMENT };
    }

    // Styling (Priority 30-40)
    if (lowerPath.includes('globals.css') || lowerPath.includes('global.css')) {
      return { priority: 38, category: FileCategory.STYLING };
    }
    if (lowerPath.includes('.css') || lowerPath.includes('.scss') || lowerPath.includes('.sass')) {
      return { priority: 32, category: FileCategory.STYLING };
    }

    // Configuration files (Priority 18-25)
    if (lowerPath.includes('.env.example') || lowerPath.includes('config/')) {
      return { priority: 22, category: FileCategory.ENV_CONFIG };
    }
    if (
      lowerPath.includes('pnpm-workspace') ||
      lowerPath.includes('.yarnrc') ||
      lowerPath.includes('bunfig')
    ) {
      return { priority: 21, category: FileCategory.PACKAGE_CONFIG };
    }
    if (
      lowerPath.includes('docker') ||
      lowerPath.includes('vercel.json') ||
      lowerPath.includes('.github/')
    ) {
      return { priority: 20, category: FileCategory.BUILD_CONFIG };
    }

    // Documentation (Priority 15-18)
    if (lowerPath.includes('.md') || lowerPath.includes('.mdx')) {
      return { priority: 16, category: FileCategory.DOCUMENTATION };
    }

    // TypeScript/JavaScript files (Priority 12-15)
    if (
      lowerPath.includes('.ts') ||
      lowerPath.includes('.tsx') ||
      lowerPath.includes('.js') ||
      lowerPath.includes('.jsx')
    ) {
      return { priority: 12, category: FileCategory.TYPESCRIPT_FILES };
    }

    // Other files (Priority 10)
    return { priority: 10, category: FileCategory.OTHER_FILES };
  }

  // Removed redundant estimateTokens method - now using SharedUtilities.estimateTokens

  private generateStats(files: FileInfo[], startTime: number): ContextStats {
    const categories: Record<string, number> = {};
    let totalTokens = 0;
    let totalSize = 0;

    files.forEach(file => {
      categories[file.category] = (categories[file.category] || 0) + 1;
      totalTokens += file.tokens;
      totalSize += file.size;
    });

    // Generate detected features with proper mapping
    const detectedFeatures: string[] = [];

    if (this.detectedProject) {
      const { detectedLibraries, structureType } = this.detectedProject;

      // Add structure type
      if (structureType === ProjectStructureType.T3_STACK) {
        detectedFeatures.push('T3 Stack');
      }

      // Map library enums to user-friendly names
      detectedLibraries.auth.forEach(auth => {
        switch (auth) {
          case AuthLibrary.NEXTAUTH:
            detectedFeatures.push('NextAuth.js');
            break;
          case AuthLibrary.CLERK:
            detectedFeatures.push('Clerk');
            break;
          // Add other auth libraries as needed
        }
      });

      detectedLibraries.database.forEach(db => {
        switch (db) {
          case DatabaseProvider.PRISMA:
            detectedFeatures.push('Prisma ORM');
            break;
          case DatabaseProvider.ZENSTACK:
            detectedFeatures.push('ZenStack');
            break;
          case DatabaseProvider.DRIZZLE:
            detectedFeatures.push('Drizzle ORM');
            break;
          case DatabaseProvider.SUPABASE:
            detectedFeatures.push('Supabase');
            break;
        }
      });

      detectedLibraries.api.forEach(api => {
        switch (api) {
          case APIPattern.TRPC:
            detectedFeatures.push('tRPC');
            break;
          case APIPattern.GRAPHQL:
            detectedFeatures.push('GraphQL');
            break;
        }
      });

      detectedLibraries.ui.forEach(ui => {
        switch (ui) {
          case UILibrary.SHADCN_UI:
            detectedFeatures.push('shadcn/ui');
            break;
          case UILibrary.RADIX_UI:
            detectedFeatures.push('Radix UI');
            break;
          case UILibrary.HEADLESS_UI:
            detectedFeatures.push('Headless UI');
            break;
          case UILibrary.CHAKRA_UI:
            detectedFeatures.push('Chakra UI');
            break;
          case UILibrary.MANTINE:
            detectedFeatures.push('Mantine');
            break;
          case UILibrary.ANTD:
            detectedFeatures.push('Ant Design');
            break;
          case UILibrary.MATERIAL_UI:
            detectedFeatures.push('Material-UI');
            break;
          case UILibrary.NEXTUI:
            detectedFeatures.push('NextUI');
            break;
        }
      });

      // Add styling libraries
      detectedLibraries.styling.forEach(style => {
        detectedFeatures.push(style);
      });

      // Add data fetching libraries
      detectedLibraries.dataFetching.forEach(df => {
        detectedFeatures.push(df);
      });

      // Add basic project info
      detectedFeatures.push(`Next.js ${this.detectedProject.nextjsVersion}`);
      detectedFeatures.push(`Package Manager: ${this.detectedProject.packageManager}`);
    }

    return {
      totalFiles: files.length,
      totalTokens,
      totalSize,
      categories,
      generatedAt: new Date(),
      processingTime: Date.now() - startTime,
      projectDetection: this.detectedProject,
      detectedFeatures,
    };
  }
}
