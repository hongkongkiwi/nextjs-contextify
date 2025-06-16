import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';

// Setup mocks before importing services
import '../setup';

// Import the service after setting up mocks
import { VersionDetector } from '../../services/VersionDetector';

suite('VersionDetector Unit Tests', () => {
  test('Should handle missing package.json gracefully', async () => {
    const tempDir = path.join(__dirname, 'temp-missing-package');
    
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const detector = new VersionDetector(tempDir);
      const versions = await detector.detectVersions();
      
      assert.strictEqual(versions.nextjs, 'unknown');
      assert.strictEqual(versions.react, 'unknown');
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  test('Should detect Next.js 15 correctly', async () => {
    const tempDir = path.join(__dirname, 'temp-nextjs15-test');
    
    try {
      fs.mkdirSync(tempDir, { recursive: true });
      
      const packageJson = {
        dependencies: {
          'next': '^15.0.0',
          'react': '^18.2.0',
          'tailwindcss': '^4.0.0',
          'typescript': '^5.0.0'
        }
      };
      
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const detector = new VersionDetector(tempDir);
      const versions = await detector.detectVersions();
      
      assert.strictEqual(versions.nextjs, '15.0');
      assert.strictEqual(versions.react, '^18.2.0');
      assert.strictEqual(versions.tailwind, 'v4');
      assert.strictEqual(versions.typescript, '^5.0.0');
      assert.ok(detector.isNextJs15OrLater());
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  test('Should detect older Next.js versions', async () => {
    const tempDir = path.join(__dirname, 'temp-nextjs13-test');
    
    try {
      fs.mkdirSync(tempDir, { recursive: true });
      
      const packageJson = {
        dependencies: {
          'next': '^13.5.0',
          'react': '^18.0.0',
          'tailwindcss': '^3.3.0'
        }
      };
      
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const detector = new VersionDetector(tempDir);
      const versions = await detector.detectVersions();
      
      assert.strictEqual(versions.nextjs, '13.5');
      assert.strictEqual(versions.tailwind, 'v3');
      assert.strictEqual(detector.isNextJs15OrLater(), false);
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  test('Should detect project structure correctly', async () => {
    const tempDir = path.join(__dirname, 'temp-structure-test');
    
    try {
      // Create App Router structure
      const appDir = path.join(tempDir, 'app');
      fs.mkdirSync(appDir, { recursive: true });
      fs.writeFileSync(path.join(appDir, 'layout.tsx'), 'export default function Layout() {}');
      
      const detector = new VersionDetector(tempDir);
      
      assert.ok(detector.hasAppRouter());
      assert.strictEqual(detector.getRouterType(), 'app');
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });

  test('Should detect library versions correctly', async () => {
    const tempDir = path.join(__dirname, 'temp-libraries-test');
    
    try {
      fs.mkdirSync(tempDir, { recursive: true });
      
      const packageJson = {
        dependencies: {
          'next': '^15.0.0',
          'react': '^18.2.0',
          '@prisma/client': '^5.0.0',
          'zustand': '^4.0.0',
          '@clerk/nextjs': '^4.0.0'
        },
        devDependencies: {
          'prisma': '^5.0.0',
          '@trpc/server': '^10.0.0'
        }
      };
      
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const detector = new VersionDetector(tempDir);
      const versions = await detector.detectVersions();
      
      assert.strictEqual(versions.prisma, '^5.0.0');
      assert.strictEqual(versions.zustand, '^4.0.0');
      assert.strictEqual(versions.clerk, '^4.0.0');
      assert.strictEqual(versions.trpc, '^10.0.0');
    } finally {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
}); 