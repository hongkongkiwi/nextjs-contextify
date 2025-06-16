import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileScanner } from '../core/FileScanner';
import { FileInfo, ContextStats, GenerationOptions, ProjectStructureType, PackageManager, UILibrary, ProjectLibraries, DatabaseProvider, AuthLibrary, APIPattern, StateLibrary } from '../core/types';
import { Logger } from '../utils/Logger';
import { VersionDetector, PackageVersions } from './VersionDetector';
import { EnvironmentDetector } from './EnvironmentDetector';
import { ProjectStructureDetector } from './ProjectStructureDetector';

export interface UniversalContextOptions extends GenerationOptions {
  // AI-specific optimizations - now supports multiple formats
  optimizeFor?: ('claude' | 'cursor' | 'roo' | 'windsurf' | 'cline' | 'universal')[];
  
  // Content organization
  includeProjectSummary?: boolean;
  includeFileStructure?: boolean;
  includeCodeMetrics?: boolean;
  includeDependencyGraph?: boolean;
  
  // Token management
  maxTokensPerFile?: number;
  prioritizeByRelevance?: boolean;
  useSemanticChunking?: boolean;
  
  // Formatting preferences
  useMarkdownTables?: boolean;
  includeLineNumbers?: boolean;
  addSectionAnchors?: boolean;
  
  includeFullContent?: boolean;
  includeArchitectureAnalysis?: boolean;
  maxTotalFiles?: number;
  
  // Selective exclusions to save tokens
  excludeTechnologies?: string[];
  excludeFileTypes?: string[];
  excludeDirectories?: string[];
  excludeLargeFiles?: boolean; // Files > 50KB
  
  // Content optimization
  summarizeContent?: boolean; // Provide summaries instead of full content
  priorityThreshold?: number; // Only include files above this priority (1-10)
  compactFormat?: boolean; // More concise output format
}

export type AIAssistantType = 'Universal' | 'Claude' | 'Cursor' | 'Roo' | 'Windsurf' | 'Cline';

export interface UniversalContextResult {
  assistantType: AIAssistantType;
  filename: string;
  content: string;
  stats: {
    totalFiles: number;
    totalSize: number;
    totalTokens: number;
    excludedFiles: number;
  };
}

