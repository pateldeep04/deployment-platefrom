import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config, AVAILABLE_PLATFORM_DOMAINS } from './config';
import { connectDatabase, ensureStorageDirectories } from './database';
import apiRouter from './routes';
import { handleSiteRequest } from './router/edgeProxy';
import { dbStore } from './database/store';
import { awsFleetService } from './services/awsFleetService';

const app = express();

// Initialize disk storage paths
ensureStorageDirectories();

// Subdomain Host Router: Intercept *.deployeai.duckdns.org or custom domains
app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0].toLowerCase();
  const isApi = req.path.startsWith('/api') || req.path === '/health';
  if (isApi) return next();

  const platformDomain = (config.platformDomain || 'deployeai.duckdns.org').toLowerCase();
  const recognizedDomains = Array.from(new Set([
    platformDomain,
    ...AVAILABLE_PLATFORM_DOMAINS.map(d => d.domain.toLowerCase()),
  ])).filter(Boolean);

  // pateldeeep.me is the main platform website only (NOT for project subdomains)
  if (
    host === 'pateldeeep.me' ||
    host.endsWith('.pateldeeep.me') ||
    recognizedDomains.some(d => host === d || host === `www.${d}`) ||
    host === 'localhost' ||
    host === '127.0.0.1'
  ) {
    return next();
  }

  // If host is a subdomain of any recognized platform domain
  for (const domain of recognizedDomains) {
    if (host.endsWith('.' + domain)) {
      const subdomain = host.slice(0, -(domain.length + 1));
      if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'app' && subdomain !== 'admin') {
        return handleSiteRequest(req, res, next);
      }
    }
  }

  // Local development fallback: my-app.localhost
  const parts = host.split('.');
  if (parts.length === 2 && (parts[1] === 'localhost' || parts[1] === 'local')) {
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
    xContentTypeOptions: true,
    hidePoweredBy: true,
  })
);

// Hardened Dynamic CORS with Strict Origin Validation
const allowedOrigins = [
  'https://pateldeeep.me',
  'https://www.pateldeeep.me',
  'http://pateldeeep.me',
  'https://deployeai.duckdns.org',
  'http://deployeai.duckdns.org',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      try {
        const parsedUrl = new URL(origin);
        const hostname = parsedUrl.hostname.toLowerCase();

        // 1. Check fixed list
        if (allowedOrigins.includes(origin) || allowedOrigins.includes(`${parsedUrl.protocol}//${hostname}`)) {
          return callback(null, true);
        }

        // 2. Check recognized platform domains & subdomains (*.deployeai.duckdns.org, *.pateldeeep.me, etc.)
        const isPlatformDomain = AVAILABLE_PLATFORM_DOMAINS.some(d => hostname === d.domain || hostname.endsWith('.' + d.domain));
        if (isPlatformDomain || hostname === 'pateldeeep.me' || hostname.endsWith('.pateldeeep.me') || hostname.endsWith('.duckdns.org')) {
          return callback(null, true);
        }

        // 3. Check verified custom domains from database
        const isCustomDomain = dbStore.projects.some(p => p.customDomain && p.customDomain.toLowerCase() === hostname);
        if (isCustomDomain) {
          return callback(null, true);
        }

        // 4. Localhost / local IP development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          return callback(null, true);
        }
      } catch (err) {}

      return callback(new Error(`CORS policy: Origin ${origin} is not allowed access.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
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
const getDistPath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'dist'),
    path.resolve(__dirname, '..', 'dist'),
    path.resolve(__dirname, '..', '..', 'dist')
  ];
  return candidates.find(p => fs.existsSync(path.join(p, 'index.html'))) || path.resolve(process.cwd(), 'dist');
};

const distDir = getDistPath();
app.use(express.static(distDir));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/sites') || req.path.startsWith('/health')) {
    return next();
  }
  const currentDist = getDistPath();
  const indexFile = path.join(currentDist, 'index.html');
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  
  res.status(503).send(`
    <!DOCTYPE html>
    <html>
      <head><title>DeployHub - Building Frontend</title></head>
      <body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0b0f19;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;">
        <div style="background:#131c2e;border:1px solid #1e293b;border-radius:12px;padding:32px;max-width:520px;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          <h2 style="margin:0 0 12px;color:#38bdf8;font-size:22px;">DeployHub Frontend Not Built Yet</h2>
          <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin-bottom:20px;">The backend is running, but the frontend files have not been generated yet. Run the build command on the server:</p>
          <pre style="background:#090d16;padding:12px;border-radius:8px;color:#34d399;font-size:14px;overflow-x:auto;">npm run build && pm2 restart all</pre>
        </div>
      </body>
    </html>
  `);
});

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
  ☁️  AWS EC2 Fleet: Free Tier (t2.micro) Auto-Spinup Ready
  🏷️  Namecheap DNS: ${config.namecheapSld}.${config.namecheapTld}
  🛡️  Security: Rate Limiter + Sandbox Guards + JWT Auth
======================================================
    `);
  });

  // Background monitor: Periodically checks storage on active nodes and auto-spins up new AWS Free Tier instances if >= threshold
  setInterval(async () => {
    try {
      await awsFleetService.checkNodeStorageThreshold();
    } catch (err) {
      console.error('[AWS Fleet Watcher] Storage check error:', err);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
};

startServer();
