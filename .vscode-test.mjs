import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/suite/**/*.test.js',
  workspaceFolder: './test-fixtures',
  mocha: {
    ui: 'tdd',
    timeout: 30000,
    color: true,
    retries: 2,
  },
  extensionDevelopmentPath: '.',
  launchArgs: [
    '--disable-extensions',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
  ],
  env: {
    NODE_ENV: 'test',
    DISPLAY: process.env.DISPLAY || ':99',
  },
  version: 'stable',
}); 