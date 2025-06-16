# GitHub Workflows Documentation

This directory contains automated workflows for the Next.js Contextify VS Code extension.

## Workflows

### 1. CI (Continuous Integration) - `ci.yml`
- **Triggers**: Push/PR to `main` or `develop` branches
- **Purpose**: Run tests, linting, and build verification
- **Matrix**: Tests on Node.js 18 and 20
- **Artifacts**: Creates VSIX package for testing

### 2. Release - `release.yml`
- **Triggers**: Git tags starting with `v` (e.g., `v2.1.2`)
- **Purpose**: Automated release creation
- **Steps**:
  1. Run full CI pipeline (lint, test, build)
  2. Package extension with `vsce`
  3. Create GitHub release with changelog
  4. Upload VSIX file as release asset
  5. Optionally publish to VS Code Marketplace (if `VSCE_PAT` secret is set)

### 3. Build and Upload - `build-upload.yml`
- **Triggers**: Push to `main` branch, manual dispatch
- **Purpose**: Create development builds
- **Artifacts**: Development VSIX files with commit hash

## Setup Instructions

### Prerequisites

- **Node.js 22.15.0+**: Required for building and testing the extension
- **pnpm**: Package manager (automatically installed in GitHub Actions)
- **VS Code 1.85.0+**: For local development and testing

### Repository Secrets

To enable **automatic marketplace publishing**, add these secrets to your GitHub repository:

#### Required for VS Code Marketplace Publishing
- **`VSCE_PAT`**: Personal Access Token from [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
  - Go to https://marketplace.visualstudio.com/manage
  - Click "Create Publisher" or use existing
  - Generate a Personal Access Token with "Marketplace (publish)" scope

#### Required for Open VSX Registry Publishing  
- **`OPEN_VSX_TOKEN`**: Access Token from [Open VSX Registry](https://open-vsx.org/)
  - Go to https://open-vsx.org/
  - Sign in with GitHub
  - Go to User Settings → Access Tokens
  - Generate token with "publish" permission

#### Setting Secrets in GitHub
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret name and value

**Note**: Publishing steps will be **automatically skipped** if secrets are not configured.

1. **VSCE_PAT** (optional): Personal Access Token for VS Code Marketplace
   - Go to [VS Code Publisher Management](https://marketplace.visualstudio.com/manage)
   - Create a PAT with `Marketplace (publish)` scope
   - Add as repository secret

### Release Process

#### Option 1: Using npm scripts (Recommended)
```bash
# Patch release (e.g., 2.1.1 → 2.1.2)
pnpm run release

# Minor release (e.g., 2.1.1 → 2.2.0)
pnpm run version:minor

# Major release (e.g., 2.1.1 → 3.0.0)
pnpm run version:major
```

#### Option 2: Manual
```bash
# 1. Update version in package.json
npm version patch|minor|major

# 2. Push with tags
git push origin main --tags
```

### Development Workflow

```bash
# Install dependencies
pnpm install

# Development build
pnpm run build

# Watch mode for development
pnpm run watch

# Run linter
pnpm run lint

# Lint and fix issues
pnpm run lint:fix

# Run tests
pnpm run test

# Package for testing
pnpm run package

# Install locally for testing
pnpm run package:install

# Full CI pipeline (lint + test + package)
pnpm run ci
```

### Release Workflow

```bash
# Patch release (e.g., 2.1.1 → 2.1.2)
pnpm run release

# Minor release (e.g., 2.1.1 → 2.2.0)
pnpm run version:minor

# Major release (e.g., 2.1.1 → 3.0.0) 
pnpm run version:major
```

## Workflow Outputs

- **CI**: Test results and build artifacts
- **Release**: GitHub release with VSIX file
- **Build and Upload**: Development builds with commit info

## Troubleshooting

### Common Issues

1. **Build fails**: Check Node.js version compatibility
2. **Tests fail**: Ensure all dependencies are installed with `pnpm install`
3. **Packaging fails**: Verify `vsce` is available and `--no-dependencies` flag is used
4. **Release fails**: Check tag format (must start with `v`)

### Debug Steps

1. Check workflow logs in GitHub Actions tab
2. Test locally with `pnpm run ci`
3. Verify package.json scripts work individually
4. Ensure all required files are committed 