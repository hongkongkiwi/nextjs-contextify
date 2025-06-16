/**
 * Shared utilities to eliminate code duplication across the codebase
 */

export class SharedUtilities {
  /**
   * Estimate tokens using the standard 4:1 character to token ratio
   * Consolidated from multiple files to eliminate duplication
   */
  static estimateTokens(content: string): number {
    if (!content) return 0;
    return Math.ceil(content.length / 4);
  }

  /**
   * Get programming language from file extension
   * Consolidated from ContextFormatter and UniversalContextGenerator
   */
  static getFileLanguage(filename: string): string {
    const ext = filename.includes('.') 
      ? filename.substring(filename.lastIndexOf('.')).toLowerCase()
      : '';
      
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.json': 'json',
      '.md': 'markdown',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.html': 'html',
      '.xml': 'xml',
      '.sql': 'sql',
      '.py': 'python',
      '.rb': 'ruby',
      '.php': 'php',
      '.go': 'go',
      '.rs': 'rust',
      '.java': 'java',
      '.kt': 'kotlin',
      '.swift': 'swift',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp'
    };
    
    return languageMap[ext] || 'text';
  }

  /**
   * Format bytes to human readable string
   * Used across multiple services for memory/file size reporting
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Safely parse JSON with fallback
   * Used across configuration and processing services
   */
  static safeJsonParse<T>(jsonString: string, fallback: T): T {
    try {
      return JSON.parse(jsonString) as T;
    } catch {
      return fallback;
    }
  }

  /**
   * Get file extension from path
   */
  static getFileExtension(filePath: string): string {
    return filePath.includes('.') 
      ? filePath.substring(filePath.lastIndexOf('.')).toLowerCase()
      : '';
  }

  /**
   * Check if file should be included based on common patterns
   */
  static shouldIncludeFile(filename: string): boolean {
    const ext = this.getFileExtension(filename);
    const includedExtensions = [
      '.ts', '.tsx', '.js', '.jsx', 
      '.json', '.md', '.yml', '.yaml',
      '.css', '.scss', '.sass', '.less',
      '.html', '.xml', '.sql'
    ];
    return includedExtensions.includes(ext);
  }

  /**
   * Check if directory should be excluded based on common patterns
   */
  static shouldExcludeDirectory(dirname: string): boolean {
    const excludedDirs = [
      'node_modules', '.git', '.next', 'build', 'dist', 
      '.vscode', '.turbo', '.cache', 'coverage', '.nyc_output',
      '.swc', 'out', '.vercel', '.netlify'
    ];
    return excludedDirs.includes(dirname);
  }

  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T, 
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Sleep/delay utility
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clamp a number between min and max values
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
} 