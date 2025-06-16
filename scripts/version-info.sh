#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_version() {
    echo -e "${GREEN}[VERSION]${NC} $1"
}

print_git() {
    echo -e "${YELLOW}[GIT]${NC} $1"
}

echo "📦 Next.js LLM Context - Version Information"
echo "=========================================="

# Get current version from package.json
current_version=$(node -p "require('./package.json').version")
print_version "Current version: $current_version"

# Get git information
current_branch=$(git branch --show-current)
print_git "Current branch: $current_branch"

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    print_git "Working directory: ⚠️  DIRTY (uncommitted changes)"
    echo ""
    echo "Uncommitted changes:"
    git status --short
else
    print_git "Working directory: ✅ CLEAN"
fi

# Get latest tag
latest_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "No tags found")
print_git "Latest tag: $latest_tag"

# Get commit count since latest tag
if [ "$latest_tag" != "No tags found" ]; then
    commits_since_tag=$(git rev-list --count HEAD ^"$latest_tag" 2>/dev/null || echo "0")
    print_git "Commits since latest tag: $commits_since_tag"
fi

echo ""
echo "🚀 Available Release Commands:"
echo "  pnpm run bump                    # Interactive version selection"
echo "  pnpm run bump:patch             # Bump patch version (2.1.1 → 2.1.2)"
echo "  pnpm run bump:minor             # Bump minor version (2.1.1 → 2.2.0)"
echo "  pnpm run bump:major             # Bump major version (2.1.1 → 3.0.0)"
echo "  pnpm run release:script:patch   # Full release process (patch)"
echo "  pnpm run release:script:minor   # Full release process (minor)"
echo "  pnpm run release:script:major   # Full release process (major)" 