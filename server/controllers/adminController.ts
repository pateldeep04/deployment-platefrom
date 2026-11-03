import { Response } from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { dbStore, IProject, IUser } from '../database/store';
import { AuthenticatedRequest } from '../middleware/auth';
import { config, getDeploymentUrl } from '../config';
import { deploymentEngine } from '../queue/deploymentQueue';
import { domainLockService } from '../services/domainLockService';
import { subdomainService } from '../services/subdomainService';

function getDirectorySize(dirPath: string): number {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += getDirectorySize(fullPath);
      } else {
        try {
          size += fs.statSync(fullPath).size;
        } catch {}
      }
    }
  } catch {}
  return size;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

/**
 * GET /api/v1/admin/monitoring
 * Comprehensive real-time server telemetry and operational metrics
 */
export const getLiveMonitoringData = (req: AuthenticatedRequest, res: Response): void => {
  try {
    // 1. Memory Metrics
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;
    const memUsagePct = ((usedMemBytes / totalMemBytes) * 100).toFixed(1);

    const procMem = process.memoryUsage();
    const procHeapUsedMB = (procMem.heapUsed / (1024 * 1024)).toFixed(1);
    const procRssMB = (procMem.rss / (1024 * 1024)).toFixed(1);

    // 2. CPU Metrics
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown';
    const cpuCores = cpus.length;
    const loadAvg = os.loadavg(); // [1m, 5m, 15m]

    // 3. Storage Breakdown
    const sitesDir = path.join(config.storageDir, 'sites');
    const artifactsDir = path.join(config.storageDir, 'artifacts');
    const uploadsDir = path.join(config.storageDir, 'uploads');
    const dataFile = path.join(config.storageDir, 'data', 'deployhub_state.json');

    const sitesBytes = getDirectorySize(sitesDir);
    const artifactsBytes = getDirectorySize(artifactsDir);
    const uploadsBytes = getDirectorySize(uploadsDir);
    let stateBytes = 0;
    try {
      if (fs.existsSync(dataFile)) stateBytes = fs.statSync(dataFile).size;
    } catch {}

    const totalStorageBytes = sitesBytes + artifactsBytes + uploadsBytes + stateBytes;

    // 4. Platform Counters
    const totalUsers = dbStore.users.length;
    const freeUsers = dbStore.users.filter(u => u.plan === 'FREE').length;
    const devUsers = dbStore.users.filter(u => u.plan === 'DEVELOPER').length;
    const proUsers = dbStore.users.filter(u => u.plan === 'PRO').length;

    const totalProjects = dbStore.projects.length;
    const activeProjects = dbStore.projects.filter(p => p.status === 'ACTIVE').length;
    const buildingProjects = dbStore.projects.filter(p => p.status === 'BUILDING').length;
    const inactiveProjects = dbStore.projects.filter(p => p.status === 'INACTIVE').length;

    const staticProjects = dbStore.projects.filter(p => p.type === 'STATIC').length;
    const phpProjects = dbStore.projects.filter(p => p.type === 'PHP').length;

    const totalDeployments = dbStore.deployments.length;
    const liveDeployments = dbStore.deployments.filter(d => d.status === 'LIVE').length;
    const failedDeployments = dbStore.deployments.filter(d => d.status === 'FAILED').length;

    const todayStr = new Date().toISOString().split('T')[0];
    const deploymentsToday = dbStore.deployments.filter(d => d.createdAt.startsWith(todayStr)).length;

    // 5. Worker Queue Telemetry
    const queueStats = (deploymentEngine as any).getQueueStats?.() || {
      mode: 'IN_MEMORY',
      isRedisConnected: false,
      pendingJobs: 0,
      isWorkerActive: false,
    };

    // 6. Security incident count (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const recentSecurityAlerts = dbStore.auditLogs.filter(
      l => l.createdAt >= yesterday && (l.action.includes('SECURITY') || l.action.includes('BLOCK') || l.action.includes('REJECT'))
    ).length;

    // 7. Estimated Monthly Recurring Revenue (MRR)
    const devPrice = dbStore.settings?.developerPriceINR ?? 30;
    const proPrice = dbStore.settings?.proPriceINR ?? 399;
    const monthlyRevenueINR = (devUsers * devPrice) + (proUsers * proPrice);

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        system: {
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version,
          pid: process.pid,
          uptimeSeconds: Math.floor(process.uptime()),
          uptimeFormatted: formatUptime(process.uptime()),
          cpu: {
            model: cpuModel,
            cores: cpuCores,
            loadAvg1m: loadAvg[0].toFixed(2),
            loadAvg5m: loadAvg[1].toFixed(2),
            loadAvg15m: loadAvg[2].toFixed(2),
          },
          memory: {
            totalGB: (totalMemBytes / (1024 * 1024 * 1024)).toFixed(2),
            usedGB: (usedMemBytes / (1024 * 1024 * 1024)).toFixed(2),
            freeGB: (freeMemBytes / (1024 * 1024 * 1024)).toFixed(2),
            usagePercent: memUsagePct,
            processHeapMB: procHeapUsedMB,
            processRssMB: procRssMB,
          },
          storage: {
            sitesMB: (sitesBytes / (1024 * 1024)).toFixed(2),
            artifactsMB: (artifactsBytes / (1024 * 1024)).toFixed(2),
            uploadsMB: (uploadsBytes / (1024 * 1024)).toFixed(2),
            stateKB: (stateBytes / 1024).toFixed(1),
            totalUsedMB: (totalStorageBytes / (1024 * 1024)).toFixed(2),
          },
          queue: queueStats,
        },
        summary: {
          totalUsers,
          freeUsers,
          devUsers,
          proUsers,
          totalProjects,
          activeProjects,
          buildingProjects,
          inactiveProjects,
          staticProjects,
          phpProjects,
          totalDeployments,
          liveDeployments,
          failedDeployments,
          deploymentsToday,
          recentSecurityAlerts,
          monthlyRevenueINR,
          platformDomain: config.platformDomain,
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch monitoring telemetry' });
  }
};

