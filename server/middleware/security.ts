/**
 * Security Middleware Module
 * Implements comprehensive security controls
 */

import type { Request, Response, NextFunction } from "express";

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      /\.vercel\.app$/,
      /\.replit\.dev$/,
      /\.repl\.co$/,
      "http://localhost:3000",
      "http://localhost:5000",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5000",
    ].filter(Boolean);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Idempotency-Key", "Accept"],
  exposedHeaders: ["X-RateLimit-Remaining", "X-RateLimit-Reset"],
  maxAge: 86400,
};

// Request timeout middleware
export function requestTimeout(timeoutMs: number = 30000) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.setTimeout(timeoutMs, () => {
      res.status(408).json({ error: "REQUEST_TIMEOUT", message: "Request timeout" });
    });
    res.setTimeout(timeoutMs, () => {
      res.status(504).json({ error: "GATEWAY_TIMEOUT", message: "Server timeout" });
    });
    next();
  };
}

// Sanitize request body
export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === "object") {
    sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === "string") {
      obj[key] = obj[key]
        .replace(/<script[^>]*>.*?<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .trim();
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}

// Validate wallet addresses (Solana or EVM)
export function validateWalletAddress(req: Request, res: Response, next: NextFunction) {
  const fields = ["playerWallet", "wallet", "winnerPublicKey", "buyerWallet"];
  
  for (const field of fields) {
    const value = req.body?.[field] || req.params?.[field] || req.query?.[field];
    if (value && typeof value === "string") {
      if (value.startsWith("demo") || value.startsWith("Demo")) continue;
      
      const solanaRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      const evmRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!solanaRegex.test(value) && !evmRegex.test(value)) {
        return res.status(400).json({ error: "INVALID_WALLET", message: `Invalid ${field}` });
      }
    }
  }
  next();
}

// Prevent NoSQL injection
export function preventNoSQLInjection(req: Request, res: Response, next: NextFunction) {
  const patterns = [/\$where/, /\$regex/, /\$ne/, /\$gt/, /\$lt/, /\$or/, /\$and/];
  
  function check(obj: any): boolean {
    for (const key in obj) {
      if (patterns.some(p => p.test(key))) return true;
      if (typeof obj[key] === "object" && obj[key] !== null) {
        if (check(obj[key])) return true;
      }
    }
    return false;
  }
  
  if (req.body && typeof req.body === "object" && check(req.body)) {
    console.warn("NoSQL injection attempt", { ip: req.ip, path: req.path });
    return res.status(400).json({ error: "INVALID_INPUT" });
  }
  next();
}

// Apply all security middleware
export function applySecurityMiddleware(app: any) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
  
  app.use(sanitizeRequest);
  app.use(preventNoSQLInjection);
  app.use(requestTimeout(30000));
}
