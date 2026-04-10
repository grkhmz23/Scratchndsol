/**
 * Enhanced Rate Limiting with Quotas
 * 
 * Features:
 * - Tiered rate limits per endpoint
 * - User quotas (daily/hourly)
 * - IP-based blocking
 * - Distributed-ready (Redis-compatible interface)
 */

import type { Request, Response, NextFunction } from "express";

// Rate limit tiers
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs?: number;
}

// Default tiers
const TIERS = {
  // Critical: Payment endpoints
  CRITICAL: { windowMs: 60000, maxRequests: 5, blockDurationMs: 300000 },
  // Standard: Game creation
  STANDARD: { windowMs: 60000, maxRequests: 10, blockDurationMs: 60000 },
  // General: Stats, read-only
  GENERAL: { windowMs: 60000, maxRequests: 60 },
  // Jackpot: Specific endpoint
  JACKPOT: { windowMs: 60000, maxRequests: 20 },
};

// In-memory store (use Redis in production)
class RateLimitStore {
  private requests = new Map<string, number[]>();
  private blocks = new Map<string, number>();
  private quotas = new Map<string, { hourly: number; daily: number; lastReset: number }>();

  // Check if IP/user is blocked
  isBlocked(key: string): { blocked: boolean; retryAfter?: number } {
    const blockExpiry = this.blocks.get(key);
    if (blockExpiry && Date.now() < blockExpiry) {
      return { blocked: true, retryAfter: Math.ceil((blockExpiry - Date.now()) / 1000) };
    }
    if (blockExpiry) this.blocks.delete(key);
    return { blocked: false };
  }

  // Record request and check limit
  recordRequest(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; retryAfter?: number } {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get existing requests in window
    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter(t => t > windowStart);
    
    // Check if blocked
    const blockCheck = this.isBlocked(key);
    if (blockCheck.blocked) {
      return { allowed: false, remaining: 0, retryAfter: blockCheck.retryAfter };
    }
    
    // Check limit
    if (timestamps.length >= config.maxRequests) {
      // Block if configured
      if (config.blockDurationMs) {
        this.blocks.set(key, now + config.blockDurationMs);
      }
      return { 
        allowed: false, 
        remaining: 0, 
        retryAfter: Math.ceil((timestamps[0] + config.windowMs - now) / 1000)
      };
    }
    
    // Record request
    timestamps.push(now);
    this.requests.set(key, timestamps);
    
    return { 
      allowed: true, 
      remaining: config.maxRequests - timestamps.length 
    };
  }

  // Check user quotas (hourly/daily)
  checkQuota(userKey: string, cost: number = 1): { allowed: boolean; hourlyRemaining: number; dailyRemaining: number } {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;
    
    let quota = this.quotas.get(userKey);
    if (!quota || quota.lastReset < dayAgo) {
      quota = { hourly: 0, daily: 0, lastReset: now };
    }
    
    // Reset hourly if needed
    if (quota.lastReset < hourAgo) {
      quota.hourly = 0;
    }
    
    // Quota limits
    const HOURLY_LIMIT = 100;
    const DAILY_LIMIT = 500;
    
    if (quota.hourly + cost > HOURLY_LIMIT || quota.daily + cost > DAILY_LIMIT) {
      return { allowed: false, hourlyRemaining: HOURLY_LIMIT - quota.hourly, dailyRemaining: DAILY_LIMIT - quota.daily };
    }
    
    quota.hourly += cost;
    quota.daily += cost;
    quota.lastReset = now;
    this.quotas.set(userKey, quota);
    
    return { 
      allowed: true, 
      hourlyRemaining: HOURLY_LIMIT - quota.hourly,
      dailyRemaining: DAILY_LIMIT - quota.daily
    };
  }

  // Cleanup old entries
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.requests.forEach((timestamps, key) => {
      const filtered = timestamps.filter((t: number) => t > now - 86400000);
      if (filtered.length === 0) keysToDelete.push(key);
      else this.requests.set(key, filtered);
    });
    keysToDelete.forEach(key => this.requests.delete(key));
  }
}

const store = new RateLimitStore();

// Cleanup every 5 minutes
setInterval(() => store.cleanup(), 300000);

// Create rate limiter middleware
export function createRateLimiter(config: RateLimitConfig, identifier?: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = identifier?.(req) || `${req.ip}:${req.path}`;
    const result = store.recordRequest(key, config);
    
    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", config.maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, result.remaining));
    res.setHeader("X-RateLimit-Reset", Math.ceil(Date.now() / 1000) + Math.ceil(config.windowMs / 1000));
    
    if (!result.allowed) {
      res.setHeader("Retry-After", result.retryAfter || 60);
      return res.status(429).json({
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please slow down.",
        retryAfter: result.retryAfter,
      });
    }
    
    next();
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  // Payment/payout endpoints
  critical: createRateLimiter(TIERS.CRITICAL, (req) => 
    `${req.ip}:${req.body?.playerWallet || req.ip}`
  ),
  
  // Game creation
  standard: createRateLimiter(TIERS.STANDARD, (req) => 
    `${req.ip}:${req.body?.playerWallet || req.ip}`
  ),
  
  // General endpoints
  general: createRateLimiter(TIERS.GENERAL),
  
  // Jackpot endpoints
  jackpot: createRateLimiter(TIERS.JACKPOT),
};

// Quota middleware
export function quotaMiddleware(req: Request, res: Response, next: NextFunction) {
  const wallet = req.body?.playerWallet || req.params?.wallet;
  if (!wallet || wallet.startsWith("demo")) {
    return next();
  }
  
  const result = store.checkQuota(wallet, 1);
  res.setHeader("X-Quota-Hourly-Remaining", result.hourlyRemaining);
  res.setHeader("X-Quota-Daily-Remaining", result.dailyRemaining);
  
  if (!result.allowed) {
    return res.status(429).json({
      error: "QUOTA_EXCEEDED",
      message: "Daily or hourly quota exceeded. Please try again later.",
    });
  }
  
  next();
}

// Export store for testing
export { store };