export class UniversalContextGenerator {
  private rootPath: string;
  private scanner: FileScanner;
  private versionDetector: VersionDetector;
  private environmentDetector: EnvironmentDetector;
  private projectStructureDetector: ProjectStructureDetector;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.scanner = new FileScanner(rootPath);
    this.versionDetector = new VersionDetector(rootPath);
    this.environmentDetector = new EnvironmentDetector(rootPath);
    this.projectStructureDetector = new ProjectStructureDetector(rootPath);
  }

  async generateUniversalContext(
    assistantTypes: AIAssistantType[],
    options: UniversalContextOptions = {
      format: 'MARKDOWN' as any,
      includePrompts: true,
      targetLLM: 'CLAUDE' as any
    }
  ): Promise<UniversalContextResult[]> {
    try {
      const files = await this.collectProjectFiles();
      
      // Apply token optimization filters
      const optimizedFiles = this.applyTokenOptimizations(files, options);
      
      const stats = await this.generateStats(optimizedFiles);
      const timestamp = new Date().toISOString();

      const results: UniversalContextResult[] = [];

      for (const assistantType of assistantTypes) {
        const output = this.buildOptimizedOutput(optimizedFiles, stats, options, timestamp, assistantType);
        
        results.push({
          assistantType,
          filename: `context-${assistantType.toLowerCase()}.md`,
          content: output,
          stats: {
            totalFiles: optimizedFiles.length,
            totalSize: optimizedFiles.reduce((sum, f) => sum + f.size, 0),
            totalTokens: this.estimateTokens(output),
            excludedFiles: files.length - optimizedFiles.length
          }
        });
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to generate universal context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async collectProjectFiles(): Promise<FileInfo[]> {
    try {
      const { files } = await this.scanner.scanAndProcessFiles();
      return files;
    } catch (error) {
      Logger.error('Failed to collect project files:', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  private async generateStats(files: FileInfo[]): Promise<ContextStats> {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const totalTokens = files.reduce((sum, f) => sum + (f.tokens || this.estimateTokens(f.content)), 0);
    
    const categories: Record<string, number> = {};
    files.forEach(file => {
      categories[file.category] = (categories[file.category] || 0) + 1;
    });

    // Detect versions and project structure
    const versions = await this.versionDetector.detectVersions();
    const projectStructure = await this.projectStructureDetector.analyzeProjectStructure();
    const environmentAnalysis = await this.environmentDetector.analyzeEnvironmentFiles();

    // Map project structure type
    const structureType = this.mapProjectStructureType(projectStructure.type);
    
    // Detect package manager
    const packageManager = this.detectPackageManager();

    return {
      totalFiles: files.length,
      totalSize,
      totalTokens,
      categories,
      generatedAt: new Date(),
      processingTime: 0,
      projectDetection: {
        structureType,
        packageManager,
        nextjsVersion: versions.nextjs,
        confidence: 95,
        detectedLibraries: this.mapDetectedLibraries(versions),
        customConfig: {
          customPaths: {},
          hasAppRouter: projectStructure.type === 'app-router' || projectStructure.type === 'mixed',
          hasPagesRouter: projectStructure.type === 'pages-router' || projectStructure.type === 'mixed'
        },
        recommendations: projectStructure.recommendations
      },
      versions,
      projectStructure,
      environmentAnalysis
    };
  }

  private applyTokenOptimizations(files: FileInfo[], options: UniversalContextOptions): FileInfo[] {
    let optimizedFiles = [...files];

    // Apply priority threshold filter
    if (options.priorityThreshold) {
      optimizedFiles = optimizedFiles.filter(f => f.priority >= options.priorityThreshold!);
    }

    // Apply technology exclusions
    if (options.excludeTechnologies?.length) {
      optimizedFiles = this.filterByTechnology(optimizedFiles, options.excludeTechnologies);
    }

    // Apply file type exclusions
    if (options.excludeFileTypes?.length) {
      optimizedFiles = optimizedFiles.filter(f => 
        !options.excludeFileTypes!.some(ext => f.path.endsWith(ext))
      );
    }

    // Apply directory exclusions
    if (options.excludeDirectories?.length) {
      optimizedFiles = optimizedFiles.filter(f => 
        !options.excludeDirectories!.some(dir => f.path.includes(`/${dir}/`) || f.path.startsWith(`${dir}/`))
      );
    }

    // Exclude large files if requested
    if (options.excludeLargeFiles) {
      optimizedFiles = optimizedFiles.filter(f => f.size <= 50 * 1024); // 50KB limit
    }

    // Apply content summarization to reduce tokens
    if (options.summarizeContent) {
      optimizedFiles = optimizedFiles.map(f => ({
        ...f,
        content: this.summarizeFileContent(f.content, f.path),
        tokens: Math.floor(f.tokens * 0.3) // Estimate 70% token reduction
      }));
    }

    // Apply max token per file limit
    if (options.maxTokensPerFile) {
      optimizedFiles = optimizedFiles.map(f => ({
        ...f,
        content: this.truncateContent(f.content, options.maxTokensPerFile!),
        tokens: Math.min(f.tokens, options.maxTokensPerFile!)
      }));
    }

    // Apply total file limit (keep highest priority)
    if (options.maxTotalFiles && optimizedFiles.length > options.maxTotalFiles) {
      optimizedFiles = optimizedFiles
        .sort((a, b) => b.priority - a.priority)
        .slice(0, options.maxTotalFiles);
    }

    return optimizedFiles;
  }

  private buildUniversalOutput(
    files: FileInfo[],
    stats: ContextStats,
    options: UniversalContextOptions,
    timestamp: string
  ): string {
    const optimizeFor = options.optimizeFor || ['universal'];
    
    let output = '';
    
    optimizeFor.forEach(format => {
      switch (format) {
        case 'claude':
          output += this.buildClaudeOptimizedOutput(files, stats, options, timestamp);
          break;
        case 'cursor':
          output += this.buildCursorOptimizedOutput(files, stats, options, timestamp);
          break;
        case 'roo':
          output += this.buildRooOptimizedOutput(files, stats, options, timestamp);
          break;
        case 'windsurf':
          output += this.buildWindsurfOptimizedOutput(files, stats, options, timestamp);
          break;
        case 'cline':
          output += this.buildClineOptimizedOutput(files, stats, options, timestamp);
          break;
        default:
          output += this.buildUniversalOptimizedOutput(files, stats, options, timestamp);
          break;
      }
    });

    return output;
  }

  private buildUniversalOptimizedOutput(
    files: FileInfo[],
    stats: ContextStats,
    options: UniversalContextOptions,
    timestamp: string
  ): string {
    const sortedFiles = files.sort((a, b) => b.priority - a.priority);
    
    let output = `# 🚀 Next.js Project Context\n\n`;
    
    // AI-friendly metadata section
    output += `## 📋 Project Overview\n\n`;
    output += `**Generated:** ${timestamp}\n`;
    output += `**Project Path:** \`${this.rootPath}\`\n`;
    output += `**Target LLM:** ${options.targetLLM}\n`;
    output += `**Analysis Mode:** Universal (compatible with Claude, Cursor, Roo, Windsurf, Cline)\n\n`;

    // Project summary for better AI understanding
    if (options.includeProjectSummary !== false) {
      output += this.generateProjectSummary(stats);
    }

    // Quick statistics in AI-friendly format
    output += `## 📊 Project Statistics\n\n`;
    output += `| Metric | Value |\n`;
    output += `|--------|-------|\n`;
    output += `| **Total Files** | ${stats.totalFiles} |\n`;
    output += `| **Total Tokens** | ${stats.totalTokens.toLocaleString()} |\n`;
    output += `| **Total Size** | ${(stats.totalSize / 1024).toFixed(2)} KB |\n`;
    output += `| **Processing Time** | ${stats.processingTime}ms |\n\n`;

    // File structure overview for AI navigation
    if (options.includeFileStructure !== false) {
      output += this.generateFileStructure(sortedFiles);
    }

    // Category breakdown
    output += `## 📁 File Categories\n\n`;
    Object.entries(stats.categories).forEach(([category, count]) => {
      output += `- **${category}:** ${count} files\n`;
    });
    output += '\n';

    // Code metrics for AI understanding
    if (options.includeCodeMetrics !== false) {
      output += this.generateCodeMetrics(sortedFiles, stats);
    }

    // Main file content section
    output += `## 📄 File Contents\n\n`;
    output += `> 💡 **AI Assistant Tip:** Files are ordered by priority for optimal context understanding.\n\n`;

    // Process files with AI-optimized formatting
    sortedFiles.forEach((file, index) => {
      output += this.formatFileForAI(file, index + 1, options);
    });

    // AI assistant specific instructions
    output += this.generateAIInstructions(options);

    return output;
  }

  private buildClaudeOptimizedOutput(
    files: FileInfo[],
    stats: ContextStats,
    options: UniversalContextOptions,
    timestamp: string
  ): string {
    // Claude prefers structured, hierarchical content with clear sections
    let output = `# Next.js Project Analysis\n\n`;
    
    // Executive summary first for Claude's planning
    output += `## Executive Summary\n\n`;
    output += this.generateExecutiveSummary(stats);
    
    // Architecture overview for Claude's understanding
    output += `## Architecture Overview\n\n`;
    output += this.generateArchitectureOverview(stats);
    
    // Structured project information
    output += `## Project Structure\n\n`;
    output += `**Root:** ${this.rootPath}\n`;
    output += `**Generated:** ${timestamp}\n`;
    output += `**Files Analyzed:** ${stats.totalFiles}\n`;
    output += `**Context Size:** ${stats.totalTokens.toLocaleString()} tokens\n\n`;

    // Design patterns and architectural decisions
    if (stats.projectDetection) {
      output += `## Design Patterns & Decisions\n\n`;
      output += `- **Structure Type:** ${stats.projectDetection.structureType}\n`;
      output += `- **Package Manager:** ${stats.projectDetection.packageManager}\n`;
      output += `- **Confidence Score:** ${stats.projectDetection.confidence}%\n\n`;
      
      if (stats.projectDetection.recommendations) {
        output += `### Architectural Recommendations\n\n`;
        stats.projectDetection.recommendations.forEach(rec => {
          output += `- ${rec}\n`;
        });
        output += '\n';
      }
    }

    // Dependency relationships for Claude's understanding
    output += `## Dependency Relationships\n\n`;
    this.generateDependencyMap(files).forEach(dep => {
      output += `- **${dep.file}** depends on: ${dep.dependencies.join(', ')}\n`;
    });
    output += '\n';

    // Categorized file listing with comprehensive content
    const categorizedFiles = this.categorizeFilesBySections(files);
    
    Object.entries(categorizedFiles).forEach(([category, categoryFiles]) => {
      if (categoryFiles.length > 0) {
        output += `## ${category}\n\n`;
        categoryFiles.forEach(file => {
          output += this.formatFileForClaude(file);
        });
      }
    });

    return output;
  }

  private buildCursorOptimizedOutput(
    files: FileInfo[],
    stats: ContextStats,
    _options: UniversalContextOptions,
    _timestamp: string
  ): string {
    // Cursor prefers concise, structured output with clear file boundaries
    let output = `# 🎯 Cursor Context - Next.js Project\n\n`;
    
    output += `**Project:** ${path.basename(this.rootPath)}\n`;
    output += `**Files:** ${stats.totalFiles} | **Size:** ${(stats.totalSize / 1024).toFixed(1)}KB | **Tokens:** ${stats.totalTokens.toLocaleString()}\n\n`;

    // Quick navigation for Cursor with anchor links
    output += `## 📍 Quick Navigation\n\n`;
    files.slice(0, 15).forEach((file, i) => {
      output += `${i + 1}. [\`${file.path}\`](#file-${i + 1}) (${file.priority} priority)\n`;
    });
    output += '\n';

    // Component relationship map for @codebase feature
    output += `## 🔗 Component Relationships\n\n`;
    const relationships = this.generateComponentRelationships(files);
    relationships.forEach(rel => {
      output += `- **${rel.component}**: ${rel.relationships.join(' → ')}\n`;
    });
    output += '\n';

    // Symbol definitions for quick reference
    output += `## 🎯 Symbol Map\n\n`;
    const symbols = this.extractSymbols(files);
    Object.entries(symbols).forEach(([type, symbolList]) => {
      if (symbolList.length > 0) {
        output += `**${type}:** ${symbolList.join(', ')}\n`;
      }
    });
    output += '\n';

    // Compact file listing with anchor links
    files.forEach((file, index) => {
      output += `<a id="file-${index + 1}"></a>\n`;
      output += `### ${index + 1}. \`${file.path}\`\n\n`;
      output += `**Category:** ${file.category} | **Priority:** ${file.priority} | **Tokens:** ${file.tokens}\n`;
      
      if (file.isClientComponent !== undefined) {
        output += `**Component Type:** ${file.isClientComponent ? 'Client' : 'Server'}\n`;
      }
      
      output += '\n';
      
      const extension = path.extname(file.path).slice(1) || 'text';
      output += `\`\`\`${extension}\n${file.content}\n\`\`\`\n\n`;
      output += `---\n\n`;
    });

    return output;
  }

  private buildRooOptimizedOutput(
    files: FileInfo[],
    stats: ContextStats,
    _options: UniversalContextOptions,
    _timestamp: string
  ): string {
    // Roo prefers practical, action-oriented context
    let output = `# 🛠️ Roo Context - Next.js Project\n\n`;
    
    output += `## Project Setup\n`;
    output += `- **Root Directory:** ${this.rootPath}\n`;
    output += `- **Total Files:** ${stats.totalFiles}\n`;
    output += `- **Project Type:** ${stats.projectDetection?.structureType || 'Next.js'}\n`;
    output += `- **Package Manager:** ${stats.projectDetection?.packageManager || 'npm'}\n\n`;

    // Configuration files first for Roo's workflow
    output += `## 🔧 Configuration Files\n\n`;
    const configFiles = files.filter(f => 
      f.category.includes('CONFIGURATION') || 
      f.path.includes('package.json') ||
      f.path.includes('next.config') ||
      f.path.includes('tsconfig') ||
      f.path.includes('tailwind.config') ||
      f.path.includes('.env')
    );
    
    configFiles.forEach(file => {
      output += `### \`${file.path}\`\n\n`;
      output += `**Purpose:** ${this.getFilePurpose(file.path)}\n`;
      output += `**CLI Usage:** \`cat ${file.path}\` or edit with your preferred editor\n\n`;
      output += `\`\`\`${path.extname(file.path).slice(1) || 'text'}\n${file.content}\n\`\`\`\n\n`;
    });

    // Development commands and scripts
    const packageJsonFile = files.find(f => f.path.includes('package.json'));
    if (packageJsonFile) {
      try {
        const packageData = JSON.parse(packageJsonFile.content);
        if (packageData.scripts) {
          output += `## 🚀 Available Scripts\n\n`;
          Object.entries(packageData.scripts).forEach(([script, command]) => {
            output += `- **\`pnpm run ${script}\`**: ${command}\n`;
          });
          output += '\n';
        }
      } catch (_e) {
        // Ignore JSON parse errors
      }
    }

    // Environment setup
    output += `## 🌍 Environment Setup\n\n`;
    output += `\`\`\`bash\n`;
    output += `# Clone and setup\n`;
    output += `cd ${path.basename(this.rootPath)}\n`;
    output += `${stats.projectDetection?.packageManager || 'npm'} install\n`;
    output += `\n`;
    output += `# Development\n`;
    output += `${stats.projectDetection?.packageManager || 'npm'} run dev\n`;
    output += `\n`;
    output += `# Build for production\n`;
    output += `${stats.projectDetection?.packageManager || 'npm'} run build\n`;
    output += `\`\`\`\n\n`;

    // Main source files organized by functionality
    output += `## 📁 Source Files\n\n`;
    const sourceFiles = files.filter(f => !configFiles.includes(f)).sort((a, b) => b.priority - a.priority);
    
    sourceFiles.forEach(file => {
      output += `### \`${file.path}\`\n\n`;
      output += `**Category:** ${file.category} | **Priority:** ${file.priority}\n`;
      if (file.isClientComponent !== undefined) {
        output += `**Component Type:** ${file.isClientComponent ? 'Client Component' : 'Server Component'}\n`;
      }
      output += '\n';
      output += `\`\`\`${path.extname(file.path).slice(1) || 'text'}\n${file.content}\n\`\`\`\n\n`;
    });

    return output;
  }

  private buildWindsurfOptimizedOutput(
    files: FileInfo[],
    stats: ContextStats,
    options: UniversalContextOptions,
    timestamp: string
  ): string {
    // Windsurf prefers clean, navigable format
    let output = `# 🌊 Windsurf Context - Next.js Project\n\n`;
    
    // Clean project header
    output += `**Project:** ${path.basename(this.rootPath)}\n`;
    output += `**Generated:** ${new Date(timestamp).toLocaleString()}\n`;
    output += `**Files:** ${stats.totalFiles} files (${(stats.totalSize / 1024).toFixed(1)}KB)\n`;
    output += `**Tokens:** ${stats.totalTokens.toLocaleString()}\n\n`;

    // Technology stack overview for team understanding
    output += `## 🔧 Technology Stack\n\n`;
    if (stats.projectDetection?.detectedLibraries) {
      const libs = stats.projectDetection.detectedLibraries;
      
      output += `| Layer | Technologies |\n`;
      output += `|-------|-------------|\n`;
      if (libs.ui.length > 0) {output += `| **Frontend** | ${libs.ui.join(', ')} |\n`;}
      if (libs.database.length > 0) {output += `| **Database** | ${libs.database.join(', ')} |\n`;}
      if (libs.auth.length > 0) {output += `| **Auth** | ${libs.auth.join(', ')} |\n`;}
      if (libs.api.length > 0) {output += `| **API** | ${libs.api.join(', ')} |\n`;}
      if (libs.testing.length > 0) {output += `| **Testing** | ${libs.testing.join(', ')} |\n`;}
      output += '\n';
    }

    // Feature mapping for team collaboration
    output += `## 🎯 Feature Map\n\n`;
    const featureMap = this.generateFeatureMap(files);
    Object.entries(featureMap).forEach(([feature, fileList]) => {
      output += `**${feature}:**\n`;
      fileList.forEach(file => {
        output += `- \`${file}\`\n`;
      });
      output += '\n';
    });

    // Coding standards for team consistency
    if (options.includeCodeMetrics !== false) {
      output += `## 📋 Coding Standards\n\n`;
      output += `- **File Naming:** ${this.detectNamingConvention(files)}\n`;
      output += `- **Component Pattern:** ${this.detectComponentPattern(files)}\n`;
      output += `- **Import Style:** ${this.detectImportStyle(files)}\n\n`;
    }

    // Organized file structure with team-friendly categorization
    const filesByCategory = this.groupFilesByCategory(files);
    
    Object.entries(filesByCategory).forEach(([category, categoryFiles]) => {
      output += `## ${this.formatCategoryName(category)}\n\n`;
      
      categoryFiles.forEach(file => {
        output += `### ${file.path}\n\n`;
        if (file.isClientComponent !== undefined) {
          output += `**Type:** ${file.isClientComponent ? 'Client Component' : 'Server Component'}\n`;
        }
        output += `**Priority:** ${file.priority} | **Size:** ${file.size} bytes | **Tokens:** ${file.tokens}\n\n`;
        
        const extension = path.extname(file.path).slice(1) || 'text';
        output += `\`\`\`${extension}\n${file.content}\n\`\`\`\n\n`;
      });
    });

    return output;
  }

  private buildClineOptimizedOutput(
    files: FileInfo[],
    stats: ContextStats,
    _options: UniversalContextOptions,
    _timestamp: string
  ): string {
    // Cline prefers structured, task-oriented context
    let output = `# 🤖 Cline Context - Next.js Project\n\n`;
    
    // Task-relevant project info
    output += `## Project Information\n\n`;
    output += `| Property | Value |\n`;
    output += `|----------|-------|\n`;
    output += `| Project Root | \`${this.rootPath}\` |\n`;
    output += `| Structure Type | ${stats.projectDetection?.structureType || 'Standard Next.js'} |\n`;
    output += `| Total Files | ${stats.totalFiles} |\n`;
    output += `| Total Tokens | ${stats.totalTokens.toLocaleString()} |\n\n`;

    // Dependencies for task context
    output += `## Dependencies & Libraries\n\n`;
    if (stats.projectDetection?.detectedLibraries) {
      const libs = stats.projectDetection.detectedLibraries;
      if (libs.auth.length > 0) {
        output += `**Auth:** ${libs.auth.join(', ')}\n`;
      }
      if (libs.ui.length > 0) {
        output += `**UI:** ${libs.ui.join(', ')}\n`;
      }
      if (libs.database.length > 0) {
        output += `**Database:** ${libs.database.join(', ')}\n`;
      }
      if (libs.api.length > 0) {
        output += `**API:** ${libs.api.join(', ')}\n`;
      }
    }
    output += '\n';

    // File contents with clear separation
    output += `## File Contents\n\n`;
    files.forEach((file, index) => {
      output += `### File ${index + 1}: ${file.path}\n\n`;
      output += `**Category:** ${file.category}\n`;
      output += `**Priority:** ${file.priority}\n`;
      output += `**Tokens:** ${file.tokens}\n\n`;
      
      const extension = path.extname(file.path).slice(1) || 'text';
      output += `\`\`\`${extension}\n${file.content}\n\`\`\`\n\n`;
      output += `${'='.repeat(80)}\n\n`;
    });

    return output;
  }

  // Helper methods for content generation
  private generateProjectSummary(stats: ContextStats): string {
    let summary = `## 🎯 Project Summary\n\n`;
    
    if (stats.projectDetection) {
      const detection = stats.projectDetection;
      summary += `**Framework:** Next.js ${detection.nextjsVersion}\n`;
      summary += `**Structure:** ${detection.structureType}\n`;
      summary += `**Package Manager:** ${detection.packageManager}\n`;
      summary += `**Confidence:** ${detection.confidence}%\n\n`;
      
      if (detection.detectedLibraries) {
        summary += `**Key Libraries:**\n`;
        const libs = detection.detectedLibraries;
              if (libs.auth.length > 0) {
        summary += `- Authentication: ${libs.auth.join(', ')}\n`;
      }
      if (libs.ui.length > 0) {
        summary += `- UI Framework: ${libs.ui.join(', ')}\n`;
      }
      if (libs.database.length > 0) {
        summary += `- Database: ${libs.database.join(', ')}\n`;
      }
      if (libs.api.length > 0) {
        summary += `- API Layer: ${libs.api.join(', ')}\n`;
      }
      }
    }
    
    return summary + '\n';
  }

  private generateFileStructure(files: FileInfo[]): string {
    let structure = `## 🏗️ File Structure\n\n`;
    structure += `\`\`\`\n`;
    
    // Create a tree structure
    const paths = files.map(f => f.path).sort();
    const tree = this.buildFileTree(paths);
    structure += tree;
    
    structure += `\`\`\`\n\n`;
    return structure;
  }

  private buildFileTree(paths: string[]): string {
    const tree: any = {};
    
    paths.forEach(filePath => {
      const parts = filePath.split('/');
      let current = tree;
      
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? null : {};
        }
        if (current[part] !== null) {
          current = current[part];
        }
      });
    });
    
    return this.renderTree(tree, '', true);
  }

  private renderTree(node: any, prefix: string, isLast: boolean): string {
    let result = '';
    const entries = Object.entries(node);
    
    entries.forEach(([name, children], index) => {
      const isLastEntry = index === entries.length - 1;
      const currentPrefix = prefix + (isLast ? '└── ' : '├── ');
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      
      result += currentPrefix + name + '\n';
      
      if (children !== null && typeof children === 'object') {
        result += this.renderTree(children, nextPrefix, isLastEntry);
      }
    });
    
    return result;
  }

  private generateCodeMetrics(files: FileInfo[], stats: ContextStats): string {
    let metrics = `## 📈 Code Metrics\n\n`;
    
    const avgFileSize = files.length > 0 ? Math.round(stats.totalSize / files.length) : 0;
    const avgTokens = files.length > 0 ? Math.round(stats.totalTokens / files.length) : 0;
    
    metrics += `| Metric | Value |\n`;
    metrics += `|--------|-------|\n`;
    metrics += `| Average File Size | ${avgFileSize} bytes |\n`;
    metrics += `| Average Tokens/File | ${avgTokens} |\n`;
    metrics += `| Largest File | ${Math.max(...files.map(f => f.size))} bytes |\n`;
    metrics += `| Most Complex File | ${Math.max(...files.map(f => f.tokens))} tokens |\n\n`;
    
    return metrics;
  }

  private formatFileForAI(file: FileInfo, index: number, _options: UniversalContextOptions): string {
    let content = `### ${index}. \`${file.path}\`\n\n`;
    
    // AI-helpful metadata
    content += `**Metadata:**\n`;
    content += `- Category: ${file.category}\n`;
    content += `- Priority: ${file.priority}\n`;
    content += `- Size: ${file.size} bytes (${file.tokens} tokens)\n`;
    if (file.isClientComponent !== undefined) {
      content += `- Component Type: ${file.isClientComponent ? 'Client' : 'Server'}\n`;
    }
    content += '\n';

    // File content with proper syntax highlighting
    const extension = path.extname(file.path).slice(1) || 'text';
    content += `**Content:**\n`;
    content += `\`\`\`${extension}\n${file.content}\n\`\`\`\n\n`;
    
    // Separator for AI parsing
    content += `---\n\n`;
    
    return content;
  }

  private formatFileForClaude(file: FileInfo): string {
    let content = `### \`${file.path}\`\n\n`;
    content += `Priority: ${file.priority} | Category: ${file.category}\n\n`;
    
    const extension = path.extname(file.path).slice(1) || 'text';
    content += `\`\`\`${extension}\n${file.content}\n\`\`\`\n\n`;
    
    return content;
  }

  private categorizeFilesBySections(files: FileInfo[]): Record<string, FileInfo[]> {
    const sections: Record<string, FileInfo[]> = {
      'Core Configuration': [],
      'Application Structure': [],
      'Components': [],
      'API Routes': [],
      'Database': [],
      'Styling': [],
      'Utilities': [],
      'Tests': [],
      'Other': []
    };

    files.forEach(file => {
      if (file.category.includes('CONFIGURATION')) {
        sections['Core Configuration'].push(file);
      } else if (file.category.includes('APP_ROUTER') || file.category.includes('PAGES_ROUTER')) {
        sections['Application Structure'].push(file);
      } else if (file.category.includes('COMPONENT')) {
        sections['Components'].push(file);
      } else if (file.category.includes('API') || file.category.includes('TRPC')) {
        sections['API Routes'].push(file);
      } else if (file.category.includes('DATABASE') || file.category.includes('PRISMA')) {
        sections['Database'].push(file);
      } else if (file.category.includes('TAILWIND') || file.category.includes('STYLES')) {
        sections['Styling'].push(file);
      } else if (file.category.includes('UTILITIES') || file.category.includes('HOOKS')) {
        sections['Utilities'].push(file);
      } else if (file.category.includes('TEST')) {
        sections['Tests'].push(file);
      } else {
        sections['Other'].push(file);
      }
    });

    return sections;
  }

  private groupFilesByCategory(files: FileInfo[]): Record<string, FileInfo[]> {
    const groups: Record<string, FileInfo[]> = {};
    
    files.forEach(file => {
      const category = file.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(file);
    });

    return groups;
  }

  private formatCategoryName(category: string): string {
    return category
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private generateExecutiveSummary(stats: ContextStats): string {
    let summary = '';
    
    if (stats.projectDetection) {
      summary += `This is a ${stats.projectDetection.structureType} Next.js project `;
      summary += `with ${stats.totalFiles} files analyzed. `;
      
      if (stats.detectedFeatures && stats.detectedFeatures.length > 0) {
        summary += `Key technologies include: ${stats.detectedFeatures.slice(0, 3).join(', ')}. `;
      }
      
      summary += `The project has a confidence score of ${stats.projectDetection.confidence}% `;
      summary += `for structure detection.\n\n`;
    }
    
    return summary;
  }

  private generateArchitectureOverview(stats: ContextStats): string {
    let overview = '';
    
    if (stats.projectDetection?.detectedLibraries) {
      const libs = stats.projectDetection.detectedLibraries;
      
      overview += `**Frontend Architecture:**\n`;
      if (libs.ui.length > 0) {
        overview += `- UI Framework: ${libs.ui.join(', ')}\n`;
      }
      if (libs.state.length > 0) {
        overview += `- State Management: ${libs.state.join(', ')}\n`;
      }
      
      overview += `\n**Backend Architecture:**\n`;
      if (libs.database.length > 0) {
        overview += `- Database: ${libs.database.join(', ')}\n`;
      }
      if (libs.api.length > 0) {
        overview += `- API Layer: ${libs.api.join(', ')}\n`;
      }
      if (libs.auth.length > 0) {
        overview += `- Authentication: ${libs.auth.join(', ')}\n`;
      }
    }
    
    return overview + '\n';
  }

  private generateAIInstructions(_options: UniversalContextOptions): string {
    let instructions = `## 🤖 AI Assistant Instructions\n\n`;
    
    instructions += `This context has been optimized for AI code assistants. Here are some guidelines:\n\n`;
    instructions += `1. **File Priority:** Files are sorted by priority (higher numbers = more important)\n`;
    instructions += `2. **Categories:** Use file categories to understand the codebase structure\n`;
    instructions += `3. **Tokens:** Token counts help manage context window limits\n`;
    instructions += `4. **Components:** Client/Server component indicators help with Next.js development\n`;
    instructions += `5. **Dependencies:** Check the project summary for key libraries and patterns\n\n`;
    
    instructions += `**Compatible Tools:** Claude, Cursor, Roo, Windsurf, Cline, and other AI assistants\n\n`;
    
    return instructions;
  }

  private async saveUniversalOutput(output: string, options: UniversalContextOptions): Promise<void> {
    const optimizeFor = options.optimizeFor || ['universal'];
    
    const savePromises = optimizeFor.map(async (format) => {
      const filename = `nextjs-context-${format}-${Date.now()}.md`;
      const filepath = path.join(this.rootPath, filename);

      try {
        await fs.promises.writeFile(filepath, output, 'utf8');
        Logger.info(`Universal context saved to: ${filename}`);
      } catch (error) {
        Logger.error(`Error saving universal context: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    await Promise.all(savePromises);
  }

  private async openOutput(options: UniversalContextOptions): Promise<void> {
    const optimizeFor = options.optimizeFor || ['universal'];
    
    for (const format of optimizeFor) {
      const files = await vscode.workspace.findFiles(`nextjs-context-${format}-*.md`);

      if (files.length > 0) {
        const latestFile = files.sort(
          (a, b) => fs.statSync(b.fsPath).mtime.getTime() - fs.statSync(a.fsPath).mtime.getTime()
        )[0];

        const document = await vscode.workspace.openTextDocument(latestFile);
        await vscode.window.showTextDocument(document);
      }
    }
  }

  private generateDependencyMap(files: FileInfo[]): Array<{file: string, dependencies: string[]}> {
    return files.map(file => {
      const dependencies: string[] = [];
      
      // Simple dependency extraction from imports
      const importMatches = file.content.match(/import.*from\s+['"`]([^'"`]+)['"`]/g);
      if (importMatches) {
        importMatches.forEach(match => {
          const dep = match.match(/from\s+['"`]([^'"`]+)['"`]/)?.[1];
          if (dep && !dep.startsWith('.') && !dependencies.includes(dep)) {
            dependencies.push(dep);
          }
        });
      }
      
      return {
        file: file.path,
        dependencies: dependencies.slice(0, 5) // Limit to top 5 dependencies
      };
    });
  }

  private generateComponentRelationships(files: FileInfo[]): Array<{component: string, relationships: string[]}> {
    const relationships: Array<{component: string, relationships: string[]}> = [];
    
    files.forEach(file => {
      const component = path.basename(file.path, path.extname(file.path));
      const _relativePath = file.path;
      
      // Extract imports to show relationships
      const importMatches = file.content.match(/import.*from\s+['"`]\.([^'"`]+)['"`]/g);
      const imports: string[] = [];
      
      if (importMatches) {
        importMatches.forEach(match => {
          const importPath = match.match(/from\s+['"`]\.([^'"`]+)['"`]/)?.[1];
          if (importPath) {
            imports.push(importPath.replace(/^\//, ''));
          }
        });
      }
      
      if (imports.length > 0) {
        relationships.push({
          component,
          relationships: imports
        });
      }
    });
    
    return relationships.slice(0, 10); // Limit to top 10 relationships
  }

  private extractSymbols(files: FileInfo[]): Record<string, string[]> {
    const symbols: Record<string, string[]> = {
      'Functions': [],
      'Components': [],
      'Types': [],
      'Interfaces': []
    };
    
    files.forEach(file => {
      // Extract function declarations
      const functionMatches = file.content.match(/(?:function|const)\s+([A-Za-z][A-Za-z0-9]*)/g);
      if (functionMatches) {
        functionMatches.forEach(match => {
          const funcName = match.split(/\s+/)[1];
          if (funcName && /^[A-Z]/.test(funcName)) {
            symbols['Components'].push(funcName);
          } else if (funcName) {
            symbols['Functions'].push(funcName);
          }
        });
      }
      
      // Extract type definitions
      const typeMatches = file.content.match(/type\s+([A-Za-z][A-Za-z0-9]*)/g);
      if (typeMatches) {
        typeMatches.forEach(match => {
          const typeName = match.split(/\s+/)[1];
          if (typeName) {
            symbols['Types'].push(typeName);
          }
        });
      }
      
      // Extract interface definitions
      const interfaceMatches = file.content.match(/interface\s+([A-Za-z][A-Za-z0-9]*)/g);
      if (interfaceMatches) {
        interfaceMatches.forEach(match => {
          const interfaceName = match.split(/\s+/)[1];
          if (interfaceName) {
            symbols['Interfaces'].push(interfaceName);
          }
        });
      }
    });
    
    // Remove duplicates and limit
    Object.keys(symbols).forEach(key => {
      symbols[key] = [...new Set(symbols[key])].slice(0, 10);
    });
    
    return symbols;
  }

  private getFilePurpose(filePath: string): string {
    const filename = path.basename(filePath);
    
    if (filename === 'package.json') {return 'Project dependencies and scripts';}
    if (filename.includes('next.config')) {return 'Next.js configuration';}
    if (filename.includes('tsconfig')) {return 'TypeScript configuration';}
    if (filename.includes('tailwind.config')) {return 'Tailwind CSS configuration';}
    if (filename.includes('.env')) {return 'Environment variables';}
    if (filename.includes('eslint')) {return 'ESLint configuration';}
    if (filename.includes('prettier')) {return 'Prettier configuration';}
    
    return 'Configuration file';
  }

  private generateFeatureMap(files: FileInfo[]): Record<string, string[]> {
    const featureMap: Record<string, string[]> = {};
    
    files.forEach(file => {
      const feature = this.extractFeatureFromPath(file.path);
      if (!featureMap[feature]) {
        featureMap[feature] = [];
      }
      featureMap[feature].push(file.path);
    });
    
    return featureMap;
  }

  private extractFeatureFromPath(filePath: string): string {
    if (filePath.includes('/components/')) {return 'UI Components';}
    if (filePath.includes('/pages/') || filePath.includes('/app/')) {return 'Pages & Routes';}
    if (filePath.includes('/api/')) {return 'API Endpoints';}
    if (filePath.includes('/lib/') || filePath.includes('/utils/')) {return 'Utilities';}
    if (filePath.includes('/hooks/')) {return 'React Hooks';}
    if (filePath.includes('/types/') || filePath.includes('.d.ts')) {return 'Type Definitions';}
    if (filePath.includes('/styles/') || filePath.includes('.css')) {return 'Styling';}
    if (filePath.includes('/test/') || filePath.includes('.test.')) {return 'Testing';}
    if (filePath.includes('config')) {return 'Configuration';}
    
    return 'Core Files';
  }

  private detectNamingConvention(files: FileInfo[]): string {
    const kebabCase = files.filter(f => /^[a-z][a-z0-9-]*$/.test(path.basename(f.path, path.extname(f.path)))).length;
    const camelCase = files.filter(f => /^[a-z][a-zA-Z0-9]*$/.test(path.basename(f.path, path.extname(f.path)))).length;
    const pascalCase = files.filter(f => /^[A-Z][a-zA-Z0-9]*$/.test(path.basename(f.path, path.extname(f.path)))).length;
    
    if (kebabCase > camelCase && kebabCase > pascalCase) {return 'kebab-case';}
    if (pascalCase > camelCase) {return 'PascalCase';}
    return 'camelCase';
  }

  private detectComponentPattern(files: FileInfo[]): string {
    const hasClientComponents = files.some(f => f.isClientComponent === true);
    const hasServerComponents = files.some(f => f.isClientComponent === false);
    
    if (hasClientComponents && hasServerComponents) {return 'Mixed (Client + Server Components)';}
    if (hasClientComponents) {return 'Client Components';}
    if (hasServerComponents) {return 'Server Components';}
    return 'Standard React Components';
  }

  private detectImportStyle(files: FileInfo[]): string {
    let absoluteImports = 0;
    let relativeImports = 0;
    
    files.forEach(file => {
      const imports = file.content.match(/import.*from\s+['"`]([^'"`]+)['"`]/g) || [];
      imports.forEach(imp => {
        if (imp.includes('from \'@/') || imp.includes('from "@/')) {
          absoluteImports++;
        } else if (imp.includes('from \'./') || imp.includes('from "../')) {
          relativeImports++;
        }
      });
    });
    
    if (absoluteImports > relativeImports) {return 'Absolute imports (@/)';}
    if (relativeImports > 0) {return 'Relative imports (./,../)';}
    return 'Mixed import styles';
  }

  private filterByTechnology(files: FileInfo[], excludeTechnologies: string[]): FileInfo[] {
    return files.filter(file => {
      const content = file.content.toLowerCase();
      const path = file.path.toLowerCase();
      
      return !excludeTechnologies.some(tech => {
        const techLower = tech.toLowerCase();
        return (
          content.includes(techLower) ||
          path.includes(techLower) ||
          content.includes(`'${techLower}'`) ||
          content.includes(`"${techLower}"`) ||
          content.includes(`from '${techLower}`) ||
          content.includes(`from "${techLower}`)
        );
      });
    });
  }

  private summarizeFileContent(content: string, filePath: string): string {
    const extension = path.extname(filePath);
    
    // For code files, extract key elements
    if (['.ts', '.tsx', '.js', '.jsx'].includes(extension)) {
      const summary: string[] = [];
      
      // Extract imports
      const imports = content.match(/import.*from.*;/g) || [];
      if (imports.length > 0) {
        summary.push('// IMPORTS');
        summary.push(...imports.slice(0, 5)); // Top 5 imports
        if (imports.length > 5) {summary.push(`// ... ${imports.length - 5} more imports`);}
        summary.push('');
      }
      
      // Extract exports and functions
      const exports = content.match(/(export\s+(default\s+)?(function|const|class|interface|type).*)/g) || [];
      if (exports.length > 0) {
        summary.push('// KEY EXPORTS');
        summary.push(...exports.map(exp => exp.split('{')[0] + (exp.includes('{') ? ' { ... }' : '')));
        summary.push('');
      }
      
      // Add file structure comment
      const lines = content.split('\n').length;
      summary.push(`// File: ${filePath} (${lines} lines, summarized)`);
      
      return summary.join('\n');
    }
    
    // For config files, keep essential parts
    if (['.json', '.yml', '.yaml'].includes(extension)) {
      try {
        if (extension === '.json') {
          const parsed = JSON.parse(content);
          return JSON.stringify(parsed, null, 2);
        }
      } catch {
        // Fallback to truncation
      }
    }
    
    // Default: truncate to first 500 characters with structure
    return content.length > 500 
      ? content.substring(0, 500) + `\n\n// ... (truncated ${content.length - 500} characters)`
      : content;
  }

  private truncateContent(content: string, maxTokens: number): string {
    // Rough estimate: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    
    if (content.length <= maxChars) {
      return content;
    }
    
    const truncated = content.substring(0, maxChars);
    const lastNewline = truncated.lastIndexOf('\n');
    
    // Try to break at a clean line
    if (lastNewline > maxChars * 0.8) {
      return truncated.substring(0, lastNewline) + '\n\n// ... (content truncated)';
    }
    
    return truncated + '\n\n// ... (content truncated)';
  }

  private estimateTokens(content: string): number {
    // Rough token estimation: ~4 characters per token for code
    return Math.ceil(content.length / 4);
  }

  private buildOptimizedOutput(
    files: FileInfo[],
    stats: ContextStats,
    options: UniversalContextOptions,
    timestamp: string,
    assistantType: AIAssistantType
  ): string {
    if (options.compactFormat) {
      return this.buildCompactOutput(files, stats, assistantType);
    }
    
    switch (assistantType) {
      case 'Claude':
        return this.buildClaudeOptimizedOutput(files, stats, options, timestamp);
      case 'Cursor':
        return this.buildCursorOptimizedOutput(files, stats, options, timestamp);
      case 'Roo':
        return this.buildRooOptimizedOutput(files, stats, options, timestamp);
      case 'Windsurf':
        return this.buildWindsurfOptimizedOutput(files, stats, options, timestamp);
      case 'Cline':
        return this.buildClineOptimizedOutput(files, stats, options, timestamp);
      default:
        return this.buildUniversalOutput(files, stats, options, timestamp);
    }
  }

  private buildCompactOutput(files: FileInfo[], stats: ContextStats, assistantType: AIAssistantType): string {
    let output = `# ${assistantType} Context\n`;
    output += `**Files:** ${files.length} | **Tokens:** ~${stats.totalTokens.toLocaleString()}\n\n`;
    
    // Group by category for compact display
    const categories = this.groupFilesByCategory(files);
    
    Object.entries(categories).forEach(([category, categoryFiles]) => {
      output += `## ${this.formatCategoryName(category)}\n`;
      
      categoryFiles.forEach(file => {
        output += `### ${file.path}\n`;
        output += `\`\`\`${path.extname(file.path).slice(1) || 'text'}\n${file.content}\n\`\`\`\n`;
      });
    });
    
    return output;
  }

  private mapProjectStructureType(type: 'app-router' | 'pages-router' | 'mixed' | 'unknown'): ProjectStructureType {
    switch (type) {
      case 'app-router':
      case 'pages-router':
      case 'mixed':
        return ProjectStructureType.STANDARD_NEXTJS; // All Next.js types map to standard
      default:
        return ProjectStructureType.STANDARD_NEXTJS;
    }
  }

  private detectPackageManager(): PackageManager {
    const lockFiles = [
      { file: 'pnpm-lock.yaml', manager: PackageManager.PNPM },
      { file: 'yarn.lock', manager: PackageManager.YARN },
      { file: 'package-lock.json', manager: PackageManager.NPM },
      { file: 'bun.lockb', manager: PackageManager.PNPM } // Use PNPM as fallback for bun
    ];

    for (const { file, manager } of lockFiles) {
      if (fs.existsSync(path.join(this.rootPath, file))) {
        return manager;
      }
    }

    return PackageManager.NPM; // Default fallback
  }

  private mapDetectedLibraries(versions: PackageVersions): ProjectLibraries {
    const ui: UILibrary[] = [];
    const database: DatabaseProvider[] = [];
    const auth: AuthLibrary[] = [];
    const api: APIPattern[] = [];
    const state: StateLibrary[] = [];
    const utilities: string[] = [];

    // UI Libraries
    if (versions.tailwind) {
      ui.push(UILibrary.TAILWIND_CSS);
    }
    if (versions.shadcnui) {
      ui.push(UILibrary.SHADCN_UI);
    }
    if (versions.radixui) {
      ui.push(UILibrary.RADIX_UI);
    }

    // Database
    if (versions.prisma) {
      database.push(DatabaseProvider.PRISMA);
    }
    if (versions.drizzle) {
      database.push(DatabaseProvider.DRIZZLE);
    }
    if (versions.zenstack) {
      database.push(DatabaseProvider.ZENSTACK);
    }

    // Auth
    if (versions.clerk) {
      auth.push(AuthLibrary.CLERK);
    }
    if (versions.supabase) {
      auth.push(AuthLibrary.SUPABASE);
    }

    // API
    if (versions.trpc) {
      api.push(APIPattern.TRPC);
    }

    // State Management
    if (versions.zustand) {
      state.push(StateLibrary.ZUSTAND);
    }

    // TypeScript
    if (versions.typescript) {
      utilities.push('TypeScript');
    }

    return {
      ui,
      database,
      auth,
      api,
      state,
      dataFetching: [],
      styling: [],
      testing: [],
      utilities
    };
  }
} 