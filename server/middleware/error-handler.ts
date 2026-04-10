/**
 * Secure Error Handler
 * 
 * Prevents information leakage by sanitizing error messages
 * and stack traces in production.
 */

import type { Request, Response, NextFunction } from "express";

// Custom API Error class
export class APIError extends Error {
  statusCode: number;
  errorCode: string;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number = 500, errorCode: string = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error types
export const ErrorTypes = {
  VALIDATION_ERROR: { code: "VALIDATION_ERROR", status: 400 },
  INVALID_WALLET: { code: "INVALID_WALLET", status: 400 },
  INSUFFICIENT_BALANCE: { code: "INSUFFICIENT_BALANCE", status: 400 },
  TRANSACTION_FAILED: { code: "TRANSACTION_FAILED", status: 400 },
  UNAUTHORIZED: { code: "UNAUTHORIZED", status: 401 },
  FORBIDDEN: { code: "FORBIDDEN", status: 403 },
  NOT_FOUND: { code: "NOT_FOUND", status: 404 },
  RATE_LIMIT: { code: "RATE_LIMIT", status: 429 },
  INTERNAL_ERROR: { code: "INTERNAL_ERROR", status: 500 },
  SERVICE_UNAVAILABLE: { code: "SERVICE_UNAVAILABLE", status: 503 },
};

// Sanitize error for client
function sanitizeErrorForClient(error: any, isDevelopment: boolean): any {
  const baseResponse = {
    error: error.errorCode || "INTERNAL_ERROR",
    message: error.message || "An error occurred",
  };
  
  // Only include details for operational errors
  if (error.isOperational) {
    return baseResponse;
  }
  
  // For non-operational errors in production, hide details
  if (!isDevelopment) {
    return {
      error: "INTERNAL_ERROR",
      message: "An internal error occurred",
    };
  }
  
  // In development, include stack trace
  return {
    ...baseResponse,
    stack: error.stack,
    originalError: error.message,
  };
}

// Error logging
function logError(error: any, req: Request): void {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      code: error.errorCode || "UNKNOWN",
      stack: error.stack,
    },
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      headers: {
        "user-agent": req.headers["user-agent"],
        "x-idempotency-key": req.headers["x-idempotency-key"],
      },
    },
  };
  
  // Log to console (use structured logging in production)
  if (error.statusCode >= 500 || !error.isOperational) {
    console.error("CRITICAL ERROR:", JSON.stringify(errorLog, null, 2));
  } else {
    console.warn("API Error:", error.message, {
      path: req.path,
      ip: req.ip,
      code: error.errorCode,
    });
  }
}

// Global error handler middleware
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Set default status code
  const statusCode = err.statusCode || err.status || 500;
  
  // Log error
  logError(err, req);
  
  // Check if development mode
  const isDevelopment = process.env.NODE_ENV === "development";
  
  // Sanitize error for client
  const clientError = sanitizeErrorForClient(err, isDevelopment);
  
  // Send response
  res.status(statusCode).json(clientError);
}

// 404 handler
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `Cannot ${req.method} ${req.path}`,
  });
}

// Async handler wrapper
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Validation error handler
export function handleValidationError(errors: any[]): APIError {
  const message = errors.map(e => `${e.path}: ${e.message}`).join(", ");
  return new APIError(message, 400, "VALIDATION_ERROR");
}

// Database error handler
export function handleDatabaseError(error: any): APIError {
  // Handle specific database errors
  if (error.code === "23505") {
    return new APIError("Duplicate entry", 409, "DUPLICATE_ERROR");
  }
  if (error.code === "23503") {
    return new APIError("Referenced resource not found", 400, "FOREIGN_KEY_ERROR");
  }
  if (error.code?.startsWith("08")) {
    return new APIError("Database connection error", 503, "DATABASE_ERROR");
  }
  
  return new APIError("Database error", 500, "DATABASE_ERROR");
}

// Solana error handler
export function handleSolanaError(error: any): APIError {
  const message = error.message?.toLowerCase() || "";
  
  if (message.includes("insufficient")) {
    return new APIError("Insufficient balance for transaction", 400, "INSUFFICIENT_BALANCE");
  }
  if (message.includes("blockhash")) {
    return new APIError("Transaction expired, please try again", 400, "TRANSACTION_EXPIRED");
  }
  if (message.includes("timeout")) {
    return new APIError("Network timeout, please try again", 503, "NETWORK_TIMEOUT");
  }
  
  return new APIError("Blockchain transaction failed", 400, "TRANSACTION_FAILED");
}
