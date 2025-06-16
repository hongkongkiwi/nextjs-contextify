#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default release type
RELEASE_TYPE="patch"

# Parse command line arguments
case "$1" in
    "patch"|"minor"|"major"|"prerelease")
        RELEASE_TYPE="$1"
        ;;
    "")
        print_warning "No release type specified, defaulting to 'patch'"
        ;;
    *)
        print_error "Invalid release type: $1"
        print_error "Valid types: patch, minor, major, prerelease"
        exit 1
        ;;
esac

print_status "Starting $RELEASE_TYPE release process..."

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    print_error "Working directory is not clean. Please commit or stash your changes."
    git status --short
    exit 1
fi

# Check if we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    print_warning "You're on branch '$current_branch', not 'main'. Continue? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_error "Aborting release."
        exit 1
    fi
fi

# Pull latest changes
print_status "Pulling latest changes..."
git pull origin "$current_branch"

# Run full CI pipeline
print_status "Running CI pipeline..."
if ! pnpm run ci; then
    print_error "CI pipeline failed. Please fix issues before releasing."
    exit 1
fi

print_success "CI pipeline passed!"

# Get current version
current_version=$(node -p "require('./package.json').version")
print_status "Current version: $current_version"

# Bump version, commit, tag, and push
print_status "Bumping version ($RELEASE_TYPE)..."
if [ "$RELEASE_TYPE" = "prerelease" ]; then
    pnpm run version:prerelease
else
    pnpm run "version:$RELEASE_TYPE"
fi

# Get new version
new_version=$(node -p "require('./package.json').version")
print_success "Version bumped from $current_version to $new_version"

print_status "Creating GitHub release..."
print_status "The release workflow should trigger automatically from the tag push."
print_status "Check: https://github.com/hongkongkiwi/nextjs-llm-context/actions"

print_success "🎉 Release process completed!"
print_success "New version: $new_version"
print_success "Tag: v$new_version"
print_success "🚀 GitHub release workflow should be running now." 