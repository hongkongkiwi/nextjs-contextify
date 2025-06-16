# Testing Guide for Next.js LLM Context Extension

This document describes the comprehensive testing setup for the Next.js LLM Context VS Code extension using the [Microsoft vscode-test utility](https://github.com/microsoft/vscode-test).

## Testing Architecture

Our testing setup uses the official Microsoft vscode-test utility for comprehensive VS Code extension testing:

- **Unit Tests**: Fast, isolated tests using Mocha
- **Integration Tests**: Full VS Code extension tests using @vscode/test-electron
- **Coverage**: Code coverage reports using c8
- **CI/CD**: Automated testing in GitHub Actions

## Test Structure

```
src/test/
├── runTest.ts          # Main test runner using @vscode/test-electron
├── suite/
│   ├── index.ts        # Test suite configuration
│   └── extension.test.ts # Main extension tests
test-fixtures/          # Test workspace fixtures
├── sample-nextjs/      # Sample Next.js project for testing
└── ...
.vscode-test.mjs        # VS Code Test CLI configuration
```

## Available Test Scripts

### Core Test Commands
```bash
# Run all tests (unit + integration)
pnpm run test

# Run only unit tests
pnpm run test:unit

# Run only integration tests
pnpm run test:integration

# Run integration tests with electron (alternative)
pnpm run test:integration:electron

# Run all tests (comprehensive)
pnpm run test:all

# Run tests for CI (optimized for GitHub Actions)
pnpm run test:ci
```

### Development Commands
```bash
# Watch mode for unit tests
pnpm run test:watch

# Generate test coverage report
pnpm run test:coverage

# Build project before testing
pnpm run pretest
```

## Test Categories

### 1. Extension Core Tests
- Extension activation and deactivation
- Command registration verification
- Configuration validation
- Error handling

### 2. Service Tests
- **VersionDetector**: Next.js version detection, package.json parsing
- **EnvironmentDetector**: Environment file parsing, NEXT_PUBLIC variables
- **ProjectStructureDetector**: App Router/Pages Router detection
- **UniversalContextGenerator**: Context generation for different AI assistants

### 3. Integration Tests
- Full extension workflow testing
- VS Code API interaction
- File system operations
- Real project structure analysis

## Configuration Files

### .vscode-test.mjs
VS Code Test CLI configuration:
```javascript
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  workspaceFolder: './test-fixtures',
  mocha: {
    ui: 'tdd',
    timeout: 20000,
    color: true,
  },
  extensionDevelopmentPath: '.',
  launchArgs: [
    '--disable-extensions',
    '--no-sandbox',
  ],
  version: 'stable', // or 'insiders', '1.85.0'
});
```

### Test Fixtures
Test fixtures provide realistic project structures for testing:
- `test-fixtures/sample-nextjs/`: Next.js 15 project with App Router
- Environment files for testing environment detection
- Various project structures (App Router, Pages Router, Mixed)

## Running Tests Locally

### Prerequisites
1. Node.js 22.x (recommended)
2. pnpm package manager
3. VS Code installed (for integration tests)

### Setup
```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run all tests
pnpm run test
```

### Debugging Tests
1. **VS Code Debug**: Use the provided launch configuration
2. **Console Output**: Tests include detailed logging
3. **Test Coverage**: Run `pnpm run test:coverage` for coverage reports

## CI/CD Integration

### GitHub Actions
The CI pipeline runs tests across multiple Node.js versions:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]

steps:
  - name: Setup Xvfb for VS Code tests
    run: |
      sudo apt-get update
      sudo apt-get install -y xvfb
      export DISPLAY=:99
      Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
    if: matrix.node-version == '22.x'
    
  - name: Run integration tests
    run: pnpm run test:ci
    if: matrix.node-version == '22.x'
    env:
      DISPLAY: ":99"
```

### Test Environments
- **Unit Tests**: Run on all Node.js versions (18.x, 20.x, 22.x)
- **Integration Tests**: Run only on Node.js 22.x with Xvfb
- **Coverage**: Generated on Node.js 22.x and uploaded to Codecov

## Writing New Tests

### Unit Test Example
```typescript
suite('New Feature Tests', () => {
  test('Should handle new functionality', () => {
    // Arrange
    const input = 'test input';
    
    // Act
    const result = newFunction(input);
    
    // Assert
    assert.strictEqual(result, 'expected output');
  });
});
```

### Integration Test Example
```typescript
suite('Extension Integration Tests', () => {
  test('Should execute command successfully', async () => {
    // Test extension command execution
    await vscode.commands.executeCommand('nextjsLlmContext.newCommand');
    
    // Verify results
    const config = vscode.workspace.getConfiguration('nextjsLlmContext');
    assert.ok(config);
  });
});
```

### Service Test Example
```typescript
suite('Service Tests', () => {
  test('Should detect Next.js version correctly', async () => {
    const tempDir = path.join(__dirname, 'temp-test');
    
    try {
      // Setup test environment
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: { 'next': '^15.0.0' } })
      );
      
      // Test service
      const detector = new VersionDetector(tempDir);
      const versions = await detector.detectVersions();
      
      assert.strictEqual(versions.nextjs, '15.0');
    } finally {
      // Cleanup
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});
```

## Test Best Practices

### 1. Test Organization
- Group related tests in suites
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)

### 2. Async Testing
- Always await async operations
- Use proper error handling
- Set appropriate timeouts

### 3. Resource Management
- Clean up temporary files and directories
- Use try/finally blocks for cleanup
- Avoid test interdependencies

### 4. Mock and Stub Usage
- Mock external dependencies
- Use fixtures for consistent test data
- Avoid testing implementation details

## Troubleshooting

### Common Issues

#### 1. Tests Timeout
- Increase timeout in Mocha configuration
- Check for infinite loops or hanging promises
- Ensure proper async/await usage

#### 2. VS Code Not Starting
- Verify Xvfb is running (Linux CI)
- Check display environment variable
- Ensure VS Code is installed and accessible

#### 3. File System Errors
- Use absolute paths in tests
- Check file permissions
- Ensure proper cleanup in finally blocks

#### 4. Module Import Errors
- Verify TypeScript compilation
- Check import paths
- Ensure all dependencies are installed

### Debug Commands
```bash
# Run tests with debug output
DEBUG=* pnpm run test

# Run specific test file
pnpm run test:unit -- --grep "Version Detection"

# Run tests with coverage and debug
pnpm run test:coverage -- --reporter spec
```

## Coverage Reports

Coverage reports are generated using c8 and include:
- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

View coverage:
```bash
# Generate coverage
pnpm run test:coverage

# View HTML report
open coverage/index.html
```

## Performance Testing

Monitor test performance:
```bash
# Run tests with timing
pnpm run test -- --reporter spec

# Analyze bundle size impact
pnpm run analyze:bundle
```

## Security Testing

The CI pipeline includes security scanning:
```bash
# Manual security audit
pnpm run security:audit

# Check for vulnerabilities
pnpm run security:check
```

## Contributing to Tests

When adding new features:
1. Write tests before implementation (TDD)
2. Ensure good test coverage (>80%)
3. Test both success and error cases
4. Update this documentation if needed

For questions or issues with testing, please check:
- [Microsoft vscode-test documentation](https://github.com/microsoft/vscode-test)
- [Mocha testing framework](https://mochajs.org/)
- [VS Code Extension Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension) 