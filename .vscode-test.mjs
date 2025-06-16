import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  workspaceFolder: './test-fixtures',
  mocha: {
    ui: 'tdd',
    timeout: 30000, // Increased timeout for CI environments
    color: true,
    retries: 2, // Retry flaky tests
  },
  extensionDevelopmentPath: '.',
  launchArgs: [
    '--disable-extensions', // Disable other extensions for isolated testing
    '--no-sandbox', // Required for CI environments
    '--disable-dev-shm-usage', // Overcome limited resource problems
    '--disable-gpu', // Disable GPU for headless environments
    '--disable-web-security', // Sometimes needed for extension testing
    '--disable-features=VizDisplayCompositor', // Additional headless flag
    '--disable-ipc-flooding-protection', // Prevent IPC timeouts in CI
    '--max_old_space_size=4096', // Increase memory for CI
    '--disable-background-timer-throttling', // Prevent timing issues
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
  ],
  env: {
    NODE_ENV: 'test',
    DISPLAY: process.env.DISPLAY || ':99', // For headless environments with fallback
    CI: process.env.CI || 'false',
  },
  // Version configurations for testing against different VS Code versions
  version: 'stable', // Can be 'stable', 'insiders', or specific version like '1.85.0'
  // Uncomment to test against multiple versions
  // version: ['stable', 'insiders'],
  
  // Improved coverage and error handling
  coverage: {
    enabled: false, // Can be enabled when needed
    exclude: ['**/node_modules/**', '**/test/**'],
  },
  
  // Additional options for CI stability
  platform: process.platform,
  reuseMachineInstall: false, // Always download fresh in CI
}); 