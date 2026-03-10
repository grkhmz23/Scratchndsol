import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";
import { serveStatic } from "../server/vite";

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
  console.error('Server error:', err);
});

// For serverless, we need to export a handler
let serverPromise: Promise<any> | null = null;

async function getHandler() {
  if (!serverPromise) {
    serverPromise = registerRoutes(app).then(() => {
      // Serve static files in production
      if (process.env.NODE_ENV === 'production') {
        serveStatic(app);
      }
      return app;
    });
  }
  return serverPromise;
}

// Vercel serverless handler
export default async function handler(req: Request, res: Response) {
  await getHandler();
  return app(req, res);
}
