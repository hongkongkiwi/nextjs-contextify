import * as vscode from 'vscode';

// Enums for better type safety
export enum OutputFormat {
  XML = 'xml',
  MARKDOWN = 'markdown',
  JSON = 'json',
}

export enum TargetLLM {
  CLAUDE = 'claude',
  GPT = 'gpt',
  GEMINI = 'gemini',
  DEEPSEEK = 'deepseek',
  GROK = 'grok',
  CUSTOM = 'custom',
}

export enum FileCategory {
  // Core configurations (Priority 80-100)
  CORE_CONFIGURATIONS = 'A: Core Configurations',

  // App Router structure (Priority 60-80)
  APP_ROUTER_STRUCTURE = 'B: App Router Structure',

  // Pages Router structure (Priority 68-78)
  PAGES_ROUTER_STRUCTURE = 'C: Pages Router Structure',

  // Components (Priority 50-55)
  CLIENT_COMPONENTS = 'D: Client Components',
  SERVER_COMPONENTS = 'D: Server Components',

  // Hooks & Utilities (Priority 45-48)
  HOOKS_UTILITIES = 'E: Hooks & Utilities',

  // Data Layer (Priority 35-50)
  DATABASE_SCHEMA = 'F1: Database Schema & Migrations',
  ZENSTACK_SCHEMA = 'F2: ZenStack Schema & Models',
  STATE_MANAGEMENT = 'F3: State Management',
  API_LAYER = 'F4: API Layer & Services',
  DATA_FETCHING = 'F5: Data Fetching & Queries',

  // API & Routes (Priority 40-55)
  TRPC_PROCEDURES = 'G1: tRPC Procedures',
  REST_API_ROUTES = 'G2: REST API Routes',
  GRAPHQL_SCHEMA = 'G3: GraphQL Schema & Resolvers',
  WEBSOCKET_HANDLERS = 'G4: WebSocket Handlers',

  // Authentication (Priority 45-50)
  NEXTAUTH_CONFIG = 'H1: NextAuth Configuration',
  CLERK_CONFIG = 'H2: Clerk Authentication',
  SUPABASE_AUTH = 'H3: Supabase Authentication',
  FIREBASE_AUTH = 'H4: Firebase Authentication',
  CUSTOM_AUTH = 'H5: Custom Authentication',

  // UI & Styling (Priority 30-40)
  UI_COMPONENTS = 'I1: UI Library Components',
  TAILWIND_CONFIG = 'I2: Tailwind & Styling Config',
  STYLING = 'I3: Styling Files',
  DESIGN_SYSTEM = 'I4: Design System & Tokens',

  // Testing (Priority 25-30)
  TESTS = 'J: Tests & Testing Utils',

  // Configuration & Environment (Priority 20-25)
  ENV_CONFIG = 'K1: Environment & Config',
  BUILD_CONFIG = 'K2: Build & Deployment Config',
  PACKAGE_CONFIG = 'K3: Package Manager Config',

  // Documentation & Other (Priority 10-20)
  DOCUMENTATION = 'L1: Documentation',
  TYPESCRIPT_FILES = 'L2: TypeScript/JavaScript Files',
  OTHER_FILES = 'L3: Other Files',
}

// Enhanced project structure types
export enum ProjectStructureType {
  STANDARD_NEXTJS = 'standard',
  T3_STACK = 't3',
  NEXTJS_WITH_PRISMA = 'nextjs-prisma',
  NEXTJS_WITH_ZENSTACK = 'nextjs-zenstack',
  NEXTJS_WITH_TRPC = 'nextjs-trpc',
  NEXTJS_WITH_SUPABASE = 'nextjs-supabase',
  NEXTJS_WITH_FIREBASE = 'nextjs-firebase',
  ENTERPRISE_NEXTJS = 'enterprise',
  CUSTOM = 'custom',
}

export enum PackageManager {
  NPM = 'npm',
  YARN = 'yarn',
  PNPM = 'pnpm',
  BUN = 'bun',
  UNKNOWN = 'unknown',
}

