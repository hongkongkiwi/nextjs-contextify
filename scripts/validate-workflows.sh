#!/bin/bash

# Comprehensive workflow validation script
# Tests both local commands and workflow syntax

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Comprehensive Workflow Validation${NC}"
echo "This validates both local commands and workflow syntax"
echo ""

# Step 1: Test local CI commands
echo -e "${BLUE}Step 1: Testing CI Commands Locally${NC}"
echo ""
if ./scripts/test-ci-commands.sh; then
    echo -e "${GREEN}✅ All local CI commands passed!${NC}"
else
    echo -e "${RED}❌ Some local CI commands failed. Fix these first.${NC}"
    exit 1
fi

echo ""
echo "---"
echo ""

# Step 2: Validate workflow syntax with act
echo -e "${BLUE}Step 2: Validating Workflow Syntax${NC}"
echo ""

workflows=("ci" "build-upload" "release" "publish")
all_valid=true

for workflow in "${workflows[@]}"; do
    echo -e "${YELLOW}📋 Checking $workflow.yml syntax...${NC}"
    
    if act -W ".github/workflows/${workflow}.yml" --list > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $workflow.yml syntax is valid${NC}"
    else
        echo -e "${RED}❌ $workflow.yml has syntax issues${NC}"
        all_valid=false
    fi
done

echo ""

if [ "$all_valid" = true ]; then
    echo -e "${GREEN}🎉 All workflows validated successfully!${NC}"
    echo ""
    echo "Summary:"
    echo "✅ Local CI commands work correctly"
    echo "✅ All workflow syntax is valid"
    echo "✅ Unit tests run without display server"
    echo "✅ Integration tests properly conditional"
    echo ""
    echo -e "${BLUE}🖥️  Optional: Test headless mode for CI compatibility${NC}"
    echo "Run: pnpm run test:headless"
    echo ""
    echo "Your workflows should work correctly in GitHub Actions!"
else
    echo -e "${RED}❌ Some workflows have issues. Please review and fix.${NC}"
    exit 1
fi 