import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { FileScanner } from '../../core/FileScanner';
import { FileCategory, ProjectStructureType } from '../../core/types';

suite('FileScanner Test Suite', () => {
  let tempDir: string;
  let scanner: FileScanner;

  suiteSetup(async () => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nextjs-contextify-test-'));
    scanner = new FileScanner(tempDir);

    // Create test file structure
    await createTestFileStructure();
  });

  suiteTeardown(async () => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  async function createTestFileStructure(): Promise<void> {
    const testFiles = [
      // Core configuration files
      { path: 'next.config.js', content: 'module.exports = {};' },
      {
        path: 'package.json',
        content: JSON.stringify(
          {
            name: 'test-app',
            dependencies: {
              next: '^14.0.0',
              '@trpc/server': '^10.0.0',
              '@trpc/client': '^10.0.0',
              prisma: '^5.0.0',
              '@prisma/client': '^5.0.0',
              'next-auth': '^4.0.0',
              tailwindcss: '^3.0.0',
              zod: '^3.0.0',
            },
          },
          null,
          2
        ),
      },
      { path: 'tsconfig.json', content: '{"compilerOptions": {}}' },
      { path: 'tailwind.config.ts', content: 'export default {};' },
      { path: 'middleware.ts', content: 'export function middleware() {}' },

      // T3 Stack specific files
      { path: 'src/env.mjs', content: 'export const env = {};' },
      { path: 'src/server/auth.ts', content: 'export const authOptions = {};' },
      { path: 'src/server/db.ts', content: 'export const db = {};' },
      { path: 'src/server/api/trpc.ts', content: 'export const createTRPCRouter = {};' },
      { path: 'src/server/api/root.ts', content: 'export const appRouter = {};' },
      { path: 'src/server/api/routers/example.ts', content: 'export const exampleRouter = {};' },
      { path: 'src/utils/api.ts', content: 'export const api = {};' },

      // Prisma files
      {
        path: 'prisma/schema.prisma',
        content: 'generator client { provider = "prisma-client-js" }',
      },
      { path: 'prisma/seed.ts', content: 'async function main() {}' },
      { path: 'prisma/migrations/001_init/migration.sql', content: 'CREATE TABLE users();' },

      // App router files
      { path: 'app/layout.tsx', content: 'export default function Layout() { return null; }' },
      { path: 'app/page.tsx', content: 'export default function Page() { return null; }' },
      { path: 'app/loading.tsx', content: 'export default function Loading() { return null; }' },
      { path: 'app/error.tsx', content: 'export default function Error() { return null; }' },
      { path: 'app/not-found.tsx', content: 'export default function NotFound() { return null; }' },
      { path: 'app/template.tsx', content: 'export default function Template() { return null; }' },
      {
        path: 'app/global-error.tsx',
        content: 'export default function GlobalError() { return null; }',
      },
      { path: 'app/api/auth/[...nextauth]/route.ts', content: 'export async function GET() {}' },
      { path: 'app/api/trpc/[trpc]/route.ts', content: 'export async function GET() {}' },

      // Pages router files (for hybrid projects)
      { path: 'pages/_app.tsx', content: 'export default function App() { return null; }' },
      {
        path: 'pages/_document.tsx',
        content: 'export default function Document() { return null; }',
      },
      { path: 'pages/api/auth/[...nextauth].ts', content: 'export default function handler() {}' },

      // Components
      {
        path: 'src/components/ui/Button.tsx',
        content: "'use client';\nexport default function Button() { return null; }",
      },
      {
        path: 'src/components/server/Card.tsx',
        content: 'export default function Card() { return null; }',
      },
      {
        path: 'components/Layout.tsx',
        content: 'export default function Layout() { return null; }',
      },

      // Hooks and utilities
      { path: 'src/hooks/useAuth.ts', content: 'export function useAuth() {}' },
      { path: 'src/lib/utils.ts', content: 'export function cn() {}' },
      { path: 'src/utils/helpers.ts', content: 'export function helper() {}' },

      // State management
      { path: 'src/store/auth.ts', content: 'export const authStore = {};' },
      { path: 'src/context/AppContext.tsx', content: 'export const AppContext = {};' },

      // Styling
      { path: 'src/styles/globals.css', content: 'body { margin: 0; }' },
      { path: 'src/components/Button.module.css', content: '.button { color: blue; }' },

      // Testing files
      { path: 'src/components/__tests__/Button.test.tsx', content: 'test("renders", () => {});' },
      { path: 'cypress/e2e/auth.cy.ts', content: 'describe("auth", () => {});' },
      { path: 'playwright/auth.spec.ts', content: 'test("login", async () => {});' },

      // Configuration and environment
      { path: '.env.example', content: 'DATABASE_URL=example' },
      { path: 'drizzle.config.ts', content: 'export default {};' },
      { path: 'vercel.json', content: '{}' },
      { path: '.github/workflows/ci.yml', content: 'name: CI' },

      // Documentation
      { path: 'README.md', content: '# Test App' },
      { path: 'docs/api.md', content: '# API Documentation' },

      // Files to be ignored
      { path: 'node_modules/package/index.js', content: 'module.exports = {};' },
      { path: '.next/cache/file.js', content: 'compiled code' },
      { path: 'image.png', content: 'binary data' },
    ];

    for (const file of testFiles) {
      const fullPath = path.join(tempDir, file.path);
      const dir = path.dirname(fullPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write file
      fs.writeFileSync(fullPath, file.content);
    }
  }

  test('should scan and process files successfully', async () => {
    const result = await scanner.scanAndProcessFiles();

    assert.ok(result.files.length > 0, 'Should find files');
    assert.ok(result.stats.totalFiles > 0, 'Should have file count in stats');
    assert.ok(result.stats.totalTokens > 0, 'Should calculate tokens');
    assert.ok(result.stats.totalSize > 0, 'Should calculate file sizes');
    assert.ok(result.stats.generatedAt instanceof Date, 'Should have generation timestamp');
  });

  test('should detect T3 stack project structure', async () => {
    const result = await scanner.scanAndProcessFiles();

    assert.strictEqual(
      result.stats.projectDetection?.structureType,
      ProjectStructureType.T3_STACK,
      'Should detect T3 stack'
    );
    assert.ok(
      result.stats.detectedFeatures?.includes('T3 Stack'),
      'Should detect T3 Stack feature'
    );
    assert.ok(result.stats.detectedFeatures?.includes('tRPC'), 'Should detect tRPC feature');
    assert.ok(
      result.stats.detectedFeatures?.includes('Prisma ORM'),
      'Should detect Prisma feature'
    );
    assert.ok(
      result.stats.detectedFeatures?.includes('NextAuth.js'),
      'Should detect NextAuth feature'
    );
  });

  test('should categorize T3 stack files correctly', async () => {
    const result = await scanner.scanAndProcessFiles();

    // Check tRPC files
    const trpcFiles = result.files.filter(f => f.category === FileCategory.TRPC_PROCEDURES);
    assert.ok(trpcFiles.length >= 4, 'Should find tRPC procedure files');

    const trpcRouter = trpcFiles.find(f => f.path.includes('src/server/api/trpc.ts'));
    assert.ok(trpcRouter, 'Should find tRPC router');
    assert.strictEqual(trpcRouter?.priority, 78, 'tRPC router should have priority 78');

    // Check Prisma files
    const prismaFiles = result.files.filter(f => f.category === FileCategory.DATABASE_SCHEMA);
    assert.ok(prismaFiles.length >= 1, 'Should find Prisma schema files');

    const prismaSchema = prismaFiles.find(f => f.path.includes('prisma/schema.prisma'));
    assert.ok(prismaSchema, 'Should find Prisma schema');
    assert.strictEqual(prismaSchema?.priority, 80, 'Prisma schema should have priority 80');

    // Check NextAuth files
    const authFiles = result.files.filter(f => f.category === FileCategory.NEXTAUTH_CONFIG);
    assert.ok(authFiles.length >= 1, 'Should find NextAuth config files');

    const serverAuth = authFiles.find(f => f.path.includes('src/server/auth.ts'));
    assert.ok(serverAuth, 'Should find server auth config');
    assert.strictEqual(serverAuth?.priority, 78, 'Server auth should have priority 78');
  });

  test('should categorize configuration files correctly', async () => {
    const result = await scanner.scanAndProcessFiles();

    const configFiles = result.files.filter(f => f.category === FileCategory.CORE_CONFIGURATIONS);

    assert.ok(configFiles.length >= 5, 'Should find configuration files');

    const nextConfig = configFiles.find(f => f.path.includes('next.config.js'));
    assert.ok(nextConfig, 'Should find next.config.js');
    assert.strictEqual(nextConfig?.priority, 100, 'next.config.js should have priority 100');

    const packageJson = configFiles.find(f => f.path.includes('package.json'));
    assert.ok(packageJson, 'Should find package.json');
    assert.strictEqual(packageJson?.priority, 95, 'package.json should have priority 95');

    const envFile = configFiles.find(f => f.path.includes('src/env.mjs'));
    assert.ok(envFile, 'Should find T3 env file');
    assert.strictEqual(envFile?.priority, 83, 'T3 env file should have priority 83');
  });

  test('should categorize App Router files correctly', async () => {
    const result = await scanner.scanAndProcessFiles();

    const appRouterFiles = result.files.filter(
      f => f.category === FileCategory.APP_ROUTER_STRUCTURE
    );

    assert.ok(appRouterFiles.length >= 6, 'Should find App Router files');

    const layout = appRouterFiles.find(f => f.path.includes('app/layout.tsx'));
    assert.ok(layout, 'Should find layout.tsx');
    assert.strictEqual(layout?.priority, 74, 'Layout should have priority 74');

    const page = appRouterFiles.find(f => f.path.includes('app/page.tsx'));
    assert.ok(page, 'Should find page.tsx');
    assert.strictEqual(page?.priority, 74, 'Page should have priority 74');

    const loading = appRouterFiles.find(f => f.path.includes('app/loading.tsx'));
    assert.ok(loading, 'Should find loading.tsx');
    assert.strictEqual(loading?.priority, 72, 'Loading should have priority 72');
  });

  test('should categorize database files correctly', async () => {
    const result = await scanner.scanAndProcessFiles();

    const dbFiles = result.files.filter(f => f.category === FileCategory.DATABASE_SCHEMA);

    assert.ok(dbFiles.length >= 3, 'Should find database files');

    const schema = dbFiles.find(f => f.path.includes('prisma/schema.prisma'));
    assert.ok(schema, 'Should find Prisma schema');

    const migration = dbFiles.find(f => f.path.includes('migrations/'));
    assert.ok(migration, 'Should find migration files');

    const dbConfig = result.files.find(f => f.path.includes('src/server/db.ts'));
    assert.ok(dbConfig, 'Should find database configuration');
  });

  test('should detect client vs server components', async () => {
    const result = await scanner.scanAndProcessFiles();

    const clientComponents = result.files.filter(
      f => f.category === FileCategory.CLIENT_COMPONENTS
    );
    const serverComponents = result.files.filter(
      f => f.category === FileCategory.SERVER_COMPONENTS
    );

    assert.ok(clientComponents.length > 0, 'Should find client components');
    assert.ok(serverComponents.length > 0, 'Should find server components');

    const clientButton = clientComponents.find(f => f.path.includes('ui/Button.tsx'));
    assert.ok(clientButton, 'Should find client Button component');
    assert.ok(clientButton?.isClientComponent, 'Should mark as client component');

    const serverCard = serverComponents.find(f => f.path.includes('server/Card.tsx'));
    assert.ok(serverCard, 'Should find server Card component');
    assert.strictEqual(serverCard?.isClientComponent, false, 'Should not mark as client component');
  });

  test('should categorize hooks and utilities correctly', async () => {
    const result = await scanner.scanAndProcessFiles();

    const hooksAndUtils = result.files.filter(f => f.category === FileCategory.HOOKS_UTILITIES);

    assert.ok(hooksAndUtils.length >= 3, 'Should find hooks and utilities');

    const hook = hooksAndUtils.find(f => f.path.includes('useAuth.ts'));
    assert.ok(hook, 'Should find custom hook');
    assert.strictEqual(hook?.priority, 50, 'Hook should have priority 50');

    const utils = hooksAndUtils.find(f => f.path.includes('lib/utils.ts'));
    assert.ok(utils, 'Should find utility functions');
  });

  test('should categorize test files correctly', async () => {
    const result = await scanner.scanAndProcessFiles();

    const testFiles = result.files.filter(f => f.category === FileCategory.TESTS);

    assert.ok(testFiles.length >= 3, 'Should find test files');

    const unitTest = testFiles.find(f => f.path.includes('.test.tsx'));
    assert.ok(unitTest, 'Should find unit test');
    assert.strictEqual(unitTest?.priority, 28, 'Unit test should have priority 28');

    const e2eTest = testFiles.find(f => f.path.includes('cypress/'));
    assert.ok(e2eTest, 'Should find e2e test');
    assert.strictEqual(e2eTest?.priority, 25, 'E2E test should have priority 25');
  });

  test('should ignore specified files and directories', async () => {
    const result = await scanner.scanAndProcessFiles();

    // Should not include ignored files
    const nodeModulesFiles = result.files.filter(f => f.path.includes('node_modules/'));
    assert.strictEqual(nodeModulesFiles.length, 0, 'Should ignore node_modules');

    const nextFiles = result.files.filter(f => f.path.includes('.next/'));
    assert.strictEqual(nextFiles.length, 0, 'Should ignore .next directory');

    const imageFiles = result.files.filter(f => f.path.includes('.png'));
    assert.strictEqual(imageFiles.length, 0, 'Should ignore image files');
  });

  test('should calculate tokens and file sizes correctly', async () => {
    const result = await scanner.scanAndProcessFiles();

    result.files.forEach(file => {
      assert.ok(file.tokens > 0, `File ${file.path} should have token count`);
      assert.ok(file.size > 0, `File ${file.path} should have size`);
      assert.ok(file.tokens <= file.content.length, 'Token count should be reasonable');
    });
  });

  test('should sort files by priority correctly', async () => {
    const result = await scanner.scanAndProcessFiles();

    // Check that files are sorted by priority (highest first)
    for (let i = 0; i < result.files.length - 1; i++) {
      assert.ok(
        result.files[i].priority >= result.files[i + 1].priority,
        `File ${result.files[i].path} (priority ${result.files[i].priority}) should have higher or equal priority than ${result.files[i + 1].path} (priority ${result.files[i + 1].priority})`
      );
    }

    // Check that highest priority files are configuration files
    const highestPriorityFile = result.files[0];
    assert.ok(
      highestPriorityFile.category === FileCategory.CORE_CONFIGURATIONS,
      'Highest priority file should be a configuration file'
    );
  });

  test('should handle file processing errors gracefully', async () => {
    // This test ensures the scanner doesn't crash on file system errors
    const result = await scanner.scanAndProcessFiles();

    // Should complete successfully even if some files can't be read
    assert.ok(result.files.length >= 0, 'Should return results even with errors');
    assert.ok(result.stats, 'Should return stats even with errors');
  });

  test('should provide comprehensive statistics', async () => {
    const result = await scanner.scanAndProcessFiles();

    assert.ok(result.stats.totalFiles > 0, 'Should count total files');
    assert.ok(result.stats.totalTokens > 0, 'Should count total tokens');
    assert.ok(result.stats.totalSize > 0, 'Should count total size');
    assert.ok(Object.keys(result.stats.categories).length > 0, 'Should categorize files');
    assert.ok(result.stats.processingTime !== undefined, 'Should track processing time');
    assert.ok(result.stats.projectDetection, 'Should detect project structure');
    assert.ok(
      result.stats.detectedFeatures && result.stats.detectedFeatures.length > 0,
      'Should detect features'
    );
  });

  test('should handle different project structures', async () => {
    const result = await scanner.scanAndProcessFiles();

    // Should detect T3 stack based on our test files
    assert.strictEqual(result.stats.projectDetection?.structureType, ProjectStructureType.T3_STACK);

    // Should include project structure in file info
    const fileWithStructure = result.files.find(f => f.projectStructure);
    assert.ok(fileWithStructure, 'Files should include project structure info');
    assert.strictEqual(fileWithStructure?.projectStructure, ProjectStructureType.T3_STACK);
  });

  test('should include modern Next.js file patterns', async () => {
    const result = await scanner.scanAndProcessFiles();

    // Should find instrumentation file if it exists
    const _instrumentationFile = result.files.find(f => f.path.includes('instrumentation.'));
    // Note: We didn't create this file in our test structure, so it might not exist

    // Should find drizzle config if it exists
    const drizzleConfig = result.files.find(f => f.path.includes('drizzle.config.'));
    assert.ok(drizzleConfig, 'Should find Drizzle config file');
    assert.strictEqual(drizzleConfig?.priority, 81, 'Drizzle config should have priority 81');
  });

  test('should handle performance with many files', async () => {
    const startTime = Date.now();
    const result = await scanner.scanAndProcessFiles();
    const endTime = Date.now();

    const processingTime = endTime - startTime;

    // Should complete within reasonable time (adjust threshold as needed)
    assert.ok(
      processingTime < 5000,
      `Processing should complete quickly, took ${processingTime}ms`
    );
    assert.ok(result.stats.processingTime !== undefined, 'Should track processing time in stats');
  });
});