/**
 * GET /api/v1/admin/stats (Legacy endpoint kept for backwards compatibility)
 */
export const getSystemStats = (req: AuthenticatedRequest, res: Response): void => {
  const totalUsers = dbStore.users.length;
  const totalProjects = dbStore.projects.length;
  const activeProjects = dbStore.projects.filter(p => p.status === 'ACTIVE').length;
  const totalDeployments = dbStore.deployments.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const deploymentsToday = dbStore.deployments.filter(d => d.createdAt.startsWith(todayStr)).length;

  const totalStorageBytes = dbStore.projects.reduce((acc, p) => acc + (p.storageUsed || 0), 0);
  const totalBandwidthBytes = dbStore.users.reduce((acc, u) => acc + (u.bandwidthUsed || 0), 0);

  const developerPlans = dbStore.users.filter(u => u.plan === 'DEVELOPER').length;
  const proPlans = dbStore.users.filter(u => u.plan === 'PRO').length;
  const devPrice = dbStore.settings?.developerPriceINR ?? 30;
  const proPrice = dbStore.settings?.proPriceINR ?? 399;
  const monthlyRevenueINR = (developerPlans * devPrice) + (proPlans * proPrice);

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalProjects,
        activeProjects,
        totalDeployments,
        deploymentsToday,
        totalStorageMB: (totalStorageBytes / (1024 * 1024)).toFixed(1),
        totalBandwidthGB: (totalBandwidthBytes / (1024 * 1024 * 1024)).toFixed(2),
        monthlyRevenueINR,
      }
    }
  });
};

/**
 * GET /api/v1/admin/projects
 * Lists all projects across the platform with owner details & actions
 */
export const listAllProjects = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const projectsWithDetails = dbStore.projects.map((p) => {
      const owner = dbStore.users.find(u => u._id === p.userId);
      const projectDeployments = dbStore.deployments.filter(d => d.projectId === p._id);
      return {
        ...p,
        owner: owner ? { id: owner._id, name: owner.name, email: owner.email, plan: owner.plan } : null,
        deploymentCount: projectDeployments.length,
        liveUrl: getDeploymentUrl(p),
      };
    });

    res.json({
      success: true,
      data: { projects: projectsWithDetails }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to list projects' });
  }
};

/**
 * DELETE /api/v1/admin/projects/:projectId
 * Administrative deletion of any project
 */
