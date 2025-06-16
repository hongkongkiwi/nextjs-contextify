import { FileInfo, TargetLLM } from '../../core/types';
import { Logger } from '../../utils/Logger';

export interface TokenOptimizationOptions {
  maxTotalFiles?: number;
  maxTokensPerFile?: number;
  priorityThreshold?: number; // 1-10, only include files above this priority
  excludeTechnologies?: string[];
  excludeFileTypes?: string[];
  excludeDirectories?: string[];
  excludeLargeFiles?: boolean; // Files > 50KB
  summarizeContent?: boolean;
  removeComments?: boolean;
  removeEmptyLines?: boolean;
  targetLLM?: TargetLLM;
}

export interface OptimizationResult {
  originalFileCount: number;
  optimizedFileCount: number;
  originalTokens: number;
  optimizedTokens: number;
  savings: {
    fileReduction: number; // percentage
    tokenReduction: number; // percentage
    estimatedCostSavings: number; // percentage
  };
  appliedOptimizations: string[];
}

export class TokenOptimizer {
  private static readonly FILE_SIZE_LIMITS = {
    small: 50 * 1024,    // 50KB
    medium: 100 * 1024,  // 100KB
    large: 200 * 1024,   // 200KB
  };

  private static readonly TOKEN_LIMITS = {
    claude: 200000,     // Claude 3.5 Sonnet
    gpt: 128000,        // GPT-4 Turbo
    gemini: 32000,      // Gemini Pro
    deepseek: 64000,    // DeepSeek V3
    grok: 128000,       // Grok 2/3
    custom: 50000,      // Conservative default
  };

  private static readonly TECHNOLOGY_PATTERNS = {
    prisma: ['/prisma/', 'schema.prisma', '.prisma'],
    zenstack: ['.zmodel', '/zenstack/'],
    drizzle: ['drizzle.config', '/drizzle/'],
    mongodb: ['/mongodb/', 'mongoose'],
    'aws-sdk': ['/aws/', 'aws-sdk'],
    firebase: ['/firebase/', 'firebase-admin'],
    supabase: ['/supabase/', '@supabase/'],
    'database': ['/migrations/', '/seeds/', '/db/'],
  };

  static async optimizeFiles(
    files: FileInfo[], 
    options: TokenOptimizationOptions = {}
  ): Promise<{ optimizedFiles: FileInfo[]; result: OptimizationResult }> {
    const startTime = Date.now();
    Logger.info(`Starting token optimization with ${files.length} files`);

    let optimizedFiles = [...files];
    const appliedOptimizations: string[] = [];
    const originalTokens = this.calculateTotalTokens(files);

    // Apply file count limit
    if (options.maxTotalFiles && optimizedFiles.length > options.maxTotalFiles) {
      optimizedFiles = this.selectTopPriorityFiles(optimizedFiles, options.maxTotalFiles);
      appliedOptimizations.push(`Limited to top ${options.maxTotalFiles} priority files`);
    }

    // Apply priority threshold
    if (options.priorityThreshold) {
      const beforeCount = optimizedFiles.length;
      optimizedFiles = optimizedFiles.filter(f => f.priority >= options.priorityThreshold!);
      if (beforeCount > optimizedFiles.length) {
        appliedOptimizations.push(`Filtered by priority threshold: ${options.priorityThreshold}`);
      }
    }

    // Exclude large files
    if (options.excludeLargeFiles) {
      const beforeCount = optimizedFiles.length;
      optimizedFiles = optimizedFiles.filter(f => f.size <= this.FILE_SIZE_LIMITS.small);
      if (beforeCount > optimizedFiles.length) {
        appliedOptimizations.push('Excluded large files (>50KB)');
      }
    }

    // Exclude by technology
    if (options.excludeTechnologies?.length) {
      const beforeCount = optimizedFiles.length;
      optimizedFiles = this.filterByTechnology(optimizedFiles, options.excludeTechnologies);
      if (beforeCount > optimizedFiles.length) {
        appliedOptimizations.push(`Excluded technologies: ${options.excludeTechnologies.join(', ')}`);
      }
    }

    // Exclude by file types
    if (options.excludeFileTypes?.length) {
      const beforeCount = optimizedFiles.length;
      optimizedFiles = optimizedFiles.filter(f => 
        !options.excludeFileTypes!.some(ext => f.path.endsWith(ext))
      );
      if (beforeCount > optimizedFiles.length) {
        appliedOptimizations.push(`Excluded file types: ${options.excludeFileTypes.join(', ')}`);
      }
    }

    // Exclude by directories
    if (options.excludeDirectories?.length) {
      const beforeCount = optimizedFiles.length;
      optimizedFiles = optimizedFiles.filter(f => 
        !options.excludeDirectories!.some(dir => f.path.includes(dir))
      );
      if (beforeCount > optimizedFiles.length) {
        appliedOptimizations.push(`Excluded directories: ${options.excludeDirectories.join(', ')}`);
      }
    }

    // Apply content optimizations
    if (options.summarizeContent || options.removeComments || options.removeEmptyLines) {
      optimizedFiles = await this.optimizeFileContent(optimizedFiles, options);
      appliedOptimizations.push('Applied content optimizations');
    }

    // Apply per-file token limits
    if (options.maxTokensPerFile) {
      optimizedFiles = this.enforcePerFileTokenLimits(optimizedFiles, options.maxTokensPerFile);
      appliedOptimizations.push(`Limited files to ${options.maxTokensPerFile} tokens each`);
    }

    const optimizedTokens = this.calculateTotalTokens(optimizedFiles);
    const processingTime = Date.now() - startTime;

    const result: OptimizationResult = {
      originalFileCount: files.length,
      optimizedFileCount: optimizedFiles.length,
      originalTokens,
      optimizedTokens,
      savings: {
        fileReduction: ((files.length - optimizedFiles.length) / files.length) * 100,
        tokenReduction: ((originalTokens - optimizedTokens) / originalTokens) * 100,
        estimatedCostSavings: this.calculateCostSavings(originalTokens, optimizedTokens, options.targetLLM),
      },
      appliedOptimizations,
    };

    Logger.info(`Token optimization completed in ${processingTime}ms`, {
      originalFiles: files.length,
      optimizedFiles: optimizedFiles.length,
      tokenReduction: `${result.savings.tokenReduction.toFixed(1)}%`,
      costSavings: `${result.savings.estimatedCostSavings.toFixed(1)}%`,
    });

    return { optimizedFiles, result };
  }

