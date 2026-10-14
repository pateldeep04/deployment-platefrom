import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { dbStore, IProject } from '../database/store';
import { createProjectSchema, updateProjectSchema } from '../validators';
import { AuthenticatedRequest } from '../middleware/auth';

import { subdomainService } from '../services/subdomainService';
import { domainExpiryService } from '../services/domainExpiryService';

// Concurrency mutex lock to prevent simultaneous race conditions when 2 users claim the same domain at the exact same millisecond
const activeSubdomainLocks = new Map<string, number>();

function acquireSubdomainLock(subdomainKey: string, ttlMs = 6000): boolean {
  const now = Date.now();
  const expiresAt = activeSubdomainLocks.get(subdomainKey);
  if (expiresAt && expiresAt > now) {
    return false; // locked by concurrent in-flight request!
  }
  activeSubdomainLocks.set(subdomainKey, now + ttlMs);
  return true;
}

function releaseSubdomainLock(subdomainKey: string): void {
  activeSubdomainLocks.delete(subdomainKey);
}

export const listProjects = (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!._id;
  const userProjects = dbStore.projects.filter(p => p.userId === userId);
  res.json({ success: true, data: { projects: userProjects } });
};

export const getProject = (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const userId = req.user!._id;
  const project = dbStore.projects.find(p => (p._id === id || p.slug === id) && p.userId === userId);

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  const latestDeployment = dbStore.deployments.find(d => d._id === project.currentDeploymentId);
  res.json({
    success: true,
    data: {
      project,
      latestDeployment,
    }
  });
};

