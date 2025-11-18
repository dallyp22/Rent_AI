import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Process-level error handlers for deployment stability
process.on('uncaughtException', (error: Error) => {
  console.error('[CRITICAL] Uncaught Exception:', error);
  console.error(error.stack);
  // Give the process time to write logs before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[CRITICAL] Unhandled Promise Rejection at:', promise, 'reason:', reason);
  console.error(reason?.stack || reason);
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[INFO] SIGINT signal received: closing HTTP server');
  process.exit(0);
});

const app = express();

// CORS configuration for Vercel frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Global error handler with improved logging for deployment
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error details for debugging deployment issues
    console.error('[ERROR] Request failed:', {
      status,
      message,
      stack: err.stack,
      path: _req.path,
      method: _req.method
    });

    // Send response but don't re-throw (prevents crashes)
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Add error handling for server startup
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    console.log(`[DEPLOYMENT] Server successfully started`);
    console.log(`[DEPLOYMENT] Listening on 0.0.0.0:${port}`);
    console.log(`[DEPLOYMENT] Environment: ${app.get("env")}`);
    log(`serving on port ${port}`);
  });

  // Handle server errors
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[DEPLOYMENT ERROR] Port ${port} is already in use`);
    } else if (error.code === 'EACCES') {
      console.error(`[DEPLOYMENT ERROR] Insufficient permissions to bind to port ${port}`);
    } else {
      console.error('[DEPLOYMENT ERROR] Server error:', error);
    }
    process.exit(1);
  });
})().catch((error) => {
  console.error('[DEPLOYMENT ERROR] Failed to start server:', error);
  process.exit(1);
});