  private static selectTopPriorityFiles(files: FileInfo[], maxFiles: number): FileInfo[] {
    // Sort by priority (descending) and take top N
    return files
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxFiles);
  }

  private static filterByTechnology(files: FileInfo[], excludeTechnologies: string[]): FileInfo[] {
    return files.filter(file => {
      return !excludeTechnologies.some(tech => {
        const patterns = this.TECHNOLOGY_PATTERNS[tech as keyof typeof this.TECHNOLOGY_PATTERNS];
        if (!patterns) return false;
        
        return patterns.some(pattern => 
          file.path.toLowerCase().includes(pattern.toLowerCase())
        );
      });
    });
  }

  private static async optimizeFileContent(
    files: FileInfo[], 
    options: TokenOptimizationOptions
  ): Promise<FileInfo[]> {
    return files.map(file => {
      let content = file.content;
      
      if (options.removeEmptyLines) {
        content = content.replace(/^\s*[\r\n]/gm, '');
      }
      
      if (options.removeComments) {
        content = this.removeComments(content, file.path);
      }
      
      if (options.summarizeContent) {
        content = this.summarizeContent(content, file.path);
      }

      const newTokens = this.estimateTokens(content);
      
      return {
        ...file,
        content,
        tokens: newTokens,
        size: Buffer.byteLength(content, 'utf8'),
      };
    });
  }

  private static removeComments(content: string, filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    if (['js', 'jsx', 'ts', 'tsx'].includes(ext || '')) {
      // Remove // comments (but preserve URLs)
      content = content.replace(/(?<!https?:)\/\/.*$/gm, '');
      // Remove /* */ comments
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    }
    
    if (['json'].includes(ext || '')) {
      // JSON doesn't have comments, but some tools allow them
      content = content.replace(/\/\/.*$/gm, '');
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    }
    
    return content;
  }

  private static summarizeContent(content: string, filePath: string): string {
    const lines = content.split('\n');
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) {
      return this.summarizeJavaScriptFile(lines, filePath);
    }
    
    if (['json'].includes(ext || '')) {
      return this.summarizeJsonFile(content, filePath);
    }
    
    // For other files, just truncate if too long
    if (lines.length > 50) {
      return lines.slice(0, 50).join('\n') + 
        `\n\n// ... (${lines.length - 50} more lines)`;
    }
    
    return content;
  }

  private static summarizeJavaScriptFile(lines: string[], filePath: string): string {
    const important: string[] = [];
    const imports: string[] = [];
    const exports: string[] = [];
    const types: string[] = [];
    const functions: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) {
        imports.push(line);
      } else if (trimmed.startsWith('export ')) {
        exports.push(line);
      } else if (trimmed.startsWith('interface ') || trimmed.startsWith('type ')) {
        types.push(line);
      } else if (trimmed.startsWith('function ') || trimmed.includes('=>')) {
        functions.push(line);
      } else if (trimmed.startsWith('const ') && trimmed.includes('=')) {
        important.push(line);
      }
    }
    
    let summary = `// File: ${filePath} (summarized)\n\n`;
    
    if (imports.length > 0) {
      summary += '// IMPORTS\n' + imports.slice(0, 10).join('\n') + '\n\n';
    }
    
    if (types.length > 0) {
      summary += '// TYPES\n' + types.slice(0, 5).join('\n') + '\n\n';
    }
    
    if (functions.length > 0) {
      summary += '// FUNCTIONS\n' + functions.slice(0, 5).join('\n') + '\n\n';
    }
    
    if (exports.length > 0) {
      summary += '// EXPORTS\n' + exports.slice(0, 5).join('\n') + '\n\n';
    }
    
    return summary;
  }

  private static summarizeJsonFile(content: string, filePath: string): string {
    try {
      const json = JSON.parse(content);
      const keys = Object.keys(json);
      
      if (keys.length > 20) {
        const summary: any = {};
        keys.slice(0, 20).forEach(key => {
          if (typeof json[key] === 'object') {
            summary[key] = `{...} (${Object.keys(json[key] || {}).length} properties)`;
          } else {
            summary[key] = json[key];
          }
        });
        
        summary['...'] = `(${keys.length - 20} more properties)`;
        return JSON.stringify(summary, null, 2);
      }
    } catch {
      // If JSON parsing fails, just truncate
    }
    
    return content;
  }

  private static enforcePerFileTokenLimits(files: FileInfo[], maxTokens: number): FileInfo[] {
    return files.map(file => {
      if (file.tokens <= maxTokens) return file;
      
      // Truncate content to fit token limit
      const ratio = maxTokens / file.tokens;
      const targetLength = Math.floor(file.content.length * ratio * 0.9); // 90% to be safe
      
      const truncatedContent = file.content.substring(0, targetLength) + 
        `\n\n// ... (content truncated to fit ${maxTokens} token limit)`;
      
      return {
        ...file,
        content: truncatedContent,
        tokens: maxTokens,
        size: Buffer.byteLength(truncatedContent, 'utf8'),
      };
    });
  }

  private static calculateTotalTokens(files: FileInfo[]): number {
    return files.reduce((total, file) => total + file.tokens, 0);
  }

  private static estimateTokens(content: string): number {
    // Rough estimation: 1 token ≈ 4 characters for most content
    return Math.ceil(content.length / 4);
  }

  private static calculateCostSavings(
    originalTokens: number, 
    optimizedTokens: number, 
    targetLLM?: TargetLLM
  ): number {
    const reduction = (originalTokens - optimizedTokens) / originalTokens;
    
    // Cost varies by LLM, but reduction percentage is the same
    // Some LLMs have higher cost per token, so savings are more significant
    const costMultiplier = targetLLM === 'gpt' ? 1.2 : 
                          targetLLM === 'claude' ? 1.0 : 
                          targetLLM === 'gemini' ? 0.8 : 1.0;
    
    return reduction * 100 * costMultiplier;
  }

  static getOptimizationPresets(): Record<string, TokenOptimizationOptions> {
    return {
      maximum: {
        maxTotalFiles: 20,
        maxTokensPerFile: 1000,
        priorityThreshold: 7,
        excludeTechnologies: ['prisma', 'zenstack', 'drizzle', 'mongodb', 'aws-sdk'],
        excludeFileTypes: ['.test.ts', '.spec.js', '.stories.ts'],
        excludeLargeFiles: true,
        summarizeContent: true,
        removeComments: true,
        removeEmptyLines: true,
      },
      balanced: {
        maxTotalFiles: 50,
        maxTokensPerFile: 2000,
        priorityThreshold: 5,
        excludeTechnologies: ['aws-sdk', 'mongodb'],
        excludeLargeFiles: true,
        removeEmptyLines: true,
      },
      light: {
        maxTotalFiles: 100,
        excludeFileTypes: ['.test.ts', '.spec.js'],
        removeEmptyLines: true,
      },
      custom: {
        // User-defined settings
      }
    };
  }
} 