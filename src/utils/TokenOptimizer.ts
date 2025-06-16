import * as vscode from 'vscode';
import { FileInfo } from '../core/types';

export interface TokenOptimizationOptions {
  // Content size limits
  maxTotalFiles?: number;
  maxTokensPerFile?: number;
  priorityThreshold?: number; // 1-10 scale
  
  // Technology exclusions
  excludeTechnologies?: string[];
  excludeFileTypes?: string[];
  excludeDirectories?: string[];
  excludeLargeFiles?: boolean; // > 50KB
  
  // Content optimization
  summarizeContent?: boolean;
  compactFormat?: boolean;
  removeComments?: boolean;
  removeEmptyLines?: boolean;
}

export interface OptimizationResult {
  originalFiles: number;
  optimizedFiles: number;
  originalTokens: number;
  optimizedTokens: number;
  savedTokens: number;
  savedPercentage: number;
}

export class TokenOptimizer {
  private static readonly DEFAULT_EXCLUSIONS = {
    technologies: [
      'prisma', 'zenstack', 'drizzle', 'planetscale',
      'supabase', 'firebase', 'aws-sdk', 'mongodb',
      'express', 'fastify', 'koa', 'hapi'
    ],
    fileTypes: [
      '.lock', '.log', '.map', '.d.ts', '.min.js',
      '.bundle.js', '.chunk.js', '.vendor.js'
    ],
    directories: [
      'node_modules', '.next', '.vercel', '.git',
      'dist', 'build', 'coverage', '.nyc_output'
    ]
  };

  static async showOptimizationDialog(): Promise<TokenOptimizationOptions | undefined> {
    const selections = await vscode.window.showQuickPick([
      {
        label: '🚀 Maximum Savings',
        description: 'Aggressive optimization - may lose some detail',
        detail: 'Summarize content, exclude large files, limit to top 20 files',
        value: 'aggressive'
      },
      {
        label: '⚖️ Balanced',
        description: 'Good balance of savings and completeness',
        detail: 'Moderate summarization, exclude common bloat',
        value: 'balanced'
      },
      {
        label: '🔧 Custom',
        description: 'Choose specific exclusions',
        detail: 'Select what to exclude manually',
        value: 'custom'
      },
      {
        label: '📄 Full Context (No Optimization)',
        description: 'Include everything - highest token cost',
        detail: 'No optimization applied',
        value: 'none'
      }
    ], {
      placeHolder: 'Select optimization level to save AI tokens and costs',
      ignoreFocusOut: true
    });

    if (!selections) {
      return undefined;
    }

    switch (selections.value) {
      case 'aggressive':
        return {
          maxTotalFiles: 20,
          maxTokensPerFile: 1000,
          priorityThreshold: 7,
          excludeTechnologies: this.DEFAULT_EXCLUSIONS.technologies,
          excludeFileTypes: this.DEFAULT_EXCLUSIONS.fileTypes,
          excludeDirectories: this.DEFAULT_EXCLUSIONS.directories,
          excludeLargeFiles: true,
          summarizeContent: true,
          compactFormat: true,
          removeComments: true,
          removeEmptyLines: true
        };

      case 'balanced':
        return {
          maxTotalFiles: 50,
          maxTokensPerFile: 2000,
          priorityThreshold: 5,
          excludeTechnologies: ['prisma', 'zenstack', 'mongodb', 'aws-sdk'],
          excludeFileTypes: ['.lock', '.map', '.min.js'],
          excludeDirectories: ['node_modules', '.next', 'dist'],
          excludeLargeFiles: true,
          summarizeContent: false,
          compactFormat: false,
          removeComments: false,
          removeEmptyLines: true
        };

      case 'custom':
        return await this.showCustomOptimizationDialog();

      case 'none':
      default:
        return {};
    }
  }

  private static async showCustomOptimizationDialog(): Promise<TokenOptimizationOptions> {
    const options: TokenOptimizationOptions = {};

    // Ask about technology exclusions
    const techExclusions = await vscode.window.showQuickPick(
      this.DEFAULT_EXCLUSIONS.technologies.map(tech => ({
        label: tech,
        description: `Exclude ${tech} related files`,
        picked: false
      })),
      {
        placeHolder: 'Select technologies to exclude (saves tokens)',
        canPickMany: true,
        ignoreFocusOut: true
      }
    );

    if (techExclusions && techExclusions.length > 0) {
      options.excludeTechnologies = techExclusions.map(item => item.label);
    }

    // Ask about content optimization
    const contentOpts = await vscode.window.showQuickPick([
      {
        label: 'Summarize file contents',
        description: 'Extract key parts only (70% token reduction)',
        picked: false
      },
      {
        label: 'Remove comments',
        description: 'Strip code comments (10-20% reduction)',
        picked: false
      },
      {
        label: 'Compact format',
        description: 'Minimal formatting (5-10% reduction)',
        picked: false
      },
      {
        label: 'Exclude large files (>50KB)',
        description: 'Skip files over 50KB',
        picked: true
      }
    ], {
      placeHolder: 'Select content optimizations',
      canPickMany: true,
      ignoreFocusOut: true
    });

    if (contentOpts) {
      options.summarizeContent = contentOpts.some(opt => opt.label.includes('Summarize'));
      options.removeComments = contentOpts.some(opt => opt.label.includes('comments'));
      options.compactFormat = contentOpts.some(opt => opt.label.includes('Compact'));
      options.excludeLargeFiles = contentOpts.some(opt => opt.label.includes('large files'));
    }

    // Ask about file limits
    const fileLimit = await vscode.window.showInputBox({
      placeHolder: 'Maximum number of files (leave empty for no limit)',
      prompt: 'Limit total files to reduce tokens',
      validateInput: (value) => {
        if (value && isNaN(Number(value))) {
          return 'Please enter a valid number';
        }
        return undefined;
      }
    });

    if (fileLimit && fileLimit.trim()) {
      options.maxTotalFiles = parseInt(fileLimit);
    }

    return options;
  }