export const adminDeleteProject = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { projectId } = req.params;
    const projectIndex = dbStore.projects.findIndex(p => p._id === projectId);

    if (projectIndex === -1) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const project = dbStore.projects[projectIndex];

    // Remove site directory
    const siteDir = path.join(config.storageDir, 'sites', project.slug);
    if (fs.existsSync(siteDir)) {
      try {
        fs.rmSync(siteDir, { recursive: true, force: true });
      } catch {}
    }

    // Remove from database
    dbStore.projects.splice(projectIndex, 1);
    dbStore.deployments = dbStore.deployments.filter(d => d.projectId !== projectId);
    dbStore.envVars = dbStore.envVars.filter(e => e.projectId !== projectId);

    // Audit log
    dbStore.auditLogs.push({
      _id: `aud_${Date.now()}`,
      userId: req.user!._id,
      action: `ADMIN_DELETE_PROJECT: ${project.name} (${project.slug})`,
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
      details: { projectId, slug: project.slug },
    });

    dbStore.save();

    res.json({
      success: true,
      message: `Project '${project.name}' and all associated files deleted by administrator.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete project' });
  }
};

/**
 * PATCH /api/v1/admin/projects/:projectId/status
 * Toggle project status (ACTIVE <-> INACTIVE)
 */
export const adminToggleProjectStatus = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { projectId } = req.params;
    const { status } = req.body;

    const project = dbStore.projects.find(p => p._id === projectId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    if (status && ['ACTIVE', 'INACTIVE', 'BUILDING'].includes(status)) {
      project.status = status;
      project.updatedAt = new Date().toISOString();
      dbStore.save();
    }

    res.json({
      success: true,
      message: `Project '${project.name}' status updated to ${project.status}`,
      data: { project }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update project status' });
  }
};

/**
 * GET /api/v1/admin/users
 */
export const listAllUsers = (req: AuthenticatedRequest, res: Response): void => {
  const users = dbStore.users.map(({ passwordHash, ...u }) => ({
    ...u,
    projectCount: dbStore.projects.filter(p => p.userId === u._id).length,
  }));
  res.json({ success: true, data: { users } });
};

/**
 * PATCH /api/v1/admin/users/:userId
 */
export const updateUserPlanOrRole = (req: AuthenticatedRequest, res: Response): void => {
  const { userId } = req.params;
  const { plan, role } = req.body;

  const user = dbStore.users.find(u => u._id === userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  if (plan && ['FREE', 'DEVELOPER', 'PRO'].includes(plan)) {
    user.plan = plan;
  }
  if (role && ['USER', 'ADMIN', 'SUPPORT'].includes(role)) {
    user.role = role;
  }

  user.updatedAt = new Date().toISOString();
  dbStore.save();

  const { passwordHash, ...safeUser } = user;
  res.json({ success: true, data: { user: safeUser } });
};

/**
 * POST /api/v1/admin/users/:userId/reset-password
 * Allows administrator to reset a user's password directly
 */
export const adminResetUserPassword = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
      return;
    }

    const user = dbStore.users.find(u => u._id === userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 10);
    user.updatedAt = new Date().toISOString();
    dbStore.save();

    res.json({
      success: true,
      message: `Password reset successfully for user '${user.email}'`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to reset password' });
  }
};

/**
 * DELETE /api/v1/admin/users/:userId
 * Deletes user and cascades cleanup of all their hosted sites
 */
export const adminDeleteUser = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { userId } = req.params;

    if (userId === req.user!._id) {
      res.status(400).json({ success: false, error: 'Cannot delete your own administrative account' });
      return;
    }

    const userIndex = dbStore.users.findIndex(u => u._id === userId);
    if (userIndex === -1) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const user = dbStore.users[userIndex];

    // Delete user's hosted site folders
    const userProjects = dbStore.projects.filter(p => p.userId === userId);
    for (const proj of userProjects) {
      const siteDir = path.join(config.storageDir, 'sites', proj.slug);
      if (fs.existsSync(siteDir)) {
        try { fs.rmSync(siteDir, { recursive: true, force: true }); } catch {}
      }
    }

    // Cascade remove database entries
    dbStore.projects = dbStore.projects.filter(p => p.userId !== userId);
    dbStore.deployments = dbStore.deployments.filter(d => d.userId !== userId);
    dbStore.users.splice(userIndex, 1);

    dbStore.auditLogs.push({
      _id: `aud_${Date.now()}`,
      userId: req.user!._id,
      action: `ADMIN_DELETE_USER: ${user.email}`,
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    dbStore.save();

    res.json({
      success: true,
      message: `User '${user.email}' and all associated websites deleted.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete user' });
  }
};

