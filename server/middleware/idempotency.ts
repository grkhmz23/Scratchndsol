/**
 * Idempotency Middleware
 * 
 * Ensures payment operations are processed exactly once,
 * preventing double-charges and duplicate payouts.
 */

import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

interface IdempotencyEntry {
  key: string;
  response: any;
  createdAt: number;
  status: "processing" | "completed" | "failed";
}

// In-memory store (use Redis in production)
class IdempotencyStore {
  private entries = new Map<string, IdempotencyEntry>();
  private readonly TTL = 86400000; // 24 hours

  get(key: string): IdempotencyEntry | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    
    // Check expiry
    if (Date.now() - entry.createdAt > this.TTL) {
      this.entries.delete(key);
      return undefined;
    }
    
    return entry;
  }

  set(key: string, entry: Omit<IdempotencyEntry, "key">): void {
    this.entries.set(key, { ...entry, key });
  }

  updateStatus(key: string, status: IdempotencyEntry["status"], response?: any): void {
    const entry = this.entries.get(key);
    if (entry) {
      entry.status = status;
      if (response) entry.response = response;
    }
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];
    this.entries.forEach((entry, key) => {
      if (now - entry.createdAt > this.TTL) {
        expired.push(key);
      }
    });
    expired.forEach(key => this.entries.delete(key));
  }
}

const store = new IdempotencyStore();

// Cleanup every hour
setInterval(() => store.cleanup(), 3600000);

// Idempotency middleware
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only apply to state-changing methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }
  
  // Get idempotency key from header
  const idempotencyKey = req.headers["x-idempotency-key"] as string;
  
  if (!idempotencyKey) {
    // Generate one for tracking (optional - can require instead)
    req.idempotencyKey = randomUUID();
  } else {
    // Validate key format (UUID v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      return res.status(400).json({
        error: "INVALID_IDEMPOTENCY_KEY",
        message: "Idempotency key must be a valid UUID v4",
      });
    }
    
    req.idempotencyKey = idempotencyKey;
    
    // Check for existing entry
    const existing = store.get(idempotencyKey);
    if (existing) {
      if (existing.status === "processing") {
        // Request in progress - return 409 Conflict
        return res.status(409).json({
          error: "CONCURRENT_REQUEST",
          message: "A request with this idempotency key is already being processed",
          retryAfter: 5,
        });
      }
      
      if (existing.status === "completed") {
        // Return cached response with 200
        res.setHeader("X-Idempotency-Replay", "true");
        return res.status(200).json(existing.response);
      }
      
      if (existing.status === "failed") {
        // Allow retry if previous failed
        // Continue to process
      }
    }
  }
  
  // Store initial entry
  store.set(req.idempotencyKey, {
    response: null,
    createdAt: Date.now(),
    status: "processing",
  });
  
  // Override res.json to capture response
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    // Update store with response
    if (res.statusCode >= 200 && res.statusCode < 300) {
      store.updateStatus(req.idempotencyKey!, "completed", body);
    } else {
      store.updateStatus(req.idempotencyKey!, "failed", body);
    }
    
    // Add idempotency key to response
    if (req.idempotencyKey) {
      res.setHeader("X-Idempotency-Key", req.idempotencyKey);
    }
    
    return originalJson(body);
  };
  
  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      idempotencyKey?: string;
    }
  }
}

// Export store for testing
export { store };
