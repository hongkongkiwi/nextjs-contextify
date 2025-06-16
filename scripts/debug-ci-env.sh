#!/bin/bash
# Debug CI environment for VS Code tests

echo "🔍 CI Environment Debug Information"
echo "=================================="
echo

echo "📋 Environment Variables:"
echo "  NODE_ENV: ${NODE_ENV:-'(not set)'}"
echo "  CI: ${CI:-'(not set)'}"
echo "  DISPLAY: ${DISPLAY:-'(not set)'}"
echo "  GITHUB_ACTIONS: ${GITHUB_ACTIONS:-'(not set)'}"
echo "  RUNNER_OS: ${RUNNER_OS:-'(not set)'}"
echo

echo "💻 System Information:"
echo "  OS Type: $OSTYPE"
echo "  Platform: $(uname -s 2>/dev/null || echo 'Unknown')"
echo "  Architecture: $(uname -m 2>/dev/null || echo 'Unknown')"
echo

echo "🖥️  Display Information:"
if command -v xdpyinfo &> /dev/null && [ -n "$DISPLAY" ]; then
    echo "  Display server info:"
    xdpyinfo -display "$DISPLAY" | head -10 || echo "  Failed to get display info"
else
    echo "  xdpyinfo not available or DISPLAY not set"
fi

echo

echo "🔧 Process Information:"
echo "  Xvfb processes:"
ps aux | grep -i xvfb | grep -v grep || echo "  No Xvfb processes found"

echo

echo "📦 Node.js & Package Info:"
echo "  Node.js version: $(node --version)"
echo "  npm version: $(npm --version)"
echo "  pnpm version: $(pnpm --version 2>/dev/null || echo 'not available')"

echo

echo "🏗️  Build Status:"
if [ -d "out" ]; then
    echo "  ✅ out/ directory exists"
    echo "  Built files: $(find out -name "*.js" | wc -l) JS files"
else
    echo "  ❌ out/ directory missing - run 'pnpm run build' first"
fi

echo

echo "📁 VS Code Test Setup:"
if [ -d ".vscode-test" ]; then
    echo "  ✅ .vscode-test directory exists"
    echo "  VS Code versions: $(ls .vscode-test 2>/dev/null | wc -l)"
else
    echo "  ℹ️  .vscode-test directory not found (will be created)"
fi

echo
echo "🎯 Recommended Actions:"
if [ -z "$DISPLAY" ]; then
    echo "  1. Set DISPLAY environment variable (e.g., export DISPLAY=:99)"
fi
if ! ps aux | grep -i xvfb | grep -v grep >/dev/null; then
    echo "  2. Start Xvfb: Xvfb :99 -screen 0 1024x768x24 &"
fi
if [ ! -d "out" ]; then
    echo "  3. Build the extension: pnpm run build"
fi
echo "  4. Run tests: pnpm run test:integration" 