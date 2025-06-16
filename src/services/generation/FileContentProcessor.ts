import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';
import { FileInfo } from '../../core/types';
import { Logger } from '../../utils/Logger';
import { SharedUtilities } from '../../utils/SharedUtilities';

export interface ProcessingOptions {
  maxFileSize?: number;
  maxMemoryUsage?: number;
  enableStreaming?: boolean;
  truncateIfNeeded?: boolean;
  preserveStructure?: boolean;
}

export interface ProcessingResult {
  content: string;
  wasTruncated: boolean;
  originalSize: number;
  processedSize: number;
  processingTime: number;
  memoryUsed: number;
}

export class FileContentProcessor {
  private static readonly DEFAULT_MAX_FILE_SIZE = 1024 * 1024; // 1MB
  private static readonly DEFAULT_MAX_MEMORY = 50 * 1024 * 1024; // 50MB
  private static readonly STREAM_THRESHOLD = 100 * 1024; // 100KB
  private static readonly MAX_LINES_PER_FILE = 2000;

  private static memoryUsage = 0;

  static async processFile(
    filePath: string,
    options: ProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      // Basic security validation
      if (!filePath || path.isAbsolute(filePath) && !filePath.startsWith(process.cwd())) {
        throw new Error(`File path ${filePath} is outside of workspace`);
      }

      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) {
        throw new Error(`Path ${filePath} is not a regular file`);
      }

      const maxSize = options.maxFileSize || this.DEFAULT_MAX_FILE_SIZE;
      const enableStreaming = options.enableStreaming ?? (stats.size > this.STREAM_THRESHOLD);

      let content: string;
      let wasTruncated = false;

      if (stats.size > maxSize) {
        if (options.truncateIfNeeded) {
          content = await this.processLargeFileWithTruncation(filePath, maxSize, enableStreaming);
          wasTruncated = true;
        } else {
          throw new Error(`File ${filePath} exceeds maximum size limit (${maxSize} bytes)`);
        }
      } else if (enableStreaming) {
        content = await this.processWithStreaming(filePath);
      } else {
        content = await this.processNormally(filePath);
      }

      // Memory safety check
      const currentMemory = process.memoryUsage().heapUsed;
      this.memoryUsage = currentMemory;
      
