import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './Logger';

export class SecurityService {
  private static readonly MAX_SAFE_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly MAX_PATH_LENGTH = 4096;
  private static readonly ALLOWED_EXTENSIONS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', 
    '.css', '.scss', '.sass', '.html', '.yaml', '.yml',
    '.env', '.gitignore', '.eslintrc', '.prettierrc'
  ]);
  
  private static workspaceRoot: string = '';

  static setWorkspaceRoot(root: string): void {
    this.workspaceRoot = path.resolve(root);
  }

  static sanitizeFilePath(filePath: string): string {
    // Normalize path and remove any path traversal attempts
    const normalized = path.normalize(filePath);
    
    // Remove dangerous patterns
    const sanitized = normalized
      .replace(/\.\./g, '') // Remove parent directory references
      .replace(/[<>:"|?*]/g, '') // Remove illegal filename characters
      .trim();

    // Ensure path length is reasonable
    if (sanitized.length > this.MAX_PATH_LENGTH) {
      throw new Error(`File path too long: ${sanitized.length} characters`);
    }

    return sanitized;
  }

  static async validateFileAccess(filePath: string): Promise<boolean> {
    try {
      const sanitizedPath = this.sanitizeFilePath(filePath);
      const resolvedPath = path.resolve(sanitizedPath);

      // Check if file is within workspace boundaries
      if (this.workspaceRoot && !resolvedPath.startsWith(this.workspaceRoot)) {
        throw new Error(`File outside workspace: ${resolvedPath}`);
      }

      // Check if file exists and is accessible
      await fs.promises.access(resolvedPath, fs.constants.R_OK);

      // Get real path to check for symlinks
      const realPath = await fs.promises.realpath(resolvedPath);
      
      // If paths differ, it's a symlink - validate the target
      if (realPath !== resolvedPath) {
        if (this.workspaceRoot && !realPath.startsWith(this.workspaceRoot)) {
          throw new Error(`Symlink target outside workspace: ${realPath}`);
        }
      }

      return true;
    } catch (error) {
      Logger.warn(`File access validation failed for ${filePath}:`, error);
      return false;
    }
  }

  static isFileSafe(stats: fs.Stats): boolean {
    // Check if it's actually a file
    if (!stats.isFile()) {
      return false;
    }

    // Check file size
    if (stats.size > this.MAX_SAFE_FILE_SIZE) {
      Logger.warn(`File too large: ${stats.size} bytes`);
      return false;
    }

    // Check for suspicious modification times (future dates, etc.)
    const now = Date.now();
    const modTime = stats.mtime.getTime();
    
    if (modTime > now + 60000) { // More than 1 minute in the future
      Logger.warn(`File has suspicious modification time: ${stats.mtime}`);
      return false;
    }

    return true;
  }

  static isExtensionAllowed(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.ALLOWED_EXTENSIONS.has(ext) || ext === '';
  }

  static isPathSafe(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath);
    
    // Check for dangerous patterns
    const dangerousPatterns = [
      /\.\./,           // Parent directory traversal
      /[<>:"|?*]/,      // Illegal filename characters
      /\/\.\//,         // Current directory references
      /\\{2,}/,         // Multiple backslashes
      /\/{2,}/,         // Multiple forward slashes
      /\0/,             // Null bytes
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(normalizedPath)) {
        return false;
      }
    }

    return true;
  }

  static async validateFileContent(filePath: string, content: string): Promise<boolean> {
    try {
      // Check for binary content (null bytes)
      if (content.includes('\0')) {
        Logger.warn(`Binary content detected in ${filePath}`);
        return false;
      }

      // Check for extremely long lines that might cause issues
      const lines = content.split('\n');
      const maxLineLength = 10000; // 10KB per line
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].length > maxLineLength) {
          Logger.warn(`Very long line detected in ${filePath} at line ${i + 1}`);
          return false;
        }
      }

      // Check for suspicious patterns that might be malicious
      const suspiciousPatterns = [
        /eval\s*\(/gi,           // eval() calls
        /new\s+Function\s*\(/gi, // Function constructor
        /document\.write/gi,     // document.write
        /innerHTML\s*=/gi,       // innerHTML assignment
        /outerHTML\s*=/gi,       // outerHTML assignment
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          Logger.warn(`Suspicious pattern detected in ${filePath}: ${pattern}`);
          // Don't reject, just warn for code files
        }
      }

      return true;
    } catch (error) {
      Logger.error(`Content validation failed for ${filePath}:`, error as Error);
      return false;
    }
  }

  static getSecurityReport(filePath: string, stats?: fs.Stats): {
    isSecure: boolean;
    issues: string[];
    warnings: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Path security checks
    if (!this.isPathSafe(filePath)) {
      issues.push('Unsafe file path detected');
    }

    if (!this.isExtensionAllowed(filePath)) {
      warnings.push('File extension not in allowed list');
      recommendations.push('Consider adding extension to allowed list if safe');
    }

    // File stats checks
    if (stats) {
      if (!this.isFileSafe(stats)) {
        issues.push('File failed safety validation');
      }

      if (stats.size === 0) {
        warnings.push('Empty file detected');
      }

      if (stats.size > 1024 * 1024) { // 1MB
        warnings.push('Large file detected - may impact performance');
        recommendations.push('Consider using streaming for large files');
      }
    }

    return {
      isSecure: issues.length === 0,
      issues,
      warnings,
      recommendations,
    };
  }

  static async scanDirectoryForThreats(dirPath: string): Promise<{
    scannedFiles: number;
    threats: Array<{ file: string; threat: string; severity: 'low' | 'medium' | 'high' }>;
    suspicious: Array<{ file: string; reason: string }>;
  }> {
    const threats: Array<{ file: string; threat: string; severity: 'low' | 'medium' | 'high' }> = [];
    const suspicious: Array<{ file: string; reason: string }> = [];
    let scannedFiles = 0;

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isFile()) {
          scannedFiles++;
          
          // Check file extension
          if (!this.isExtensionAllowed(fullPath)) {
            suspicious.push({
              file: fullPath,
              reason: 'Unknown or potentially dangerous file extension',
            });
          }

          // Check file size
          try {
            const stats = await fs.promises.stat(fullPath);
            if (stats.size > this.MAX_SAFE_FILE_SIZE) {
              threats.push({
                file: fullPath,
                threat: 'File size exceeds safety limit',
                severity: 'medium',
              });
            }
          } catch (error) {
            suspicious.push({
              file: fullPath,
              reason: 'Cannot access file stats',
            });
          }
        }
      }
    } catch (error) {
      Logger.error(`Failed to scan directory ${dirPath}:`, error as Error);
    }

    return {
      scannedFiles,
      threats,
      suspicious,
    };
  }

  static createSecureOptions(): {
    maxFileSize: number;
    allowedExtensions: string[];
    enableContentValidation: boolean;
    enablePathValidation: boolean;
  } {
    return {
      maxFileSize: this.MAX_SAFE_FILE_SIZE,
      allowedExtensions: Array.from(this.ALLOWED_EXTENSIONS),
      enableContentValidation: true,
      enablePathValidation: true,
    };
  }
} 