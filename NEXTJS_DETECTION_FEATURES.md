# Next.js Detection Features

This document outlines the enhanced Next.js detection capabilities added to the Universal Context Generator.

## Features Overview

### 1. Version Detection (`VersionDetector`)
Automatically detects versions of Next.js and related libraries from `package.json`:

- **Next.js Version**: Detects major.minor version (e.g., "15.0", "14.2")
- **React Version**: Detects React version
- **Tailwind CSS**: Detects v3 vs v4
- **TypeScript**: Detects if TypeScript is used
- **Database**: Prisma, Drizzle ORM, ZenStack
- **Auth**: Clerk, Supabase Auth
- **API**: tRPC
- **State**: Zustand
- **UI Libraries**: shadcn/ui, Radix UI detection

**Example Output:**
```json
{
  "nextjs": "15.0",
  "react": "18.2.0", 
  "tailwind": "v4",
  "typescript": "5.0.0",
  "prisma": "5.0.0",
  "clerk": "4.0.0"
}
```

### 2. Project Structure Detection (`ProjectStructureDetector`)
Analyzes Next.js project structure according to v15 standardized structure:

#### Router Type Detection
- **App Router**: Detects `app/` directory structure
- **Pages Router**: Detects `pages/` directory structure  
- **Mixed**: Both App and Pages Router present
- **Next.js 15+ Compliance**: Checks for v15 standardized directories

#### Directory Analysis
- **Standard Directories**: `components/`, `lib/`, `utils/`, `hooks/`, `types/`
- **Next.js 15 Recommended**: `components/`, `lib/`, `public/`
- **Config Files**: `next.config.js`, `tailwind.config.js`, `tsconfig.json`
- **Special Files**: App Router files (`layout.tsx`, `page.tsx`, `loading.tsx`, etc.)

#### Recommendations
- Suggests missing recommended directories
- Next.js 15+ compliance suggestions
- App Router migration recommendations

### 3. Environment Variables Detection (`EnvironmentDetector`)
Handles Next.js environment variables according to [official documentation](https://nextjs.org/docs/pages/guides/environment-variables):

#### File Detection and Load Order
Following Next.js precedence:
1. `process.env`
2. `.env.$(NODE_ENV).local`  
3. `.env.local` (not loaded in test environment)
4. `.env.$(NODE_ENV)`
5. `.env`

#### Variable Analysis
- **Public Variables**: `NEXT_PUBLIC_*` (accessible in browser)
- **Private Variables**: Server-side only variables
- **Variable Expansion**: Supports `$VARIABLE` references
- **Environment-Specific**: Development, production, test environments

#### Best Practices Validation
- Checks for `.env.example` file
- Validates `.gitignore` includes environment files
- Identifies potential security issues

**Example Analysis:**
```json
{
  "files": [
    {
      "filename": ".env",
      "publicVariables": {
        "NEXT_PUBLIC_API_URL": "http://localhost:3000/api"
      },
      "privateVariables": {
        "DATABASE_URL": "postgresql://..."
      }
    }
  ],
  "loadOrder": [
    ".env.development.local",
    ".env.local", 
    ".env.development",
    ".env"
  ]
}
```

## Integration with AI Context Generation

### Enhanced Project Detection
The Universal Context Generator now includes:

- **Accurate Version Information**: AI assistants receive precise Next.js version
- **Structure-Aware Context**: Tailored output based on App vs Pages Router
- **Environment Context**: Relevant environment files included in context
- **Technology Stack**: Complete technology stack detection

### AI Assistant Optimizations
Each AI assistant receives optimized context:

- **Claude**: Enhanced with version-specific architectural analysis
- **Cursor**: @codebase integration with structure detection  
- **Windsurf**: Technology stack tables with versions
- **Roo**: Configuration-focused with environment setup
- **Cline**: Task-oriented with structure recommendations

### Token Optimization Benefits
- **Smart Filtering**: Exclude irrelevant technologies based on actual usage
- **Version-Specific Content**: Include only relevant documentation for detected versions
- **Structure-Aware Summaries**: Focused summaries based on project structure

## Usage Example

```typescript
// Automatic detection when generating context
const generator = new UniversalContextGenerator(rootPath);
const results = await generator.generateUniversalContext(['Claude'], {
  includeProjectSummary: true,
  includeFileStructure: true
});

// Results include:
// - Detected Next.js 15.0 with App Router
// - Tailwind v4, TypeScript, Prisma
// - Environment files analysis
// - Structure recommendations
```

## Environment Variables Example

Create `.env.example` in your project:

```bash
# Next.js Environment Variables Example

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/db"

# Next.js Public Variables (browser accessible)
NEXT_PUBLIC_APP_NAME="My Next.js App"
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# Private Server Variables
NEXTAUTH_SECRET="your-secret"
OPENAI_API_KEY="sk-your-key"

# Feature Flags
NEXT_PUBLIC_ENABLE_FEATURE="false"
```

## Benefits

1. **Accurate AI Context**: AI assistants receive precise project information
2. **Version-Specific Guidance**: Recommendations based on actual Next.js version
3. **Structure Compliance**: Ensures Next.js 15+ best practices
4. **Security Best Practices**: Environment variable handling validation
5. **Token Efficiency**: Optimized context based on actual project stack

## Next.js 15 Compliance

The detector specifically checks for Next.js 15+ standardized structure:
- App Router as primary routing method
- Standardized directory structure (`components/`, `lib/`)
- Modern config file formats (`next.config.ts`)
- TypeScript-first approach
- Environment variable best practices

This ensures AI assistants provide relevant, up-to-date guidance for modern Next.js development. 