export const createProject = (req: AuthenticatedRequest, res: Response): void => {
  const user = req.user!;
  const parseResult = createProjectSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
    return;
  }

  // Strictly enforce 3 website hosting limit
  const MAX_PROJECTS = 3;
  const existingCount = dbStore.projects.filter(p => p.userId === user._id).length;

  if (existingCount >= MAX_PROJECTS) {
    res.status(403).json({
      success: false,
      error: `Hosting limit reached (${existingCount}/${MAX_PROJECTS} websites). You can host a maximum of 3 websites. Please delete an unused website to create a new one.`
    });
    return;
  }

  const { name, type, buildCommand, outputDirectory, subdomain: customSub, platformDomain: chosenDomain } = parseResult.data;
  let slug = parseResult.data.slug || customSub || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const assignedSubdomain = (customSub || slug).toLowerCase().replace(/[^a-z0-9-]/g, '');
  const platformDomain = (chosenDomain || config.platformDomain || 'deployeai.duckdns.org').toLowerCase();

  // 1. Concurrency Mutex Lock: Prevents two simultaneous requests from claiming the same subdomain at the same millisecond
  const lockKey = `${assignedSubdomain}@${platformDomain}`;
  if (!acquireSubdomainLock(lockKey, 6000)) {
    const suggestions = subdomainService.generateSuggestions(assignedSubdomain);
    res.status(409).json({
      success: false,
      conflict: true,
      error: `Subdomain '${assignedSubdomain}.${platformDomain}' is currently being claimed by another user at the exact same moment.`,
      suggestions,
    });
    return;
  }

  try {
    // 2. Atomic Verification: Verify availability right now before inserting into store
    const check = subdomainService.checkAvailability(assignedSubdomain, undefined, platformDomain);
    if (!check.isAvailable) {
      const suggestions = check.suggestions && check.suggestions.length > 0
        ? check.suggestions
        : subdomainService.generateSuggestions(assignedSubdomain);

      res.status(409).json({
        success: false,
        conflict: true,
        error: check.reason || `Subdomain '${assignedSubdomain}.${platformDomain}' is already claimed by another project.`,
        suggestions,
      });
      return;
    }

    // Ensure unique internal slug
    if (dbStore.projects.some(p => p.slug === slug)) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const newProject: IProject = {
      _id: `prj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user._id,
      name,
      slug,
      assignedSubdomain,
      platformDomain,
      type,
      status: 'INACTIVE',
      storageUsed: 0,
      buildCommand: buildCommand || (type === 'VITE' ? 'npm run build' : undefined),
      outputDirectory: outputDirectory || (type === 'VITE' ? 'dist' : undefined),
      domainExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      domainStatus: 'ACTIVE',
      isDomainExpired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.projects.push(newProject);
    dbStore.auditLogs.push({
      _id: `log_${Date.now()}`,
      userId: user._id,
      action: 'PROJECT_CREATE',
      ip: req.ip || '127.0.0.1',
      details: { projectId: newProject._id, name, slug, assignedSubdomain, platformDomain, type },
      createdAt: new Date().toISOString(),
    });
    dbStore.save();

    res.status(201).json({ success: true, data: { project: newProject } });
  } finally {
    releaseSubdomainLock(lockKey);
  }
};

export const updateProject = (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const user = req.user!;
  const project = dbStore.projects.find(p => p._id === id && p.userId === user._id);

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  const parseResult = updateProjectSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
    return;
  }

  const data = parseResult.data;
  if (data.name) project.name = data.name;
  if (data.buildCommand !== undefined) project.buildCommand = data.buildCommand;
  if (data.outputDirectory !== undefined) project.outputDirectory = data.outputDirectory;
  if (data.customDomain !== undefined) project.customDomain = data.customDomain;
  project.updatedAt = new Date().toISOString();

  dbStore.save();
  res.json({ success: true, data: { project } });
};

export const deleteProject = (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const user = req.user!;
  const index = dbStore.projects.findIndex(p => p._id === id && p.userId === user._id);

  if (index === -1) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  const project = dbStore.projects[index];

  // Clean up directory on disk
  try {
    const siteDir = path.join(config.storageDir, 'sites', project.slug);
    if (fs.existsSync(siteDir)) {
      fs.rmSync(siteDir, { recursive: true, force: true });
    }
  } catch (e) {
    console.error('Failed to remove site directory on deletion:', e);
  }

  dbStore.projects.splice(index, 1);
  dbStore.save();

  res.json({ success: true, message: `Project '${project.name}' deleted successfully` });
};

export const getTelemetryAnalytics = (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!._id;
  const userLogs = (dbStore.trafficLogs || []).filter(l => l.userId === userId);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const telemetry = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = daysOfWeek[d.getDay()];

    const dayLogs = userLogs.filter(l => l.date === dateStr);
    const requests = dayLogs.length;
    const bandwidthMB = +(dayLogs.reduce((sum, l) => sum + (l.bytesSent || 0), 0) / (1024 * 1024)).toFixed(2);

    telemetry.push({
      day: dayName,
      date: dateStr,
      requests,
      bandwidth: bandwidthMB,
    });
  }

  res.json({
    success: true,
    data: {
      telemetry,
      totalRequests: userLogs.length,
      totalBandwidthMB: +(userLogs.reduce((sum, l) => sum + (l.bytesSent || 0), 0) / (1024 * 1024)).toFixed(2),
    },
  });
};

/**
 * POST /api/v1/projects/:id/reactivate-domain
 * Free 1-click domain reactivation: extends domain validity for another 3 months
 */
export const reactivateDomain = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = req.user!;
    const project = await domainExpiryService.reactivateDomain(id, user._id, user.role === 'ADMIN');

    res.json({
      success: true,
      message: `Domain '${project.assignedSubdomain}.${project.platformDomain}' reactivated successfully for FREE! Valid for 3 more months until ${new Date(project.domainExpiresAt!).toLocaleDateString()}.`,
      data: { project },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to reactivate domain' });
  }
};

/**
 * GET /api/v1/projects/:id/domain-expiry
 * Retrieves live domain expiry countdown and reactivation status
 */
export const getDomainExpiryStatus = (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const user = req.user!;
  const project = dbStore.projects.find(p => p._id === id && (p.userId === user._id || user.role === 'ADMIN'));

  if (!project) {
    res.status(404).json({ success: false, error: 'Project not found' });
    return;
  }

  const expiryStatus = domainExpiryService.getProjectExpiryStatus(project);
  res.json({ success: true, data: expiryStatus });
};