export enum AuthLibrary {
  NEXTAUTH = 'next-auth',
  AUTH_JS = 'auth.js',
  CLERK = 'clerk',
  SUPABASE = 'supabase',
  FIREBASE = 'firebase',
  BETTER_AUTH = 'better-auth',
  STACK_AUTH = 'stack-auth',
  LUCIA = 'lucia',
  AUTH0 = 'auth0',
  CUSTOM = 'custom',
}

export enum UILibrary {
  // Popular UI Libraries
  SHADCN_UI = 'shadcn-ui',
  MATERIAL_UI = 'material-ui',
  TAILWIND_CSS = 'tailwind-css',
  CHAKRA_UI = 'chakra-ui',
  ANTD = 'antd',
  RADIX_UI = 'radix-ui',
  NEXTUI = 'nextui',
  HEROUI = 'heroui',

  // Additional UI Libraries
  RSUITE = 'rsuite',
  FLOWBITE = 'flowbite',
  ONEUI = 'oneui',
  HIMALAYA_UI = 'himalaya-ui',
  METRO_UI = 'metro-ui',
  EVERGREEN = 'evergreen',
  REBASS = 'rebass',
  DAISYUI = 'daisyui',

  // Specialized/Modern Libraries
  V0_BY_VERCEL = 'v0-by-vercel',
  MAGIC_UI = 'magic-ui',
  SUPABASE_UI = 'supabase-ui',
  PRELINE = 'preline',
  DYNAUI = 'dynaui',
  FRANKENUI = 'frankenui',
  KOKONUTUI = 'kokonutui',
  KENDO_REACT = 'kendo-react',
  SAAS_UI = 'saas-ui',

  // Headless UI
  HEADLESS_UI = 'headless-ui',
  MANTINE = 'mantine',
  CUSTOM = 'custom',
}

export enum StateLibrary {
  ZUSTAND = 'zustand',
  REDUX_TOOLKIT = 'redux-toolkit',
  REDUX = 'redux',
  JOTAI = 'jotai',
  VALTIO = 'valtio',
  RECOIL = 'recoil',
  MOBX = 'mobx',
  CONTEXT_API = 'context-api',
  SWR = 'swr',
  REACT_QUERY = 'react-query',
  CUSTOM = 'custom',
}

export enum TailwindVersion {
  V3 = 'v3',
  V4 = 'v4',
  UNKNOWN = 'unknown',
}

export enum RouterType {
  APP_ROUTER = 'app-router',
  PAGES_ROUTER = 'pages-router',
  MIXED = 'mixed',
  UNKNOWN = 'unknown',
}

export enum TestingFramework {
  JEST = 'jest',
  VITEST = 'vitest',
  PLAYWRIGHT = 'playwright',
  CYPRESS = 'cypress',
  TESTING_LIBRARY = 'testing-library',
  STORYBOOK = 'storybook',
  CHROMATIC = 'chromatic',
  CUSTOM = 'custom',
}

export enum DatabaseProvider {
  PRISMA = 'prisma',
  ZENSTACK = 'zenstack',
  DRIZZLE = 'drizzle',
  SUPABASE = 'supabase',
  FIREBASE = 'firebase',
  MONGODB = 'mongodb',
  PLANETSCALE = 'planetscale',
  CUSTOM = 'custom',
}

export enum APIPattern {
  TRPC = 'trpc',
  REST = 'rest',
  GRAPHQL = 'graphql',
  WEBSOCKET = 'websocket',
  SERVER_ACTIONS = 'server-actions',
  CUSTOM = 'custom',
}

// Core data structures
export interface FileInfo {
  readonly path: string;
  readonly content: string;
  readonly priority: number;
  readonly category: FileCategory;
  readonly tokens: number;
  readonly size: number;
  readonly lastModified?: Date;
  readonly isClientComponent?: boolean;
  readonly projectStructure?: ProjectStructureType;
  readonly detectedLibraries?: readonly string[];
}

