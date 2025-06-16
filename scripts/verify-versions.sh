#!/bin/bash
# Verify that our workflows are using the correct Node.js and pnpm versions

set -e

echo "🔍 Verifying version consistency across project..."
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get current versions
NODE_VERSION=$(node --version | cut -d'v' -f2)
PNPM_VERSION=$(pnpm --version)

echo "📦 Current versions:"
echo "  Node.js: v${NODE_VERSION}"
echo "  pnpm: ${PNPM_VERSION}"
echo

# Check .nvmrc
if [ -f ".nvmrc" ]; then
    NVMRC_VERSION=$(cat .nvmrc | tr -d '[:space:]')
    echo "📄 .nvmrc specifies: v${NVMRC_VERSION}"
    
    if [ "${NODE_VERSION}" = "${NVMRC_VERSION}" ]; then
        echo -e "  ${GREEN}✅ Matches current Node.js version${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Different from current Node.js version${NC}"
    fi
else
    echo -e "  ${RED}❌ .nvmrc file not found${NC}"
fi
echo

# Check package.json engines
NODE_ENGINE=$(node -p "require('./package.json').engines?.node || 'undefined'")
PNPM_ENGINE=$(node -p "require('./package.json').engines?.pnpm || 'undefined'")
PACKAGE_MANAGER=$(node -p "require('./package.json').packageManager || 'undefined'")

echo "📄 package.json configuration:"
echo "  engines.node: ${NODE_ENGINE}"
echo "  engines.pnpm: ${PNPM_ENGINE}"
echo "  packageManager: ${PACKAGE_MANAGER}"
echo

# Check workflow files for hardcoded versions
echo "🔍 Checking workflows for hardcoded versions..."

HARDCODED_FOUND=false

# Check for hardcoded node-version (not node-version-file or matrix strategy)
HARDCODED_NODE=$(grep -r "node-version:" .github/workflows/ 2>/dev/null | grep -v "node-version-file" | grep -v "matrix.node-version" | grep -v "strategy:" | grep -v "node-version: \[" || true)
if [ -n "$HARDCODED_NODE" ]; then
    echo -e "  ${RED}❌ Found hardcoded node-version in workflows:${NC}"
    echo "$HARDCODED_NODE" | sed 's/^/    /'
    HARDCODED_FOUND=true
fi

# Check for hardcoded pnpm version
HARDCODED_PNPM=$(grep -r "version:" .github/workflows/ 2>/dev/null | grep -A2 -B2 "pnpm/action-setup" | grep "version:" | grep -v "packageManager field" || true)
if [ -n "$HARDCODED_PNPM" ]; then
    echo -e "  ${RED}❌ Found hardcoded pnpm version in workflows:${NC}"
    echo "$HARDCODED_PNPM" | sed 's/^/    /'
    HARDCODED_FOUND=true
fi

if [ "$HARDCODED_FOUND" = false ]; then
    echo -e "  ${GREEN}✅ No problematic hardcoded versions found in workflows${NC}"
fi

echo

# Check for node-version-file usage
if grep -r "node-version-file" .github/workflows/ >/dev/null; then
    echo -e "  ${GREEN}✅ Workflows using node-version-file (reading from .nvmrc)${NC}"
else
    echo -e "  ${YELLOW}⚠️  Workflows not using node-version-file${NC}"
fi

# Check for matrix strategy (this is good for testing)
if grep -r "node-version: \[" .github/workflows/ >/dev/null; then
    echo -e "  ${GREEN}✅ Matrix strategy found (testing multiple Node.js versions)${NC}"
fi

# Check for pnpm setup without version
PNPM_SETUPS=$(grep -r "pnpm/action-setup" .github/workflows/ | wc -l)
PNPM_NO_VERSION=$(grep -A5 "pnpm/action-setup" .github/workflows/* | grep -c "packageManager field" || echo "0")

if [ "$PNPM_SETUPS" -eq "$PNPM_NO_VERSION" ]; then
    echo -e "  ${GREEN}✅ All pnpm setups reading from package.json packageManager${NC}"
else
    echo -e "  ${YELLOW}⚠️  Some pnpm setups may have hardcoded versions${NC}"
fi

echo
echo "📋 Summary:"
echo "  - Create/update .nvmrc with your preferred Node.js version"
echo "  - Set engines.node in package.json (minimum version)"
echo "  - Set packageManager in package.json (exact pnpm version)"
echo "  - Use node-version-file: '.nvmrc' in workflows"
echo "  - Use pnpm/action-setup without version (reads from packageManager)"
echo "  - Matrix strategies with multiple Node.js versions are good for testing"
echo

if [ "$HARDCODED_FOUND" = true ]; then
    echo -e "${RED}⚠️  Found hardcoded versions that should be updated${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Version configuration looks good!${NC}"
fi 