#!/bin/bash
# Local integration test runner with display setup

set -e

echo "🧪 Running VS Code Integration Tests Locally"
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 Detected macOS - using native display"
    export DISPLAY=:0
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "🐧 Detected Linux - checking for display server"
    
    if [ -z "$DISPLAY" ]; then
        echo "⚠️  No DISPLAY variable set. Setting up Xvfb..."
        
        # Check if Xvfb is available
        if ! command -v Xvfb &> /dev/null; then
            echo -e "${RED}❌ Xvfb not found. Please install it:${NC}"
            echo "  Ubuntu/Debian: sudo apt-get install xvfb"
            echo "  CentOS/RHEL: sudo yum install xorg-x11-server-Xvfb"
            echo "  Arch: sudo pacman -S xorg-server-xvfb"
            exit 1
        fi
        
        echo "🚀 Starting Xvfb on display :99"
        export DISPLAY=:99
        Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
        XVFB_PID=$!
        sleep 3
        
        # Function to cleanup Xvfb on exit
        cleanup() {
            if [ -n "$XVFB_PID" ]; then
                echo "🧹 Cleaning up Xvfb (PID: $XVFB_PID)"
                kill $XVFB_PID 2>/dev/null || true
            fi
        }
        trap cleanup EXIT
        
        echo -e "${GREEN}✅ Xvfb started successfully${NC}"
    else
        echo -e "${GREEN}✅ Using existing display: $DISPLAY${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Unknown OS type: $OSTYPE${NC}"
    echo "Setting DISPLAY to :0 and hoping for the best..."
    export DISPLAY=:0
fi

echo
echo "🏗️  Building extension..."
pnpm run build

echo
echo "🔧 Running integration tests..."
echo "   DISPLAY: $DISPLAY"
echo "   NODE_ENV: ${NODE_ENV:-development}"

# Run the tests
if pnpm run test:integration; then
    echo
    echo -e "${GREEN}✅ Integration tests passed!${NC}"
else
    echo
    echo -e "${RED}❌ Integration tests failed${NC}"
    exit 1
fi 