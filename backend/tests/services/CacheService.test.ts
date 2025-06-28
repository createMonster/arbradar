import { CacheService, CacheEntry, CacheStats } from '../../src/services/CacheService';

// Mock console to silence output during tests
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
};

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService(1000); // 1 second TTL for faster tests
  });

  afterEach(() => {
    cacheService.clear();
  });

  describe('Constructor', () => {
    it('should create with default TTL', () => {
      const service = new CacheService();
      expect(service).toBeInstanceOf(CacheService);
    });

    it('should create with custom TTL', () => {
      const service = new CacheService(5000);
      expect(service).toBeInstanceOf(CacheService);
    });
  });

  describe('Set and Get', () => {
    it('should store and retrieve data', () => {
      const key = 'test-key';
      const data = { value: 'test-data' };

      cacheService.set(key, data);
      const result = cacheService.get(key);

      expect(result).toEqual(data);
    });

    it('should store with custom TTL', () => {
      const key = 'test-key';
      const data = 'test-data';
      const customTtl = 5000;

      cacheService.set(key, data, customTtl);
      const result = cacheService.get(key);

      expect(result).toBe(data);
    });

    it('should return null for non-existent key', () => {
      const result = cacheService.get('non-existent');

      expect(result).toBeNull();
    });

    it('should handle different data types', () => {
      cacheService.set('string', 'hello');
      cacheService.set('number', 42);
      cacheService.set('boolean', true);
      cacheService.set('object', { key: 'value' });
      cacheService.set('array', [1, 2, 3]);

      expect(cacheService.get('string')).toBe('hello');
      expect(cacheService.get('number')).toBe(42);
      expect(cacheService.get('boolean')).toBe(true);
      expect(cacheService.get('object')).toEqual({ key: 'value' });
      expect(cacheService.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire entries after TTL', (done) => {
      const key = 'expiring-key';
      const data = 'expiring-data';

      cacheService.set(key, data, 50); // 50ms TTL

      // Should exist immediately
      expect(cacheService.get(key)).toBe(data);

      // Should expire after TTL
      setTimeout(() => {
        try {
          const result = cacheService.get(key);
          expect(result).toBeNull();
          done();
        } catch (error) {
          done(error);
        }
      }, 60); // Wait a bit longer than TTL
    });

    it('should use default TTL when not specified', () => {
      const key = 'default-ttl-key';
      const data = 'test-data';

      cacheService.set(key, data);
      const info = cacheService.getCacheInfo(key);

      expect(info?.ttl).toBe(1000); // Default TTL set in beforeEach
    });
  });

  describe('Has Method', () => {
    it('should return true for existing non-expired entry', () => {
      const key = 'existing-key';
      cacheService.set(key, 'data');

      expect(cacheService.has(key)).toBe(true);
    });

    it('should return false for non-existent entry', () => {
      expect(cacheService.has('non-existent')).toBe(false);
    });

    it('should return false for expired entry', (done) => {
      const key = 'expiring-key';
      cacheService.set(key, 'data', 50);

      setTimeout(() => {
        try {
          expect(cacheService.has(key)).toBe(false);
          done();
        } catch (error) {
          done(error);
        }
      }, 60);
    });
  });

  describe('Delete Method', () => {
    it('should delete existing entry', () => {
      const key = 'to-delete';
      cacheService.set(key, 'data');

      const deleted = cacheService.delete(key);

      expect(deleted).toBe(true);
      expect(cacheService.get(key)).toBeNull();
    });

    it('should return false for non-existent entry', () => {
      const deleted = cacheService.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('Clear Method', () => {
    it('should clear all entries and reset stats', () => {
      cacheService.set('key1', 'data1');
      cacheService.set('key2', 'data2');
      cacheService.get('key1'); // Generate a hit
      cacheService.get('non-existent'); // Generate a miss

      cacheService.clear();

      expect(cacheService.getSize()).toBe(0);
      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).toBeNull();

      const stats = cacheService.getStats();
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(2); // The two get calls above after clear
    });
  });

  describe('Statistics', () => {
    it('should track cache hits and misses', () => {
      cacheService.set('key1', 'data1');
      cacheService.set('key2', 'data2');

      // Generate hits
      cacheService.get('key1');
      cacheService.get('key2');

      // Generate misses
      cacheService.get('non-existent1');
      cacheService.get('non-existent2');

      const stats = cacheService.getStats();

      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(2);
      expect(stats.hitRate).toBe(50);
      expect(stats.missRate).toBe(50);
      expect(stats.totalEntries).toBe(2);
    });

    it('should handle empty cache stats', () => {
      const stats = cacheService.getStats();

      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.missRate).toBe(0);
      expect(stats.totalEntries).toBe(0);
    });

    it('should calculate hit rate correctly', () => {
      cacheService.set('key', 'data');

      // 3 hits, 1 miss = 75% hit rate
      cacheService.get('key');
      cacheService.get('key');
      cacheService.get('key');
      cacheService.get('non-existent');

      const stats = cacheService.getStats();
      expect(stats.hitRate).toBe(75);
      expect(stats.missRate).toBe(25);
    });
  });

  describe('Utility Methods', () => {
    it('should return all keys', () => {
      cacheService.set('key1', 'data1');
      cacheService.set('key2', 'data2');
      cacheService.set('key3', 'data3');

      const keys = cacheService.getKeys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return cache size', () => {
      expect(cacheService.getSize()).toBe(0);

      cacheService.set('key1', 'data1');
      expect(cacheService.getSize()).toBe(1);

      cacheService.set('key2', 'data2');
      expect(cacheService.getSize()).toBe(2);

      cacheService.delete('key1');
      expect(cacheService.getSize()).toBe(1);
    });

    it('should return cache info for existing entry', () => {
      const key = 'info-key';
      const beforeSet = Date.now();
      cacheService.set(key, 'data', 2000);
      const afterSet = Date.now();

      const info = cacheService.getCacheInfo(key);

      expect(info).not.toBeNull();
      expect(info?.exists).toBe(true);
      expect(info?.expired).toBe(false);
      expect(info?.ttl).toBe(2000);
      expect(info?.age).toBeGreaterThanOrEqual(0);
      expect(info?.age).toBeLessThan(afterSet - beforeSet + 10); // Allow some margin
    });

    it('should return null for non-existent entry info', () => {
      const info = cacheService.getCacheInfo('non-existent');
      expect(info).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should remove expired entries during cleanup', (done) => {
      cacheService.set('key1', 'data1', 50); // Will expire
      cacheService.set('key2', 'data2', 5000); // Will not expire

      setTimeout(() => {
        try {
          const deletedCount = cacheService.cleanup();

          expect(deletedCount).toBe(1);
          expect(cacheService.has('key1')).toBe(false);
          expect(cacheService.has('key2')).toBe(true);

          done();
        } catch (error) {
          done(error);
        }
      }, 60); // Shorter wait time but still after expiration
    });

    it('should return 0 when no entries to cleanup', () => {
      cacheService.set('key', 'data', 5000); // Long TTL

      const deletedCount = cacheService.cleanup();

      expect(deletedCount).toBe(0);
      expect(cacheService.has('key')).toBe(true);
    });

    it('should handle empty cache cleanup', () => {
      const deletedCount = cacheService.cleanup();
      expect(deletedCount).toBe(0);
    });
  });

  describe('Auto Cleanup', () => {
    it('should start auto cleanup interval', () => {
      const interval = cacheService.startAutoCleanup(100);

      expect(interval).toBeDefined();
      expect(typeof interval).toBe('object');

      // Clean up the interval
      clearInterval(interval);
    });

    it('should run cleanup periodically', (done) => {
      // Spy on the cleanup method
      const cleanupSpy = jest.spyOn(cacheService, 'cleanup');

      cacheService.set('key', 'data', 50); // Will expire quickly

      const interval = cacheService.startAutoCleanup(100);

      setTimeout(() => {
        expect(cleanupSpy).toHaveBeenCalled();
        clearInterval(interval);
        cleanupSpy.mockRestore();
        done();
      }, 150);
    });
  });

  describe('Edge Cases', () => {
    it('should handle setting same key multiple times', () => {
      const key = 'same-key';

      cacheService.set(key, 'first');
      cacheService.set(key, 'second');
      cacheService.set(key, 'third');

      expect(cacheService.get(key)).toBe('third');
      expect(cacheService.getSize()).toBe(1);
    });

    it('should handle empty string as key', () => {
      const key = '';
      const data = 'empty-key-data';

      cacheService.set(key, data);
      expect(cacheService.get(key)).toBe(data);
    });

    it('should handle null and undefined data', () => {
      cacheService.set('null-key', null);
      cacheService.set('undefined-key', undefined);

      expect(cacheService.get('null-key')).toBeNull();
      expect(cacheService.get('undefined-key')).toBeUndefined();
    });

    it('should handle very large TTL values', () => {
      const key = 'large-ttl';
      const largeTtl = Number.MAX_SAFE_INTEGER;

      cacheService.set(key, 'data', largeTtl);
      const info = cacheService.getCacheInfo(key);

      expect(info?.ttl).toBe(largeTtl);
      expect(info?.expired).toBe(false);
    });

    it('should handle zero TTL (immediate expiration)', () => {
      const key = 'zero-ttl';

      cacheService.set(key, 'data', 0);

      // Should expire immediately
      const result = cacheService.get(key);
      expect(result).toBeNull();
    });
  });
});

export {}; 