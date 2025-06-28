export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(private defaultTtl: number = 30000) {} // 30 seconds default

  public set<T>(key: string, data: T, ttl?: number): void {
    const effectiveTtl = ttl !== undefined ? ttl : this.defaultTtl;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: effectiveTtl,
    };

    this.cache.set(key, entry);
    console.log(`📦 Cached data for key: ${key} (TTL: ${entry.ttl}ms)`);
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      console.log(`❌ Cache miss for key: ${key}`);
      return null;
    }

    const now = Date.now();
    // Handle zero TTL as immediate expiration
    const isExpired = entry.ttl === 0 || (now - entry.timestamp > entry.ttl);

    if (isExpired) {
      this.cache.delete(key);
      this.stats.misses++;
      console.log(`⏰ Cache expired for key: ${key}`);
      return null;
    }

    this.stats.hits++;
    console.log(`✅ Cache hit for key: ${key}`);
    return entry.data as T;
  }

  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    // Handle zero TTL as immediate expiration
    const isExpired = entry.ttl === 0 || (now - entry.timestamp > entry.ttl);

    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  public delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      console.log(`🗑️ Deleted cache entry for key: ${key}`);
    }
    return result;
  }

  public clear(): void {
    this.cache.clear();
    // Reset statistics
    this.stats.hits = 0;
    this.stats.misses = 0;
    console.log('🧹 Cleared all cache entries');
  }

  public getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      totalEntries: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      missRate: total > 0 ? (this.stats.misses / total) * 100 : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
    };
  }

  public getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  public getSize(): number {
    return this.cache.size;
  }

  public cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      // Handle zero TTL as immediate expiration
      const isExpired = entry.ttl === 0 || (now - entry.timestamp > entry.ttl);
      if (isExpired) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired cache entries`);
    }

    return deletedCount;
  }

  public getCacheInfo(key: string): { exists: boolean; expired: boolean; age: number; ttl: number } | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    // Handle zero TTL as immediate expiration
    const isExpired = entry.ttl === 0 || age > entry.ttl;

    return {
      exists: true,
      expired: isExpired,
      age,
      ttl: entry.ttl,
    };
  }

  // Auto cleanup method to run periodically
  public startAutoCleanup(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }
}