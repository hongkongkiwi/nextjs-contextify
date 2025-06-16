# Project Validation and Graceful Handling

This document describes how the Next.js LLM Context extension handles different project types and gracefully manages non-Next.js projects.

## Overview

The extension now includes robust project validation to ensure it only operates on supported project types while providing helpful guidance for unsupported projects.

## Supported Project Types

### ✅ Next.js Projects (Fully Supported)
- Projects with `next` as a dependency in package.json
- Both App Router and Pages Router architectures
- All extension features available

### ⚠️ Node.js Projects (Limited Support)
- Projects with package.json but no Next.js dependency
- Extension shows helpful messages and guidance
- Commands are blocked with educational prompts

### ❌ Non-Node.js Projects (Not Supported)
- Projects without package.json
- Non-JavaScript/TypeScript projects
- Extension provides guidance on getting started

## Features

### Project Detection
The extension automatically detects:
- Presence of package.json
- Next.js dependency in any dependency field
- Project structure (app/, pages/, src/ directories)
- Next.js configuration files

### Conditional UI Display
- **Activity Bar**: Shows only when a workspace is open
- **File Explorer**: Only visible in Next.js projects
- **Project Status**: Always visible, shows current project state
- **Commands**: Validated before execution

### Graceful Error Handling
When commands are executed in non-Next.js projects:
- Clear, educational error messages
- Specific suggestions based on project type
- Links to relevant documentation
- No crashes or undefined behavior

## User Experience

### Next.js Projects
```
📊 Project Status
├── ✅ Next.js Project Detected (Version: 14.0.0)
└── 🚀 Ready to generate context

📁 File Selection
├── 📄 Components
├── 📄 Pages/Routes
└── 📄 Configuration
```

### Node.js Projects
```
📊 Project Status
├── ⚠️ Not a Next.js Project
│   ├── 💡 This extension is specifically designed for Next.js projects
│   ├── 💡 To use this extension, you need a Next.js project with "next" as a dependency
│   ├── 💡 Run "npx create-next-app@latest" to create a new Next.js project
│   └── ➕ Create Next.js Project (Click to learn how)
```

### Non-Node.js Projects
```
📊 Project Status
├── ⚠️ Not a Next.js Project
│   ├── 💡 Make sure you're in the root directory of a Node.js project
│   ├── 💡 If this is a Next.js project, ensure package.json exists in the workspace root
│   └── ➕ Create Next.js Project (Click to learn how)
```

## Implementation Details

### ProjectValidator Service
Located in `src/services/ProjectValidator.ts`, this service provides:

```typescript
interface ProjectValidation {
  isValidProject: boolean;
  projectType: 'nextjs' | 'nodejs' | 'unknown';
  hasPackageJson: boolean;
  hasNextJs: boolean;
  nextjsVersion?: string;
  reason?: string;
  suggestions?: string[];
}
```

### Key Methods
- `validateProject()`: Complete project analysis
- `isValidNextJsProject()`: Quick Next.js check
- `isNodeJsProject()`: Quick Node.js check
- `hasNextJsStructure()`: Structural validation
- `generateErrorMessage()`: User-friendly error messages

### Extension Integration
The validation is integrated into:
- Extension activation (`src/extension.ts`)
- Command handlers (all generation commands)
- UI providers (`src/providers/ProjectStatusProvider.ts`)
- VSCode context variables

## Configuration

### Package.json Context Variables
```json
{
  "views": {
    "nextjsLlmContext": [
      {
        "id": "nextjsLlmContextStatus",
        "name": "📊 Project Status",
        "when": "workspaceFolderCount > 0"
      },
      {
        "id": "nextjsLlmContextExplorer",
        "name": "📁 File Selection", 
        "when": "workspaceFolderCount > 0 && nextjsLlmContext.isNextJsProject"
      }
    ]
  }
}
```

### Context Variables Set by Extension
- `nextjsLlmContext.isNextJsProject`: Boolean indicating valid Next.js project

## Error Messages

### Example Error for Node.js Project
```
❌ This is a Node.js project but not a Next.js project

Suggestions:
• This extension is specifically designed for Next.js projects
• To use this extension, you need a Next.js project with "next" as a dependency
• Run "npx create-next-app@latest" to create a new Next.js project

About this extension:
The Next.js LLM Context extension is specifically designed for Next.js projects and helps generate optimized context files for AI assistants like Claude, GPT, and others.

[Learn More] [Cancel]
```

## Testing

Unit tests are provided in `src/test/unit/ProjectValidator.test.ts` covering:
- Next.js project detection
- Node.js project detection
- Non-Node.js project handling
- Error message generation
- Project structure validation

Run tests with:
```bash
pnpm test
```

## Benefits

1. **No Crashes**: Extension never crashes on unsupported projects
2. **Clear Guidance**: Users understand why features aren't available
3. **Educational**: Helps users learn about Next.js and proper setup
4. **Professional UX**: Polished experience regardless of project type
5. **Reduced Support**: Fewer confused users and support requests

## Future Enhancements

Potential improvements:
- Support for Nuxt.js, Astro, or other meta-frameworks
- Project migration guidance
- Template project creation
- Integration with `create-next-app`
- Custom project type detection 