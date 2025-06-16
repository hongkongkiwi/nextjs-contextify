#!/bin/bash

# Test GitHub Actions workflow locally using act
set -e

echo "🔧 Testing Next.js LLM Context workflow with act..."

# Function to run a specific job
run_job() {
    local job_name=$1
    echo "🚀 Running job: $job_name"
    
    case $job_name in
        "test")
            echo "Testing on Node.js 22.x (integration tests included)"
            act --job test --matrix node-version:22.x
            ;;
        "test-unit")
            echo "Testing unit tests only on all Node.js versions"
            act --job test --matrix node-version:18.x
            ;;
        "build")
            echo "Testing build job"
            act --job build
            ;;
        "quality")
            echo "Testing code quality job"
            act --job quality
            ;;
        "security")
            echo "Testing security job (PR context)"
            act pull_request --job security
            ;;
        "all")
            echo "Testing all jobs in sequence"
            act --job test --matrix node-version:22.x
            act --job build
            act --job quality
            ;;
        *)
            echo "❌ Unknown job: $job_name"
            echo "Available jobs: test, test-unit, build, quality, security, all"
            exit 1
            ;;
    esac
}

# Parse command line arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <job_name>"
    echo "Available jobs:"
    echo "  test       - Run full test suite (Node.js 22.x with integration tests)"
    echo "  test-unit  - Run unit tests only (Node.js 18.x)"
    echo "  build      - Run build and package job"
    echo "  quality    - Run code quality checks"
    echo "  security   - Run security scan (PR context)"
    echo "  all        - Run all jobs in sequence"
    exit 1
fi

# Run the requested job
run_job $1

echo "✅ Workflow test completed successfully!" 