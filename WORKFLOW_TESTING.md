# Workflow Testing Guide

This guide explains how to test GitHub Actions workflows locally before pushing changes to avoid CI failures.

## Quick Commands

```bash
# Test all CI commands locally (recommended before pushing)
pnpm run validate:workflows

# Test only CI commands (faster)
pnpm run test:ci-commands

# Test specific workflow syntax
pnpm run test:workflow:ci
pnpm run test:workflow:build

# Test headless mode (simulates CI environment)
pnpm run test:headless
```

## Validation Tools

### 1. `pnpm run validate:workflows` - Comprehensive Validation
- ✅ Tests all CI commands locally
- ✅ Validates workflow syntax with `act`
- ✅ Confirms unit tests work without display server
- ✅ Verifies integration tests are properly conditional

### 2. `pnpm run test:ci-commands` - Command Testing Only
- Tests the exact commands used in workflows
- Simulates GitHub Actions environment
- Faster than full validation

### 3. Individual Workflow Testing
- `pnpm run test:workflow:ci` - Main CI workflow
- `pnpm run test:workflow:build` - Build and upload workflow

### 4. Headless Mode Testing
- `pnpm run test:headless` - Test VS Code extension in headless mode
- Simulates GitHub Actions environment more closely
- Helps identify GUI/display dependencies

## Common Issues & Solutions

### Unit Test Pattern Issues
**Problem**: `Error: No test files found: "out/test/unit/**/*.test.js"`

**Solution**: Use quoted glob patterns in package.json:
```json
"test:unit": "mocha 'out/test/unit/**/*.test.js' --ui tdd --timeout 10000"
```

### Integration Tests in Wrong Workflows
**Problem**: VS Code tests failing with X server errors in build workflows

**Solution**: Use `test:unit` instead of `test` in build/release/publish workflows:
```yaml
- name: Run tests
  run: pnpm run test:unit
  # Only run unit tests here - integration tests are covered by main CI workflow
```

### Display Server Requirements
**Integration tests require**:
- Xvfb setup in CI
- DISPLAY environment variable
- Only run on specific Node.js versions (22.x)

**Unit tests**:
- ✅ Work without display server
- ✅ Run on all Node.js versions
- ✅ Suitable for build/release workflows

### Headless vs Local Environment
**Key differences between local and CI:**
- **Display**: Local has GUI, CI is headless with Xvfb
- **Electron**: Different behavior in headless mode
- **Environment variables**: CI has specific vars (LIBGL_ALWAYS_INDIRECT, etc.)
- **File permissions**: Different in CI containers
- **Performance**: CI may be slower, affecting timeouts

**Use `pnpm run test:headless` to simulate CI conditions locally**

## Workflow Structure

### Main CI (`ci.yml`)
- **Unit tests**: All Node.js versions (18.x, 20.x, 22.x)
- **Integration tests**: Only Node.js 22.x with Xvfb
- **Full testing suite**: lint, typecheck, coverage, security

### Build/Release Workflows
- **Unit tests only**: Fast validation
- **No display server needed**: Simpler setup
- **Focus on packaging**: Build, lint, package

## Before Pushing Changes

Always run:
```bash
pnpm run validate:workflows
```

This ensures:
1. All commands work locally
2. Workflow syntax is valid
3. Unit/integration test separation is correct
4. Display server requirements are met

## Troubleshooting

### act Issues
```bash
# Check act version
act --version

# List available workflows
act --list

# Test specific workflow
act -W .github/workflows/ci.yml --list
```

### Common Fixes
1. **Quote glob patterns** in package.json scripts
2. **Use `test:unit`** in build workflows
3. **Use `test:ci`** only in main CI workflow
4. **Set up Xvfb** only where integration tests run
5. **Add timeouts** for commands that show UI dialogs in headless mode

## Version Management

Our workflows automatically read Node.js and pnpm versions from project configuration instead of using hardcoded versions:

### Configuration Files

- **`.nvmrc`**: Specifies the Node.js version (22.15.0)
- **`package.json`**: 
  - `engines.node`: Minimum Node.js version (>=18.0.0)
  - `engines.pnpm`: Minimum pnpm version (>=9.0.0)  
  - `packageManager`: Exact pnpm version (pnpm@10.12.1)

### Workflow Configuration

Workflows use:
- `node-version-file: '.nvmrc'` to read Node.js version from .nvmrc
- `pnpm/action-setup@v4.1.0` without version to read from `packageManager` field

### Version Verification

```bash
# Check version consistency across project
pnpm run verify:versions
```

