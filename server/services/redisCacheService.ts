import IORedis from 'ioredis';
import { config } from '../config';

export interface CachedRouteData {
  projectId: string;
  slug: string;
  customDomain?: string;
  assignedSubdomain?: string;
  status: string;
}

class RedisCacheService {
  private client: IORedis | null = null;
  private isConnected = false;
  private inMemoryCache = new Map<string, { data: CachedRouteData; expiresAt: number }>();

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.client = new IORedis(config.redisUrl, {
        maxRetriesPerRequest: null,
        connectTimeout: 2000,
        retryStrategy: () => null, // Don't block if Redis isn't running
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('[DeployHub Redis] Edge Routing Cache connected to Redis successfully.');
      });

      this.client.on('error', () => {
        this.isConnected = false;
      });
    } catch {
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Retrieves a cached route by hostname or subdomain
   */
  public async getRoute(hostOrSlug: string): Promise<CachedRouteData | null> {
    const key = `route:${hostOrSlug.toLowerCase()}`;

    if (this.isConnected && this.client) {
      try {
        const cached = await this.client.get(key);
        if (cached) {
          return JSON.parse(cached) as CachedRouteData;
        }
      } catch {
        // Fallback to in-memory cache
      }
    }

    // In-memory fallback
    const mem = this.inMemoryCache.get(key);
    if (mem && mem.expiresAt > Date.now()) {
      return mem.data;
    }

    return null;
  }

  /**
   * Caches a route for 10 minutes (600 seconds)
   */
  public async setRoute(hostOrSlug: string, data: CachedRouteData, ttlSeconds: number = 600): Promise<void> {
    const key = `route:${hostOrSlug.toLowerCase()}`;

    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, JSON.stringify(data), 'EX', ttlSeconds);
        return;
      } catch {
        // Fallback to in-memory
      }
    }

    this.inMemoryCache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidates route cache for a project
   */
  public async invalidateRoute(keys: string[]): Promise<void> {
    for (const k of keys) {
      if (!k) continue;
      const key = `route:${k.toLowerCase()}`;
      this.inMemoryCache.delete(key);
      if (this.isConnected && this.client) {
        try {
          await this.client.del(key);
        } catch {
          // ignore error
        }
      }
    }
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      cacheType: this.isConnected ? 'REDIS' : 'IN_MEMORY_FALLBACK',
      inMemoryItemCount: this.inMemoryCache.size,
    };
  }
}

export const redisCacheService = new RedisCacheService();