export interface ProjectDetectionResult {
  readonly packageManager: PackageManager;
  readonly nextjsVersion: string;
  readonly structureType: ProjectStructureType;
  readonly confidence: number;
  readonly detectedLibraries: ProjectLibraries;
  readonly customConfig: ProjectCustomConfig;
  readonly recommendations: readonly string[];
}

export interface ProjectLibraries {
  readonly auth: readonly AuthLibrary[];
  readonly ui: readonly UILibrary[];
  readonly database: readonly DatabaseProvider[];
  readonly api: readonly APIPattern[];
  readonly dataFetching: readonly string[];
  readonly styling: readonly string[];
  readonly testing: readonly TestingFramework[];
  readonly state: readonly StateLibrary[];
  readonly utilities: readonly string[];
}

export interface ProjectCustomConfig {
  readonly prismaSchemaPath?: string;
  readonly zenstackSchemaPath?: string;
  readonly tailwindConfigPath?: string;
  readonly tailwindVersion?: TailwindVersion;
  readonly routerType?: RouterType;
  readonly customPaths: Record<string, string>;
  readonly workspaceRoot?: string;
  readonly monorepoType?: string;
  readonly supabaseDetected?: boolean;
  readonly hasAppRouter?: boolean;
  readonly hasPagesRouter?: boolean;
}

export interface ContextStats {
  readonly totalFiles: number;
  readonly totalTokens: number;
  readonly totalSize: number;
  readonly categories: Readonly<Record<string, number>>;
  readonly generatedAt: Date;
  readonly processingTime?: number;
  readonly projectDetection?: ProjectDetectionResult;
  readonly detectedFeatures?: readonly string[];
  readonly versions?: any; // PackageVersions from VersionDetector
  readonly projectStructure?: any; // ProjectStructure from ProjectStructureDetector  
  readonly environmentAnalysis?: any; // EnvironmentAnalysis from EnvironmentDetector
}

// Generation options
export interface GenerationOptions {
  readonly format: OutputFormat;
  readonly includePrompts: boolean;
  readonly maxTokens?: number;
  readonly targetLLM: TargetLLM;
  readonly includeMetadata?: boolean;
  readonly sortByPriority?: boolean;
  readonly includeTests?: boolean;
  readonly includePrisma?: boolean;
  readonly includeZenStack?: boolean;
  readonly includeEnvFiles?: boolean;
  readonly includeUILibraries?: boolean;
  readonly includeAuthConfig?: boolean;
  readonly includeDataFetching?: boolean;
}

export interface UIGenerationOptions extends GenerationOptions {
  readonly selectedFiles?: readonly string[];
  readonly userPrompt?: string;
  readonly rules?: readonly string[];
  readonly selectedPrompt?: string;
  readonly customIgnorePatterns?: readonly string[];
}

// Enhanced configuration
export interface ExtensionConfig {
  readonly defaultFormat: OutputFormat;
  readonly defaultLLM: TargetLLM;
  readonly includePrompts: boolean;
  readonly autoOpenOutput: boolean;
  readonly maxFileSize?: number;
  readonly customIgnorePatterns?: readonly string[];
  readonly includeTests?: boolean;
  readonly includePrisma?: boolean;
  readonly includeZenStack?: boolean;
  readonly includeEnvFiles?: boolean;
  readonly includeUILibraries?: boolean;
  readonly includeAuthConfig?: boolean;
  readonly includeDataFetching?: boolean;
  readonly detectProjectStructure?: boolean;
  readonly autoDetectPackageManager?: boolean;
  readonly respectWorkspaceConfig?: boolean;
}

// Library detection patterns
export interface LibraryPattern {
  readonly name: string;
  readonly category: 'auth' | 'ui' | 'database' | 'api' | 'styling' | 'testing' | 'utility';
  readonly dependencies: readonly string[];
  readonly files: readonly string[];
  readonly directories: readonly string[];
  readonly configKeys?: readonly string[];
  readonly priority: number;
}

