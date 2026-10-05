import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { config } from '../config';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN' | 'SUPPORT';
  plan: 'FREE' | 'DEVELOPER' | 'PRO';
  emailVerified: boolean;
  storageUsed: number; // in bytes
  bandwidthUsed: number; // in bytes
  createdAt: string;
  updatedAt: string;
}

export interface IProject {
  _id: string;
  userId: string;
  name: string;
  slug: string;
  type: 'STATIC' | 'PHP' | 'REACT' | 'VITE' | 'NODE';
  status: 'ACTIVE' | 'BUILDING' | 'INACTIVE';
  currentDeploymentId?: string;
  storageUsed: number;
  buildCommand?: string;
  outputDirectory?: string;
  customDomain?: string;
  customDomainVerified?: boolean;
  sslEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IDeployment {
  _id: string;
  projectId: string;
  userId: string;
  version: number;
  source: 'ZIP_UPLOAD' | 'FILE_UPLOAD' | 'CLI' | 'GIT';
  status: 'QUEUED' | 'BUILDING' | 'DEPLOYING' | 'LIVE' | 'FAILED' | 'CANCELLED';
  buildCommand?: string;
  outputDirectory?: string;
  artifactPath?: string;
  deploymentUrl: string;
  logs: Array<{ timestamp: string; message: string; stage: string; level: 'info' | 'warn' | 'error' | 'success' }>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface IEnvironmentVariable {
  _id: string;
  projectId: string;
  key: string;
  value: string; // masked in list responses
  createdAt: string;
  updatedAt: string;
}

export interface IAdvertisement {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  targetUrl: string;
  placement: 'DASHBOARD' | 'PROJECT_PAGE' | 'DOCUMENTATION' | 'PUBLIC_WEBSITE';
  status: 'ACTIVE' | 'DISABLED';
  impressions: number;
  clicks: number;
  createdAt: string;
}

export interface IAuditLog {
  _id: string;
  userId?: string;
  action: string;
  ip: string;
  userAgent?: string;
  details?: Record<string, any>;
  createdAt: string;
}

// In-memory + persistent JSON store for high performance and zero-dependency local setup
class DataStore {
  private filePath: string;
  public users: IUser[] = [];
  public projects: IProject[] = [];
  public deployments: IDeployment[] = [];
  public envVars: IEnvironmentVariable[] = [];
  public ads: IAdvertisement[] = [];
  public auditLogs: IAuditLog[] = [];

  constructor() {
    this.filePath = path.join(config.storageDir, 'data', 'deployhub_state.json');
    this.load();
    this.seedDefaults();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(raw);
        this.users = data.users || [];
        this.projects = data.projects || [];
        this.deployments = data.deployments || [];
        this.envVars = data.envVars || [];
        this.ads = data.ads || [];
        this.auditLogs = data.auditLogs || [];
      }
    } catch (e) {
      console.warn('Could not read existing state file, initializing fresh store');
    }
  }

  public save() {
    try {
      const data = {
        users: this.users,
        projects: this.projects,
        deployments: this.deployments,
        envVars: this.envVars,
        ads: this.ads,
        auditLogs: this.auditLogs,
      };
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save store to file:', err);
    }
  }