  static optimizeFiles(files: FileInfo[], options: TokenOptimizationOptions): {
    optimized: FileInfo[];
    result: OptimizationResult;
  } {
    const originalFiles = files.length;
    const originalTokens = files.reduce((sum, f) => sum + (f.tokens || this.estimateTokens(f.content)), 0);

    let optimizedFiles = [...files];

    // Apply priority threshold
    if (options.priorityThreshold) {
      optimizedFiles = optimizedFiles.filter(f => (f.priority || 5) >= options.priorityThreshold!);
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
        !options.excludeDirectories!.some(dir => 
          f.path.includes(`/${dir}/`) || f.path.startsWith(`${dir}/`)
        )
      );
    }

    // Exclude large files
    if (options.excludeLargeFiles) {
      optimizedFiles = optimizedFiles.filter(f => (f.size || 0) <= 50 * 1024);
    }

    // Apply content optimizations
    if (options.summarizeContent || options.removeComments || options.removeEmptyLines) {
      optimizedFiles = optimizedFiles.map(f => ({
        ...f,
        content: this.optimizeContent(f.content, options),
        tokens: Math.floor((f.tokens || this.estimateTokens(f.content)) * 
          (options.summarizeContent ? 0.3 : options.removeComments ? 0.85 : 0.95))
      }));
    }

    // Apply token per file limit
    if (options.maxTokensPerFile) {
      optimizedFiles = optimizedFiles.map(f => ({
        ...f,
        content: this.truncateContent(f.content, options.maxTokensPerFile!),
        tokens: Math.min(f.tokens || this.estimateTokens(f.content), options.maxTokensPerFile!)
      }));
    }

    // Apply total file limit (keep highest priority)
    if (options.maxTotalFiles && optimizedFiles.length > options.maxTotalFiles) {
      optimizedFiles = optimizedFiles
        .sort((a, b) => (b.priority || 5) - (a.priority || 5))
        .slice(0, options.maxTotalFiles);
    }

    const optimizedTokens = optimizedFiles.reduce((sum, f) => sum + (f.tokens || this.estimateTokens(f.content)), 0);
    const savedTokens = originalTokens - optimizedTokens;
    const savedPercentage = Math.round((savedTokens / originalTokens) * 100);

    return {
      optimized: optimizedFiles,
      result: {
        originalFiles,
        optimizedFiles: optimizedFiles.length,
        originalTokens,
        optimizedTokens,
        savedTokens,
        savedPercentage
      }
    };
  }

  private static filterByTechnology(files: FileInfo[], excludeTechnologies: string[]): FileInfo[] {
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

  private static optimizeContent(content: string, options: TokenOptimizationOptions): string {
    let optimized = content;

    if (options.removeComments) {
      // Remove single-line comments
      optimized = optimized.replace(/\/\/.*$/gm, '');
      // Remove multi-line comments
      optimized = optimized.replace(/\/\*[\s\S]*?\*\//g, '');
    }

    if (options.removeEmptyLines) {
      optimized = optimized.replace(/^\s*\n/gm, '');
    }

    if (options.summarizeContent) {
      optimized = this.summarizeContent(optimized);
    }

    return optimized;
  }

  private static summarizeContent(content: string): string {
    const lines = content.split('\n');
    const summary: string[] = [];

    // Keep imports
    const imports = lines.filter(line => line.trim().startsWith('import'));
    if (imports.length > 0) {
      summary.push('// IMPORTS');
      summary.push(...imports.slice(0, 5));
      if (imports.length > 5) {summary.push(`// ... ${imports.length - 5} more imports`);}
      summary.push('');
    }

    // Keep exports and function signatures
    const exports = lines.filter(line => 
      line.includes('export') && 
      (line.includes('function') || line.includes('const') || line.includes('class'))
    );
    
    if (exports.length > 0) {
      summary.push('// EXPORTS & FUNCTIONS');
      exports.forEach(exp => {
        const cleaned = exp.split('{')[0].trim() + (exp.includes('{') ? ' { ... }' : '');
        summary.push(cleaned);
      });
      summary.push('');
    }

    // Add summary note
    summary.push(`// Content summarized from ${lines.length} lines`);

    return summary.join('\n');
  }

  private static truncateContent(content: string, maxTokens: number): string {
    const maxChars = maxTokens * 4; // Rough estimate
    
    if (content.length <= maxChars) {
      return content;
    }
    
    const truncated = content.substring(0, maxChars);
    const lastNewline = truncated.lastIndexOf('\n');
    
    if (lastNewline > maxChars * 0.8) {
      return truncated.substring(0, lastNewline) + '\n\n// ... (truncated for token limit)';
    }
    
    return truncated + '\n\n// ... (truncated for token limit)';
  }

  private static estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }
} 