export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPPORT';
  plan: 'FREE' | 'DEVELOPER' | 'PRO';
  emailVerified: boolean;
  storageUsed: number;
  bandwidthUsed: number;
  createdAt: string;
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

export interface IDeploymentLog {
  timestamp: string;
  message: string;
  stage: string;
  level: 'info' | 'warn' | 'error' | 'success';
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
  deploymentUrl: string;
  logs: IDeploymentLog[];
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface IEnvironmentVariable {
  _id: string;
  key: string;
  maskedValue: string;
  valueLength: number;
  createdAt: string;
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
  ctr?: string;
}

export interface IPlan {
  id: string;
  name: string;
  priceINR: number;
  priceLabel: string;
  projectsLimit: number;
  storageMB: number;
  bandwidthGB: number;
  customDomains: boolean;
  phpHosting: boolean;
  priorityBuilds: boolean;
  adFree: boolean;
  description: string;
}
