# Enhanced Next.js Project Structure Support

This document outlines the comprehensive Next.js project structure detection and support capabilities of the Contextify extension.

## Supported Project Types

### 1. Standard Next.js
- Basic Next.js applications with minimal additional tooling
- Supports both App Router and Pages Router
- **Confidence Threshold**: 50-60%

### 2. T3 Stack
Complete T3 Stack detection with enterprise-grade confidence:
- **tRPC** for type-safe APIs
- **Prisma** for database management
- **NextAuth.js** for authentication
- **Tailwind CSS** for styling
- **TypeScript** for type safety
- **Confidence Threshold**: 70-90%

### 3. ZenStack Enhanced Projects
- **ZenStack** schema files (`.zmodel`)
- Access control policies
- Generated types and hooks
- Prisma schema integration
- **Confidence Threshold**: 75-85%

### 4. Enterprise Next.js
- Multiple authentication providers
- Complex UI library setups
- Multiple database providers
- Monorepo configurations
- **Confidence Threshold**: 60-80%

## Database & ORM Support

### Prisma
- **Schema Detection**: `prisma/schema.prisma`, custom paths via `package.json`
- **Migration Files**: `prisma/migrations/`
- **Seed Files**: `prisma/seed.ts`, `prisma/seed.js`
- **Generated Client**: `@prisma/client`
- **Adapters**: NextAuth, tRPC, custom adapters

### ZenStack
- **Schema Files**: `schema.zmodel`, `prisma/schema.zmodel`, `src/schema.zmodel`
- **Access Control**: Policy definitions in schema
- **Generated Hooks**: React hooks for data access
- **Runtime Integration**: `@zenstackhq/runtime`
- **Custom Paths**: Configurable via settings

### Drizzle ORM
- **Configuration**: `drizzle.config.ts`, `drizzle.config.js`
- **Schema Files**: `src/db/schema.ts`, `db/schema.ts`
- **Migration Support**: Generated migration files
- **Multiple Dialects**: PostgreSQL, MySQL, SQLite

### Supabase
- **Client Configuration**: `src/lib/supabase.ts`
- **Type Generation**: Generated TypeScript types
- **Auth Integration**: Supabase Auth
- **Real-time Support**: Subscriptions and live queries

## Package Manager Detection

### Automatic Detection
The extension automatically detects your package manager based on lock files:

| Package Manager | Lock File | Config File | Priority |
|----------------|-----------|-------------|----------|
| **pnpm** | `pnpm-lock.yaml` | `.npmrc`, `pnpm-workspace.yaml` | Highest |
| **Yarn** | `yarn.lock` | `.yarnrc.yml` | High |
| **Bun** | `bun.lockb` | `bunfig.toml` | Medium |
| **npm** | `package-lock.json` | `.npmrc` | Default |

### Configuration Override
```json
{
  "nextjsContextify.packageManagerOverride": "pnpm"
}
```

## Authentication Libraries

### NextAuth.js
- **Configuration**: `src/server/auth.ts`, `src/lib/auth.ts`
- **API Routes**: `pages/api/auth/[...nextauth].ts`, `app/api/auth/[...nextauth]/route.ts`
- **Providers**: OAuth, credentials, magic links
- **Adapters**: Prisma, Drizzle, custom adapters

### Clerk
- **Middleware**: `src/middleware.ts`
- **Environment**: Clerk keys and configuration
- **Components**: Sign-in/up pages
- **Webhooks**: User management webhooks

### Better Auth
- **Configuration**: `src/lib/auth.ts`
- **API Routes**: `app/api/auth`
- **Session Management**: Server-side sessions
- **Security**: Built-in CSRF protection

### Stack Auth
- **Configuration**: `src/stack.ts`
- **Admin Dashboard**: Built-in user management
- **Team Support**: Organization features
- **Security**: Advanced security features

### Supabase Auth
- **Client Setup**: Supabase client configuration
- **RLS Policies**: Row Level Security
- **Social Providers**: OAuth integrations
- **Magic Links**: Passwordless authentication

### Custom Auth Solutions
- Lucia, Auth0, Firebase Auth
- Custom JWT implementations
- Session-based authentication

## UI Libraries & Component Systems

