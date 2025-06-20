import * as path from 'path';
import { glob } from 'glob';

// Import mocha dynamically to avoid module issues
export async function run(): Promise<void> {
  // Dynamic import of Mocha
  const Mocha = (await import('mocha')).default;
  
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 10000, // 10 seconds timeout for extension tests
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot })
      .then((files: string[]) => {
        // Add files to the test suite
        files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

        try {
          // Run the mocha test
          mocha.run((failures: number) => {
            if (failures > 0) {
              reject(new Error(`${failures} tests failed.`));
            } else {
              resolve();
            }
          });
        } catch (err) {
          console.error(err);
          reject(err);
        }
      })
      .catch((err: any) => {
        reject(err);
      });
  });
} 