/**
 * POST /api/v1/admin/prune-storage
 * Cleans old temporary artifacts and upload caches to free up server disk space
 */
export const adminPruneStorage = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const artifactsDir = path.join(config.storageDir, 'artifacts');
    const uploadsDir = path.join(config.storageDir, 'uploads');
    let freedBytes = 0;

    if (fs.existsSync(artifactsDir)) {
      freedBytes += getDirectorySize(artifactsDir);
      try {
        fs.rmSync(artifactsDir, { recursive: true, force: true });
        fs.mkdirSync(artifactsDir, { recursive: true });
      } catch {}
    }

    if (fs.existsSync(uploadsDir)) {
      freedBytes += getDirectorySize(uploadsDir);
      try {
        fs.rmSync(uploadsDir, { recursive: true, force: true });
        fs.mkdirSync(uploadsDir, { recursive: true });
      } catch {}
    }

    dbStore.auditLogs.push({
      _id: `aud_${Date.now()}`,
      userId: req.user!._id,
      action: `PRUNED_STORAGE: ${(freedBytes / (1024 * 1024)).toFixed(1)} MB reclaimed`,
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });
    dbStore.save();

    res.json({
      success: true,
      message: `Successfully reclaimed ${(freedBytes / (1024 * 1024)).toFixed(2)} MB of disk space.`,
      freedMB: (freedBytes / (1024 * 1024)).toFixed(2),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Storage prune failed' });
  }
};

/**
 * GET /api/v1/admin/deployments
 */
export const listAllDeployments = (req: AuthenticatedRequest, res: Response): void => {
  const deployments = dbStore.deployments
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(d => {
      const proj = dbStore.projects.find(p => p._id === d.projectId);
      const user = dbStore.users.find(u => u._id === d.userId);
      return {
        ...d,
        projectName: proj?.name || 'Unknown',
        projectSlug: proj?.slug || 'unknown',
        userEmail: user?.email || 'Unknown',
      };
    });

  res.json({ success: true, data: { deployments } });
};

/**
 * GET /api/v1/admin/security-logs
 */
export const getSecurityLogs = (req: AuthenticatedRequest, res: Response): void => {
  const logs = dbStore.auditLogs
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);

  res.json({ success: true, data: { logs } });
};

/**
 * DELETE /api/v1/admin/security-logs
 * Clears security audit logs
 */
export const clearSecurityLogs = (req: AuthenticatedRequest, res: Response): void => {
  dbStore.auditLogs = [];
  dbStore.save();
  res.json({ success: true, message: 'Audit logs cleared successfully' });
};

/**
 * GET /api/v1/admin/settings
 * Retrieve platform pricing and monetization settings
 */
export const getPlatformSettings = (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: {
      settings: dbStore.settings,
    },
  });
};

/**
 * PATCH /api/v1/admin/settings
 * Update plan prices (e.g. Developer tier ₹30) and free tier ad controls
 */
