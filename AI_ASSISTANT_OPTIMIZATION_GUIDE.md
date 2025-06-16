# 🤖 AI Assistant Context Optimization Guide

This guide covers specific optimizations, quirks, and requirements for major AI coding assistants.

## 🧠 Claude (Anthropic)

### **Strengths & Preferences**
- **Long Context Window**: 200K+ tokens (Claude 3.5 Sonnet)
- **Structured Thinking**: Prefers hierarchical, well-organized content
- **Analysis Depth**: Excellent at understanding complex architectures
- **Markdown Excellence**: Native markdown parsing and generation

### **Optimal Context Format**
```markdown
# Executive Summary
[High-level project analysis]

# Architecture Overview
[Technical structure breakdown]

# Implementation Details
[Categorized by functionality]
```

### **Specific Optimizations**
- **Executive Summary First**: Claude plans better with overview
- **Hierarchical Sections**: Use clear H1, H2, H3 structure
- **Code Documentation**: Include inline comments and JSDoc
- **Dependency Relationships**: Show how components interact
- **Design Patterns**: Highlight architectural decisions

### **Token Management**
- Can handle large contexts effectively
- Include comprehensive file content
- Add detailed explanations and context
- Use full project structure trees

---

## 🎯 Cursor

### **Strengths & Preferences**
- **VSCode Integration**: Deep editor integration
- **@codebase Feature**: Semantic code search
- **Quick Navigation**: Anchor links and references
- **File Tree Awareness**: Understands project structure

### **Optimal Context Format**
```markdown
# Quick Navigation
1. [Config Files](#config)
2. [Components](#components)
3. [API Routes](#api)

# Project Overview
[Concise summary]

# File Contents
[Anchor-linked sections]
```

### **Specific Optimizations**
- **Anchor Links**: `[filename.tsx](#file-1)` for quick jumping
- **Compact Format**: Avoid verbose explanations
- **File Priorities**: Most important files first
- **Relative Paths**: Use project-relative file paths
- **Component Relationships**: Show import/export connections

### **Integration Features**
- **@codebase Integration**: Structure for semantic search
- **Inline References**: Use `@filename` syntax
- **Multi-file Context**: Group related files together
- **Symbol Maps**: Include function/class definitions

---

## 🛠️ Roo

### **Strengths & Preferences**
- **CLI-First Approach**: Command-line oriented
- **Configuration Focus**: Emphasizes setup files
- **Practical Actions**: Ready-to-implement solutions
- **Tool Integration**: Works well with build tools

### **Optimal Context Format**
```markdown
# Project Setup
[Configuration files and build setup]

# Development Workflow
[Scripts, commands, and processes]

# Source Code
[Implementation files by priority]
```

### **Specific Optimizations**
- **Config Files First**: package.json, tsconfig.json, etc.
- **Build Commands**: Include npm/pnpm scripts
- **Environment Setup**: .env examples and requirements
- **Tool Configurations**: ESLint, Prettier, etc.
- **Deployment Info**: Vercel, Netlify configurations

### **Command Integration**
- **Executable Examples**: Include runnable commands
- **Script References**: Link to package.json scripts
- **File Paths**: Use relative paths for CLI operations

---

## 🌊 Windsurf

### **Strengths & Preferences**
- **Modern UI**: Clean, visual interface
- **Technology Stack Focus**: Framework identification
- **Project Intelligence**: Smart file categorization
- **Team Collaboration**: Multi-developer workflows

### **Optimal Context Format**
```markdown
# Technology Stack
[Framework and library overview]

# Project Architecture
[Structure and organization]

# Development Guidelines
[Coding standards and practices]
```

### **Specific Optimizations**
- **Stack Overview**: Clear framework identification
- **Visual Structure**: Use tables and organized lists
- **Feature Mapping**: Connect files to features
- **Dependency Graph**: Show library relationships
- **Coding Standards**: Include style guides

### **Team Features**
- **Collaboration Notes**: Team conventions
- **Code Review Guidelines**: PR templates
- **Documentation Links**: Wiki and docs references

---

## 🤖 Cline (formerly Claude Dev)

### **Strengths & Preferences**
- **Task-Oriented**: Focused on specific objectives
- **Structured Data**: Tables and organized information
- **Dependency Awareness**: Library and framework knowledge
- **Implementation Focus**: Ready-to-code solutions

### **Optimal Context Format**
```markdown
| File | Purpose | Priority | Dependencies |
|------|---------|----------|--------------|
| app.tsx | Main App | High | React, Next.js |

# Implementation Tasks
[Structured by objectives]
```

### **Specific Optimizations**
- **Tabular Data**: Use tables for file information
- **Task Breakdown**: Organize by implementation goals
- **Dependency Lists**: Clear library requirements
- **Code Snippets**: Include relevant examples
- **Error Patterns**: Common issues and solutions

### **Development Workflow**
- **Step-by-Step Guides**: Implementation instructions
- **Testing Strategies**: Unit and integration tests
- **Debugging Info**: Common error patterns

---

## 💫 GitHub Copilot / Copilot Chat

### **Strengths & Preferences**
- **VSCode Native**: Deep editor integration
- **Context Awareness**: Uses open files automatically
- **Inline Suggestions**: Real-time code completion
- **Chat Interface**: Conversational development

