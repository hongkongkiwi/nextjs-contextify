#!/bin/bash

# Test GitHub Actions workflows locally using act
# Usage: ./scripts/test-workflow-local.sh [workflow-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing GitHub Actions workflows locally with act${NC}"
echo ""

# Check if act is installed
if ! command -v act &> /dev/null; then
    echo -e "${RED}❌ act is not installed. Install it with: brew install act${NC}"
    exit 1
fi

# Function to test a specific workflow
test_workflow() {
    local workflow=$1
    local workflow_file=".github/workflows/${workflow}.yml"
    
    if [ ! -f "$workflow_file" ]; then
        echo -e "${RED}❌ Workflow file not found: $workflow_file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}📋 Testing workflow: $workflow${NC}"
    echo "File: $workflow_file"
    echo ""
    
    # Test the workflow with act
    echo -e "${BLUE}🚀 Running act for $workflow...${NC}"
    if act --job test --workflows "$workflow_file" --dry-run; then
        echo -e "${GREEN}✅ Workflow $workflow syntax is valid${NC}"
        echo ""
        
        # Ask if user wants to run it for real
        read -p "Do you want to run this workflow for real? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}🏃 Running workflow $workflow...${NC}"
            act --job test --workflows "$workflow_file"
        fi
    else
        echo -e "${RED}❌ Workflow $workflow has issues${NC}"
        return 1
    fi
    
    echo ""
}

# If specific workflow provided, test only that one
if [ $# -eq 1 ]; then
    test_workflow "$1"
    exit 0
fi

# Test all main workflows
workflows=("ci" "build-upload" "release" "publish")

echo "Available workflows to test:"
for i in "${!workflows[@]}"; do
    echo "  $((i+1)). ${workflows[$i]}"
done
echo "  a. All workflows"
echo ""

read -p "Which workflow to test? (1-${#workflows[@]}/a): " choice

case $choice in
    1|2|3|4)
        idx=$((choice-1))
        test_workflow "${workflows[$idx]}"
        ;;
    a|A)
        echo -e "${BLUE}🔄 Testing all workflows...${NC}"
        for workflow in "${workflows[@]}"; do
            test_workflow "$workflow"
            echo "---"
        done
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}✅ Workflow testing complete!${NC}" 