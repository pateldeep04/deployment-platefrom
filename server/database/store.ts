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
  instanceType: string; // 't2.micro' (AWS Free Tier)
  region: string;
  provider: 'AWS_EC2' | 'LOCAL';
  status: 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'DRAINING' | 'TERMINATED';
  storageTotalBytes: number; // 30 GB AWS Free Tier EBS
  storageUsedBytes: number;
  storageUsagePercent: number;
  maxAllowedStoragePercent: number; // default 85% threshold
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

export interface IPlatformSettings {
  developerPriceINR: number; // default: 30
  proPriceINR: number; // default: 399
  freeTierAdsEnabled: boolean; // default: true
  adBannerTitle?: string;
  adBannerText?: string;
  adBannerLink?: string;
  customAdScript?: string;
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
          primaryNode.instanceId = 'i-089bcd5af2cb5b8f3';
          primaryNode.name = 'deploye test (EC2 Primary Node)';
          primaryNode.publicIp = config.primaryServerIp;
          primaryNode.privateIp = '172.31.11.217';
          primaryNode.region = 'ap-south-1';
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
        storageUsed: 0,
        bandwidthUsed: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
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

    // Seed initial Primary AWS EC2 Free Tier Node if none exist
    if (this.serverNodes.length === 0) {
      this.serverNodes.push({
        _id: 'node_primary_001',
        instanceId: 'i-089bcd5af2cb5b8f3',
        name: 'deploye test (EC2 Primary Node)',
        publicIp: config.primaryServerIp,
        privateIp: '172.31.11.217',
        instanceType: config.awsEc2InstanceType,
        region: 'ap-south-1',
        provider: 'AWS_EC2',
        status: 'RUNNING',
        storageTotalBytes: 30 * 1024 * 1024 * 1024, // 30 GB AWS Free Tier EBS
        storageUsedBytes: 4.8 * 1024 * 1024 * 1024,  // Initial system usage
        storageUsagePercent: 16.0,
        maxAllowedStoragePercent: config.awsAutoSpinupThresholdPercent, // e.g. 85%
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