  private seedDefaults() {
    // Seed Admin user if not present
    if (!this.users.some(u => u.email === 'admin@deployhub.com')) {
      const adminPassHash = bcrypt.hashSync('AdminDeployHub2026!', 10);
      this.users.push({
        _id: 'usr_admin_001',
        name: 'DeployHub Admin',
        email: 'admin@deployhub.com',
        passwordHash: adminPassHash,
        role: 'ADMIN',
        plan: 'PRO',
        emailVerified: true,
        storageUsed: 12582912,
        bandwidthUsed: 429496729,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Seed Demo developer user
    if (!this.users.some(u => u.email === 'developer@deployhub.com')) {
      const devPassHash = bcrypt.hashSync('Developer2026!', 10);
      this.users.push({
        _id: 'usr_demo_002',
        name: 'Alex Rivera',
        email: 'developer@deployhub.com',
        passwordHash: devPassHash,
        role: 'USER',
        plan: 'DEVELOPER',
        emailVerified: true,
        storageUsed: 35651584,
        bandwidthUsed: 1073741824,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Seed Demo Projects & Deployments if empty
    if (this.projects.length === 0) {
      const devUser = this.users.find(u => u.email === 'developer@deployhub.com')!;
      
      const portfolioProject: IProject = {
        _id: 'prj_portfolio_001',
        userId: devUser._id,
        name: 'Alex Portfolio',
        slug: 'alex-portfolio',
        type: 'STATIC',
        status: 'ACTIVE',
        currentDeploymentId: 'dep_port_001',
        storageUsed: 2450000,
        customDomain: 'portfolio.alexrivera.dev',
        customDomainVerified: true,
        sslEnabled: true,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const phpProject: IProject = {
        _id: 'prj_shop_002',
        userId: devUser._id,
        name: 'Retro Games API',
        slug: 'retro-games-api',
        type: 'PHP',
        status: 'ACTIVE',
        currentDeploymentId: 'dep_php_002',
        storageUsed: 6200000,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.projects.push(portfolioProject, phpProject);

      this.deployments.push({
        _id: 'dep_port_001',
        projectId: portfolioProject._id,
        userId: devUser._id,
        version: 1,
        source: 'ZIP_UPLOAD',
        status: 'LIVE',
        deploymentUrl: `http://localhost:${config.port}/sites/alex-portfolio/`,
        logs: [
          { timestamp: new Date(Date.now() - 3600000).toISOString(), message: 'Deployment initialized for alex-portfolio', stage: 'QUEUE', level: 'info' },
          { timestamp: new Date(Date.now() - 3590000).toISOString(), message: 'Extracting archive securely... 14 files unpacked', stage: 'EXTRACT', level: 'info' },
          { timestamp: new Date(Date.now() - 3580000).toISOString(), message: 'Security Scan: 0 vulnerabilities found, MIME types valid', stage: 'SCAN', level: 'success' },
          { timestamp: new Date(Date.now() - 3570000).toISOString(), message: 'Artifact compiled and mounted to static edge route', stage: 'DEPLOY', level: 'info' },
          { timestamp: new Date(Date.now() - 3560000).toISOString(), message: 'Deployment is LIVE at http://alex-portfolio.deployhub.local', stage: 'LIVE', level: 'success' },
        ],
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3560000).toISOString(),
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      });

      this.deployments.push({
        _id: 'dep_php_002',
        projectId: phpProject._id,
        userId: devUser._id,
        version: 1,
        source: 'ZIP_UPLOAD',
        status: 'LIVE',
        deploymentUrl: `http://localhost:${config.port}/sites/retro-games-api/`,
        logs: [
          { timestamp: new Date(Date.now() - 7200000).toISOString(), message: 'PHP Deployment initiated for retro-games-api', stage: 'QUEUE', level: 'info' },
          { timestamp: new Date(Date.now() - 7190000).toISOString(), message: 'Verifying PHP 8.2 runtime dependencies and index.php entrypoint', stage: 'VALIDATE', level: 'info' },
          { timestamp: new Date(Date.now() - 7180000).toISOString(), message: 'Configuring isolated tenant sandbox & PHP execution boundary', stage: 'ISOLATION', level: 'info' },
          { timestamp: new Date(Date.now() - 7170000).toISOString(), message: 'PHP Application online and healthy', stage: 'LIVE', level: 'success' },
        ],
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        completedAt: new Date(Date.now() - 7170000).toISOString(),
        createdAt: new Date(Date.now() - 7200000).toISOString(),
      });

      // Sample sample sites files on disk so they immediately render if clicked!
      this.seedSampleSiteFiles(portfolioProject.slug, 'static');
      this.seedSampleSiteFiles(phpProject.slug, 'php');
    }

    // Seed Advertisements for monetization system
    if (this.ads.length === 0) {
      this.ads.push(
        {
          _id: 'ad_cloud_001',
          title: 'Supersonic Redis & KV Cache',
          description: 'Sub-millisecond global caching for modern applications. Free 1GB tier.',
          imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80',
          targetUrl: 'https://redis.io',
          placement: 'DASHBOARD',
          status: 'ACTIVE',
          impressions: 1420,
          clicks: 68,
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'ad_db_002',
          title: 'Neon Serverless Postgres',
          description: 'Ship faster with instant branching, automated autoscaling, and zero config.',
          imageUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&auto=format&fit=crop&q=80',
          targetUrl: 'https://neon.tech',
          placement: 'PROJECT_PAGE',
          status: 'ACTIVE',
          impressions: 890,
          clicks: 42,
          createdAt: new Date().toISOString(),
        }
      );
    }

    this.save();
  }

  private seedSampleSiteFiles(slug: string, type: 'static' | 'php') {
    const siteDir = path.join(config.storageDir, 'sites', slug);
    if (!fs.existsSync(siteDir)) {
      fs.mkdirSync(siteDir, { recursive: true });
      if (type === 'static') {
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alex Rivera - Full Stack Engineer</title>
  <style>
    body { margin: 0; background: #0B1120; color: #F8FAFC; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #172033; border: 1px solid #263449; border-radius: 16px; padding: 40px; max-width: 600px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    h1 { color: #38BDF8; margin-top: 0; }
    p { color: #94A3B8; line-height: 1.6; }
    .badge { display: inline-block; background: #2563EB; color: white; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🚀 Deployed on DeployHub</div>
    <h1>Alex Rivera's Portfolio</h1>
    <p>Welcome to my static deployment hosted seamlessly on DeployHub high performance edge router.</p>
    <p>Fast. Secure. Multi-tenant isolated.</p>
  </div>
</body>
</html>`;
        fs.writeFileSync(path.join(siteDir, 'index.html'), html);
      } else {
        const php = `<?php
header('Content-Type: application/json');
echo json_encode([
  'status' => 'success',
  'message' => 'Hello from isolated DeployHub PHP Engine!',
  'platform' => 'DeployHub v1.0.0',
  'php_version' => PHP_VERSION,
  'timestamp' => date('Y-m-d H:i:s')
]);
`;
        fs.writeFileSync(path.join(siteDir, 'index.php'), php);
      }
    }
  }
}

export const dbStore = new DataStore();