### shadcn/ui
- **Configuration**: `components.json`
- **Components**: `src/components/ui/`, `components/ui/`
- **Dependencies**: Radix UI primitives
- **Theming**: CSS variables, dark mode

### Radix UI
- **Primitives**: Unstyled, accessible components
- **Composition**: Building custom components
- **Accessibility**: ARIA compliant

### Headless UI
- **React/Vue**: Framework-specific implementations
- **Tailwind Integration**: Perfect styling companion
- **Accessibility**: Built-in focus management

### Chakra UI
- **Theme Configuration**: `src/theme.ts`
- **Component System**: Pre-built components
- **Design Tokens**: Consistent design system

### Mantine
- **Hook System**: Comprehensive hook library
- **Theme Provider**: Advanced theming
- **Form Management**: Built-in form handling

### Ant Design
- **Next.js Integration**: SSR support
- **Theming**: Customizable design tokens
- **Component Library**: Enterprise-grade components

### Material-UI (MUI)
- **Theme Configuration**: Material Design system
- **Component Variants**: Extensive customization
- **Performance**: Tree-shaking support

### NextUI
- **Modern Design**: Beautiful default components
- **Tailwind Integration**: Built on Tailwind CSS
- **Performance**: Optimized for speed

## API Patterns & Data Fetching

### tRPC
- **Router Configuration**: `src/server/api/trpc.ts`
- **Procedure Definitions**: `src/server/api/routers/`
- **Client Setup**: `src/utils/api.ts`
- **Type Safety**: End-to-end type safety

### GraphQL
- **Schema Definition**: `src/graphql/schema.ts`
- **Resolvers**: Query and mutation resolvers
- **Client Integration**: Apollo Client, Relay
- **Code Generation**: Automatic type generation

### REST APIs
- **API Routes**: `pages/api/`, `app/api/`
- **Middleware**: Request/response handling
- **Validation**: Schema validation
- **Documentation**: OpenAPI/Swagger

### Server Actions
- **Next.js 13+**: Server-side form handling
- **Type Safety**: TypeScript integration
- **Streaming**: Progressive enhancement
- **Error Handling**: Built-in error boundaries

### Data Fetching Libraries

#### TanStack Query (React Query)
- **Query Client**: `src/lib/query-client.ts`
- **DevTools**: Development debugging
- **Caching**: Intelligent cache management
- **Background Updates**: Automatic refetching

#### TanStack Table
- **Table Configuration**: Advanced data grids
- **Sorting/Filtering**: Built-in functionality
- **Virtualization**: Performance optimization
- **Accessibility**: Screen reader support

#### AG Grid
- **Enterprise Features**: Advanced data grid
- **Performance**: Virtual scrolling
- **Customization**: Extensive theming
- **Integration**: React/TypeScript support

#### SWR
- **Lightweight**: Minimal API
- **Revalidation**: Smart data fetching
- **Cache Management**: Built-in caching
- **Error Handling**: Retry logic

## Styling & CSS Solutions

### Tailwind CSS
- **Configuration**: `tailwind.config.js`, `tailwind.config.ts`
- **PostCSS**: `postcss.config.js`
- **Plugins**: Form, typography, aspect-ratio
- **JIT Mode**: Just-in-time compilation

#### Tailwind Variants
- **Class Variance Authority (CVA)**: Type-safe variants
- **Tailwind Variants**: Component variants
- **Custom Plugins**: Extended functionality

### PostCSS Ecosystem
- **Autoprefixer**: Vendor prefix management
- **PostCSS Preset Env**: Modern CSS features
- **CSS Nesting**: Nested selectors
- **Custom Properties**: CSS variables

### CSS-in-JS Solutions
- **Styled Components**: Template literals
- **Emotion**: Performance-focused
- **Stitches**: Near-zero runtime
- **Vanilla Extract**: Zero-runtime CSS

## Development Tools & Testing

### Testing Frameworks
- **Jest**: Unit testing framework
- **Vitest**: Vite-native testing
- **React Testing Library**: Component testing
- **Cypress**: End-to-end testing
- **Playwright**: Cross-browser testing

### Development Tools
- **Storybook**: Component development
- **Chromatic**: Visual testing
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks

## Monorepo & Workspace Support

### Package Managers
- **pnpm Workspaces**: `pnpm-workspace.yaml`
- **Yarn Workspaces**: `package.json` workspaces
- **npm Workspaces**: Native npm support

