# Quick Start Guide

## 🚀 For New Developers

### Clone and Setup
```bash
git clone https://github.com/hongkongkiwi/nextjs-llm-context
cd nextjs-llm-context
pnpm install
```

### Development Workflow
```bash
# Start development (watch mode)
pnpm run dev

# Lint code
pnpm run lint

# Build extension
pnpm run build

# Package for testing
pnpm run package

# Install locally for testing
pnpm run package:install

# Run full CI pipeline
pnpm run ci

# Quick CI (no tests)
pnpm run ci:fast
```

### Release Workflow
```bash
# Patch release (2.1.1 → 2.1.2)
pnpm run release

# Minor release (2.1.1 → 2.2.0)
pnpm run version:minor

# Major release (2.1.1 → 3.0.0)
pnpm run version:major
```

### Testing Extension
1. Run `pnpm run package:install`
2. Press `F5` in VS Code to launch Extension Development Host
3. Open a Next.js project in the new window
4. Click the Next.js LLM Context icon in the Activity Bar

### Debugging
- Use VS Code's built-in debugger with the included `launch.json`
- Console logs appear in VS Code's Developer Tools
- Extension logs appear in Output panel → "Extension Host"

## 📁 Project Structure

```
├── src/extension.ts          # Main extension code (2,673 lines - needs refactoring!)
├── .github/workflows/        # CI/CD automation
├── media/                    # Screenshots and images
├── images/                   # Extension icon
├── IMPROVEMENTS.md           # Detailed improvement plan
├── CONTRIBUTING.md          # How to contribute
└── README.md                # Main documentation
```

## 🎯 Next Steps

1. **Code Refactoring** - Break down the large extension.ts file
2. **Add Tests** - Implement proper test suite
3. **Performance** - Optimize for large codebases
4. **Features** - Add new prompt templates and formats

See `IMPROVEMENTS.md` for detailed roadmap. 