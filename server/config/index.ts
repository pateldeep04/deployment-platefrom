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
  { domain: 'deployeai.duckdns.org', label: 'deployeai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: true, isDefault: true },
  { domain: 'deploye-ai.duckdns.org', label: 'deploye-ai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: true },
  { domain: 'ml-ai.duckdns.org', label: 'ml-ai.duckdns.org (DuckDNS)', provider: 'DuckDNS', isSsl: true },
  { domain: 'ai-ml.mooo.com', label: 'ai-ml.mooo.com (FreeDNS)', provider: 'FreeDNS', isSsl: true },
  { domain: 'ml-ai.mooo.com', label: 'ml-ai.mooo.com (FreeDNS)', provider: 'FreeDNS', isSsl: true },
  { domain: 'ai-ml.chickenkiller.com', label: 'ai-ml.chickenkiller.com (FreeDNS)', provider: 'FreeDNS', isSsl: true },
];

const rawPlatformDomain = process.env.PLATFORM_DOMAIN || '';
const domainParts = rawPlatformDomain.split('.');
const defaultSld = domainParts.length >= 2 ? domainParts[0] : '';
const defaultTld = domainParts.length >= 2 ? domainParts.slice(1).join('.') : '';

export const config = {
  env: process.env.NODE_ENV || 'production',
  port: parseInt(process.env.PORT || '5000', 10),
  apiUrl: process.env.API_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  mongoUri: process.env.MONGODB_URI || '',
  redisUrl: process.env.REDIS_URL || '',
  storageDir: baseStorage,
  uploadMaxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '100', 10),
  storageQuotaFreeMb: parseInt(process.env.STORAGE_QUOTA_FREE_MB || '500', 10),
  platformDomain: rawPlatformDomain,
  serverIp: process.env.SERVER_IP || '',

  // Admin Credentials (loaded strictly from environment variables)
  adminEmail: (process.env.ADMIN_EMAIL || '').toLowerCase().trim(),
  adminPassword: process.env.ADMIN_PASSWORD || '',

  // Namecheap DNS Automation
  namecheapApiUser: process.env.NAMECHEAP_API_USER || '',
  namecheapApiKey: process.env.NAMECHEAP_API_KEY || '',
  namecheapUserName: process.env.NAMECHEAP_USERNAME || '',
  namecheapClientIp: process.env.NAMECHEAP_CLIENT_IP || '',
  namecheapUseSandbox: process.env.NAMECHEAP_USE_SANDBOX === 'true',
  namecheapSld: process.env.NAMECHEAP_SLD || defaultSld,
  namecheapTld: process.env.NAMECHEAP_TLD || defaultTld,

  // Email / SMTP Dispatcher (Gmail, Amazon SES, Brevo, SendGrid, etc.)
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
};

// Production Security Health Check
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️ [SECURITY AUDIT] JWT_SECRET environment variable is missing.');
  }
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️ [SECURITY AUDIT] ADMIN_PASSWORD environment variable is missing.');
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
    if (domain.startsWith('https://')) return domain;
    if (domain.startsWith('http://')) return domain.replace('http://', 'https://');
    return `https://${domain}/`;
  }
  if (project.assignedSubdomain && project.assignedSubdomain.trim()) {
    const base = config.platformDomain || 'deployeai.duckdns.org';
    return `https://${project.assignedSubdomain.trim()}.${base}/`;
  }
  return `${config.apiUrl || ''}/sites/${project.slug}/`;
};