export const updatePlatformSettings = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const {
      developerPriceINR,
      proPriceINR,
      freeTierAdsEnabled,
      adBannerTitle,
      adBannerText,
      adBannerLink,
      customAdScript,
    } = req.body;

    if (developerPriceINR !== undefined) {
      const devNum = Number(developerPriceINR);
      if (isNaN(devNum) || devNum < 0) {
        res.status(400).json({ success: false, error: 'Developer price must be a non-negative number' });
        return;
      }
      dbStore.settings.developerPriceINR = devNum;
    }

    if (proPriceINR !== undefined) {
      const proNum = Number(proPriceINR);
      if (isNaN(proNum) || proNum < 0) {
        res.status(400).json({ success: false, error: 'Pro price must be a non-negative number' });
        return;
      }
      dbStore.settings.proPriceINR = proNum;
    }

    if (freeTierAdsEnabled !== undefined) {
      dbStore.settings.freeTierAdsEnabled = Boolean(freeTierAdsEnabled);
    }

    if (adBannerTitle !== undefined) {
      dbStore.settings.adBannerTitle = String(adBannerTitle).trim();
    }

    if (adBannerText !== undefined) {
      dbStore.settings.adBannerText = String(adBannerText).trim();
    }

    if (adBannerLink !== undefined) {
      dbStore.settings.adBannerLink = String(adBannerLink).trim();
    }

    if (customAdScript !== undefined) {
      dbStore.settings.customAdScript = String(customAdScript);
    }

    dbStore.auditLogs.push({
      _id: `aud_${Date.now()}`,
      userId: req.user!._id,
      action: `ADMIN_UPDATE_SETTINGS: Plan pricing set to Dev: ₹${dbStore.settings.developerPriceINR}, Pro: ₹${dbStore.settings.proPriceINR}, FreeAds: ${dbStore.settings.freeTierAdsEnabled}`,
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
      details: dbStore.settings,
    });

    dbStore.save();

    res.json({
      success: true,
      message: 'Platform pricing & ad monetization settings updated successfully',
      data: {
        settings: dbStore.settings,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update settings' });
  }
};

/**
 * GET /api/v1/admin/domains
 * Returns list of platform routing domains and all project domain bindings
 */
export const getAdminDomains = (req: AuthenticatedRequest, res: Response): void => {
  const platformDomains = dbStore.settings.platformDomains || [];

  const projectDomains = dbStore.projects.map(p => {
    const owner = dbStore.users.find(u => u._id === p.userId);
    const primaryDomain = platformDomains.find(d => d.isDefault)?.domain || config.platformDomain;
    const baseDomain = p.platformDomain || primaryDomain;
    const fullSubdomain = p.assignedSubdomain ? `${p.assignedSubdomain}.${baseDomain}` : `${p.slug}.${baseDomain}`;

    return {
      projectId: p._id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      ownerEmail: owner?.email || 'Unknown',
      assignedSubdomain: p.assignedSubdomain || p.slug,
      platformDomain: baseDomain,
      fullSubdomainUrl: `http://${fullSubdomain}`,
      customDomain: p.customDomain || null,
      customDomainVerified: p.customDomainVerified || false,
      sslEnabled: p.sslEnabled || false,
      createdAt: p.createdAt,
    };
  });

  res.json({
    success: true,
    data: {
      platformDomains,
      projectDomains,
      defaultPlatformDomain: config.platformDomain,
    },
  });
};

/**
 * POST /api/v1/admin/domains
 * Add a new platform domain for project subdomains
 */
export const addPlatformDomain = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { domain, label, provider, isSsl, isDefault } = req.body;
    if (!domain || typeof domain !== 'string') {
      res.status(400).json({ success: false, error: 'Domain name is required' });
      return;
    }

    const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!cleanDomain || cleanDomain.length < 3 || !cleanDomain.includes('.')) {
      res.status(400).json({ success: false, error: 'Invalid domain format (e.g. yourdomain.duckdns.org or yourdomain.com)' });
      return;
    }

    if (!dbStore.settings.platformDomains) {
      dbStore.settings.platformDomains = [];
    }

    if (dbStore.settings.platformDomains.some(d => d.domain.toLowerCase() === cleanDomain)) {
      res.status(400).json({ success: false, error: `Domain '${cleanDomain}' already exists in platform domains` });
      return;
    }

    if (isDefault) {
      dbStore.settings.platformDomains.forEach(d => { d.isDefault = false; });
    }

    const newDomainItem = {
      domain: cleanDomain,
      label: label && typeof label === 'string' ? label.trim() : `${cleanDomain} (${provider || 'Custom'})`,
      provider: (provider as any) || 'Custom',
      isSsl: Boolean(isSsl),
      isDefault: Boolean(isDefault),
      createdAt: new Date().toISOString(),
    };

    dbStore.settings.platformDomains.push(newDomainItem);

    dbStore.auditLogs.push({
      _id: `aud_${Date.now()}`,
      userId: req.user!._id,
      action: `ADMIN_ADD_PLATFORM_DOMAIN: Added '${cleanDomain}'`,
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    dbStore.save();

    res.json({
      success: true,
      message: `Platform domain '${cleanDomain}' added successfully`,
      data: {
        platformDomains: dbStore.settings.platformDomains,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to add platform domain' });
  }
};

/**
 * DELETE /api/v1/admin/domains/:domain
 * Remove a platform domain from the platform
 */
export const removePlatformDomain = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const rawDomain = String(req.params.domain || '');
    const cleanDomain = decodeURIComponent(rawDomain).toLowerCase().trim();

    if (!dbStore.settings.platformDomains) {
      dbStore.settings.platformDomains = [];
    }

    const idx = dbStore.settings.platformDomains.findIndex(d => d.domain.toLowerCase() === cleanDomain);
    if (idx === -1) {
      res.status(404).json({ success: false, error: `Domain '${cleanDomain}' not found in platform domains` });
      return;
    }

    const removed = dbStore.settings.platformDomains.splice(idx, 1)[0];

    if (removed.isDefault && dbStore.settings.platformDomains.length > 0) {
      dbStore.settings.platformDomains[0].isDefault = true;
    }

    dbStore.auditLogs.push({
      _id: `aud_${Date.now()}`,
      userId: req.user!._id,
      action: `ADMIN_REMOVE_PLATFORM_DOMAIN: Removed '${cleanDomain}'`,
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    dbStore.save();

    res.json({
      success: true,
      message: `Platform domain '${cleanDomain}' removed successfully`,
      data: {
        platformDomains: dbStore.settings.platformDomains,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to remove platform domain' });
  }
};

/**
 * PATCH /api/v1/admin/domains/:domain/default
 * Set a platform domain as the primary default
 */
export const setDefaultPlatformDomain = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const rawDomain = String(req.params.domain || '');
    const cleanDomain = decodeURIComponent(rawDomain).toLowerCase().trim();

    if (!dbStore.settings.platformDomains) {
      dbStore.settings.platformDomains = [];
    }

    const target = dbStore.settings.platformDomains.find(d => d.domain.toLowerCase() === cleanDomain);
    if (!target) {
      res.status(404).json({ success: false, error: `Domain '${cleanDomain}' not found` });
      return;
    }

    dbStore.settings.platformDomains.forEach(d => {
      d.isDefault = d.domain.toLowerCase() === cleanDomain;
    });

    dbStore.auditLogs.push({
      _id: `aud_${Date.now()}`,
      userId: req.user!._id,
      action: `ADMIN_SET_DEFAULT_PLATFORM_DOMAIN: Set '${cleanDomain}' as primary default`,
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    dbStore.save();

    res.json({
      success: true,
      message: `'${cleanDomain}' is now the primary default platform domain`,
      data: {
        platformDomains: dbStore.settings.platformDomains,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to set default platform domain' });
  }
};

/**
 * DELETE /api/v1/admin/domains/projects/:projectId/subdomain
 * Admin action: Remove assigned subdomain from a project
 */
export const adminRemoveProjectSubdomain = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { projectId } = req.params;
    const project = dbStore.projects.find(p => p._id === projectId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const oldSubdomain = project.assignedSubdomain;
    project.assignedSubdomain = undefined;
    project.updatedAt = new Date().toISOString();

    dbStore.auditLogs.push({
      _id: `aud_${Date.now()}`,
      userId: req.user!._id,
      action: `ADMIN_UNBIND_SUBDOMAIN: Removed subdomain '${oldSubdomain}' from project '${project.name}' (${project._id})`,
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    dbStore.save();

    res.json({
      success: true,
      message: `Subdomain unlinked from project '${project.name}'`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to unlink subdomain' });
  }
};

/**
 * DELETE /api/v1/admin/domains/projects/:projectId/custom
 * Admin action: Remove custom domain from a project
 */
export const adminRemoveProjectCustomDomain = (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { projectId } = req.params;
    const project = dbStore.projects.find(p => p._id === projectId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const oldCustomDomain = project.customDomain;
    project.customDomain = undefined;
    project.customDomainVerified = false;
    project.updatedAt = new Date().toISOString();

    dbStore.auditLogs.push({
      _id: `aud_${Date.now()}`,
      userId: req.user!._id,
      action: `ADMIN_UNBIND_CUSTOM_DOMAIN: Removed domain '${oldCustomDomain}' from project '${project.name}' (${project._id})`,
      ip: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });

    dbStore.save();

    res.json({
      success: true,
      message: `Custom domain unlinked from project '${project.name}'`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to unlink custom domain' });
  }
};

/**
 * POST /api/v1/admin/domains/projects/:projectId/subdomain
 * Admin action: Assign or change a project's subdomain & platform base domain
 */
export const adminAssignProjectSubdomain = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { subdomain, baseDomain } = req.body;

    if (!subdomain) {
      res.status(400).json({ success: false, error: 'Subdomain is required' });
      return;
    }

    const project = dbStore.projects.find(p => p._id === projectId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const cleanSub = subdomainService.sanitizeSubdomain(subdomain);
    const chosenBase = (baseDomain || project.platformDomain || config.platformDomain || 'deployeai.duckdns.org').toLowerCase().trim();
    const lockKey = domainLockService.getSubdomainKey(cleanSub, chosenBase);

    await domainLockService.withLock(lockKey, req.user!._id, async () => {
      // Check collision
      const check = subdomainService.checkAvailability(cleanSub, project._id, chosenBase);
      if (!check.isAvailable) {
        throw new Error(check.reason || `Subdomain '${cleanSub}.${chosenBase}' is already in use`);
      }

      project.assignedSubdomain = cleanSub;
      project.platformDomain = chosenBase;
      project.updatedAt = new Date().toISOString();

      dbStore.auditLogs.push({
        _id: `aud_${Date.now()}`,
        userId: req.user!._id,
        action: `ADMIN_ASSIGN_SUBDOMAIN: Set subdomain '${cleanSub}.${chosenBase}' on project '${project.name}' (${project._id})`,
        ip: req.ip || '127.0.0.1',
        createdAt: new Date().toISOString(),
      });

      dbStore.save();
    });

    res.json({
      success: true,
      message: `Assigned subdomain '${cleanSub}.${chosenBase}' to project '${project.name}'`,
      data: {
        projectId: project._id,
        assignedSubdomain: project.assignedSubdomain,
        platformDomain: project.platformDomain,
        fqdn: `${cleanSub}.${chosenBase}`,
      },
    });
  } catch (err: any) {
    const isConflict = err.code === 'CONCURRENT_CLAIM_CONFLICT';
    res.status(isConflict ? 409 : 400).json({
      success: false,
      conflict: isConflict,
      error: err.message || 'Failed to assign subdomain',
    });
  }
};

/**
 * POST /api/v1/admin/domains/projects/:projectId/custom
 * Admin action: Assign and verify a custom domain for any project
 */
export const adminAssignProjectCustomDomain = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { domain, verified } = req.body;

    if (!domain) {
      res.status(400).json({ success: false, error: 'Custom domain is required' });
      return;
    }

    const project = dbStore.projects.find(p => p._id === projectId);
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const cleanDomain = domain.toLowerCase().trim().replace(/^[./]+|[./]+$/g, '');
    const lockKey = domainLockService.getCustomDomainKey(cleanDomain);

    await domainLockService.withLock(lockKey, req.user!._id, async () => {
      // Check collision with other projects
      if (dbStore.projects.some(p => p.customDomain?.toLowerCase() === cleanDomain && p._id !== project._id)) {
        throw new Error(`Domain '${cleanDomain}' is already bound to another project`);
      }

      project.customDomain = cleanDomain;
      project.customDomainVerified = verified !== undefined ? !!verified : true;
      project.sslEnabled = true;
      project.updatedAt = new Date().toISOString();

      dbStore.auditLogs.push({
        _id: `aud_${Date.now()}`,
        userId: req.user!._id,
        action: `ADMIN_ASSIGN_CUSTOM_DOMAIN: Set custom domain '${cleanDomain}' on project '${project.name}' (${project._id})`,
        ip: req.ip || '127.0.0.1',
        createdAt: new Date().toISOString(),
      });

      dbStore.save();
    });

    res.json({
      success: true,
      message: `Assigned custom domain '${cleanDomain}' to project '${project.name}'`,
      data: {
        projectId: project._id,
        customDomain: project.customDomain,
        customDomainVerified: project.customDomainVerified,
        sslEnabled: project.sslEnabled,
      },
    });
  } catch (err: any) {
    const isConflict = err.code === 'CONCURRENT_CLAIM_CONFLICT';
    res.status(isConflict ? 409 : 400).json({
      success: false,
      conflict: isConflict,
      error: err.message || 'Failed to assign custom domain',
    });
  }
};

