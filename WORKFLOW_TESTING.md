# Workflow Testing Guide

This guide covers testing GitHub Actions workflows locally using `act` and direct command execution.

## Quick Start

```bash
# Verify version configuration
pnpm run verify:versions

# Test all workflow scripts directly
pnpm run workflow:test-direct

# Test specific workflow job with act
pnpm run workflow:quality

# List all available workflows
pnpm run workflow:list
```

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

## Common Issues and Solutions

### Issue 1: VS Code Tests in CI

**Problem**: Integration tests require VS Code which isn't available in CI without setup.

**Solution**: The workflow uses Xvfb (Virtual Framebuffer) for headless testing:

```yaml
- name: Setup Xvfb for VS Code tests
  run: |
    sudo apt-get update
    sudo apt-get install -y xvfb
    echo "DISPLAY=:99" >> $GITHUB_ENV
    Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
    sleep 3
  if: matrix.node-version == '22.x'
```

**Key improvements:**
- Uses `$GITHUB_ENV` to persist DISPLAY variable across workflow steps
- Adds `sleep 3` to ensure Xvfb is ready before tests run
- Enhanced VS Code launch args for better CI stability

### Issue 2: Act Authentication

**Problem**: Act can't clone GitHub Actions due to authentication.

**Solution**: Use direct command testing or run act with `--dryrun`:

```bash
# See what act would do without running
act --dryrun -W .github/workflows/ci.yml --job quality
```

### Issue 3: Circular Dependencies

**Problem**: `build:production` was calling tests, but tests were already run in test job.

**Solution**: Fixed `build:production` to avoid running tests:

```json
{
  "build:production": "pnpm run clean && pnpm run lint && pnpm run typecheck && tsc -p ./"
}
```

### Issue 4: Docs Generation

**Problem**: TypeDoc couldn't find entry points.

**Solution**: Added `--entryPointStrategy expand` flag:

```json
{
  "docs:generate": "typedoc --out docs --entryPointStrategy expand src/"
}
```

## Workflow Jobs Breakdown

### Test Job

Runs on Node.js 18.x, 20.x, 22.x matrix:

- Linting (`eslint`)
- Type checking (`tsc --noEmit`)
- Build (`tsc`)
- Unit tests (`mocha`)
- Integration tests (VS Code - only on 22.x)
- Coverage report (only on 22.x)
- Security audit (`pnpm audit`)

### Build Job

Depends on test job:

- Build production (`build:production`)
- Package extension (`vsce package`)
- Upload VSIX artifact

### Quality Job

Independent job:

- Analyze dependencies (`madge --circular`)
- Generate documentation (`typedoc`)
- Deploy docs to GitHub Pages (on main branch)

### Security Job

Runs on pull requests:

- Trivy vulnerability scanner
- Upload SARIF results to GitHub

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