import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { FileScanner } from '../core/FileScanner';
import { FileInfo, ContextStats, GenerationOptions } from '../core/types';
import { Logger } from '../utils/Logger';

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
}

export class UniversalContextGenerator {
  private rootPath: string;
  private scanner: FileScanner;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.scanner = new FileScanner(rootPath);
  }

  async generateUniversalContext(
    options: UniversalContextOptions,
    progress?: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<void> {
    const { files, stats } = await this.scanner.scanAndProcessFiles(progress);
    
    progress?.report({ message: 'Generating universal context format...', increment: 10 });

    const timestamp = new Date().toISOString();
    const output = this.buildUniversalOutput(files, stats, options, timestamp);

    await this.saveUniversalOutput(output, options);

    if (vscode.workspace.getConfiguration('nextjsContextify').get('autoOpenOutput')) {
      await this.openOutput(options);
    }
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
    
    // Structured project information
    output += `## Project Structure\n\n`;
    output += `**Root:** ${this.rootPath}\n`;
    output += `**Generated:** ${timestamp}\n`;
    output += `**Files Analyzed:** ${stats.totalFiles}\n\n`;

    // Architecture overview for Claude's understanding
    output += `## Architecture Overview\n\n`;
    output += this.generateArchitectureOverview(stats);

    // Categorized file listing
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
    output += `**Files:** ${stats.totalFiles} | **Size:** ${(stats.totalSize / 1024).toFixed(1)}KB\n\n`;

    // Quick navigation for Cursor
    output += `## 📍 Quick Navigation\n\n`;
    files.slice(0, 10).forEach((file, i) => {
      output += `${i + 1}. [\`${file.path}\`](#file-${i + 1})\n`;
    });
    output += '\n';

    // Compact file listing
    files.forEach((file, index) => {
      output += `<a id="file-${index + 1}"></a>\n`;
      output += `### ${index + 1}. \`${file.path}\`\n\n`;
      output += `**Category:** ${file.category} | **Priority:** ${file.priority} | **Tokens:** ${file.tokens}\n\n`;
      
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
    output += `- **Project Type:** ${stats.projectDetection?.structureType || 'Next.js'}\n\n`;

    // Key files first for Roo's workflow
    output += `## 🔑 Key Configuration Files\n\n`;
    const configFiles = files.filter(f => 
      f.category.includes('CONFIGURATION') || 
      f.path.includes('package.json') ||
      f.path.includes('next.config')
    );
    
    configFiles.forEach(file => {
      output += `### \`${file.path}\`\n\n`;
      output += `\`\`\`${path.extname(file.path).slice(1) || 'text'}\n${file.content}\n\`\`\`\n\n`;
    });

    // Main source files
    output += `## 📁 Source Files\n\n`;
    const sourceFiles = files.filter(f => !configFiles.includes(f));
    
    sourceFiles.forEach(file => {
      output += `### \`${file.path}\`\n\n`;
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
    output += `**Files:** ${stats.totalFiles} files (${(stats.totalSize / 1024).toFixed(1)}KB)\n\n`;

    // Technology stack overview
    output += `## 🔧 Technology Stack\n\n`;
    if (stats.detectedFeatures) {
      stats.detectedFeatures.forEach(feature => {
        output += `- ${feature}\n`;
      });
    }
    output += '\n';

    // Organized file structure
    const filesByCategory = this.groupFilesByCategory(files);
    
    Object.entries(filesByCategory).forEach(([category, categoryFiles]) => {
      output += `## ${this.formatCategoryName(category)}\n\n`;
      
      categoryFiles.forEach(file => {
        output += `### ${file.path}\n\n`;
        if (file.isClientComponent !== undefined) {
          output += `**Type:** ${file.isClientComponent ? 'Client Component' : 'Server Component'}\n`;
        }
        output += `**Priority:** ${file.priority} | **Size:** ${file.size} bytes\n\n`;
        
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
} 