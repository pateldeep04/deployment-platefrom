import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Locate root storage directory reliably regardless of execution working dir
let baseStorage = path.resolve(process.cwd(), 'storage');
if (!fs.existsSync(baseStorage)) {
  baseStorage = path.resolve(__dirname, '../../storage');
}
if (!fs.existsSync(baseStorage)) {
  fs.mkdirSync(baseStorage, { recursive: true });
}

export interface PlatformDomainOption {
  domain: string;
  label: string;
  provider: 'SSL' | 'DuckDNS' | 'FreeDNS';
  isSsl: boolean;
  isDefault?: boolean;
}

export const AVAILABLE_PLATFORM_DOMAINS: PlatformDomainOption[] = [
  { domain: 'deployeai.duckdns.org', label: 'deployeai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: false, isDefault: true },
  { domain: 'deploye-ai.duckdns.org', label: 'deploye-ai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: false },
  { domain: 'ml-ai.duckdns.org', label: 'ml-ai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: false },
  { domain: 'ai-ml.mooo.com', label: 'ai-ml.mooo.com (FreeDNS)', provider: 'FreeDNS', isSsl: false },
  { domain: 'ml-ai.mooo.com', label: 'ml-ai.mooo.com (FreeDNS)', provider: 'FreeDNS', isSsl: false },
  { domain: 'ai-ml.chickenkiller.com', label: 'ai-ml.chickenkiller.com (FreeDNS)', provider: 'FreeDNS', isSsl: false },
];

const rawPlatformDomain = process.env.PLATFORM_DOMAIN || 'deployeai.duckdns.org';
const domainParts = rawPlatformDomain.split('.');
const defaultSld = domainParts.length >= 2 ? domainParts[0] : 'deployeai';
const defaultTld = domainParts.length >= 2 ? domainParts.slice(1).join('.') : 'duckdns.org';

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiUrl: process.env.API_URL || 'http://localhost:5000',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-deployhub-jwt-token-key-change-in-production-32chars',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'super-secret-deployhub-refresh-token-key-32chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/deployhub',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  storageDir: baseStorage,
  uploadMaxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '100', 10),
  storageQuotaFreeMb: parseInt(process.env.STORAGE_QUOTA_FREE_MB || '500', 10),
  platformDomain: rawPlatformDomain,
  serverIp: process.env.SERVER_IP || '127.0.0.1',

  // Admin Credentials
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@pateldeeep.me').toLowerCase().trim(),
  adminPassword: process.env.ADMIN_PASSWORD || 'AdminDeployHub2026!',

  // Namecheap DNS Automation
  namecheapApiUser: process.env.NAMECHEAP_API_USER || '',
  namecheapApiKey: process.env.NAMECHEAP_API_KEY || '',
  namecheapUserName: process.env.NAMECHEAP_USERNAME || '',
  namecheapClientIp: process.env.NAMECHEAP_CLIENT_IP || '127.0.0.1',
  namecheapUseSandbox: process.env.NAMECHEAP_USE_SANDBOX === 'true' || false,
  namecheapSld: process.env.NAMECHEAP_SLD || defaultSld,
  namecheapTld: process.env.NAMECHEAP_TLD || defaultTld,

  // Email / SMTP Dispatcher (Gmail, Amazon SES, Brevo, SendGrid, etc.)
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: (process.env.SMTP_FROM && process.env.SMTP_FROM.includes('<'))
    ? process.env.SMTP_FROM
    : (process.env.SMTP_USER
      ? `"${(process.env.SMTP_FROM || 'DeployHub Cloud').replace(/"/g, '')}" <${process.env.SMTP_USER}>`
      : '"DeployHub Cloud" <no-reply@deployhub.com>'),
};

// Production Security Health Check
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change-in-production')) {
    console.warn('⚠️ [SECURITY AUDIT] JWT_SECRET is using a default key! For maximum security, define a dedicated random secret in production.');
  }
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === 'AdminDeployHub2026!') {
    console.warn('⚠️ [SECURITY AUDIT] ADMIN_PASSWORD is set to the default value. Update ADMIN_PASSWORD in your production environment variables.');
  }
}

export interface ProjectUrlTarget {
  slug: string;
  customDomain?: string | null;
  assignedSubdomain?: string | null;
}

export const getDeploymentUrl = (project: ProjectUrlTarget): string => {
  if (project.customDomain && project.customDomain.trim()) {
    const domain = project.customDomain.trim();
    return domain.startsWith('http://') || domain.startsWith('https://')
      ? domain
      : `http://${domain}/`;
  }
  if (project.assignedSubdomain && project.assignedSubdomain.trim()) {
    return `http://${project.assignedSubdomain.trim()}.${config.platformDomain}/`;
  }
  return `${config.apiUrl}/sites/${project.slug}/`;
};