      if (currentMemory > (options.maxMemoryUsage || this.DEFAULT_MAX_MEMORY)) {
        Logger.warn(`Memory usage exceeded threshold: ${SharedUtilities.formatBytes(currentMemory)}`);
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Additional processing
      if (options.preserveStructure) {
        content = this.preserveCodeStructure(content, filePath);
      }

      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;

      return {
        content,
        wasTruncated,
        originalSize: stats.size,
        processedSize: Buffer.byteLength(content, 'utf8'),
        processingTime: endTime - startTime,
        memoryUsed: endMemory - startMemory,
      };
    } catch (error) {
      Logger.error(`Failed to process file ${filePath}:`, error as Error);
      throw error;
    }
  }

  static async processMultipleFiles(
    filePaths: string[],
    options: ProcessingOptions = {}
  ): Promise<Map<string, ProcessingResult>> {
    const results = new Map<string, ProcessingResult>();
    const maxConcurrent = 5; // Limit concurrent file processing
    
    Logger.info(`Processing ${filePaths.length} files with memory safety`);

    // Process in batches to control memory usage
    for (let i = 0; i < filePaths.length; i += maxConcurrent) {
      const batch = filePaths.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (filePath) => {
        try {
          const result = await this.processFile(filePath, options);
          results.set(filePath, result);
        } catch (error) {
          Logger.warn(`Skipping file due to processing error: ${filePath}`, error);
          // Add error result instead of failing completely
          results.set(filePath, {
            content: `// Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            wasTruncated: false,
            originalSize: 0,
            processedSize: 0,
            processingTime: 0,
            memoryUsed: 0,
          });
        }
      });

      await Promise.all(batchPromises);

      // Memory check after each batch
      const currentMemory = process.memoryUsage().heapUsed;
      if (currentMemory > this.DEFAULT_MAX_MEMORY) {
        Logger.info(`Running garbage collection after batch ${Math.floor(i / maxConcurrent) + 1}`);
        if (global.gc) {
          global.gc();
        }
      }
    }

    Logger.info(`Completed processing ${results.size} files`);
    return results;
  }

  private static async processNormally(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf8');
  }

  private static async processWithStreaming(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      const stream = createReadStream(filePath, { encoding: 'utf8' });

      stream.on('data', (chunk: string | Buffer) => {
        chunks.push(chunk.toString());
      });

      stream.on('end', () => {
        resolve(chunks.join(''));
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  private static async processLargeFileWithTruncation(
    filePath: string,
    maxSize: number,
    useStreaming: boolean
  ): Promise<string> {
    if (useStreaming) {
      return this.streamTruncatedContent(filePath, maxSize);
    } else {
      return this.readTruncatedContent(filePath, maxSize);
    }
  }

  private static async streamTruncatedContent(filePath: string, maxSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      let totalSize = 0;
      const stream = createReadStream(filePath, { encoding: 'utf8' });

             stream.on('data', (chunk: string | Buffer) => {
         const chunkStr = chunk.toString();
         const chunkSize = Buffer.byteLength(chunkStr, 'utf8');
        
                 if (totalSize + chunkSize <= maxSize) {
           chunks.push(chunkStr);
           totalSize += chunkSize;
         } else {
           const remainingSize = maxSize - totalSize;
           if (remainingSize > 0) {
             const truncatedChunk = chunkStr.substring(0, remainingSize);
             chunks.push(truncatedChunk);
           }
           stream.destroy(); // Stop reading
         }
      });

      stream.on('end', () => {
        const content = chunks.join('') + '\n\n// ... (file truncated due to size limit)';
        resolve(content);
      });

      stream.on('close', () => {
        const content = chunks.join('') + '\n\n// ... (file truncated due to size limit)';
        resolve(content);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    });
  }

  private static async readTruncatedContent(filePath: string, maxSize: number): Promise<string> {
    const fd = await fs.promises.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(maxSize);
      const { bytesRead } = await fd.read(buffer, 0, maxSize, 0);
      const content = buffer.subarray(0, bytesRead).toString('utf8');
      return content + '\n\n// ... (file truncated due to size limit)';
    } finally {
      await fd.close();
    }
  }

  private static preserveCodeStructure(content: string, filePath: string): string {
    const ext = SharedUtilities.getFileExtension(filePath);
    const lines = content.split('\n');

    // Limit total lines to prevent memory issues
    if (lines.length > this.MAX_LINES_PER_FILE) {
      const preservedLines = this.selectImportantLines(lines, ext);
      return preservedLines.join('\n') + 
        `\n\n// ... (${lines.length - preservedLines.length} lines removed for brevity)`;
    }

    return content;
  }

  private static selectImportantLines(lines: string[], ext: string): string[] {
    const important: string[] = [];
    const maxLines = this.MAX_LINES_PER_FILE;
    
    if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      // For JavaScript/TypeScript files, prioritize:
      // 1. Imports and exports
      // 2. Type definitions
      // 3. Function signatures
      // 4. Component definitions
      
      const imports = lines.filter(line => line.trim().startsWith('import '));
      const exports = lines.filter(line => line.trim().startsWith('export '));
      const types = lines.filter(line => 
        line.trim().startsWith('interface ') || 
        line.trim().startsWith('type ')
      );
      const functions = lines.filter(line => 
        line.trim().startsWith('function ') ||
        line.trim().startsWith('const ') && line.includes('=>') ||
        line.trim().startsWith('export function ')
      );
      
      important.push(...imports.slice(0, 20));
      important.push(...types.slice(0, 10));
      important.push(...functions.slice(0, 15));
      important.push(...exports.slice(0, 10));
      
      // Fill remaining space with other lines
      const remaining = maxLines - important.length;
      if (remaining > 0) {
        const otherLines = lines.filter(line => !important.includes(line));
        important.push(...otherLines.slice(0, remaining));
      }
    } else {
      // For other files, just take first N lines
      important.push(...lines.slice(0, maxLines));
    }

    return important.slice(0, maxLines);
  }

  static async estimateFileInfo(filePath: string): Promise<{
    size: number;
    isLarge: boolean;
    needsStreaming: boolean;
    estimatedMemory: number;
  }> {
    try {
      const stats = await fs.promises.stat(filePath);
      const isLarge = stats.size > this.DEFAULT_MAX_FILE_SIZE;
      const needsStreaming = stats.size > this.STREAM_THRESHOLD;
      const estimatedMemory = Math.min(stats.size * 1.5, this.DEFAULT_MAX_FILE_SIZE); // 1.5x for processing overhead

      return {
        size: stats.size,
        isLarge,
        needsStreaming,
        estimatedMemory,
      };
    } catch (error) {
      Logger.warn(`Failed to estimate file info for ${filePath}:`, error);
      return {
        size: 0,
        isLarge: false,
        needsStreaming: false,
        estimatedMemory: 0,
      };
    }
  }

  static getMemoryUsage(): {
    current: number;
    currentFormatted: string;
    limit: number;
    limitFormatted: string;
    percentage: number;
  } {
    const current = process.memoryUsage().heapUsed;
    const limit = this.DEFAULT_MAX_MEMORY;
    
    return {
      current,
      currentFormatted: SharedUtilities.formatBytes(current),
      limit,
      limitFormatted: SharedUtilities.formatBytes(limit),
      percentage: (current / limit) * 100,
    };
  }

  static async optimizeMemoryUsage(): Promise<void> {
    Logger.info('Optimizing memory usage...');
    
    // Force garbage collection if available
    if (global.gc) {
      const beforeGC = process.memoryUsage().heapUsed;
      global.gc();
      const afterGC = process.memoryUsage().heapUsed;
      Logger.info(`Garbage collection freed ${SharedUtilities.formatBytes(beforeGC - afterGC)}`);
    }
    
    // Clear any internal caches if needed
    this.memoryUsage = process.memoryUsage().heapUsed;
  }

  // Removed redundant formatBytes method - now using SharedUtilities.formatBytes

  static async getProcessingRecommendations(
    filePaths: string[]
  ): Promise<{
    shouldUseStreaming: boolean;
    estimatedMemory: number;
    recommendedBatchSize: number;
    warningsIssues: string[];
  }> {
    let totalEstimatedMemory = 0;
    let largeFileCount = 0;
    const warnings: string[] = [];

    for (const filePath of filePaths) {
      const info = await this.estimateFileInfo(filePath);
      totalEstimatedMemory += info.estimatedMemory;
      
      if (info.isLarge) {
        largeFileCount++;
      }
      
      if (info.size > 5 * 1024 * 1024) { // 5MB
        warnings.push(`Very large file detected: ${filePath} (${SharedUtilities.formatBytes(info.size)})`);
      }
    }

    const shouldUseStreaming = largeFileCount > 0 || totalEstimatedMemory > this.DEFAULT_MAX_MEMORY;
    const recommendedBatchSize = Math.max(1, Math.floor(this.DEFAULT_MAX_MEMORY / (totalEstimatedMemory / filePaths.length)));

    if (totalEstimatedMemory > this.DEFAULT_MAX_MEMORY) {
      warnings.push(`Estimated memory usage (${SharedUtilities.formatBytes(totalEstimatedMemory)}) exceeds recommended limit`);
    }

    return {
      shouldUseStreaming,
      estimatedMemory: totalEstimatedMemory,
      recommendedBatchSize: Math.min(recommendedBatchSize, 10), // Cap at 10
      warningsIssues: warnings,
    };
  }
} 