// Package manager detection
export interface PackageManagerInfo {
  readonly type: PackageManager;
  readonly lockFile: string;
  readonly configFile: string;
  readonly installCommand: string;
  readonly runCommand: string;
  readonly detected: boolean;
}

// Enhanced project structure detector
export interface ProjectStructureDetector {
  readonly type: ProjectStructureType;
  readonly confidence: number;
  readonly features: readonly string[];
  readonly libraries: ProjectLibraries;
  readonly packageManager: PackageManager;
  readonly nextjsVersion: string;
  readonly customConfig: ProjectCustomConfig;
  readonly recommendations?: readonly string[];
  readonly warnings?: readonly string[];
}

// Library detection configurations
export const LIBRARY_PATTERNS: LibraryPattern[] = [
  // Authentication Libraries
  {
    name: 'NextAuth.js',
    category: 'auth',
    dependencies: ['next-auth', '@auth/core'],
    files: ['src/server/auth.ts', 'src/lib/auth.ts'],
    directories: [],
    priority: 82,
  },
  {
    name: 'Auth.js',
    category: 'auth',
    dependencies: ['@auth/nextjs', '@auth/core'],
    files: ['src/app/api/auth/[...nextauth]/route.ts'],
    directories: [],
    priority: 82,
  },
  {
    name: 'Clerk',
    category: 'auth',
    dependencies: ['@clerk/nextjs'],
    files: ['src/middleware.ts'],
    directories: [],
    priority: 80,
  },
  {
    name: 'Better Auth',
    category: 'auth',
    dependencies: ['better-auth'],
    files: ['src/lib/auth.ts'],
    directories: [],
    priority: 78,
  },
  {
    name: 'Stack Auth',
    category: 'auth',
    dependencies: ['@stackframe/stack'],
    files: ['src/stack.ts'],
    directories: [],
    priority: 78,
  },
  {
    name: 'Lucia',
    category: 'auth',
    dependencies: ['lucia'],
    files: ['src/lib/lucia.ts'],
    directories: [],
    priority: 76,
  },
  {
    name: 'Auth0',
    category: 'auth',
    dependencies: ['@auth0/nextjs-auth0'],
    files: [],
    directories: [],
    priority: 76,
  },
  {
    name: 'Supabase Auth',
    category: 'auth',
    dependencies: ['@supabase/auth-js', '@supabase/supabase-js'],
    files: ['src/lib/supabase.ts'],
    directories: [],
    priority: 74,
  },

  // UI Libraries & Component Systems
  {
    name: 'shadcn/ui',
    category: 'ui',
    dependencies: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
    files: ['components.json'],
    directories: ['src/components/ui', 'components/ui'],
    priority: 75,
  },
  {
    name: 'Material-UI',
    category: 'ui',
    dependencies: ['@mui/material', '@emotion/react'],
    files: [],
    directories: [],
    priority: 73,
  },
  {
    name: 'Chakra UI',
    category: 'ui',
    dependencies: ['@chakra-ui/react'],
    files: ['src/theme.ts'],
    directories: [],
    priority: 73,
  },
  {
    name: 'Ant Design',
    category: 'ui',
    dependencies: ['antd'],
    files: [],
    directories: [],
    priority: 73,
  },
  {
    name: 'NextUI',
    category: 'ui',
    dependencies: ['@nextui-org/react'],
    files: [],
    directories: [],
    priority: 71,
  },
  {
    name: 'HeroUI',
    category: 'ui',
    dependencies: ['@heroui/react'],
    files: [],
    directories: [],
    priority: 71,
  },
  {
    name: 'Mantine',
    category: 'ui',
    dependencies: ['@mantine/core'],
    files: [],
    directories: [],
    priority: 71,
  },
  {
    name: 'RSuite',
    category: 'ui',
    dependencies: ['rsuite'],
    files: [],
    directories: [],
    priority: 69,
  },
  {
    name: 'Flowbite',
    category: 'ui',
    dependencies: ['flowbite-react'],
    files: [],
    directories: [],
    priority: 69,
  },
  {
    name: 'DaisyUI',
    category: 'ui',
    dependencies: ['daisyui'],
    files: [],
    directories: [],
    priority: 69,
  },
  {
    name: 'Radix UI',
    category: 'ui',
    dependencies: ['@radix-ui/react-primitives'],
    files: [],
    directories: [],
    priority: 69,
  },
  {
    name: 'Headless UI',
    category: 'ui',
    dependencies: ['@headlessui/react'],
    files: [],
    directories: [],
    priority: 69,
  },
  {
    name: 'Evergreen',
    category: 'ui',
    dependencies: ['evergreen-ui'],
    files: [],
    directories: [],
    priority: 67,
  },
  {
    name: 'Rebass',
    category: 'ui',
    dependencies: ['rebass'],
    files: [],
    directories: [],
    priority: 67,
  },
  {
    name: 'Magic UI',
    category: 'ui',
    dependencies: ['magicui'],
    files: [],
    directories: [],
    priority: 67,
  },
  {
    name: 'Supabase UI',
    category: 'ui',
    dependencies: ['@supabase/ui'],
    files: [],
    directories: [],
    priority: 67,
  },
  {
    name: 'Preline UI',
    category: 'ui',
    dependencies: ['preline'],
    files: [],
    directories: [],
    priority: 65,
  },
  {
    name: 'Kendo React',
    category: 'ui',
    dependencies: ['@progress/kendo-react-grid'],
    files: [],
    directories: [],
    priority: 65,
  },
  {
    name: 'SaaS UI',
    category: 'ui',
    dependencies: ['@saas-ui/react'],
    files: [],
    directories: [],
    priority: 65,
  },

  // State Management
  {
    name: 'Zustand',
    category: 'utility',
    dependencies: ['zustand'],
    files: [],
    directories: ['src/store', 'store'],
    priority: 60,
  },
  {
    name: 'Redux Toolkit',
    category: 'utility',
    dependencies: ['@reduxjs/toolkit'],
    files: [],
    directories: ['src/store', 'store'],
    priority: 58,
  },
  {
    name: 'Jotai',
    category: 'utility',
    dependencies: ['jotai'],
    files: [],
    directories: ['src/atoms', 'atoms'],
    priority: 58,
  },
  {
    name: 'Valtio',
    category: 'utility',
    dependencies: ['valtio'],
    files: [],
    directories: [],
    priority: 56,
  },
  {
    name: 'Recoil',
    category: 'utility',
    dependencies: ['recoil'],
    files: [],
    directories: [],
    priority: 56,
  },
  {
    name: 'MobX',
    category: 'utility',
    dependencies: ['mobx', 'mobx-react-lite'],
    files: [],
    directories: [],
    priority: 56,
  },

  // Database & ORM
  {
    name: 'Prisma',
    category: 'database',
    dependencies: ['prisma', '@prisma/client'],
    files: ['prisma/schema.prisma'],
    directories: ['prisma'],
    priority: 83,
  },
  {
    name: 'ZenStack',
    category: 'database',
    dependencies: ['zenstack'],
    files: ['schema.zmodel'],
    directories: [],
    priority: 85,
  },
  {
    name: 'Drizzle ORM',
    category: 'database',
    dependencies: ['drizzle-orm'],
    files: ['drizzle.config.ts'],
    directories: [],
    priority: 81,
  },
  {
    name: 'Supabase',
    category: 'database',
    dependencies: ['@supabase/supabase-js'],
    files: ['src/lib/supabase.ts'],
    directories: [],
    priority: 79,
  },

  // API & Data Fetching
  {
    name: 'tRPC',
    category: 'api',
    dependencies: ['@trpc/server', '@trpc/client'],
    files: ['src/server/api/trpc.ts'],
    directories: ['src/server/api'],
    priority: 80,
  },
  {
    name: 'TanStack Query',
    category: 'utility',
    dependencies: ['@tanstack/react-query'],
    files: [],
    directories: [],
    priority: 58,
  },
  {
    name: 'SWR',
    category: 'utility',
    dependencies: ['swr'],
    files: [],
    directories: [],
    priority: 55,
  },
  {
    name: 'Apollo Client',
    category: 'api',
    dependencies: ['@apollo/client'],
    files: [],
    directories: [],
    priority: 75,
  },
  {
    name: 'GraphQL',
    category: 'api',
    dependencies: ['graphql'],
    files: ['schema.graphql'],
    directories: ['graphql'],
    priority: 75,
  },

  // Testing
  {
    name: 'Jest',
    category: 'testing',
    dependencies: ['jest'],
    files: ['jest.config.js'],
    directories: ['__tests__'],
    priority: 28,
  },
  {
    name: 'Vitest',
    category: 'testing',
    dependencies: ['vitest'],
    files: ['vitest.config.ts'],
    directories: [],
    priority: 28,
  },
  {
    name: 'Playwright',
    category: 'testing',
    dependencies: ['@playwright/test'],
    files: ['playwright.config.ts'],
    directories: ['tests', 'e2e'],
    priority: 25,
  },
  {
    name: 'Cypress',
    category: 'testing',
    dependencies: ['cypress'],
    files: ['cypress.config.js'],
    directories: ['cypress'],
    priority: 25,
  },
  {
    name: 'Testing Library',
    category: 'testing',
    dependencies: ['@testing-library/react'],
    files: [],
    directories: [],
    priority: 28,
  },
  {
    name: 'Storybook',
    category: 'testing',
    dependencies: ['@storybook/react'],
    files: [],
    directories: ['.storybook'],
    priority: 30,
  },

  // Styling
  {
    name: 'Tailwind CSS',
    category: 'styling',
    dependencies: ['tailwindcss'],
    files: ['tailwind.config.js', 'tailwind.config.ts'],
    directories: [],
    priority: 75,
  },
  {
    name: 'PostCSS',
    category: 'styling',
    dependencies: ['postcss'],
    files: ['postcss.config.js'],
    directories: [],
    priority: 70,
  },
  {
    name: 'Styled Components',
    category: 'styling',
    dependencies: ['styled-components'],
    files: [],
    directories: [],
    priority: 65,
  },
  {
    name: 'Emotion',
    category: 'styling',
    dependencies: ['@emotion/react'],
    files: [],
    directories: [],
    priority: 65,
  },

  // Popular Next.js Libraries from Strapi blog and ecosystem
  {
    name: 'Next SEO',
    category: 'utility',
    dependencies: ['next-seo'],
    files: [],
    directories: [],
    priority: 45,
  },
  {
    name: 'React Hook Form',
    category: 'utility',
    dependencies: ['react-hook-form'],
    files: [],
    directories: [],
    priority: 50,
  },
  {
    name: 'Zod',
    category: 'utility',
    dependencies: ['zod'],
    files: [],
    directories: [],
    priority: 48,
  },
  {
    name: 'React Hot Toast',
    category: 'utility',
    dependencies: ['react-hot-toast'],
    files: [],
    directories: [],
    priority: 40,
  },
  {
    name: 'Framer Motion',
    category: 'utility',
    dependencies: ['framer-motion'],
    files: [],
    directories: [],
    priority: 42,
  },
  {
    name: 'Lucide React',
    category: 'utility',
    dependencies: ['lucide-react'],
    files: [],
    directories: [],
    priority: 35,
  },
  {
    name: 'React Icons',
    category: 'utility',
    dependencies: ['react-icons'],
    files: [],
    directories: [],
    priority: 35,
  },
  {
    name: 'Date Fns',
    category: 'utility',
    dependencies: ['date-fns'],
    files: [],
    directories: [],
    priority: 35,
  },
  {
    name: 'Lodash',
    category: 'utility',
    dependencies: ['lodash'],
    files: [],
    directories: [],
    priority: 35,
  },
  {
    name: 'Axios',
    category: 'utility',
    dependencies: ['axios'],
    files: [],
    directories: [],
    priority: 45,
  },
  {
    name: 'React Query DevTools',
    category: 'utility',
    dependencies: ['@tanstack/react-query-devtools'],
    files: [],
    directories: [],
    priority: 30,
  },
  {
    name: 'Next Themes',
    category: 'utility',
    dependencies: ['next-themes'],
    files: [],
    directories: [],
    priority: 40,
  },
  {
    name: 'React Dropzone',
    category: 'utility',
    dependencies: ['react-dropzone'],
    files: [],
    directories: [],
    priority: 35,
  },
  {
    name: 'React Select',
    category: 'utility',
    dependencies: ['react-select'],
    files: [],
    directories: [],
    priority: 35,
  },
  {
    name: 'React Datepicker',
    category: 'utility',
    dependencies: ['react-datepicker'],
    files: [],
    directories: [],
    priority: 35,
  },
];