### Build Tools
- **Turborepo**: `turbo.json` configuration
- **Lerna**: `lerna.json` multi-package repos
- **Rush**: `rush.json` enterprise builds

### Configuration
```json
{
  "nextjsContextify.monorepo.enabled": true,
  "nextjsContextify.monorepo.detectAutomatically": true,
  "nextjsContextify.monorepo.includedWorkspaces": ["apps/web", "packages/ui"]
}
```

## File Categorization & Prioritization

### Priority System (0-100)

#### Core Configurations (80-100)
- `next.config.js/ts/mjs` - Priority 100
- `package.json` - Priority 95
- `tsconfig.json` - Priority 90
- `middleware.ts` - Priority 88
- `instrumentation.ts` - Priority 85

#### Database Layer (75-85)
- ZenStack schemas (`.zmodel`) - Priority 85
- Prisma schema - Priority 83
- Drizzle config - Priority 81

#### Authentication (75-82)
- NextAuth config - Priority 82
- Clerk middleware - Priority 80
- Supabase auth - Priority 78
- API auth routes - Priority 76

#### API Layer (70-80)
- tRPC server setup - Priority 80
- tRPC routers - Priority 78
- tRPC root - Priority 76
- GraphQL schema - Priority 75

#### UI & Styling (65-75)
- Tailwind config - Priority 75
- UI component configs - Priority 73
- Theme files - Priority 70

#### App Structure (60-75)
- App Router layouts/pages - Priority 74
- App Router special files - Priority 72
- API routes - Priority 70
- Pages Router files - Priority 65-72

## Custom Configuration Paths

### Database Schemas
```json
{
  "prisma": {
    "schema": "custom/path/schema.prisma"
  }
}
```

### ZenStack Schemas
```json
{
  "nextjsContextify.customDatabaseSchemaPaths": [
    "custom/schema.zmodel",
    "db/models.zmodel"
  ]
}
```

### Configuration Overrides
```json
{
  "nextjsContextify.customConfigPaths": {
    "tailwind": "config/tailwind.config.js",
    "prisma": "database/schema.prisma",
    "zenstack": "models/schema.zmodel"
  }
}
```

## Performance Optimization

### Parallel Scanning
- **Multi-threaded**: Concurrent file processing
- **Smart Caching**: Results cached for 5 minutes
- **Progressive Loading**: Incremental context building

### Configuration
```json
{
  "nextjsContextify.performance.enableParallelScanning": true,
  "nextjsContextify.performance.maxFilesPerScan": 10000,
  "nextjsContextify.performance.cacheResults": true,
  "nextjsContextify.performance.cacheTTL": 300000
}
```

## Version Support

### Next.js Versions
- **Next.js 14**: Full support for App Router and Server Actions
- **Next.js 15**: Enhanced support for latest features
- **Legacy Support**: Pages Router compatibility

### Library Compatibility
- **Prisma**: v5+ with enhanced features
- **tRPC**: v10+ with App Router integration
- **TanStack Query**: v5+ with React Server Components
- **Tailwind CSS**: v3+ with all modern features

## Troubleshooting

### Debug Mode
```json
{
  "nextjsContextify.advanced.debugMode": true,
  "nextjsContextify.advanced.verboseLogging": true
}
```

### Common Issues
1. **Missing Dependencies**: Check package.json for required libraries
2. **Custom Paths**: Configure custom paths in settings
3. **Performance**: Adjust scanning limits for large projects
4. **Cache Issues**: Clear cache or disable caching temporarily

### Support
- File detection confidence scores help identify issues
- Recommendations provide setup guidance
- Warning system alerts to potential problems

## Migration Guide

### From Basic to Enhanced
1. **Update Settings**: Enable new detection features
2. **Configure Paths**: Set custom file paths if needed
3. **Review Output**: Check categorization accuracy
4. **Adjust Priorities**: Fine-tune file importance

### Project-Specific Setup
1. **T3 Stack**: Enable all T3-related options
2. **Enterprise**: Configure monorepo and advanced features
3. **Custom Setup**: Use overrides for unique configurations

This enhanced detection system provides enterprise-grade Next.js project analysis with intelligent categorization and prioritization for optimal AI context generation. 