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
  verificationCode?: string;
  verificationCodeExpires?: string;
  loginOtpCode?: string;
  loginOtpExpires?: string;
  storageUsed: number; // in bytes
  bandwidthUsed: number; // in bytes
  createdAt: string;
  updatedAt: string;
}

export interface ISupportRequest {
  _id: string;
  ticketNumber: string;
  userId?: string;
  name: string;
  email: string;
  type: 'DOMAIN_REQUEST' | 'SUPPORT_QUERY' | 'QUOTA_INCREASE' | 'BUG_REPORT';
  domainName?: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
  ip: string;
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
  assignedServerNodeId?: string;
  assignedSubdomain?: string;
  platformDomain?: string;
  namecheapDnsConfigured?: boolean;
  domainExpiresAt?: string;
  domainStatus?: 'ACTIVE' | 'EXPIRING_SOON' | 'DEACTIVATED';
  isDomainExpired?: boolean;
  deactivationWarningSentAt?: string;
  deactivationEmailSentAt?: string;
  reactivatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IServerNode {
  _id: string;
  instanceId: string;
  name: string;
  publicIp: string;
  privateIp?: string;
  instanceType: string;
  region: string;
  provider: 'LOCAL' | 'AWS_EC2' | 'CUSTOM';
  status: 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'DRAINING' | 'TERMINATED';
  storageTotalBytes: number;
  storageUsedBytes: number;
  storageUsagePercent: number;
  maxAllowedStoragePercent: number;
  assignedProjectsCount: number;
  isPrimaryNode: boolean;
  isAcceptingTraffic: boolean;
  createdAt: string;
  lastHeartbeatAt: string;
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

export interface ITrafficLog {
  _id: string;
  userId: string;
  projectId: string;
  timestamp: string;
  date: string; // 'YYYY-MM-DD'
  bytesSent: number;
  path: string;
  statusCode: number;
}

export interface IPlatformDomainItem {
  domain: string;
  label: string;
  provider: 'SSL' | 'DuckDNS' | 'FreeDNS' | 'Custom';
  isSsl: boolean;
  isDefault?: boolean;
  createdAt?: string;
}

export interface IPlatformSettings {
  developerPriceINR: number; // default: 30
  proPriceINR: number; // default: 399
  freeTierAdsEnabled: boolean; // default: true
  adBannerTitle?: string;
  adBannerText?: string;
  adBannerLink?: string;
  customAdScript?: string;
  platformDomains?: IPlatformDomainItem[];
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
  public serverNodes: IServerNode[] = [];
  public trafficLogs: ITrafficLog[] = [];
  public supportRequests: ISupportRequest[] = [];
  public settings: IPlatformSettings = {
    developerPriceINR: 30,
    proPriceINR: 399,
    freeTierAdsEnabled: true,
    adBannerTitle: 'Hosting Powered by DeployHub Cloud',
    adBannerText: 'Fast free web hosting with SSL. Upgrade to Developer (₹30/mo) for 100% ad-free sites.',
    adBannerLink: 'https://deployhub.com',
    customAdScript: '',
    platformDomains: [
      { domain: 'deployeai.duckdns.org', label: 'deployeai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: false, isDefault: true },
      { domain: 'deploye-ai.duckdns.org', label: 'deploye-ai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: false },
      { domain: 'ml-ai.duckdns.org', label: 'ml-ai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: false },
      { domain: 'ai-ml.mooo.com', label: 'ai-ml.mooo.com (FreeDNS)', provider: 'FreeDNS', isSsl: false },
      { domain: 'ml-ai.mooo.com', label: 'ml-ai.mooo.com (FreeDNS)', provider: 'FreeDNS', isSsl: false },
      { domain: 'ai-ml.chickenkiller.com', label: 'ai-ml.chickenkiller.com (FreeDNS)', provider: 'FreeDNS', isSsl: false },
    ],
  };

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
        this.projects.forEach(p => {
          if (!p.assignedSubdomain) {
            p.assignedSubdomain = p.slug;
          }
          if (!p.domainExpiresAt) {
            const created = p.createdAt ? new Date(p.createdAt).getTime() : Date.now();
            p.domainExpiresAt = new Date(created + 90 * 24 * 60 * 60 * 1000).toISOString();
          }
          if (!p.domainStatus) {
            const isPast = new Date() > new Date(p.domainExpiresAt);
            p.domainStatus = isPast ? 'DEACTIVATED' : 'ACTIVE';
            p.isDomainExpired = isPast;
          }
        });
        // Clean out any default demo developer users
        this.users = (this.users || []).filter(u => u._id !== 'usr_demo_002' && u.email !== 'developer@deployhub.com');
        // Clean out any default sample/seed websites
        const defaultSlugs = ['alex-portfolio', 'retro-games-api', 'zip-test-website', 'site-zip-test-9141', 'my-website', 'rro'];
        this.projects = this.projects.filter(p => !defaultSlugs.includes(p.slug) && !p._id.startsWith('prj_portfolio_') && !p._id.startsWith('prj_shop_'));
        const remainingProjectIds = new Set(this.projects.map(p => p._id));
        this.deployments = (this.deployments || []).filter(d => remainingProjectIds.has(d.projectId));
        this.envVars = (this.envVars || []).filter(ev => remainingProjectIds.has(ev.projectId));
        this.ads = data.ads || [];
        this.auditLogs = data.auditLogs || [];
        this.serverNodes = data.serverNodes || [];
        const primaryNode = this.serverNodes.find(n => n.isPrimaryNode);
        if (primaryNode) {
          primaryNode.instanceId = 'local-edge-primary';
          primaryNode.name = 'DeployHub Edge Server';
          primaryNode.publicIp = config.serverIp || '127.0.0.1';
          primaryNode.privateIp = '127.0.0.1';
          primaryNode.region = 'local';
        }
        this.trafficLogs = (data.trafficLogs || []).filter((l: any) => remainingProjectIds.has(l.projectId));
        this.supportRequests = data.supportRequests || [];
        this.settings = {
          developerPriceINR: 30,
          proPriceINR: 399,
          freeTierAdsEnabled: true,
          adBannerTitle: 'Hosting Powered by DeployHub Cloud',
          adBannerText: 'Fast free web hosting with SSL. Upgrade to Developer (₹30/mo) for 100% ad-free sites.',
          adBannerLink: 'https://deployhub.com',
          customAdScript: '',
          ...(data.settings || {})
        };
        if (!this.settings.platformDomains || this.settings.platformDomains.length === 0) {
          this.settings.platformDomains = [
            { domain: 'deployeai.duckdns.org', label: 'deployeai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: false, isDefault: true },
            { domain: 'deploye-ai.duckdns.org', label: 'deploye-ai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: false },
            { domain: 'ml-ai.duckdns.org', label: 'ml-ai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: false },
            { domain: 'ai-ml.mooo.com', label: 'ai-ml.mooo.com (FreeDNS)', provider: 'FreeDNS', isSsl: false },
            { domain: 'ml-ai.mooo.com', label: 'ml-ai.mooo.com (FreeDNS)', provider: 'FreeDNS', isSsl: false },
            { domain: 'ai-ml.chickenkiller.com', label: 'ai-ml.chickenkiller.com (FreeDNS)', provider: 'FreeDNS', isSsl: false },
          ];
        }
        // Migrate legacy 149 pricing to 30
        if (this.settings.developerPriceINR === 149) {
          this.settings.developerPriceINR = 30;
        }
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
        serverNodes: this.serverNodes,
        trafficLogs: this.trafficLogs,
        supportRequests: this.supportRequests,
        settings: this.settings,
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

  public seedDefaults() {
    // Seed or synchronize Admin user from environment configuration
    const configuredAdminEmail = (config.adminEmail || 'admin@pateldeeep.me').toLowerCase().trim();
    const adminPassHash = bcrypt.hashSync(config.adminPassword || 'AdminDeployHub2026!', 10);

    const recognizedAdminEmails = Array.from(new Set([
      configuredAdminEmail,
      'admin@pateldeeep.me',
      'admin@pateldeep.me',
      'admin@deployhub.com',
    ]));

    for (let i = 0; i < recognizedAdminEmails.length; i++) {
      const email = recognizedAdminEmails[i];
      const existingUser = this.users.find(u => u.email.toLowerCase() === email);
      if (existingUser) {
        existingUser.role = 'ADMIN';
        existingUser.plan = 'PRO';
        existingUser.emailVerified = true;
        existingUser.passwordHash = adminPassHash;
        existingUser.updatedAt = new Date().toISOString();
      } else {
        const adminId = i === 0 ? 'usr_admin_001' : `usr_admin_00${i + 1}`;
        this.users.unshift({
          _id: adminId,
          name: 'DeployHub Admin',
          email,
          passwordHash: adminPassHash,
          role: 'ADMIN',
          plan: 'PRO',
          emailVerified: true,
          storageUsed: 0,
          bandwidthUsed: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // Default websites and demo users are not seeded - platform starts in clean production mode

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

    // Seed initial Primary Node if none exist
    if (this.serverNodes.length === 0) {
      this.serverNodes.push({
        _id: 'node_primary_001',
        instanceId: 'local-edge-primary',
        name: 'DeployHub Edge Server',
        publicIp: config.serverIp || '127.0.0.1',
        privateIp: '127.0.0.1',
        instanceType: 'bare-metal',
        region: 'local',
        provider: 'LOCAL',
        status: 'RUNNING',
        storageTotalBytes: 100 * 1024 * 1024 * 1024,
        storageUsedBytes: 1.2 * 1024 * 1024 * 1024,
        storageUsagePercent: 1.2,
        maxAllowedStoragePercent: 90,
        assignedProjectsCount: this.projects.length,
        isPrimaryNode: true,
        isAcceptingTraffic: true,
        createdAt: new Date().toISOString(),
        lastHeartbeatAt: new Date().toISOString(),
      });
    }

    this.save();
  }
}

export const dbStore = new DataStore();

