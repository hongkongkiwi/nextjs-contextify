import * as fs from 'fs';
import * as path from 'path';
import { FileInfo, CacheEntry, ScanResult } from '../core/types';
import { Logger } from '../utils/Logger';

export class CacheService {
  private static readonly CACHE_VERSION = '1.0.0';
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 100; // Maximum number of cached entries

  private cache = new Map<string, CacheEntry<any>>();
  private fileStatsCache = new Map<string, { mtime: Date; size: number }>();

  constructor(private rootPath: string) {
    this.loadCacheFromDisk();
    this.startCleanupTimer();
  }

  async getCachedFileInfo(filePath: string): Promise<FileInfo | null> {
    const cacheKey = this.getFileCacheKey(filePath);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if cache is still valid
    if (await this.isFileModified(filePath, entry.timestamp)) {
      this.cache.delete(cacheKey);
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(cacheKey);
      return null;
    }

    Logger.debug(`Cache hit for file: ${filePath}`);
    return entry.data as FileInfo;
  }

  async setCachedFileInfo(filePath: string, fileInfo: FileInfo): Promise<void> {
    const cacheKey = this.getFileCacheKey(filePath);

    // Update file stats cache
    try {
      const stats = await fs.promises.stat(filePath);
      this.fileStatsCache.set(filePath, {
        mtime: stats.mtime,
        size: stats.size,
      });
    } catch (error) {
      Logger.warn(`Failed to stat file for caching: ${filePath}`, error);
      return;
    }

    const entry: CacheEntry<FileInfo> = {
      data: fileInfo,
      timestamp: new Date(),
      ttl: CacheService.DEFAULT_TTL,
    };

    this.cache.set(cacheKey, entry);
    Logger.debug(`Cached file info for: ${filePath}`);

    // Enforce cache size limit
    this.enforceCacheSizeLimit();
  }

  async getCachedScanResult(scanKey: string): Promise<ScanResult | null> {
    const cacheKey = this.getScanCacheKey(scanKey);
    const entry = this.cache.get(cacheKey);

    if (!entry || this.isExpired(entry)) {
      if (entry) {
        this.cache.delete(cacheKey);
      }
      return null;
    }

    Logger.debug(`Cache hit for scan result: ${scanKey}`);
    return entry.data as ScanResult;
  }

  async setCachedScanResult(scanKey: string, result: ScanResult): Promise<void> {
    const cacheKey = this.getScanCacheKey(scanKey);
    const entry: CacheEntry<ScanResult> = {
      data: result,
      timestamp: new Date(),
      ttl: CacheService.DEFAULT_TTL,
    };

    this.cache.set(cacheKey, entry);
    Logger.debug(`Cached scan result for: ${scanKey}`);

    this.enforceCacheSizeLimit();
  }

  private async isFileModified(filePath: string, _cacheTime: Date): Promise<boolean> {
    try {
      const fullPath = path.resolve(this.rootPath, filePath);
      const stats = await fs.promises.stat(fullPath);

      const cachedStats = this.fileStatsCache.get(filePath);
      if (!cachedStats) {
        return true;
      }

      return stats.mtime > cachedStats.mtime || stats.size !== cachedStats.size;
    } catch (error) {
      Logger.warn(`Failed to check file modification: ${filePath}`, error);
      return true; // Assume modified if we can't check
    }
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    const now = new Date();
    return now.getTime() - entry.timestamp.getTime() > entry.ttl;
  }

  private getFileCacheKey(filePath: string): string {
    return `file:${CacheService.CACHE_VERSION}:${filePath}`;
  }

  private getScanCacheKey(scanKey: string): string {
    return `scan:${CacheService.CACHE_VERSION}:${scanKey}`;
  }

  private enforceCacheSizeLimit(): void {
    if (this.cache.size <= CacheService.MAX_CACHE_SIZE) {
      return;
    }

    // Remove oldest entries
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const toRemove = entries.slice(0, this.cache.size - CacheService.MAX_CACHE_SIZE);
    toRemove.forEach(([key]) => {
      this.cache.delete(key);
    });

    Logger.debug(`Removed ${toRemove.length} cache entries to enforce size limit`);
  }

  private startCleanupTimer(): void {
    // Clean up expired entries every 5 minutes
    setInterval(
      () => {
        this.cleanupExpiredEntries();
      },
      5 * 60 * 1000
    );
  }

  private cleanupExpiredEntries(): void {
    const before = this.cache.size;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }

    const removed = before - this.cache.size;
    if (removed > 0) {
      Logger.debug(`Cleaned up ${removed} expired cache entries`);
    }
  }

  private loadCacheFromDisk(): void {
    // In a more sophisticated implementation, we might persist cache to disk
    // For now, we'll just start with an empty cache
    Logger.debug('Cache service initialized');
  }

  clearCache(): void {
    this.cache.clear();
    this.fileStatsCache.clear();
    Logger.info('Cache cleared');
  }

  getCacheStats(): { size: number; files: number; scans: number } {
    const entries = Array.from(this.cache.keys());
    const fileEntries = entries.filter(key => key.startsWith('file:')).length;
    const scanEntries = entries.filter(key => key.startsWith('scan:')).length;

    return {
      size: this.cache.size,
      files: fileEntries,
      scans: scanEntries,
    };
  }

  // Generate a scan key based on scan parameters
  generateScanKey(options: {
    includePatterns?: string[];
    excludePatterns?: string[];
    maxDepth?: number;
    lastModified?: Date;
  }): string {
    const keyParts = [
      options.includePatterns?.join(',') || '',
      options.excludePatterns?.join(',') || '',
      options.maxDepth?.toString() || '',
      options.lastModified?.getTime().toString() || '',
    ];

    return Buffer.from(keyParts.join('|')).toString('base64');
  }

  dispose(): void {
    this.clearCache();
    Logger.debug('Cache service disposed');
  }
}