// Package manager detection patterns
export const PACKAGE_MANAGERS: readonly PackageManagerInfo[] = [
  {
    type: PackageManager.PNPM,
    lockFile: 'pnpm-lock.yaml',
    configFile: '.npmrc',
    installCommand: 'pnpm install',
    runCommand: 'pnpm run',
    detected: false,
  },
  {
    type: PackageManager.YARN,
    lockFile: 'yarn.lock',
    configFile: '.yarnrc.yml',
    installCommand: 'yarn install',
    runCommand: 'yarn run',
    detected: false,
  },
  {
    type: PackageManager.BUN,
    lockFile: 'bun.lockb',
    configFile: 'bunfig.toml',
    installCommand: 'bun install',
    runCommand: 'bun run',
    detected: false,
  },
  {
    type: PackageManager.NPM,
    lockFile: 'package-lock.json',
    configFile: '.npmrc',
    installCommand: 'npm install',
    runCommand: 'npm run',
    detected: false,
  },
];

// UI-related interfaces
export interface FileTreeItem extends vscode.TreeItem {
  readonly resourceUri?: vscode.Uri;
  readonly isSelected?: boolean;
  readonly isDirectory?: boolean;
  readonly children?: readonly FileTreeItem[];
  readonly priority?: number;
  readonly category?: FileCategory;
}

