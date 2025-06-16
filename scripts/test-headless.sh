#!/bin/bash

# Test VS Code extension in headless mode to simulate CI environment
# This helps identify issues that might occur in GitHub Actions but not locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🖥️  Testing VS Code Extension in Headless Mode${NC}"
echo "This simulates the GitHub Actions environment more closely"
echo ""

# Check if we have a display
if [ -n "$DISPLAY" ]; then
    echo -e "${YELLOW}⚠️  DISPLAY is currently set to: $DISPLAY${NC}"
    echo "For true headless testing, you might want to unset DISPLAY"
    echo ""
fi

# Function to test VS Code with different configurations
test_headless() {
    local config_name=$1
    local extra_args=$2
    
    echo -e "${YELLOW}📋 Testing: $config_name${NC}"
    echo "Extra args: $extra_args"
    
    # Create temporary test config
    cat > .vscode-test-headless.mjs << EOF
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/suite/**/*.test.js',
  workspaceFolder: './test-fixtures',
  mocha: {
    ui: 'tdd',
    timeout: 30000,
    color: true,
    retries: 1,
  },
  extensionDevelopmentPath: '.',
  launchArgs: [
    '--disable-extensions',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--headless',
    '--disable-audio-output',
    '--no-first-run',
    ${extra_args}
  ],
  env: {
    NODE_ENV: 'test',
    DISPLAY: process.env.DISPLAY || ':99',
    LIBGL_ALWAYS_INDIRECT: '1',
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
  },
  version: 'stable',
});
EOF

    if VSCODE_TEST_CONFIG=.vscode-test-headless.mjs vscode-test; then
        echo -e "${GREEN}✅ SUCCESS: $config_name${NC}"
        rm -f .vscode-test-headless.mjs
        return 0
    else
        echo -e "${RED}❌ FAILED: $config_name${NC}"
        rm -f .vscode-test-headless.mjs
        return 1
    fi
}

# Ensure we have built the extension
echo -e "${BLUE}🔨 Building extension first...${NC}"
if ! pnpm run build; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo ""

# Test different configurations
echo -e "${BLUE}🧪 Testing different headless configurations...${NC}"
echo ""

# Test 1: Basic headless
if test_headless "Basic Headless" ""; then
    echo -e "${GREEN}✅ Basic headless test passed!${NC}"
else
    echo -e "${RED}❌ Basic headless test failed${NC}"
    echo ""
    echo -e "${YELLOW}💡 This might indicate issues that would occur in CI${NC}"
    echo "Consider:"
    echo "1. Checking if tests require GUI interactions"
    echo "2. Adding more Electron headless flags"
    echo "3. Mocking GUI-dependent functionality"
    exit 1
fi

echo ""

# Test 2: With virtual display (if available)
if command -v Xvfb >/dev/null 2>&1; then
    echo -e "${YELLOW}🖥️  Testing with virtual display (Xvfb)...${NC}"
    
    # Start Xvfb if not running
    if ! pgrep Xvfb > /dev/null; then
        echo "Starting Xvfb..."
        Xvfb :99 -screen 0 1024x768x24 -ac +extension GLX +render -noreset > /dev/null 2>&1 &
        XVFB_PID=$!
        sleep 3
        
        # Set display for test
        export DISPLAY=:99
        
        echo "Testing with virtual display..."
        if test_headless "With Virtual Display" ""; then
            echo -e "${GREEN}✅ Virtual display test passed!${NC}"
        else
            echo -e "${RED}❌ Virtual display test failed${NC}"
        fi
        
        # Clean up
        if [ -n "$XVFB_PID" ]; then
            kill $XVFB_PID 2>/dev/null || true
        fi
    else
        echo "Xvfb already running, skipping virtual display test"
    fi
else
    echo -e "${YELLOW}⚠️  Xvfb not available, skipping virtual display test${NC}"
    echo "Install with: sudo apt-get install xvfb (Ubuntu) or brew install --cask xquartz (macOS)"
fi

echo ""
echo -e "${GREEN}🎉 Headless testing complete!${NC}"
echo ""
echo "Summary:"
echo "- Extension can run in headless mode"
echo "- Tests should work in GitHub Actions CI"
echo "- Virtual display setup is working (if tested)"
echo ""
echo "If tests passed here but fail in CI, check:"
echo "1. Environment variables in CI workflow"
echo "2. Xvfb configuration in CI"
echo "3. VS Code version differences" 