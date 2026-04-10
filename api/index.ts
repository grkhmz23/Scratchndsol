/**
 * Serverless API Entry Point for Vercel
 * 
 * This file serves as the entry point for serverless deployments.
 * It imports and re-exports the Express app from the server directory.
 */

import express, { Request, Response } from "express";
import cors from "cors";
import { registerRoutes } from "../server/routes";
import { applySecurityMiddleware } from "../server/middleware/security";
import { errorHandler, notFoundHandler } from "../server/middleware/error-handler";

// Create Express app
const app = express();

// Trust proxy
app.set("trust proxy", 1);

// CORS - Allow all in serverless (configured via Vercel headers)
app.use(cors({
  origin: true,
  credentials: true,
}));

// Security middleware
applySecurityMiddleware(app);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production"
  });
});

// Initialize routes
let routesInitialized = false;

async function initRoutes() {
  if (!routesInitialized) {
    await registerRoutes(app);
    
    // Error handlers
    app.use(errorHandler);
    app.use(notFoundHandler);
    
    routesInitialized = true;
  }
}

// Vercel serverless handler
export default async function handler(req: Request, res: Response) {
  await initRoutes();
  return app(req, res);
}
