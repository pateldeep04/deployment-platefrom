import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { connectDatabase, ensureStorageDirectories } from './database';
import apiRouter from './routes';
import { handleSiteRequest } from './router/edgeProxy';
import { dbStore } from './database/store';

const app = express();

// Initialize disk storage paths
ensureStorageDirectories();

// Subdomain Host Router: Intercept *.pateldeeep.in, *.deployhub.local, or custom domains
app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0].toLowerCase();
  const isApi = req.path.startsWith('/api') || req.path === '/health';
  if (isApi) return next();

  // If host is a subdomain (e.g. my-app.pateldeeep.in or my-app.localhost)
  const parts = host.split('.');
  if (parts.length > 2 || (parts.length === 2 && (parts[1] === 'localhost' || parts[1] === 'local'))) {
    const subdomain = parts[0];
    if (subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'app' && subdomain !== 'admin') {
      return handleSiteRequest(req, res, next);
    }
  }

  // If request matches a configured custom domain
  const hasCustomDomain = dbStore.projects.some(p => p.customDomain === host);
  if (hasCustomDomain) {
    return handleSiteRequest(req, res, next);
  }

  next();
});

// Security Headers (configured to allow iframe preview and static asset rendering)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', generalLimiter);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 1. Edge Proxy: Deployed sites serving (/sites/:slug fallback)
app.use('/sites/:slug', handleSiteRequest);

// 2. Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DeployHub Core API & Edge Proxy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 3. API v1 Routing
app.use('/api/v1', apiRouter);

// 4. Global 404 Fallback
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// 5. Production Static Frontend Serving
const distPath = path.resolve(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/sites') || req.path.startsWith('/health')) {
      return next();
    }
    const indexFile = path.join(distPath, 'index.html');
    if (fs.existsSync(indexFile)) {
      res.sendFile(indexFile);
    } else {
      next();
    }
  });
}

// 6. Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[DeployHub Error Handler]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Start Server
const startServer = async () => {
  await connectDatabase();

  app.listen(config.port, () => {
    console.log(`
======================================================
  🚀 DeployHub Core API & Edge Proxy Online!
  📍 Port: ${config.port}
  🌐 API Root: http://localhost:${config.port}/api/v1
  🔗 Edge Sites Router: http://localhost:${config.port}/sites/:slug/
  🛡️  Security: Rate Limiter + Sandbox Guards + JWT Auth
======================================================
    `);
  });
};

startServer();
