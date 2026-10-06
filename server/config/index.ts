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

const rawPlatformDomain = process.env.PLATFORM_DOMAIN || 'deployeai.duckdns.org';
const domainParts = rawPlatformDomain.split('.');
const defaultSld = domainParts.length >= 2 ? domainParts[0] : 'pateldeeep';
const defaultTld = domainParts.length >= 2 ? domainParts.slice(1).join('.') : 'me';

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
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_deployhub_sandbox_key',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_deployhub_sandbox_secret',

  // Namecheap DNS Automation
  namecheapApiUser: process.env.NAMECHEAP_API_USER || '',
  namecheapApiKey: process.env.NAMECHEAP_API_KEY || '',
  namecheapUserName: process.env.NAMECHEAP_USERNAME || '',
  namecheapClientIp: process.env.NAMECHEAP_CLIENT_IP || '127.0.0.1',
  namecheapUseSandbox: process.env.NAMECHEAP_USE_SANDBOX === 'true' || false,
  namecheapSld: process.env.NAMECHEAP_SLD || defaultSld,
  namecheapTld: process.env.NAMECHEAP_TLD || defaultTld,

  // AWS EC2 Fleet Auto-Hosting & Free Tier Scaling
  awsRegion: process.env.AWS_REGION || 'ap-south-1',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsEc2InstanceType: process.env.AWS_EC2_INSTANCE_TYPE || 't2.micro', // AWS Free Tier eligible
  awsEc2AmiId: process.env.AWS_EC2_AMI_ID || 'ami-03f4878e83fed34e0', // Ubuntu 22.04 LTS ap-south-1
  awsEc2KeyName: process.env.AWS_EC2_KEY_NAME || 'deployhub-key',
  awsEc2SecurityGroupId: process.env.AWS_EC2_SECURITY_GROUP_ID || 'sg-deployhub-fleet',
  awsAutoSpinupThresholdPercent: parseInt(process.env.AWS_STORAGE_THRESHOLD_PERCENT || '85', 10),
  primaryServerIp: process.env.PRIMARY_SERVER_IP || '13.233.142.85',
};

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