// Token limits and LLM configurations
export interface TokenLimits {
  readonly limit: string;
  readonly maxTokens: number;
  readonly recommended: number;
  readonly warning: number;
}

// Prompt templates
export interface PromptTemplate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: PromptCategory;
  readonly prompt: string;
  readonly icon: string;
  readonly tags: readonly string[];
  readonly targetLLMs?: readonly TargetLLM[];
  readonly supportedStructures?: readonly ProjectStructureType[];
}

export enum PromptCategory {
  DEVELOPMENT = 'Development & Implementation',
  ANALYSIS = 'Analysis & Review',
  DOCUMENTATION = 'Documentation & Communication',
  SPECIALIZED = 'Specialized Analysis',
}

// Validation interfaces
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

// Cache interfaces
export interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: Date;
  readonly ttl: number;
}

export interface ScanResult {
  readonly files: readonly FileInfo[];
  readonly stats: ContextStats;
  readonly errors: readonly string[];
}

// Progress tracking
export interface ProgressInfo {
  readonly current: number;
  readonly total: number;
  readonly message: string;
  readonly percentage: number;
}

// Utility types
export type AsyncResult<T> = Promise<T | null>;
export type SafeCallback<T> = (value: T) => void;
export type ErrorCallback = (error: Error) => void;