### **Optimal Context Format**
```markdown
# Workspace Context
[Currently relevant files and context]

# Coding Patterns
[Project-specific conventions]

# Recent Changes
[Git history and modifications]
```

### **Specific Optimizations**
- **Open Files Focus**: Prioritize currently open files
- **Function Context**: Include surrounding code
- **Naming Conventions**: Project-specific patterns
- **Import Statements**: Standard import practices
- **Type Definitions**: TypeScript interfaces and types

### **Integration Benefits**
- **Automatic Context**: Leverages VSCode workspace
- **Git Integration**: Understands recent changes
- **Symbol Understanding**: Knows project structure

---

## 🔄 Continue

### **Strengths & Preferences**
- **Open Source**: Customizable and extensible
- **Multi-Model**: Supports various AI providers
- **Context Management**: Flexible context windows
- **Plugin Architecture**: Extensible functionality

### **Optimal Context Format**
```markdown
# Model Configuration
[AI provider settings]

# Context Strategy
[Token management approach]

# Plugin Integration
[Extension configurations]
```

### **Specific Optimizations**
- **Model Switching**: Context for different AI models
- **Token Budgeting**: Efficient context management
- **Plugin Context**: Integration with tools
- **Custom Prompts**: Project-specific templates

---

## 🎨 Aider

### **Strengths & Preferences**
- **Git-First**: Version control focused
- **Diff Generation**: Excellent at code changes
- **File Editing**: Direct file modifications
- **Command Line**: Terminal-based workflow

### **Optimal Context Format**
```markdown
# Git Context
[Current branch, recent commits]

# File Structure
[Git-tracked files only]

# Change Requests
[Specific modifications needed]
```

### **Specific Optimizations**
- **Git Status**: Include current branch and changes
- **Tracked Files Only**: Focus on version-controlled files
- **Diff Context**: Show recent modifications
- **Commit Messages**: Include relevant history
- **Branch Strategy**: Development workflow

---

## ☁️ Amazon CodeWhisperer

### **Strengths & Preferences**
- **AWS Integration**: Cloud service knowledge
- **Security Focus**: Security best practices
- **Enterprise Features**: Team management
- **Multi-Language**: Broad language support

### **Optimal Context Format**
```markdown
# AWS Configuration
[Cloud service setup]

# Security Considerations
[Best practices and policies]

# Infrastructure
[Deployment and scaling]
```

### **Specific Optimizations**
- **AWS Services**: Include cloud configurations
- **Security Patterns**: IAM, permissions, etc.
- **Infrastructure Code**: CDK, CloudFormation
- **Environment Variables**: AWS-specific configs

---

## 🔧 Universal Best Practices

### **Token Management**
| Assistant | Token Limit | Strategy |
|-----------|-------------|----------|
| Claude 3.5 | ~200K | Full context, comprehensive |
| GPT-4 | ~128K | Prioritize, summarize |
| Cursor | ~50K | Concise, linked |
| Roo | ~75K | Config-first, practical |

### **File Prioritization**
1. **Configuration Files** (package.json, tsconfig.json)
2. **Entry Points** (app.tsx, index.ts)
3. **Core Components** (layouts, pages)
4. **API Routes** (endpoints, middleware)
5. **Utilities** (helpers, hooks)
6. **Types** (interfaces, schemas)
7. **Tests** (if relevant)

### **Content Organization**
```markdown
# Project Metadata
- Framework: Next.js 14
- Language: TypeScript
- Package Manager: pnpm
- Deployment: Vercel

# Architecture Decisions
- App Router vs Pages Router
- State Management Strategy
- Authentication Method
- Database Choice

# Development Environment
- Node.js version
- IDE configurations
- Required extensions
- Environment variables
```

---

## 📊 Comparison Matrix

| Feature | Claude | Cursor | Roo | Windsurf | Cline | Copilot |
|---------|--------|--------|-----|----------|-------|---------|
| **Context Size** | 200K+ | 50K | 75K | 60K | 80K | 50K |
| **Best Format** | Hierarchical | Linked | Practical | Visual | Tabular | Contextual |
| **Strength** | Analysis | Navigation | CLI | Teams | Tasks | Integration |
| **Focus** | Architecture | Files | Config | Stack | Implementation | Code |

---

## 🚀 Implementation Strategy

### **Multi-Format Generation**
1. **Detect Target Assistant** from user selection
2. **Apply Specific Optimizations** per assistant
3. **Generate Multiple Formats** simultaneously
4. **Include Universal Sections** for compatibility

### **Dynamic Context Sizing**
```typescript
const getOptimalSize = (assistant: AIAssistant) => {
  const limits = {
    claude: 180000,    // Conservative estimate
    cursor: 45000,     // Leave room for responses
    roo: 70000,        // Practical limit
    windsurf: 55000,   // UI considerations
    cline: 75000,      // Task-focused
    copilot: 45000     // Integration overhead
  };
  return limits[assistant] || 50000;
};
```

### **Quality Metrics**
- **Relevance Score**: File importance ranking
- **Context Density**: Information per token
- **Navigation Efficiency**: Quick access to key files
- **Implementation Readiness**: Actionable content

This approach ensures each AI assistant gets optimally formatted context that leverages their unique strengths and works within their constraints! 🎯 