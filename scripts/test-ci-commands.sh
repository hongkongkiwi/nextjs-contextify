#!/bin/bash

# Test the main CI commands locally to validate workflow changes
# This simulates what happens in GitHub Actions without needing full workflow execution

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing CI Commands Locally${NC}"
echo "This simulates the main commands from our GitHub Actions workflows"
echo ""

# Function to run a command and track results
run_command() {
    local name=$1
    local cmd=$2
    local required=${3:-true}
    
    echo -e "${YELLOW}📋 Testing: $name${NC}"
    echo "Command: $cmd"
    
    if eval "$cmd"; then
        echo -e "${GREEN}✅ SUCCESS: $name${NC}"
        echo ""
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}❌ FAILED: $name${NC}"
            echo "This would cause the CI to fail!"
            echo ""
            return 1
        else
            echo -e "${YELLOW}⚠️  SKIPPED: $name (optional)${NC}"
            echo ""
            return 0
        fi
    fi
}

# Test sequence matching build-upload.yml workflow
echo -e "${BLUE}🏗️  Testing Build-Upload Workflow Commands${NC}"
echo ""

# 1. Install dependencies (simulated)
echo -e "${GREEN}✅ Dependencies would be installed via pnpm install${NC}"
echo ""

# 2. Linting
run_command "Linting" "pnpm run lint"

# 3. Unit tests (the main issue we're fixing)
run_command "Unit Tests" "pnpm run test:unit"

# 4. Build
run_command "Build Extension" "pnpm run build"

# 5. Package (might fail without vsce, but let's check)
run_command "Package Extension" "pnpm run package" false

echo ""
echo -e "${BLUE}🔍 Testing Other Workflow Commands${NC}"
echo ""

# Commands from release.yml and publish.yml (same pattern)
run_command "Type Checking" "pnpm run typecheck"
run_command "Security Check" "pnpm run security:check" false

echo ""
echo -e "${BLUE}🧪 Testing Integration Test Commands (for CI workflow)${NC}"
echo ""

# These should only run with proper display setup
echo -e "${YELLOW}📋 Integration Test Check${NC}"
if [ -n "$DISPLAY" ]; then
    echo "DISPLAY is set to: $DISPLAY"
    run_command "Integration Tests" "pnpm run test:ci" false
else
    echo -e "${YELLOW}⚠️  No DISPLAY set - integration tests would be skipped (as expected)${NC}"
fi

echo ""
echo -e "${GREEN}✅ Local CI command testing complete!${NC}"
echo ""
echo "Summary:"
echo "- Unit tests: Should work without display server"
echo "- Integration tests: Require DISPLAY (only run on Node 22.x in CI)"
echo "- Build/package commands: Should work in CI environment"
echo ""
echo "If all required commands passed, the workflows should work in CI!" 