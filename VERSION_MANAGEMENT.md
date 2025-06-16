# Version Management & Release Process

This project uses [bumpp](https://github.com/antfu/bumpp) for automated version management and release automation.

## 📦 Version Information

Check current version and git status:

```bash
pnpm run version:info
```

This will show:
- Current package version
- Git branch and status
- Latest tag information
- Available release commands

## 🚀 Quick Version Bumping

### Interactive Mode
```bash
pnpm run bump
```
Prompts you to select version type and shows preview before committing.

### Direct Version Bumps
```bash
# Patch version (2.1.1 → 2.1.2) - for bug fixes
pnpm run bump:patch

# Minor version (2.1.1 → 2.2.0) - for new features
pnpm run bump:minor

# Major version (2.1.1 → 3.0.0) - for breaking changes
pnpm run bump:major

# Prerelease version (2.1.1 → 2.1.2-beta.0)
pnpm run bump:pre
```

## 🎯 Full Release Process

### Automated Release Script
The release script handles the complete process:
1. ✅ Checks working directory is clean
2. ✅ Pulls latest changes
3. ✅ Runs full CI pipeline (lint, typecheck, test, build)
4. ✅ Bumps version with bumpp
5. ✅ Commits, tags, and pushes
6. ✅ Triggers GitHub release workflow

```bash
# Patch release (recommended for most releases)
pnpm run release:script:patch

# Minor release (new features)
pnpm run release:script:minor  

# Major release (breaking changes)
pnpm run release:script:major

# Prerelease (beta versions)
pnpm run release:script:prerelease
```

### Manual Release Process
If you prefer manual control:

```bash
# Option 1: Full CI + version bump
pnpm run release           # patch
pnpm run release:minor     # minor  
pnpm run release:major     # major

# Option 2: Just version bump (with commit, tag, push)
pnpm run version:patch     # patch
pnpm run version:minor     # minor
pnpm run version:major     # major
```

## ⚙️ Configuration

### bumpp.config.ts
The bumpp configuration handles:
- ✅ Version updates in package.json
- ✅ Commit message format: `chore: bump version to v{version}`
- ✅ Git tag format: `v{version}`
- ✅ Automatic push to remote
- ✅ Confirmation prompts

### Release Workflow Trigger
When a tag is pushed (v*), it automatically triggers:
- ✅ GitHub Release workflow (.github/workflows/release.yml)
- ✅ VS Code Marketplace publishing
- ✅ Open VSX Registry publishing
- ✅ VSIX artifact creation

## 🔍 Troubleshooting

### Working Directory Not Clean
```bash
# Check what's uncommitted
git status

# Commit changes or stash them
git add . && git commit -m "your changes"
# or
git stash
```

### Failed CI Pipeline
```bash
# Run individual checks
pnpm run lint
pnpm run typecheck  
pnpm run test
pnpm run build
```

### Tag Already Exists
```bash
# Delete local tag
git tag -d v2.1.1

# Delete remote tag (if needed)
git push origin :refs/tags/v2.1.1
```

## 📋 Version Strategy

- **Patch (x.x.X)**: Bug fixes, documentation updates, dependency updates
- **Minor (x.X.0)**: New features, enhancements, non-breaking changes  
- **Major (X.0.0)**: Breaking changes, major rewrites, API changes
- **Prerelease (x.x.x-beta.X)**: Testing versions before stable release

## 🎯 Recommended Workflow

1. **Development**: Work on feature branches
2. **Testing**: `pnpm run ci` to verify everything works
3. **Release**: `pnpm run release:script:patch` (or minor/major)
4. **Verify**: Check GitHub Actions for successful release
5. **Marketplace**: Verify extension appears in VS Code Marketplace

## 🔗 Related Commands

```bash
# View all version-related commands
pnpm run | grep -E "(version|release|bump)"

# Check GitHub workflow status
# Visit: https://github.com/hongkongkiwi/nextjs-llm-context/actions
``` 