// Type guards
export function isFileInfo(obj: any): obj is FileInfo {
  return (
    obj &&
    typeof obj.path === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.priority === 'number' &&
    typeof obj.category === 'string' &&
    typeof obj.tokens === 'number' &&
    typeof obj.size === 'number'
  );
}

export function isValidOutputFormat(format: string): format is OutputFormat {
  return Object.values(OutputFormat).includes(format as OutputFormat);
}

export function isValidTargetLLM(llm: string): llm is TargetLLM {
  return Object.values(TargetLLM).includes(llm as TargetLLM);
}

export function isValidPackageManager(pm: string): pm is PackageManager {
  return Object.values(PackageManager).includes(pm as PackageManager);
}

// Validation utilities
export class ValidationUtils {
  static validateGenerationOptions(options: Partial<GenerationOptions>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!options.format || !isValidOutputFormat(options.format)) {
      errors.push('Invalid output format specified');
    }

    if (!options.targetLLM || !isValidTargetLLM(options.targetLLM)) {
      errors.push('Invalid target LLM specified');
    }

    if (options.maxTokens && options.maxTokens <= 0) {
      errors.push('maxTokens must be a positive number');
    }

    if (options.maxTokens && options.maxTokens > 2000000) {
      warnings.push('maxTokens is very large and may cause performance issues');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateFileInfo(fileInfo: Partial<FileInfo>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!fileInfo.path || typeof fileInfo.path !== 'string') {
      errors.push('File path is required and must be a string');
    }

    if (!fileInfo.content || typeof fileInfo.content !== 'string') {
      errors.push('File content is required and must be a string');
    }

    if (
      fileInfo.priority !== undefined &&
      (typeof fileInfo.priority !== 'number' || fileInfo.priority < 0 || fileInfo.priority > 100)
    ) {
      errors.push('Priority must be a number between 0 and 100');
    }

    if (fileInfo.size !== undefined && fileInfo.size > 1024 * 1024) {
      warnings.push('File size is very large (>1MB) and may impact performance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

// Constants
export const DEFAULT_CONFIG: ExtensionConfig = {
  defaultFormat: OutputFormat.XML,
  defaultLLM: TargetLLM.CLAUDE,
  includePrompts: true,
  autoOpenOutput: true,
  maxFileSize: 1024 * 1024, // 1MB
  customIgnorePatterns: [],
  includeTests: false,
  includePrisma: true,
  includeZenStack: true,
  includeEnvFiles: false,
  includeUILibraries: true,
  includeAuthConfig: true,
  includeDataFetching: true,
  detectProjectStructure: true,
  autoDetectPackageManager: true,
  respectWorkspaceConfig: true,
};

export const TOKEN_LIMITS: Record<TargetLLM, TokenLimits> = {
  [TargetLLM.CLAUDE]: {
    limit:
      '200K tokens (Claude 3.5 Sonnet) / 500K tokens (Claude 3.7 Sonnet) / 1M tokens (Claude 4)',
    maxTokens: 200000,
    recommended: 150000,
    warning: 180000,
  },
  [TargetLLM.GPT]: {
    limit: '128K tokens (GPT-4 Turbo) / 200K tokens (GPT-4.1 Turbo) / 1M tokens (GPT-4.1 Pro)',
    maxTokens: 128000,
    recommended: 100000,
    warning: 120000,
  },
  [TargetLLM.GEMINI]: {
    limit: '1M tokens (Gemini 1.5 Pro) / 2M tokens (Gemini 2.5 Pro) / 32K tokens (Gemini 2.5 Nano)',
    maxTokens: 1000000,
    recommended: 800000,
    warning: 900000,
  },
  [TargetLLM.DEEPSEEK]: {
    limit: '64K tokens (DeepSeek V3)',
    maxTokens: 64000,
    recommended: 50000,
    warning: 60000,
  },
  [TargetLLM.GROK]: {
    limit: '128K tokens (Grok 2) / 1M tokens (Grok 3)',
    maxTokens: 128000,
    recommended: 100000,
    warning: 120000,
  },
  [TargetLLM.CUSTOM]: {
    limit: 'Custom LLM',
    maxTokens: 50000,
    recommended: 40000,
    warning: 45000,
  },
};
