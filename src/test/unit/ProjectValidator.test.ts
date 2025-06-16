import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectValidator } from '../../services/ProjectValidator';

suite('ProjectValidator Tests', () => {
  let tempDir: string;

  setup(() => {
    // Create a temporary directory for tests
    tempDir = path.join(__dirname, '../../../temp-test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  teardown(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should detect valid Next.js project', async () => {
    // Create a mock package.json with Next.js dependency
    const packageJson = {
      name: 'test-nextjs-app',
      version: '1.0.0',
      dependencies: {
        next: '^14.0.0',
        react: '^18.0.0'
      },
      scripts: {
        dev: 'next dev',
        build: 'next build'
      }
    };

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const validator = new ProjectValidator(tempDir);
    const validation = await validator.validateProject();

    assert.strictEqual(validation.isValidProject, true);
    assert.strictEqual(validation.projectType, 'nextjs');
    assert.strictEqual(validation.hasPackageJson, true);
    assert.strictEqual(validation.hasNextJs, true);
    assert.strictEqual(validation.nextjsVersion, '14.0.0');
  });

  test('should detect Node.js project without Next.js', async () => {
    // Create a mock package.json without Next.js
    const packageJson = {
      name: 'test-node-app',
      version: '1.0.0',
      dependencies: {
        express: '^4.18.0',
        lodash: '^4.17.21'
      },
      scripts: {
        start: 'node index.js'
      }
    };

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const validator = new ProjectValidator(tempDir);
    const validation = await validator.validateProject();

    assert.strictEqual(validation.isValidProject, false);
    assert.strictEqual(validation.projectType, 'nodejs');
    assert.strictEqual(validation.hasPackageJson, true);
    assert.strictEqual(validation.hasNextJs, false);
    assert.ok(validation.reason?.includes('Node.js project but not a Next.js project'));
    assert.ok(validation.suggestions && validation.suggestions.length > 0);
  });

  test('should detect non-Node.js project', async () => {
    // Don't create any package.json file
    const validator = new ProjectValidator(tempDir);
    const validation = await validator.validateProject();

    assert.strictEqual(validation.isValidProject, false);
    assert.strictEqual(validation.projectType, 'unknown');
    assert.strictEqual(validation.hasPackageJson, false);
    assert.strictEqual(validation.hasNextJs, false);
    assert.ok(validation.reason?.includes('No package.json found'));
    assert.ok(validation.suggestions && validation.suggestions.length > 0);
  });

  test('should validate Next.js project structure', async () => {
    // Create package.json with Next.js
    const packageJson = {
      name: 'test-nextjs-app',
      dependencies: { next: '^14.0.0' }
    };

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // Create app directory (App Router)
    const appDir = path.join(tempDir, 'app');
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(
      path.join(appDir, 'layout.tsx'),
      'export default function RootLayout() { return null; }'
    );

    const validator = new ProjectValidator(tempDir);
    const hasStructure = await validator.hasNextJsStructure();

    assert.strictEqual(hasStructure, true);
  });

  test('should generate helpful error message', async () => {
    const validator = new ProjectValidator(tempDir);
    const validation = await validator.validateProject();
    const errorMessage = validator.generateErrorMessage(validation);

    assert.ok(errorMessage.includes('❌'));
    assert.ok(errorMessage.includes('Suggestions:'));
    assert.ok(errorMessage.includes('About this extension:'));
  });

  test('should detect valid project with quick methods', async () => {
    // Create valid Next.js project
    const packageJson = {
      dependencies: { next: '^13.5.0' }
    };

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    const validator = new ProjectValidator(tempDir);
    
    const isValidNextJs = await validator.isValidNextJsProject();
    const isNodeJs = await validator.isNodeJsProject();

    assert.strictEqual(isValidNextJs, true);
    assert.strictEqual(isNodeJs, true);
  });
}); 