This script verifies:
- ✅ .nvmrc matches current Node.js version
- ✅ package.json has proper engines and packageManager fields
- ✅ Workflows use node-version-file instead of hardcoded versions
- ✅ Workflows read pnpm version from packageManager field
- ✅ Matrix strategies are properly configured for multi-version testing

## Testing Methods

### Method 1: Direct Command Testing (Recommended)

Test the individual commands that run in the workflow:

```bash
# Test build process
pnpm run build:production

# Test code quality checks
pnpm run analyze:deps
pnpm run docs:generate

# Test security
pnpm run security:check

# Test full test suite
pnpm run test:all

# Test coverage
pnpm run test:coverage
```

### Method 2: Act Local Testing

Use `act` to run workflows in Docker containers:

```bash
# List available workflows
act --list

# Test specific job (may fail due to GitHub Actions dependencies)
act -W .github/workflows/ci.yml --job quality

# Test with specific workflow file and job
act -W .github/workflows/ci.yml --job test --matrix node-version:22.x
```

## Local Testing Scripts

### Available Scripts

```bash
# Version verification
pnpm run verify:versions    # Check version consistency

# Testing scripts
pnpm run test:integration:local  # Run integration tests locally with display setup
pnpm run debug:ci-env           # Debug CI environment and display setup

# Direct workflow testing
pnpm run workflow:test-direct

# Individual job testing with act
pnpm run workflow:test      # Test job
pnpm run workflow:build     # Build job  
pnpm run workflow:quality   # Quality job
pnpm run workflow:security  # Security job
pnpm run workflow:all       # All jobs

# Workflow inspection
pnpm run workflow:list      # List all workflows
pnpm run workflow:dry-run   # Dry run all workflows
```

### Manual Testing

```bash
# Test the exact commands from each job

# Test Job Commands
pnpm run lint
pnpm run typecheck  
pnpm run build
pnpm run test:unit
pnpm run test:ci  # (integration tests)
pnpm run test:coverage
pnpm run security:check

# Build Job Commands  
pnpm run build:production
pnpm run package

# Quality Job Commands
pnpm run analyze:deps
pnpm run docs:generate

# All commands together
pnpm run validate && pnpm run test:all && pnpm run package
```

## Debugging Failed Workflows

### Check Individual Commands

```bash
# Test each command that failed
pnpm run <failed-command>

# Check exit codes
echo $?
```

### Check Dependencies

```bash
# Verify all dependencies are installed
pnpm install

# Check for missing global tools
which vsce
which typedoc
which madge
```

### Check Environment

```bash
# Check Node.js version
node --version

# Check pnpm version  
pnpm --version

# Check VS Code for integration tests
code --version
```

## CI/CD Environment Differences

### Local vs CI Differences

| Aspect | Local | CI |
|--------|-------|---|
| VS Code | Installed | Requires Xvfb setup |
| Display | `:0` | `:99` (virtual) |
| Secrets | Empty/dummy | Real secrets |
| Docker | Native | Docker-in-Docker |
| Artifacts | Local files | Uploaded artifacts |

### Environment Variables

```bash
# CI sets these automatically
CI=true
NODE_ENV=test
DISPLAY=:99

# Local testing
export CI=true
export NODE_ENV=test  
export DISPLAY=:99
```

## Troubleshooting

### Common Error Messages

1. **"authentication required"** - Act can't clone actions (use --dryrun)
2. **"No entry points found"** - TypeDoc config issue (fixed)
3. **"Command failed with exit code 1"** - Check individual command
4. **"Display not found"** - Need Xvfb for VS Code tests

### Quick Fixes

```bash
# Reset and rebuild
pnpm run clean
pnpm install
pnpm run build

# Test minimal workflow
pnpm run lint && pnpm run typecheck && pnpm run test:unit

# Full local CI simulation
pnpm run validate && pnpm run test:all && pnpm run docs:generate && pnpm run package
```

## Act Configuration

The `.actrc` file configures act with:

- Ubuntu containers (`catthehacker/ubuntu:act-latest`)
- Required environment variables
- Dummy secrets for local testing
- Container reuse for faster runs

```bash
# View current act configuration
cat .actrc

# Test act configuration
act --list
```

## Success Criteria

✅ All these commands should pass:

```bash
pnpm run lint                 # Linting passes
pnpm run typecheck           # Type checking passes  
pnpm run build               # Build succeeds
pnpm run test:unit           # Unit tests pass
pnpm run test:integration    # Integration tests pass
pnpm run analyze:deps        # No circular dependencies
pnpm run docs:generate       # Documentation generates
pnpm run security:check      # No vulnerabilities
pnpm run package             # VSIX package creates
```

If all these pass locally, the workflow should pass in CI! 🚀 