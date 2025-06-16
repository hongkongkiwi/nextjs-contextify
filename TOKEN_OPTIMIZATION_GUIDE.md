# 💰 Token Optimization Guide

This guide explains how to minimize AI token costs while maintaining useful context for your AI coding assistants.

## 🎯 Why Token Optimization Matters

- **Cost Control**: AI services charge per token - optimization can save 30-80% on costs
- **Context Quality**: Smaller, focused context often performs better than massive dumps
- **Response Speed**: Less tokens = faster AI responses
- **API Limits**: Stay within token limits of different AI services

---

## 🚀 Optimization Levels

### **Maximum Savings (70-80% reduction)**
```typescript
{
  maxTotalFiles: 20,           // Only top 20 priority files
  maxTokensPerFile: 1000,      // Limit each file to 1K tokens
  priorityThreshold: 7,        // Only high-priority files (7-10)
  excludeTechnologies: [       // Skip bloat technologies
    'prisma', 'zenstack', 'drizzle', 'mongodb'
  ],
  summarizeContent: true,      // Extract only key code elements
  removeComments: true,        // Strip all comments
  excludeLargeFiles: true      // Skip files > 50KB
}
```

**Best for**: Quick queries, specific feature work, prototyping

### **Balanced (40-60% reduction)**
```typescript
{
  maxTotalFiles: 50,           // Top 50 files
  maxTokensPerFile: 2000,      // 2K tokens per file
  priorityThreshold: 5,        // Medium+ priority files
  excludeTechnologies: [       // Common bloat only
    'prisma', 'zenstack', 'mongodb', 'aws-sdk'
  ],
  excludeLargeFiles: true,     // Skip large files
  removeEmptyLines: true       // Basic cleanup
}
```

**Best for**: General development, refactoring, feature additions

### **Custom Selection**
- Choose specific technologies to exclude
- Set custom file and token limits  
- Select content optimization options
- Fine-tune for your use case

---

## 🔧 Technology Exclusions

### **Database & ORM** (Often high-token, low-value for many tasks)
- `prisma` - Prisma schema and generated files
- `zenstack` - ZenStack enhanced schemas  
- `drizzle` - Drizzle ORM configurations
- `mongodb` - MongoDB connection code
- `planetscale` - PlanetScale specific code
- `supabase` - Supabase client code

### **Backend Frameworks** (Skip when doing frontend work)
- `express` - Express.js server code
- `fastify` - Fastify server implementations
- `koa` - Koa.js middleware
- `hapi` - Hapi.js configurations

### **Cloud Services** (Heavy configs, often not needed)
- `aws-sdk` - AWS service integrations
- `firebase` - Firebase SDK and configs
- `vercel` - Vercel-specific configurations

### **File Types** (Automatically excluded)
- `.lock` files - Package lock files
- `.map` files - Source maps
- `.min.js` - Minified JavaScript
- `.d.ts` - TypeScript declarations
- `.log` files - Log files

---

## 📊 Content Optimization Strategies

### **Summarization (70% token reduction)**
```typescript
// Original (200+ lines)
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
// ... 190+ more lines of implementation

// Summarized (20 lines)
// IMPORTS
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
// ... 15 more imports

// KEY EXPORTS  
export const UserProfile = ({ user }: UserProfileProps) => { ... }
export default UserProfile;

// File: components/UserProfile.tsx (200 lines, summarized)
```

### **Comment Removal (10-20% reduction)**
```typescript
// Before
/**
 * UserProfile component for displaying user information
 * @param user - User object with profile data
 * @returns JSX element
 */
const UserProfile = ({ user }) => {
  // Check if user exists
  if (!user) return null;
  
  // Render user profile
  return <div>{user.name}</div>;
};

// After
const UserProfile = ({ user }) => {
  if (!user) return null;
  return <div>{user.name}</div>;
};
```

### **Empty Line Removal (5-10% reduction)**
- Removes unnecessary blank lines
- Maintains code structure
- Reduces visual bloat

---

## 🎛️ Priority-Based Filtering

Files are ranked 1-10 based on importance:

| Priority | File Types | Examples |
|----------|------------|----------|
| **9-10** | Core app files | `app/layout.tsx`, `page.tsx` |
| **7-8** | Key components | Main UI components, layouts |
| **5-6** | Support files | Utilities, hooks, types |
| **3-4** | Config files | `next.config.js`, `tailwind.config.js` |
| **1-2** | Documentation | README.md, docs files |

**Priority threshold of 7** = Only include essential app files
**Priority threshold of 5** = Include main components and utilities
**Priority threshold of 3** = Include most project files

---

## 💡 Optimization Tips

### **For Different AI Assistants**

**Claude (200K tokens)** - Can handle full context
```typescript
// Use minimal optimization
{ maxTotalFiles: 100, priorityThreshold: 3 }
```

**GPT-4 (128K tokens)** - Moderate optimization  
```typescript
// Balanced approach
{ maxTotalFiles: 50, priorityThreshold: 5, excludeLargeFiles: true }
```

**Cursor/Roo (50K tokens)** - Aggressive optimization
```typescript
// Maximum savings
{ maxTotalFiles: 20, summarizeContent: true, priorityThreshold: 7 }
```

### **By Development Task**

**Bug Fixing** - Focus on specific files
```typescript
{ maxTotalFiles: 10, priorityThreshold: 8, excludeTechnologies: ['prisma'] }
```

**New Feature** - Include related components
```typescript
{ maxTotalFiles: 30, priorityThreshold: 6, summarizeContent: false }
```

**Architecture Review** - Broader context
```typescript
{ maxTotalFiles: 80, priorityThreshold: 4, removeComments: true }
```

**Refactoring** - Full component context
```typescript
{ maxTotalFiles: 40, priorityThreshold: 5, excludeTechnologies: ['aws-sdk'] }
```

---

## 📈 Expected Token Savings

| Optimization Level | Files Reduced | Content Reduced | Total Savings |
|-------------------|---------------|-----------------|---------------|
| **Maximum** | 50-70% | 40-60% | **70-80%** |
| **Balanced** | 30-50% | 20-30% | **40-60%** |
| **Light** | 10-20% | 10-15% | **15-30%** |

### **Cost Impact Examples**

**Original Project**: 150 files, 50K tokens, $0.50 per query
- **Maximum Savings**: 30 files, 12K tokens, **$0.12 per query (76% savings)**
- **Balanced**: 75 files, 25K tokens, **$0.25 per query (50% savings)**
- **Light**: 120 files, 40K tokens, **$0.40 per query (20% savings)**

---

## ⚖️ Trade-offs to Consider

### **Aggressive Optimization**
✅ **Pros**: Maximum cost savings, faster responses, focused context
❌ **Cons**: May miss important details, requires higher priority accuracy

### **Balanced Optimization**  
✅ **Pros**: Good savings while maintaining completeness, works for most tasks
❌ **Cons**: Still significant token usage, may exclude relevant files

### **Light Optimization**
✅ **Pros**: Maintains full context, minimal risk of missing information  
❌ **Cons**: Higher costs, slower responses, may hit token limits

---

## 🛠️ Implementation

The optimization features are built into the Universal Context Generator:

1. **Automatic Detection**: Files are automatically prioritized
2. **Smart Filtering**: Technology exclusions use content analysis
3. **Preservation**: Key code structure is maintained during summarization
4. **Metrics**: Real-time feedback on token savings

Use the VS Code command palette:
- `Next.js Contextify: Generate Universal AI Context` 
- Select your optimization level
- Get optimized context files for each AI assistant

**Result**: Dramatically lower AI costs while maintaining code understanding! 🎯 